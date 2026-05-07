from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json

# Use SQLite for simplicity; 'fruit_market.db' will be created locally
SQLALCHEMY_DATABASE_URL = "sqlite:///./duolingo_style_db.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

QUESTIONS_DATA = []
INVERTED_INDEX = {}

def load_questions():
    global QUESTIONS_DATA, INVERTED_INDEX
    with open("questions.json", "r", encoding="utf-8") as f:
        QUESTIONS_DATA = json.load(f)
    
    # Build the Inverted Index
    for q in QUESTIONS_DATA:
        for tag in q.get("tags", []):
            if tag not in INVERTED_INDEX:
                INVERTED_INDEX[tag] = []
            INVERTED_INDEX[tag].append(q)

load_questions()