from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        # Pydantic v2: replace __modify_schema__
        json_schema = handler(core_schema)
        json_schema.update(type="string")
        return json_schema

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    avatar: Optional[str] = None

class UserCreate(UserBase):
    google_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    api_keys: Optional[Dict[str, str]] = None

class User(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    google_id: Optional[str] = None
    api_keys: Optional[Dict[str, str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True  # pydantic v2 replacement for allow_population_by_field_name
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    token: str

# Lesson Plan Models
class LessonPlanStatus(str, Enum):
    DRAFT = "draft"
    OUTLINE = "outline"
    DETAILED = "detailed"
    COMPLETED = "completed"

class LessonPlanBase(BaseModel):
    title: str
    subject: str
    age_group: str
    description: Optional[str] = None

class LessonPlanCreate(LessonPlanBase):
    pass

class LessonPlanUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    age_group: Optional[str] = None
    description: Optional[str] = None
    status: Optional[LessonPlanStatus] = None
    outline: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None

class LessonPlan(LessonPlanBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    status: LessonPlanStatus = LessonPlanStatus.DRAFT
    outline: Optional[List[str]] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True  # pydantic v2 replacement for allow_population_by_field_name
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Message Models
class MessageSender(str, Enum):
    USER = "user"
    AI = "ai"

class MessageBase(BaseModel):
    content: str
    sender: MessageSender
    attachments: Optional[List[str]] = None

class MessageCreate(MessageBase):
    lesson_plan_id: PyObjectId

class Message(MessageBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    lesson_plan_id: PyObjectId
    timestamp: datetime

    class Config:
        populate_by_name = True  # pydantic v2 replacement for allow_population_by_field_name
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# File Models
class FileBase(BaseModel):
    filename: str
    content_type: str
    size: int

class FileUpload(FileBase):
    user_id: PyObjectId
    lesson_plan_id: Optional[PyObjectId] = None

class FileDocument(FileBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    lesson_plan_id: Optional[PyObjectId] = None
    file_path: str
    processed: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True  # pydantic v2 replacement for allow_population_by_field_name
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Vector Embedding Models
class EmbeddingDocument(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    file_id: PyObjectId
    lesson_plan_id: Optional[PyObjectId] = None
    chunk_text: str
    embedding: List[float]
    metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        populate_by_name = True  # pydantic v2 replacement for allow_population_by_field_name
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Chat Models
class ChatRequest(BaseModel):
    message: str
    lesson_plan_id: PyObjectId
    attachments: Optional[List[str]] = None

class ChatResponse(BaseModel):
    message: str
    lesson_plan_updated: bool = False
    status_changed: bool = False
    new_status: Optional[LessonPlanStatus] = None