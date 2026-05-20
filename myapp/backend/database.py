from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
from datetime import date

# Use SQLite for simplicity; 'duolingo_style_db.db' will be created locally
SQLALCHEMY_DATABASE_URL = "sqlite:///./duolingo_style_db.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

QUESTIONS_DATA = []
JSON_FOLDER_FILEPATH = './Old_Sejong_Korean_Questions/'
QUESTIONS_FILEPATH = JSON_FOLDER_FILEPATH + 'review_questions.json'

inverted_index = {}       # key: tag, value: list of questions at that tag
tags_to_unit_dict = {}    # key: tag, value: unit number
unit_to_tags_dict = {}    # key: unit, value: list of tags
tag_to_intro_questions_dict = {}  # key: tag, value: list of intro questions

# The database is composed of 6 parts

# 1. strength table: SQL, columns: tag, user_id, stability, last practiced
# 2. tags/review questions: dictionary, key: tag; value: list of questions corresponding to that tag
# 3. tags/unit: dictionary, key: tag, value: the unit that tag belongs to
# 4. unit/tags: dictionary, key: unit, value: list of tags corresponding to that unit
# 5. user_id/unit: dictionary, key: user_id, value: unit that user is on
# 6. tags/intro questions: dictionary, key: tag; value: list of intro questions corresponding to that tag

# ----------------------------- HELPER FUNCTIONS -----------------------------
def read_questions_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            # Format: { "1": [ {question}, ... ], "2": [ ... ], ... }
            data = json.load(file)

        print("Data loaded successfully!")

    except FileNotFoundError:
        print(f"Error: The file {filepath} was not found.")
        return {}
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON. Check your file syntax.")
        return {}

    # Inverted index dictionary connecting tags to question objects
    inverted_index = {}

    # Use a counter to assign a unique ID to every single question
    q_id_counter = 0

    # New format: data is a dict keyed by unit number string e.g. "1", "2", ...
    # Each value is a flat list of question objects
    for unit_str, questions in data.items():
        unit = int(unit_str)
        for q in questions:
            q_id_counter += 1

            tags_for_this_question = q['tags']

            question_obj = {
                "id": f"q_{q_id_counter}",
                "unit": unit,   # <-- store unit on the question
                **q
            }

            for tag in tags_for_this_question:
                if tag not in inverted_index:
                    inverted_index[tag] = []
                inverted_index[tag].append(question_obj)

    return inverted_index

# ----------------------------- TAGS-UNIT DICTIONARY -----------------------------
# ----------------------------- UNIT-TAGS DICTIONARY -----------------------------
# (two birds with one stone)

# tags/unit: dictionary, key: tag, value: the unit that tag belongs to
# unit/tags: dictionary, key: unit, value: tags of that unit
TAGS_UNITS_JSON_FILEPATH = JSON_FOLDER_FILEPATH + 'unit_to_tags.json'

try:
    with open(TAGS_UNITS_JSON_FILEPATH, 'r', encoding='utf-8') as file:
        tags_units_data = json.load(file)

    print("Tags/Units JSON loaded successfully!")

except FileNotFoundError:
    print(f"Error: The file {TAGS_UNITS_JSON_FILEPATH} was not found.")
except json.JSONDecodeError:
    print("Error: Failed to decode JSON. Check your file syntax.")

for unit, tags in tags_units_data.items():
    unit = int(unit)
    for tag in tags:
        if tag not in tags_to_unit_dict:
            tags_to_unit_dict[tag] = unit

    unit_to_tags_dict[unit] = tags

# ----------------------------- TAG-REVIEW QUESTION DICT (INVERTED_INDEX) -----------------------------
inverted_index = read_questions_json(QUESTIONS_FILEPATH)

# ----------------------------- UNIT-UNIT_TEST_QUESTIONS DICTIONARY -----------------------------
# currently archived, attempting to double review questions as unit test questions
'''UNIT_TEST_QUESTIONS_FILEPATH = JSON_FOLDER_FILEPATH + 'unit_test_questions.json'

try:
    with open(UNIT_TEST_QUESTIONS_FILEPATH, 'r', encoding='utf-8') as file:
        unit_test_questions_data = json.load(file)

    print("Data loaded successfully!")

except FileNotFoundError:
    print(f"Error: The file {UNIT_TEST_QUESTIONS_FILEPATH} was not found.")
except json.JSONDecodeError:
    print("Error: Failed to decode JSON. Check your file syntax.")

for category_item in unit_test_questions_data:
    unit = category_item['unit']
    questions = category_item['questions']
    unit_to_unit_test_questions_dict[unit] = questions'''

# ----------------------------- TAG-INTRO QUESTION DICT -----------------------------
INTRO_QUESTIONS_FILEPATH = JSON_FOLDER_FILEPATH + "intro_unit_questions.json"
tag_to_intro_questions_dict = read_questions_json(INTRO_QUESTIONS_FILEPATH)