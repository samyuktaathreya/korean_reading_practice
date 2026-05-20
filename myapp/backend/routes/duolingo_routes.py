# routers/practice.py
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from database import SessionLocal, inverted_index, tags_to_unit_dict, unit_to_tags_dict,tag_to_intro_questions_dict
import crud
from datetime import datetime
import random
from schemas import *

router = APIRouter()

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --------------------------------- CONSTANTS ---------------------------------
NUM_OF_UNIT_TEST_QUESTIONS = 20
PERCENTAGE_TO_PASS_UNIT_TEST = 0.80
NUM_OF_INTRO_QUESTIONS = 10
ALLOWED_QUESTION_TYPES_FOR_UNIT_TEST = ["fill in the blank", "listening", "translate english to korean", "conversation", "speaking", "error correction"]

# --------------------------------- HELPERS ---------------------------------
# only get strength scores for tags from a specific unit (inclusive both sides)
def get_strength_scores_from_unit_range(db, user_id, unit_min, unit_max):
    # 1. Fetch whatever records DO exist
    progress_records = crud.get_progress_table_by_user_id(db, user_id)
    db_strength_map = {}
    
    now = datetime.utcnow()
    for record in progress_records:
        delta_t = (now - record.last_practice).total_seconds() / 86400
        current_strength = 0.5 ** (delta_t / record.stability) if record.stability > 0 else 0.0
        db_strength_map[record.tag] = current_strength

    # 2. Cross-reference with ALL tags that SHOULD exist in this unit range
    calculated_stats = []
    for tag, unit in tags_to_unit_dict.items():
        if unit_min <= unit <= unit_max:
            # If the user has practiced it, use the real score. 
            # If they haven't, give them a virtual default of 0.0!
            strength = db_strength_map.get(tag, 0.0) 
            
            calculated_stats.append({
                "tag": tag,
                "strength": strength
            })

    return calculated_stats

def generate_questions(
        db,
        user_id,
        num_questions,
        unit_min,
        unit_max,
        allowed_question_types, # set to "all" if any question type is allowed
        question_dict
    ):

    calculated_stats = get_strength_scores_from_unit_range(db, user_id, unit_min, unit_max)

    # 4. Sort by strength (Lowest first = Most forgotten)
    calculated_stats.sort(key=lambda x: x["strength"])

    # 5. Take the bottom num_questions
    weakest_tags = calculated_stats[:num_questions]

    question_set = []
    used_ids = set()

    for item in weakest_tags:
        tag = item["tag"]

        questions = question_dict.get(tag, [])

        questions = [q for q in questions if unit_min <= q.get("unit") and q.get("unit") <= unit_max]

        available = [q for q in questions if q["id"] not in used_ids]

        if available: 
            random.shuffle(available)
            add_count = 0
            for question in available:
                if len(question_set) < num_questions \
                    and add_count < 4 \
                    and question["id"] not in used_ids \
                    and (allowed_question_types == "all" or \
                    question["question_type"] in allowed_question_types):

                    question_set.append(question)
                    used_ids.add(question["id"])
                    add_count += 1
                else:
                    break

    random.shuffle(question_set)

    # 6. Return the data
    return question_set


def generate_mixed_session(db, user_id, user_unit):
    # generate 3 review questions
    review_question_set = generate_questions(db, user_id, 3, 1, user_unit - 1, "all", inverted_index)

    # generate 7 current unit questions
    current_unit_question_set = generate_questions(db, user_id, 7, user_unit, user_unit, "all", inverted_index)

    final_question_set = (review_question_set + current_unit_question_set)
    random.shuffle(final_question_set)

    return final_question_set

def update_stability_score(user_id: int, question_data: dict, is_correct: bool, db: Session):
    tags_to_update = question_data.get("tags", [])

    results = []

    for tag in tags_to_update:
        results.append(crud.update_stability_score(db, user_id, tag, is_correct))

    return results

