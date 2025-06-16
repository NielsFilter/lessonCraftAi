import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import openai
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import PyPDF2
from PIL import Image
import io
from bson import ObjectId

from .models import LessonPlanStatus, MessageSender

# Initialize AI services
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

class AIAgent:
    def __init__(self, user_api_keys: Dict[str, str]):
        self.openai_key = user_api_keys.get("openai")
        self.gemini_key = user_api_keys.get("gemini")
        self.suno_key = user_api_keys.get("sunoai")
        
        if self.openai_key:
            openai.api_key = self.openai_key
        
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_lesson_outline(self, lesson_plan_data: Dict[str, Any], context_docs: List[str]) -> List[str]:
        """Generate high-level lesson plan outline"""
        context = "\n".join(context_docs) if context_docs else ""
        
        prompt = f"""
        Create a high-level outline for a lesson plan with the following details:
        
        Title: {lesson_plan_data.get('title')}
        Subject: {lesson_plan_data.get('subject')}
        Age Group: {lesson_plan_data.get('age_group')}
        Description: {lesson_plan_data.get('description', '')}
        
        Context from uploaded documents:
        {context}
        
        Please provide a structured outline with 5-8 main sections that would make an effective lesson plan.
        Return only the outline points as a list, one per line, without numbering.
        """
        
        try:
            if self.gemini_key:
                response = await self._generate_with_gemini(prompt)
                outline = [line.strip() for line in response.split('\n') if line.strip()]
                return outline[:8]  # Limit to 8 points
            else:
                return [
                    "Learning Objectives",
                    "Materials and Resources",
                    "Introduction and Warm-up",
                    "Main Teaching Activity",
                    "Practice and Application",
                    "Assessment and Evaluation",
                    "Conclusion and Wrap-up",
                    "Extension Activities"
                ]
        except Exception as e:
            print(f"Error generating outline: {e}")
            return ["Error generating outline. Please try again."]

    async def generate_lesson_details(self, lesson_plan_data: Dict[str, Any], outline: List[str], context_docs: List[str]) -> Dict[str, str]:
        """Generate detailed content for each outline section"""
        context = "\n".join(context_docs) if context_docs else ""
        details = {}
        
        for section in outline:
            prompt = f"""
            Create detailed content for the "{section}" section of a lesson plan with these details:
            
            Title: {lesson_plan_data.get('title')}
            Subject: {lesson_plan_data.get('subject')}
            Age Group: {lesson_plan_data.get('age_group')}
            
            Context from uploaded documents:
            {context}
            
            Provide comprehensive, practical content for this section that a teacher can directly use.
            Include specific activities, timing, and resources where appropriate.
            """
            
            try:
                if self.gemini_key:
                    details[section] = await self._generate_with_gemini(prompt)
                else:
                    details[section] = f"Detailed content for {section} would be generated here using the configured AI model."
            except Exception as e:
                print(f"Error generating details for {section}: {e}")
                details[section] = f"Error generating content for {section}. Please try again."
        
        return details

    async def generate_chat_response(self, message: str, lesson_plan_data: Dict[str, Any], context_docs: List[str]) -> str:
        """Generate AI response for chat messages"""
        context = "\n".join(context_docs) if context_docs else ""
        
        prompt = f"""
        You are an AI assistant helping teachers create lesson plans. 
        
        Current lesson plan context:
        Title: {lesson_plan_data.get('title')}
        Subject: {lesson_plan_data.get('subject')}
        Age Group: {lesson_plan_data.get('age_group')}
        Status: {lesson_plan_data.get('status')}
        
        Context from uploaded documents:
        {context}
        
        Teacher's message: {message}
        
        Provide a helpful, professional response that assists with lesson plan creation.
        Be specific and practical in your suggestions.
        """
        
        try:
            if self.gemini_key:
                return await self._generate_with_gemini(prompt)
            else:
                return "I'd be happy to help you with your lesson plan! Please configure your AI API keys in your profile to enable full AI assistance."
        except Exception as e:
            print(f"Error generating chat response: {e}")
            return "I'm sorry, I encountered an error while processing your request. Please try again."

    async def _generate_with_gemini(self, prompt: str) -> str:
        """Generate response using Gemini model"""
        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API error: {e}")
            raise

    async def generate_song(self, prompt: str) -> Dict[str, Any]:
        """Generate song using Suno AI (placeholder implementation)"""
        # This would integrate with Suno AI API
        return {
            "song_url": "https://example.com/generated-song.mp3",
            "title": "Generated Song",
            "duration": 120
        }

    async def generate_video(self, prompt: str) -> Dict[str, Any]:
        """Generate video using OpenAI Sora (placeholder implementation)"""
        # This would integrate with OpenAI Sora API when available
        return {
            "video_url": "https://example.com/generated-video.mp4",
            "title": "Generated Video",
            "duration": 30
        }

