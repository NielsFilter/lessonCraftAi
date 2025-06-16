from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
import os
from dotenv import load_dotenv

from .database import init_db
from .auth import router as auth_router
from .lesson_plans import router as lesson_plans_router
from .chat import router as chat_router
from .files import router as files_router
from .users import router as users_router

load_dotenv()

app = FastAPI(
    title="LessonCraft AI API",
    description="AI-powered lesson plan generation API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
@app.on_event("startup")
async def startup_event():
    await init_db()

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(lesson_plans_router, prefix="/api/lesson-plans", tags=["lesson-plans"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(files_router, prefix="/api/files", tags=["files"])

@app.get("/")
async def root():
    return {"message": "LessonCraft AI API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}