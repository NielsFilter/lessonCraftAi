from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId

from .database import get_database
from .models import (
    User, ChatRequest, ChatResponse, Message, MessageCreate, 
    MessageSender, LessonPlanStatus
)
from .auth import get_current_user
from .ai_services import AIAgent, get_relevant_context

router = APIRouter()

@router.post("/message", response_model=ChatResponse)
async def send_message(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Send a message and get AI response"""
    
    # Verify lesson plan exists and belongs to user
    lesson_plan = await db.lesson_plans.find_one({
        "_id": chat_request.lesson_plan_id,
        "user_id": current_user.id
    })
    
    if not lesson_plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Get user's API keys
    user_doc = await db.users.find_one({"_id": current_user.id})
    api_keys = user_doc.get("api_keys", {})
    
    # Check if required API keys are configured
    if not api_keys.get("gemini"):
        raise HTTPException(
            status_code=400, 
            detail="Please configure your AI API keys in your profile before using the chat feature"
        )
    
    # Save user message
    user_message = {
        "lesson_plan_id": chat_request.lesson_plan_id,
        "content": chat_request.message,
        "sender": MessageSender.USER,
        "attachments": chat_request.attachments,
        "timestamp": datetime.utcnow()
    }
    
    user_msg_result = await db.messages.insert_one(user_message)
    
    # Get relevant context from uploaded documents
    context_docs = await get_relevant_context(
        chat_request.lesson_plan_id, 
        chat_request.message, 
        db
    )
    
    # Initialize AI agent
    ai_agent = AIAgent(api_keys)
    
    # Determine response based on lesson plan status and message content
    lesson_plan_updated = False
    status_changed = False
    new_status = None
    
    try:
        # Check if user is requesting outline generation
        if (lesson_plan["status"] == LessonPlanStatus.DRAFT and 
            any(keyword in chat_request.message.lower() for keyword in 
                ["outline", "structure", "plan", "create", "generate", "start"])):
            
            # Generate outline
            outline = await ai_agent.generate_lesson_outline(lesson_plan, context_docs)
            
            # Update lesson plan with outline
            await db.lesson_plans.update_one(
                {"_id": chat_request.lesson_plan_id},
                {"$set": {
                    "outline": outline,
                    "status": LessonPlanStatus.OUTLINE,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            lesson_plan_updated = True
            status_changed = True
            new_status = LessonPlanStatus.OUTLINE
            
            ai_response = f"I've created a comprehensive outline for your lesson plan:\n\n"
            for i, point in enumerate(outline, 1):
                ai_response += f"{i}. {point}\n"
            ai_response += "\nWould you like me to generate detailed content for each section?"
            
        # Check if user is requesting detailed content generation
        elif (lesson_plan["status"] == LessonPlanStatus.OUTLINE and 
              any(keyword in chat_request.message.lower() for keyword in 
                  ["details", "detailed", "content", "expand", "elaborate"])):
            
            outline = lesson_plan.get("outline", [])
            if outline:
                # Generate detailed content
                details = await ai_agent.generate_lesson_details(lesson_plan, outline, context_docs)
                
                # Update lesson plan with details
                await db.lesson_plans.update_one(
                    {"_id": chat_request.lesson_plan_id},
                    {"$set": {
                        "details": details,
                        "status": LessonPlanStatus.DETAILED,
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                lesson_plan_updated = True
                status_changed = True
                new_status = LessonPlanStatus.DETAILED
                
                ai_response = "I've generated detailed content for each section of your lesson plan! You can now review and modify any section as needed. The lesson plan is ready for use in your classroom."
            else:
                ai_response = "I need to create an outline first before generating detailed content. Would you like me to create an outline for your lesson plan?"
        
        else:
            # Generate general chat response
            ai_response = await ai_agent.generate_chat_response(
                chat_request.message, 
                lesson_plan, 
                context_docs
            )
    
    except Exception as e:
        print(f"Error generating AI response: {e}")
        ai_response = "I'm sorry, I encountered an error while processing your request. Please try again or check your API key configuration."
    
    # Save AI response
    ai_message = {
        "lesson_plan_id": chat_request.lesson_plan_id,
        "content": ai_response,
        "sender": MessageSender.AI,
        "timestamp": datetime.utcnow()
    }
    
    await db.messages.insert_one(ai_message)
    
    return ChatResponse(
        message=ai_response,
        lesson_plan_updated=lesson_plan_updated,
        status_changed=status_changed,
        new_status=new_status
    )

@router.get("/{lesson_plan_id}/messages")
async def get_chat_messages(
    lesson_plan_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all messages for a lesson plan"""
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
    
    return [
        {
            "id": str(msg["_id"]),
            "content": msg["content"],
            "sender": msg["sender"],
            "attachments": msg.get("attachments"),
            "timestamp": msg["timestamp"]
        }
        for msg in messages
    ]

@router.delete("/{lesson_plan_id}/messages")
async def clear_chat_messages(
    lesson_plan_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Clear all messages for a lesson plan"""
    if not ObjectId.is_valid(lesson_plan_id):
        raise HTTPException(status_code=400, detail="Invalid lesson plan ID")
    
    # Verify lesson plan belongs to user
    lesson_plan = await db.lesson_plans.find_one({
        "_id": ObjectId(lesson_plan_id),
        "user_id": current_user.id
    })
    
    if not lesson_plan:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    
    # Delete messages
    result = await db.messages.delete_many({
        "lesson_plan_id": ObjectId(lesson_plan_id)
    })
    
    return {"message": f"Deleted {result.deleted_count} messages"}