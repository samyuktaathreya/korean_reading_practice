from sqlalchemy import Column, Integer, String, Float, DateTime, UniqueConstraint
from database import Base
from datetime import datetime

class StrengthTable(Base):
    __tablename__ = "strength_table"

    id = Column(Integer, primary_key=True, index=True)
    tag = Column(String)
    user_id = Column(Integer)
    stability = Column(Float, default=0)
    last_practice = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (  
        UniqueConstraint('tag', 'user_id', name='_tag_user_uc'),
    )

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    current_unit = Column(Integer, default=1)
    
