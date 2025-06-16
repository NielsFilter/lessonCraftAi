from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
import os
import shutil
from datetime import datetime
from bson import ObjectId
import uuid

from .database import get_database
from .models import User, FileDocument
from .auth import get_current_user
from .ai_services import process_uploaded_file

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
}

def is_allowed_file(filename: str, content_type: str) -> bool:
    """Check if file type is allowed"""
    extension = filename.lower().split('.')[-1] if '.' in filename else ''
    return extension in ALLOWED_EXTENSIONS and content_type in ALLOWED_EXTENSIONS.values()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    lesson_plan_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Upload a file and process it for vector storage"""
    
    # Validate file type
    if not is_allowed_file(file.filename, file.content_type):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        )
    
    # Validate lesson plan if provided
    lesson_plan_obj_id = None
    if lesson_plan_id:
        if not ObjectId.is_valid(lesson_plan_id):
            raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
        
        lesson_plan_obj_id = ObjectId(lesson_plan_id)
        lesson_plan = await db.lesson_plans.find_one({
            "_id": lesson_plan_obj_id,
            "user_id": current_user.id
        })
        
        if not lesson_plan:
            raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create file document
    file_doc = {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": os.path.getsize(file_path),
        "user_id": current_user.id,
        "lesson_plan_id": lesson_plan_obj_id,
        "file_path": file_path,
        "processed": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.files.insert_one(file_doc)
    file_doc["_id"] = result.inserted_id
    
    # Get user's OpenAI API key for embedding generation
    user_doc = await db.users.find_one({"_id": current_user.id})
    openai_api_key = user_doc.get("api_keys", {}).get("openai")
    
    # Process file asynchronously (in a real app, you'd use a task queue)
    try:
        await process_uploaded_file(
            file_id=result.inserted_id,
            file_path=file_path,
            content_type=file.content_type,
            lesson_plan_id=lesson_plan_obj_id,
            db=db,
            openai_api_key=openai_api_key
        )
    except Exception as e:
        print(f"Error processing file: {e}")
        # File is saved but not processed - can be retried later
    
    return {
        "file_id": str(result.inserted_id),
        "filename": file.filename,
        "message": "File uploaded successfully"
    }

@router.get("/")
async def get_user_files(
    lesson_plan_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get user's uploaded files"""
    query = {"user_id": current_user.id}
    
    if lesson_plan_id:
        if not ObjectId.is_valid(lesson_plan_id):
            raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
        query["lesson_plan_id"] = ObjectId(lesson_plan_id)
    
    cursor = db.files.find(query).sort("created_at", -1)
    files = await cursor.to_list(length=None)
    
    return [
        {
            "id": str(file_doc["_id"]),
            "filename": file_doc["filename"],
            "content_type": file_doc["content_type"],
            "size": file_doc["size"],
            "processed": file_doc["processed"],
            "created_at": file_doc["created_at"]
        }
        for file_doc in files
    ]

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a file and its embeddings"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    # Find file
    file_doc = await db.files.find_one({
        "_id": ObjectId(file_id),
        "user_id": current_user.id
    })
    
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    try:
        if os.path.exists(file_doc["file_path"]):
            os.remove(file_doc["file_path"])
    except Exception as e:
        print(f"Error deleting physical file: {e}")
    
    # Delete from database
    await db.files.delete_one({"_id": ObjectId(file_id)})
    await db.embeddings.delete_many({"file_id": ObjectId(file_id)})
    
    return {"message": "File deleted successfully"}