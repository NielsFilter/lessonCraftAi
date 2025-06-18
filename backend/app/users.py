from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from .database import get_database
from .models import User, UserUpdate
from .auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.get("/profile", response_model=User)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get user profile information"""
    return current_user.model_dump(by_alias=True)

@router.put("/profile", response_model=User)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update user profile information"""
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": update_data}
    )
    
    # Return updated user
    updated_user_doc = await db.users.find_one({"_id": current_user.id})
    return User(**updated_user_doc).model_dump(by_alias=True)

@router.put("/api-keys")
async def update_api_keys(
    api_keys: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update user API keys"""
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {
            "api_keys": api_keys,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "API keys updated successfully"}

@router.get("/api-keys")
async def get_api_keys(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get user API keys (masked for security)"""
    user_doc = await db.users.find_one({"_id": current_user.id})
    api_keys = user_doc.get("api_keys", {})
    
    # Mask API keys for security
    masked_keys = {}
    for key, value in api_keys.items():
        if value:
            masked_keys[key] = f"{value[:8]}{'*' * (len(value) - 8)}"
        else:
            masked_keys[key] = ""
    
    return {"api_keys": masked_keys}

@router.get("/api-keys/configured")
async def check_api_keys_configured(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Check if all required API keys are configured"""
    user_doc = await db.users.find_one({"_id": current_user.id})
    api_keys = user_doc.get("api_keys", {})
    
    required_keys = ["openai", "gemini", "sunoai", "mongodb"]
    configured = all(api_keys.get(key) for key in required_keys)
    
    return {
        "configured": configured,
        "missing_keys": [key for key in required_keys if not api_keys.get(key)]
    }