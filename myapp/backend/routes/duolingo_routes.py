# routers/practice.py
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from database import SessionLocal, inverted_index, tags_to_unit_dict, unit_to_tags_dict, unit_to_unit_test_questions_dict
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

# --------------------------------- HELPERS ---------------------------------
# only get strength scores for tags from a specific unit (inclusive both sides)
def get_strength_scores_from_unit_range(db, user_id, unit_min, unit_max):
    # Look up the user's progress records
    progress_records = crud.get_progress_table_by_user_id(db, user_id)

    # store strengths in memory
    calculated_stats = []

    now = datetime.utcnow()
    
    for record in progress_records:
        tag = record.tag
        
        if tag not in tags_to_unit_dict:
            continue

        unit = tags_to_unit_dict[tag]

        if unit > unit_max or unit < unit_min: 
            continue
        
        stability = record.stability
        last_practice = record.last_practice
        
        # 1. Calculate Δt (Time elapsed in days)
        # We use .total_seconds() / 86400 to get a precise decimal of days
        delta_t = (now - last_practice).total_seconds() / 86400
        
        # 2. Apply the SRS Formula: S = 0.5 ^ (Δt / h)
        # If delta_t is 0 (just practiced), strength is 1.0
        # If delta_t == stability, strength is 0.5
        current_strength = 0.5 ** (delta_t / stability)
        
        # 3. Store in a temporary list for sorting
        calculated_stats.append({
            "tag": record.tag,
            "strength": current_strength,
            "stability": stability # keeping this to update later
        })

    return calculated_stats

def generate_questions(
        db,
        user_id,
        num_questions,
        unit_min,
        unit_max
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

        exposure_count = crud.get_row_by_user_id_and_tag(db, user_id, tag).exposure_count

        questions = inverted_index.get(tag, [])

        questions = [q for q in questions if unit_min <= q.get("unit") and q.get("unit") <= unit_max]

        available = [q for q in questions if q["id"] not in used_ids]

        if available: 
            random.shuffle(available)
            add_count = 0
            for question in available:
                if len(question_set) < num_questions and add_count < 4 and question["id"] not in used_ids:
                    question_set.append(question)
                    used_ids.add(question["id"])
                    add_count += 1
                else:
                    break

    random.shuffle(question_set)

    # 6. Return the data
    return SessionResponse(
        user_id=user_id,
        session_type="practice_session",
        question_set=question_set
    )


def generate_mixed_session(db, user_id, user_unit):
    # generate 3 review questions
    review_question_set = generate_questions(db, user_id, 3, 1, user_unit - 1).question_set

    # generate 7 current unit questions
    current_unit_question_set = generate_questions(db, user_id, 7, user_unit, user_unit).question_set

    final_question_set = (review_question_set + current_unit_question_set)
    random.shuffle(final_question_set)

    return SessionResponse(
        user_id=user_id,
        session_type="practice_session",
        question_set=final_question_set
    )

def update_stability_score(user_id: int, question_data: dict, is_correct: bool, db: Session):
    tags_to_update = question_data.get("tags", [])

    results = []

    for tag in tags_to_update:
        results.append(crud.update_stability_score(db, user_id, tag, is_correct))

    return results

def generate_unit_test(user_id, user_unit):
    # generate unit test questions
    # "database": unit_to_unit_test_questions_dict
    unit_test_questions = random.sample(unit_to_unit_test_questions_dict[user_unit], NUM_OF_UNIT_TEST_QUESTIONS)
    
    return SessionResponse(
        user_id=user_id,
        session_type="unit_test",
        question_set=unit_test_questions
    )

# --------------------------------- ENDPOINTS ---------------------------------
@router.patch("/api/practice/submit_session/{user_id}")
def submit_session(user_id: int, 
    list_of_question_data: list[dict] = Body(...), # Tells FastAPI to look in the Request Body
    is_correct: list[bool] = Body(...), 
    is_unit_test: bool = Body(...),
    db: Session = Depends(get_db)
    ):

    # if user did an intro session, increase their "intro_rounds_completed" attribute
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
    if is_unit_test:
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

    intro_rounds_completed = user.intro_rounds_completed
    if intro_rounds_completed >= 2:
        user_level = "review"
    else:
        user_level = "intro"

    if user_level == "intro":
        return generate_intro_session()

    if user_unit == 1: # check if they need review sesh or unit test
        # calculate current unit scores:
        current_stability_scores = get_strength_scores_from_unit_range(db, user_id, user_unit, user_unit)
        weak_current_tags = [score for score in current_stability_scores if score["strength"] < 0.85]

        if len(weak_current_tags) > 0:
            return generate_questions(db, user_id, 10, 1, 1)

        # 4. THE GRADUATION GATE
        # If we reached here, past is stable AND all current tags are > 0.85
        # This should be a hard session (e.g., all typing, no multiple choice)
        return generate_unit_test(user_id, user_unit)

    # calculate average past stability score from units 1 to current_unit - 1
    past_stability_scores = get_strength_scores_from_unit_range(db, user_id, 1, max(user_unit - 1, 1))
    past_stability_scores = [item["strength"] for item in past_stability_scores]
    if not past_stability_scores:
        return generate_mixed_session(db, user_id, user_unit)
    avg_past_stability = sum(past_stability_scores) / len(past_stability_scores)

    # CHECK IF USER NEEDS REVIEW
    if avg_past_stability < 0.70:
        # This draws the 10 weakest tags from units 1 to (current_unit - 1)
        return generate_questions(db, user_id, 10, 1, user_unit - 1)

    # CHECK IF USER IS READY TO GRADUATE UNIT

    # calculate current unit scores:
    current_stability_scores = get_strength_scores_from_unit_range(db, user_id, user_unit, user_unit)
    weak_current_tags = [score for score in current_stability_scores if score["strength"] < 0.85]

    if len(weak_current_tags) > 0:
        return generate_mixed_session(db, user_id, user_unit)

    # 4. THE GRADUATION GATE
    return generate_unit_test(user_id, user_unit)