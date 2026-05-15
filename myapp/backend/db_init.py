import sqlite3
import json
from datetime import date

# The database is composed of 5 parts

# 1. strength table: SQL, columns: tag, user_id, stability, last practiced
# 2. tags/questions: dictionary, key: tag; value: list of questions corresponding to that tag
# 3. tags/unit: dictionary, key: tag, value: the unit that tag belongs to
# 4. unit/tags: dictionary, key: unit, value: list of tags corresponding to that unit
# 5. user_id/unit: dictionary, key: user_id, value: unit that user is on

# ----------------------------- TAG-QUESTION DICT -----------------------------
DUOLINGO_STYLE_QUESTIONS_JSON_FILEPATH = './SejongKorean2022_Questions_DB/questions.json'

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
        difficulty = level['difficulty']
        for q in level['questions']:
            q_id_counter += 1
            question_id = f"q_{q_id_counter}"

            tags_for_this_question = q['tags']
            for tag in tags_for_this_question:
                unique_tags.add(tag)
                if tag not in inverted_index:
                    inverted_index[tag] = []
                inverted_index[tag].append(question_id)

# ----------------------------- STRENGTH TABLE -----------------------------
conn = sqlite3.connect('duolingo_style_db.db')
cursor = conn.cursor()

# Create table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS strength_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT, 
        user_id INTEGER, 
        stability REAL, 
        last_practice DATE,
        UNIQUE(tag, user_id) -- Prevent duplicate insertions for the same user
    )
''')

# Insert unique tags into the SQL table
for tag in unique_tags:
    # INSERT OR IGNORE ensures that if a tag already exists for this user, 
    # it won't overwrite their current strength progress. It only adds new ones.
    cursor.execute('''
        INSERT OR IGNORE INTO strength_table (tag, user_id, stability, last_practice)
        VALUES (?, ?, ?, ?)
    ''', (tag, user_id, initial_strength, today))

# ----------------------------- USERS TABLE -----------------------------
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        current_unit INTEGER DEFAULT 1
    )
''')

# Insert our default user if they don't exist yet
cursor.execute('''
    INSERT OR IGNORE INTO users (id, current_unit)
    VALUES (?, ?)
''', (user_id, 1))

conn.commit()
conn.close()

# ----------------------------- VERIFY RESULTS -----------------------------
print(f"--- SQL Table: {len(unique_tags)} tags initialized. ---")
print("\n--- Inverted Index (JSON Format) ---")
print(json.dumps(inverted_index, ensure_ascii=False, indent=2))