async def process_uploaded_file(
    file_id: ObjectId,
    file_path: str,
    content_type: str,
    lesson_plan_id: Optional[ObjectId],
    db
):
    """Process uploaded file and create embeddings"""
    try:
        # Extract text from file
        text_content = await extract_text_from_file(file_path, content_type)
        
        if not text_content:
            print(f"No text content extracted from file {file_id}")
            return
        
        # Chunk text
        chunks = chunk_text(text_content)
        
        # Generate embeddings
        embeddings_docs = []
        for i, chunk in enumerate(chunks):
            embedding = embedding_model.encode(chunk).tolist()
            
            embedding_doc = {
                "file_id": file_id,
                "lesson_plan_id": lesson_plan_id,
                "chunk_text": chunk,
                "embedding": embedding,
                "metadata": {
                    "chunk_index": i,
                    "file_path": file_path,
                    "content_type": content_type
                },
                "created_at": datetime.utcnow()
            }
            embeddings_docs.append(embedding_doc)
        
        # Save embeddings to database
        if embeddings_docs:
            await db.embeddings.insert_many(embeddings_docs)
        
        # Mark file as processed
        await db.files.update_one(
            {"_id": file_id},
            {"$set": {"processed": True}}
        )
        
        print(f"Successfully processed file {file_id} with {len(embeddings_docs)} chunks")
        
    except Exception as e:
        print(f"Error processing file {file_id}: {e}")
        raise

async def extract_text_from_file(file_path: str, content_type: str) -> str:
    """Extract text content from various file types"""
    try:
        if content_type == "application/pdf":
            return extract_text_from_pdf(file_path)
        elif content_type in ["image/png", "image/jpeg", "image/gif"]:
            return await extract_text_from_image(file_path)
        elif content_type == "text/plain":
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            print(f"Unsupported content type: {content_type}")
            return ""
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return ""

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    text = ""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

async def extract_text_from_image(file_path: str) -> str:
    """Extract text from image using OCR (placeholder implementation)"""
    # In a real implementation, you would use OCR libraries like pytesseract
    # For now, return a placeholder
    return f"[Image content from {file_path} - OCR would extract text here]"

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            for i in range(end, max(start + chunk_size // 2, end - 100), -1):
                if text[i] in '.!?':
                    end = i + 1
                    break
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks

async def get_relevant_context(lesson_plan_id: ObjectId, query: str, db, limit: int = 5) -> List[str]:
    """Get relevant document chunks for a query using vector similarity"""
    try:
        # Generate query embedding
        query_embedding = embedding_model.encode(query).tolist()
        
        # In a real implementation, you would use MongoDB's vector search
        # For now, we'll get all embeddings for the lesson plan and do simple similarity
        cursor = db.embeddings.find({"lesson_plan_id": lesson_plan_id})
        embeddings = await cursor.to_list(length=None)
        
        if not embeddings:
            return []
        
        # Calculate similarities (simplified)
        similarities = []
        for emb_doc in embeddings:
            # Simple dot product similarity (in real app, use cosine similarity)
            similarity = sum(a * b for a, b in zip(query_embedding, emb_doc["embedding"]))
            similarities.append((similarity, emb_doc["chunk_text"]))
        
        # Sort by similarity and return top chunks
        similarities.sort(reverse=True)
        return [chunk for _, chunk in similarities[:limit]]
        
    except Exception as e:
        print(f"Error getting relevant context: {e}")
        return []