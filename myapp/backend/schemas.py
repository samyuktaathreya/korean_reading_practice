from pydantic import BaseModel
from typing import List, Dict, Optional

# A schema for the individual question data
class QuestionBase(BaseModel):
    id: str
    question: str
    answer: str
    tags: List[str]

# The schema for submitting a session
class SessionSubmission(BaseModel):
    list_of_question_data: List[QuestionBase]
    is_correct: List[bool]
    is_unit_test: bool

# The schema for what the API returns to the frontend
class SessionResponse(BaseModel):
    user_id: int
    question_set: List[Dict]
    session_type: str