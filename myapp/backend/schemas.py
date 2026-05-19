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

class GridItem(BaseModel):
    tag: str
    strength: float
    status: str  # "stable", "cooling", "weak"

class MilestoneSummary(BaseModel):
    current_step: str  # "intro_rounds", "stabilize_tags", "unit_test_ready"
    status_message: str
    intro_rounds_completed: int
    total_tags_in_unit: int
    stable_tags_in_unit: int

class ProgressResponse(BaseModel):
    user_id: int
    current_unit: int
    milestone_summary: MilestoneSummary
    knowledge_grid: List[GridItem]

    class Config:
        from_attributes = True