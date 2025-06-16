from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from .database import get_database
from .models import (
    LessonPlan, LessonPlanCreate, LessonPlanUpdate, 
    LessonPlanStatus, User
)
from .auth import get_current_user

router = APIRouter()

@router.post("/", response_model=LessonPlan)
async def create_lesson_plan(
    lesson_plan: LessonPlanCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create a new lesson plan"""
    lesson_plan_doc = {
        **lesson_plan.dict(),
        "user_id": current_user.id,
        "status": LessonPlanStatus.DRAFT,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.lesson_plans.insert_one(lesson_plan_doc)
    lesson_plan_doc["_id"] = result.inserted_id
    
    return LessonPlan(**lesson_plan_doc)

@router.get("/", response_model=List[LessonPlan])
async def get_lesson_plans(
    status: Optional[LessonPlanStatus] = Query(None),
    subject: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get user's lesson plans with optional filtering"""
    query = {"user_id": current_user.id}
    
    if status:
        query["status"] = status
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}
    
    cursor = db.lesson_plans.find(query).sort("created_at", -1).skip(skip).limit(limit)
    lesson_plans = await cursor.to_list(length=limit)
    
    return [LessonPlan(**doc) for doc in lesson_plans]

@router.get("/{lesson_plan_id}", response_model=LessonPlan)
async def get_lesson_plan(
    lesson_plan_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get a specific lesson plan"""
    if not ObjectId.is_valid(lesson_plan_id):
        raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
    
    lesson_plan_doc = await db.lesson_plans.find_one({
        "_id": ObjectId(lesson_plan_id),
        "user_id": current_user.id
    })
    
    if not lesson_plan_doc:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    return LessonPlan(**lesson_plan_doc)

@router.put("/{lesson_plan_id}", response_model=LessonPlan)
async def update_lesson_plan(
    lesson_plan_id: str,
    lesson_plan_update: LessonPlanUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a lesson plan"""
    if not ObjectId.is_valid(lesson_plan_id):
        raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
    
    # Check if lesson plan exists and belongs to user
    existing_plan = await db.lesson_plans.find_one({
        "_id": ObjectId(lesson_plan_id),
        "user_id": current_user.id
    })
    
    if not existing_plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Update lesson plan
    update_data = {k: v for k, v in lesson_plan_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.lesson_plans.update_one(
        {"_id": ObjectId(lesson_plan_id)},
        {"$set": update_data}
    )
    
    # Return updated lesson plan
    updated_doc = await db.lesson_plans.find_one({"_id": ObjectId(lesson_plan_id)})
    return LessonPlan(**updated_doc)

@router.delete("/{lesson_plan_id}")
async def delete_lesson_plan(
    lesson_plan_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a lesson plan"""
    if not ObjectId.is_valid(lesson_plan_id):
        raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
    
    # Check if lesson plan exists and belongs to user
    existing_plan = await db.lesson_plans.find_one({
        "_id": ObjectId(lesson_plan_id),
        "user_id": current_user.id
    })
    
    if not existing_plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Delete lesson plan and related data
    await db.lesson_plans.delete_one({"_id": ObjectId(lesson_plan_id)})
    await db.messages.delete_many({"lesson_plan_id": ObjectId(lesson_plan_id)})
    await db.files.delete_many({"lesson_plan_id": ObjectId(lesson_plan_id)})
    await db.embeddings.delete_many({"lesson_plan_id": ObjectId(lesson_plan_id)})
    
    return {"message": "Lesson plan deleted successfully"}

@router.get("/{lesson_plan_id}/messages")
async def get_lesson_plan_messages(
    lesson_plan_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get messages for a lesson plan"""
    if not ObjectId.is_valid(lesson_plan_id):
        raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
    
    # Verify lesson plan belongs to user
    lesson_plan = await db.lesson_plans.find_one({
        "_id": ObjectId(lesson_plan_id),
        "user_id": current_user.id
    })
    
    if not lesson_plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Get messages
    cursor = db.messages.find({
        "lesson_plan_id": ObjectId(lesson_plan_id)
    }).sort("timestamp", 1)
    
    messages = await cursor.to_list(length=None)
    return [{"id": str(msg["_id"]), **{k: v for k, v in msg.items() if k != "_id"}} for msg in messages]