def generate_unit_test(db, user_id, user_unit):
    # monitor the allowable question types while generating questions
    return generate_questions(
        db,
        user_id,
        NUM_OF_UNIT_TEST_QUESTIONS,
        user_unit,
        user_unit,
        ALLOWED_QUESTION_TYPES_FOR_UNIT_TEST,
        inverted_index
    )

def generate_intro_session(user_id, db, user_unit):
    print("generate intro session called")
    print(tag_to_intro_questions_dict)
    intro_tags = list(tag_to_intro_questions_dict.keys())
    print(f"Tags in intro dict: {intro_tags[:5]}")
    # ask questions from those tags
    return generate_questions(
        db,
        user_id,
        NUM_OF_INTRO_QUESTIONS,
        user_unit,
        user_unit,
        "all",
        tag_to_intro_questions_dict
    )

# --------------------------------- ENDPOINTS ---------------------------------
@router.patch("/api/practice/submit_session/{user_id}")
def submit_session(user_id: int, 
    list_of_question_data: list[dict] = Body(...), # Tells FastAPI to look in the Request Body
    is_correct: list[bool] = Body(...), 
    session_type: SessionType = Body(...), # intro session, review session, unit test
    db: Session = Depends(get_db)
    ):

    # if user did an intro session, increase their "intro_rounds_completed" attribute
    if session_type == SessionType.INTRO:
        user = crud.get_user(db, user_id)
        crud.increase_intro_rounds_completed(db, user_id)

    results = []
    num_of_questions_user_answered_correct = 0

    # go through every question
    for i, question_data in enumerate(list_of_question_data):
        is_question_correct = is_correct[i]

        num_of_questions_user_answered_correct += int(is_question_correct)

        # update user's stability scores
        result = update_stability_score(user_id, question_data, is_question_correct, db)

        # keep track of results
        results.append(result)

    unit_test_passed = "unit test not taken"

    # if it's a unit test, update the user's current unit if they passed
    if session_type == SessionType.UNIT_TEST:
        # did user pass?
        num_of_questions_to_pass_unit_test = PERCENTAGE_TO_PASS_UNIT_TEST * NUM_OF_UNIT_TEST_QUESTIONS
        unit_test_passed = num_of_questions_user_answered_correct >= num_of_questions_to_pass_unit_test
        if unit_test_passed:
            unit_test_passed = "unit test passed"
            # progress user's current unit
            user_unit = crud.get_user(db, user_id).current_unit
            crud.update_user_unit(db, user_id, user_unit + 1)
        else:
            unit_test_passed = "unit test failed"

    return {
        "user_id": user_id,
        "results": results,
        "unit_test_passed": unit_test_passed
    }

