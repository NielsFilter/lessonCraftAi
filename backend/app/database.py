import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

load_dotenv()

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database():
    return db.database

async def init_db():
    """Initialize database connection"""
    mongodb_url = os.getenv("MONGODB_URL")
    if not mongodb_url:
        raise ValueError("MONGODB_URL environment variable is required")
    
    db.client = AsyncIOMotorClient(
        mongodb_url,
        server_api=ServerApi('1')
    )
    
    # Test connection
    try:
        await db.client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise
    
    db.database = db.client.lessoncraft
    
    # Create indexes
    await create_indexes()

async def create_indexes():
    """Create database indexes for better performance"""
    # Users collection indexes
    await db.database.users.create_index("email", unique=True)
    await db.database.users.create_index("google_id", unique=True, sparse=True)
    
    # Lesson plans collection indexes
    await db.database.lesson_plans.create_index([("user_id", 1), ("created_at", -1)])
    await db.database.lesson_plans.create_index("status")
    
    # Messages collection indexes
    await db.database.messages.create_index([("lesson_plan_id", 1), ("timestamp", 1)])
    
    # Files collection indexes
    await db.database.files.create_index([("user_id", 1), ("lesson_plan_id", 1)])
    
    # Vector embeddings collection indexes
    await db.database.embeddings.create_index([("file_id", 1)])
    await db.database.embeddings.create_index([("lesson_plan_id", 1)])

async def close_db():
    """Close database connection"""
    if db.client:
        db.client.close()