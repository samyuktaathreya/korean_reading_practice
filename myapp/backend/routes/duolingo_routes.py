# routers/practice.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import SessionLocal # This is your sessionmaker
from .. import crud
from datetime import datetime
from .. import INVERTED_INDEX
import random

router = APIRouter()

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/initialize/{user_id}")
def initialize_db(user_id: int, db: Session = Depends(get_db)):
    # 1. Look up the user's progress records
    progress_records = crud.get_user_progress(db, user_id)

    # store strengths in memory
    calculated_stats = []

    now = datetime.utcnow()
    
    for record in progress_records:
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

    # 4. Sort by strength (Lowest first = Most forgotten)
    calculated_stats.sort(key=lambda x: x["strength"])

    # 5. Take the bottom 10
    weakest_10_tags = calculated_stats[:10]

    question_set = []
    used_ids = set()

    for item in weakest_10_tags:
        tag = item["tag"]
        questions = INVERTED_INDEX.get(tag, [])

        # Filter out questions we already used in this specific session
        available = [q for q in questions if q["id"] not in used_ids]

        if available:
            # Pick from the remaining unique ones
            selected_q = random.choice(available)
            question_set.append(selected_q)
            used_ids.add(selected_q["id"])
        elif questions:
            # Fallback: If ALL questions for this tag were already used, 
            # just pick one anyway (better than an empty set or a crash)
            selected_q = random.choice(questions)
            question_set.append(selected_q)

    # 6. Return the data
    return {
        "user_id": user_id,
        "question_set": question_set
    }