@router.get("/api/generate_session/{user_id}", response_model=SessionResponse)
def generate_session(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    user_unit = user.current_unit

    # ----------- CHECK IF USER NEEDS INTRO LESSON -----------------
    intro_rounds_completed = user.intro_rounds_completed
    if intro_rounds_completed >= 2:
        user_level = "review"
    else:
        user_level = "intro"

    if user_level == "intro":
        question_set = generate_intro_session(user_id, db, user_unit)
        return SessionResponse(
            user_id = user_id,
            session_type=SessionType.INTRO,
            question_set=question_set
        )
    
    # calculate current unit scores:
    current_stability_scores = get_strength_scores_from_unit_range(db, user_id, user_unit, user_unit)
    weak_current_tags = [score for score in current_stability_scores if score["strength"] < 0.85]


    # ----------- HANDLE USERS IN UNIT 1 SEPARATELY -----------------
    if user_unit == 1: # check if they need review sesh or unit test
        if len(weak_current_tags) > 0:
            # PRACTICE UNIT 1
            question_set = generate_questions(db, user_id, 10, 1, 1, "all", inverted_index)
            session_type = SessionType.PRACTICE_CURRENT_UNIT
        else:
            # UNIT TEST FOR UNIT 1
            question_set = generate_unit_test(db, user_id, user_unit)
            session_type = SessionType.UNIT_TEST

        return SessionResponse(
            user_id=user_id,
            session_type=session_type,
            question_set=question_set
        )


    # ----------- CHECK IF USER NEEDS REVIEW OF PREVIOUS UNITS -------
    # calculate average past stability score from units 1 to current_unit - 1
    past_stability_scores = get_strength_scores_from_unit_range(db, user_id, 1, max(user_unit - 1, 1))
    past_stability_scores = [item["strength"] for item in past_stability_scores]
    if len(past_stability_scores) > 0:
        avg_past_stability = sum(past_stability_scores) / len(past_stability_scores)
    else:
        avg_past_stability = 0

    # CHECK IF USER NEEDS REVIEW OF PREVIOUS UNITS
    if avg_past_stability < 0.70:
        # This draws the 10 weakest tags from units 1 to (current_unit - 1)
        question_set = generate_questions(db, user_id, 10, 1, user_unit - 1, "all", inverted_index)
        session_type = SessionType.PRACTICE_OLD_UNITS
        return SessionResponse(
            user_id=user_id,
            session_type=session_type,
            question_set=question_set
        )

    # CHECK IF USER NEEDS TO PRACTICE CURRENT UNIT
    elif len(weak_current_tags) > 0:
        question_set = generate_mixed_session(db, user_id, user_unit)
        session_type = SessionType.PRACTICE_CURRENT_UNIT
        return SessionResponse(
            user_id=user_id,
            session_type=session_type,
            question_set=question_set
        )

    else:
        # OTHERWISE GIVE USER UNIT TEST
        question_set = generate_unit_test(db, user_id, user_unit)
        session_type = SessionType.UNIT_TEST

    return SessionResponse(
        user_id=user_id,
        session_type=session_type,
        question_set=question_set
    )

@router.get("/api/user_progress/{user_id}", response_model=ProgressResponse)
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
        
    user_unit = user.current_unit
    intro_rounds = user.intro_rounds_completed

    # 1. GENERATE THE KNOWLEDGE GRID FOR THE CURRENT UNIT
    # Grab all tags tied to the user's current unit
    current_unit_tags = [tag for tag, unit in tags_to_unit_dict.items() if unit == user_unit]
    
    # Get calculated strength records for this unit
    calculated_stats = get_strength_scores_from_unit_range(db, user_id, user_unit, user_unit)
    strength_map = {item["tag"]: item["strength"] for item in calculated_stats}

    knowledge_grid = []
    stable_tags_count = 0

    for tag in current_unit_tags:
        # If the tag doesn't exist in DB yet, strength is 0.0
        current_strength = strength_map.get(tag, 0.0)
        
        # Categorize health status based on your gateway logic (0.85 threshold)
        if current_strength >= 0.85:
            status = "stable"
            stable_tags_count += 1
        elif current_strength >= 0.70:
            status = "cooling"
        else:
            status = "weak"

        knowledge_grid.append({
            "tag": tag,
            "strength": round(current_strength, 2),
            "status": status
        })

    # 2. DETERMINE THE CURRENT MILESTONE STEP
    if intro_rounds < 2:
        current_step = "intro_rounds"
        status_message = f"Complete your introductory material. ({intro_rounds}/2 rounds completed)"
    else:
        # Check if they have weak tags remaining
        has_weak_tags = stable_tags_count < len(current_unit_tags)
        
        if has_weak_tags:
            current_step = "stabilize_tags"
            status_message = f"Strengthen your weak tags. Get all tags above 85% strength to unlock your Unit Test. ({stable_tags_count}/{len(current_unit_tags)} stable)"
        else:
            current_step = "unit_test_ready"
            status_message = "All concepts are stable! You are ready to take your Graduation Unit Test."

    # 3. BUILD THE STRUCTURED RESPONSE
    return {
        "user_id": user_id,
        "current_unit": user_unit,
        "milestone_summary": {
            "current_step": current_step,
            "status_message": status_message,
            "intro_rounds_completed": intro_rounds,
            "total_tags_in_unit": len(current_unit_tags),
            "stable_tags_in_unit": stable_tags_count
        },
        "knowledge_grid": knowledge_grid
    }