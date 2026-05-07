from sqlalchemy.orm import Session
from . import models, schemas

def get_progress_table_by_user_id(db: Session, user_id: int): 
    return db.query(models.StrengthTable).filter(models.StrengthTable.user_id == user_id).all()
