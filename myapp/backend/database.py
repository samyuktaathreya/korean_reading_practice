from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
from datetime import date

# Use SQLite for simplicity; 'fruit_market.db' will be created locally
SQLALCHEMY_DATABASE_URL = "sqlite:///./duolingo_style_db.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

QUESTIONS_DATA = []
JSON_FOLDER_FILEPATH = './SejongKorean2022_Questions_DB/'
QUESTIONS_FILEPATH = JSON_FOLDER_FILEPATH + 'questions.json'

inverted_index = {} # key: tag, value: list of questions at that tag
tags_to_unit_dict = {} # key: tag, value: units
unit_to_tags_dict = {} # key: unit, value: tags
unit_to_unit_test_questions_dict = {} # key: unit, value: list of unit test questions

# The database is composed of 5 parts

# 1. strength table: SQL, columns: tag, user_id, stability, last practiced
# 2. tags/questions: dictionary, key: tag; value: list of questions corresponding to that tag
# 3. tags/unit: dictionary, key: tag, value: the unit that tag belongs to
# 4. unit/tags: dictionary, key: unit, value: list of tags corresponding to that unit
# 5. user_id/unit: dictionary, key: user_id, value: unit that user is on

# ----------------------------- TAGS-UNIT DICTIONARY -----------------------------
# ----------------------------- UNIT-TAGS DICTIONARY -----------------------------
# (two birds with one stone)

# tags/unit: dictionary, key: tag, value: the unit that tag belongs to
# unit/tags: dictionary, key: unit, value: tags of that unit
TAGS_UNITS_JSON_FILEPATH = JSON_FOLDER_FILEPATH + 'unit_to_tags.json'


try:
    with open(TAGS_UNITS_JSON_FILEPATH, 'r', encoding='utf-8') as file:
        # json.load() parses the file directly into a Python list or dictionary
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


# ----------------------------- TAG-QUESTION DICT (INVERTED_INDEX) -----------------------------
DUOLINGO_STYLE_QUESTIONS_JSON_FILEPATH = JSON_FOLDER_FILEPATH + 'questions.json'

try:
    with open(DUOLINGO_STYLE_QUESTIONS_JSON_FILEPATH, 'r', encoding='utf-8') as file:
        # json.load() parses the file directly into a Python list or dictionary
        data = json.load(file)
        
    print("Data loaded successfully!")
    # Example: Access the first category
    print(f"First Category: {data[0]['category']}")

except FileNotFoundError:
    print(f"Error: The file {DUOLINGO_STYLE_QUESTIONS_JSON_FILEPATH} was not found.")
except json.JSONDecodeError:
    print("Error: Failed to decode JSON. Check your file syntax.")

# 2. Set up variables for data processing
user_id = 1
initial_strength = 1.0  # Initial strength score (for Half-life calculations)
today = date.today().isoformat()

# Inverted index dictionary connecting tags to question IDs
inverted_index = {}
# Set of unique tags to insert into our SQL database
unique_tags = set()

# 3. Parse data and create the inverted index
# Use a counter to assign a unique ID to every single question
q_id_counter = 0

for category_item in data:
    category = category_item['category']
    for level in category_item['levels']:
        for q in level['questions']:
            q_id_counter += 1
            
            tags_for_this_question = q['tags']
            
            unit = max(
                (tags_to_unit_dict.get(tag) for tag in tags_for_this_question if tags_to_unit_dict.get(tag) is not None),
                default=None
            )
            
            question_obj = {
                "id": f"q_{q_id_counter}",
                "unit": unit,   # <-- store unit on the question
                **q
            }

            for tag in tags_for_this_question:
                unique_tags.add(tag)
                if tag not in inverted_index:
                    inverted_index[tag] = []
                inverted_index[tag].append(question_obj)

# ----------------------------- UNIT-UNIT_TEST_QUESTIONS DICTIONARY -----------------------------
UNIT_TEST_QUESTIONS_FILEPATH = JSON_FOLDER_FILEPATH + 'unit_test_questions.json'

try:
    with open(UNIT_TEST_QUESTIONS_FILEPATH, 'r', encoding='utf-8') as file:
        # json.load() parses the file directly into a Python list or dictionary
        unit_test_questions_data = json.load(file)
        
    print("Data loaded successfully!")
    # Example: Access the first category
    print(f"First Category: {data[0]['category']}")

except FileNotFoundError:
    print(f"Error: The file {UNIT_TEST_QUESTIONS_FILEPATH} was not found.")
except json.JSONDecodeError:
    print("Error: Failed to decode JSON. Check your file syntax.")

for category_item in unit_test_questions_data:
    unit = category_item['unit']
    questions = category_item['questions']
    unit_to_unit_test_questions_dict[unit] = questions