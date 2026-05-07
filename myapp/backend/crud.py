from sqlalchemy.orm import Session
import models
from datetime import datetime

now = datetime.utcnow()

def get_progress_table_by_user_id(db: Session, user_id: int): 
    return db.query(models.StrengthTable).filter(models.StrengthTable.user_id == user_id).all()

def get_row_by_user_id_and_tag(db: Session, user_id: int, tag: str):
    return db.query(models.StrengthTable).filter(
            models.StrengthTable.user_id == user_id,
            models.StrengthTable.tag == tag
        ).first()

def update_stability_score(db: Session, user_id: int, tag: str, is_correct: bool):
    # get row by user_id and tag
    row = get_row_by_user_id_and_tag(db, user_id, tag)

    # update stability 
    if is_correct:
        row.stability *= 2
    else:
        row.stability = max(0.1, row.stability * 0.5)

    # update last practice
    row.last_practice = now

    updates = {"tag": tag, "new_stability": row.stability}

    return updates