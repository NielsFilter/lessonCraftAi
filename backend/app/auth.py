from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
import httpx
import json
import base64
from dotenv import load_dotenv

from .database import get_database
from .models import User, UserCreate, Token, GoogleAuthRequest, TokenData
from bson import ObjectId

load_dotenv()

router = APIRouter()
security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_database)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"email": token_data.email})
    if user_doc is None:
        raise credentials_exception
    
    return User(**user_doc)

async def verify_google_jwt(token: str) -> dict:
    """Verify Google JWT token and return user info"""
    try:
        # Verify with Google's tokeninfo endpoint
        if GOOGLE_CLIENT_ID:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
                )
                if response.status_code == 200:
                    user_info = response.json()
                    # Verify the audience (client ID)
                    if user_info.get('aud') == GOOGLE_CLIENT_ID:
                        return {
                            'email': user_info['email'],
                            'name': user_info['name'],
                            'picture': user_info.get('picture'),
                            'id': user_info['sub']
                        }
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token audience"
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Google token"
                    )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google Client ID not configured"
            )
                
    except httpx.RequestError as e:
        print(f"Network error verifying Google token: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify Google token"
        )
    except Exception as e:
        print(f"Error verifying Google token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

@router.post("/google", response_model=Token)
async def google_auth(
    auth_request: GoogleAuthRequest,
    db = Depends(get_database)
):
    """Authenticate user with Google OAuth token"""
    try:
        # Verify Google token and get user info
        user_info = await verify_google_jwt(auth_request.token)
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": user_info["email"]})
        
        if existing_user:
            user = User(**existing_user)
        else:
            # Create new user
            user_data = UserCreate(
                email=user_info["email"],
                name=user_info["name"],
                avatar=user_info.get("picture"),
                google_id=user_info["id"]
            )
            
            user_doc = {
                **user_data.dict(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await db.users.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            user = User(**user_doc)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}