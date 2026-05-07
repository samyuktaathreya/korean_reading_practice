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
QUESTIONS_FILEPATH = 'DuolingoStyleQuestions.json'

def load_questions():
    global QUESTIONS_DATA, INVERTED_INDEX
    try:
        with open(QUESTIONS_FILEPATH, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {QUESTIONS_FILEPATH} not found.")
        return

    # Clear existing data to avoid duplicates on reload
    QUESTIONS_DATA = []
    INVERTED_INDEX = {}
    
    # Nested loop to flatten the JSON structure
    for category_item in raw_data:
        category_name = category_item.get("category")
        
        for level in category_item.get("levels", []):
            difficulty_level = level.get("difficulty")
            
            for q in level.get("questions", []):
                # --- ENRICH THE DATA ---
                # We inject metadata so the frontend knows the context
                q["category"] = category_name
                q["difficulty"] = difficulty_level
                
                # --- DEFINE TAGS ---
                # 1. The answer itself (e.g., "는", "은")
                # 2. The category name
                tags = [q["answer"], category_name]
                q["tags"] = tags # Store it in the object for easy reference later
                
                # Save to our flat list
                QUESTIONS_DATA.append(q)
                
                # --- BUILD INVERTED INDEX ---
                for tag in tags:
                    if tag not in INVERTED_INDEX:
                        INVERTED_INDEX[tag] = []
                    INVERTED_INDEX[tag].append(q)

    print(f"Index built! Found {len(INVERTED_INDEX.keys())} unique tags.")

load_questions()