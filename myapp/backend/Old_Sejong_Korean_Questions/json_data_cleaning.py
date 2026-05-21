import json

def map_units_to_tags(input_filepath, output_filepath):
    """
    Reads a JSON file where:
      - top-level keys are unit numbers
      - each unit contains a list of question objects
      - each question object may contain a 'tags' list

    Outputs a JSON mapping:
      {
        "1": ["tag1", "tag2"],
        "2": ["tag3"]
      }
    """

    # Load input JSON
    with open(input_filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    unit_to_tags = {}

    # Iterate through units
    for unit, questions in data.items():
        tag_set = set()

        for question in questions:
            tags = question.get("tags", [])

            for tag in tags:
                tag_set.add(tag)

        # Sort tags for consistency
        unit_to_tags[unit] = sorted(tag_set)

    # Write output JSON
    with open(output_filepath, "w", encoding="utf-8") as f:
        json.dump(unit_to_tags, f, ensure_ascii=False, indent=2)

    print(f"Saved unit-to-tags mapping to: {output_filepath}")

# map_units_to_tags("intro_unit_questions.json", "intro_unit_to_tags.json")
# map_units_to_tags("review_questions.json", "review_unit_to_tags.json")

import json
import re


def retag_questions(input_filepath, output_filepath, unit_tags_filepath):
    with open(input_filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(unit_tags_filepath, "r", encoding="utf-8") as f:
        unit_to_allowed_tags = json.load(f)

    def clean_text(text):
        text = re.sub(r"[.,!?():;\"'“”‘’/]", " ", text)
        text = text.replace("___", " ")
        return text.split()

    def add_unique(tags, tag):
        if tag and tag not in tags:
            tags.append(tag)

    def split_word_by_tags(word, allowed_tags):
        matches = []

        # Prefer longer matches first, so "이에요/예요" logic works cleanly
        sorted_tags = sorted(allowed_tags, key=len, reverse=True)

        # Special handling for 이에요/예요 combined tag
        if "이에요/예요" in allowed_tags:
            for ending in ["이에요", "예요"]:
                if word.endswith(ending) and len(word) > len(ending):
                    stem = word[:-len(ending)]
                    if stem in allowed_tags:
                        return [stem, "이에요/예요"]
                    return [stem, "이에요/예요"]

        # Normal suffix separation
        for tag in sorted_tags:
            if word == tag:
                return [tag]

            if word.endswith(tag) and len(word) > len(tag):
                stem = word[:-len(tag)]
                if stem in allowed_tags:
                    return [stem, tag]

        # Normal prefix separation, useful for things like 책상에
        for tag in sorted_tags:
            if word.startswith(tag) and len(word) > len(tag):
                suffix = word[len(tag):]
                if suffix in allowed_tags:
                    return [tag, suffix]

        return [word] if word in allowed_tags else []

    for unit, questions in data.items():
        allowed_tags = unit_to_allowed_tags.get(unit, [])

        for question_obj in questions:
            question_text = question_obj.get("question", "")
            new_tags = []

            for word in clean_text(question_text):
                split_tags = split_word_by_tags(word, allowed_tags)
                for tag in split_tags:
                    add_unique(new_tags, tag)

            question_obj["tags"] = new_tags

    with open(output_filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

retag_questions("review_questions.json", "new_review_questions.json", "intro_unit_to_tags.json")