import os
import asyncio
from typing import List, Dict, Any, Optional, TypedDict, Annotated
from datetime import datetime
import openai
import google.generativeai as genai
import PyPDF2
from PIL import Image
import io
from bson import ObjectId
import numpy as np

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate

from .models import LessonPlanStatus, MessageSender

# Define the state for our LangGraph workflow
class LessonPlanState(TypedDict):
    messages: List[Any]
    lesson_plan_data: Dict[str, Any]
    context_docs: List[str]
    current_step: str
    outline: Optional[List[str]]
    details: Optional[Dict[str, str]]
    user_request: str
    response: str

class EmbeddingService:
    """Service for generating embeddings using OpenAI's text-embedding-3-small model"""
    
    def __init__(self, openai_api_key: str):
        self.client = openai.OpenAI(api_key=openai_api_key)
        self.model = "text-embedding-3-small"
        self.dimension = 1536  # text-embedding-3-small produces 1536-dimensional embeddings
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            response = await asyncio.to_thread(
                self.client.embeddings.create,
                model=self.model,
                input=text,
                encoding_format="float"
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * self.dimension
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts in batch"""
        try:
            response = await asyncio.to_thread(
                self.client.embeddings.create,
                model=self.model,
                input=texts,
                encoding_format="float"
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            # Return zero vectors as fallback
            return [[0.0] * self.dimension for _ in texts]

class AIAgent:
    def __init__(self, user_api_keys: Dict[str, str]):
        self.openai_key = user_api_keys.get("openai")
        self.gemini_key = user_api_keys.get("gemini")
        self.suno_key = user_api_keys.get("sunoai")
        
        # Initialize OpenAI client and embedding service
        if self.openai_key:
            openai.api_key = self.openai_key
            self.embedding_service = EmbeddingService(self.openai_key)
        else:
            self.embedding_service = None
        
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            # Initialize LangChain Gemini model for LangGraph
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=self.gemini_key,
                temperature=0.7
            )
        
        # Build the LangGraph workflow
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow for lesson plan generation"""
        
        # Define tools
        @tool
        def analyze_request(user_input: str, lesson_status: str) -> str:
            """Analyze user request to determine what action to take"""
            user_input_lower = user_input.lower()
            
            if lesson_status == "draft" and any(keyword in user_input_lower for keyword in 
                ["outline", "structure", "plan", "create", "generate", "start"]):
                return "generate_outline"
            elif lesson_status == "outline" and any(keyword in user_input_lower for keyword in 
                ["details", "detailed", "content", "expand", "elaborate"]):
                return "generate_details"
            else:
                return "general_chat"
        
        # Define workflow nodes
        def route_request(state: LessonPlanState) -> LessonPlanState:
            """Route the user request to appropriate handler"""
            lesson_status = state["lesson_plan_data"].get("status", "draft")
            action = analyze_request.invoke({
                "user_input": state["user_request"],
                "lesson_status": lesson_status
            })
            
            state["current_step"] = action
            return state
        
        def generate_outline_node(state: LessonPlanState) -> LessonPlanState:
            """Generate lesson plan outline"""
            lesson_data = state["lesson_plan_data"]
            context = "\n".join(state["context_docs"]) if state["context_docs"] else ""
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert educational AI assistant. Create a high-level outline for a lesson plan.
                Return exactly 5-8 main sections as a numbered list, one per line.
                Focus on practical, actionable sections that teachers can use directly."""),
                ("human", """Create an outline for this lesson plan:
                
                Title: {title}
                Subject: {subject}
                Age Group: {age_group}
                Description: {description}
                
                Context from uploaded documents:
                {context}
                
                Provide a structured outline with 5-8 main sections.""")
            ])
            
            try:
                if self.gemini_key:
                    chain = prompt | self.llm
                    response = chain.invoke({
                        "title": lesson_data.get('title', ''),
                        "subject": lesson_data.get('subject', ''),
                        "age_group": lesson_data.get('age_group', ''),
                        "description": lesson_data.get('description', ''),
                        "context": context
                    })
                    
                    # Parse outline from response
                    outline_text = response.content
                    outline = []
                    for line in outline_text.split('\n'):
                        line = line.strip()
                        if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                            # Remove numbering and clean up
                            clean_line = line.split('.', 1)[-1].strip() if '.' in line else line.strip('- •').strip()
                            if clean_line:
                                outline.append(clean_line)
                    
                    state["outline"] = outline[:8]  # Limit to 8 points
                    
                    response_text = f"I've created a comprehensive outline for your lesson plan:\n\n"
                    for i, point in enumerate(outline[:8], 1):
                        response_text += f"{i}. {point}\n"
                    response_text += "\nWould you like me to generate detailed content for each section?"
                    
                    state["response"] = response_text
                else:
                    default_outline = [
                        "Learning Objectives",
                        "Materials and Resources", 
                        "Introduction and Warm-up",
                        "Main Teaching Activity",
                        "Practice and Application",
                        "Assessment and Evaluation",
                        "Conclusion and Wrap-up",
                        "Extension Activities"
                    ]
                    state["outline"] = default_outline
                    state["response"] = "I've created a standard lesson plan outline. Please configure your API keys for AI-generated content."
                    
            except Exception as e:
                print(f"Error generating outline: {e}")
                state["response"] = "Error generating outline. Please try again."
                
            return state
        
        def generate_details_node(state: LessonPlanState) -> LessonPlanState:
            """Generate detailed content for each outline section"""
            lesson_data = state["lesson_plan_data"]
            outline = state.get("outline", [])
            context = "\n".join(state["context_docs"]) if state["context_docs"] else ""
            details = {}
            
            if not outline:
                state["response"] = "I need to create an outline first before generating detailed content."
                return state
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert educational AI assistant. Create detailed, practical content for lesson plan sections.
                Provide comprehensive content that teachers can use directly in their classrooms.
                Include specific activities, timing, resources, and implementation details."""),
                ("human", """Create detailed content for the "{section}" section of this lesson plan:
                
                Title: {title}
                Subject: {subject}
                Age Group: {age_group}
                
                Context from uploaded documents:
                {context}
                
                Provide comprehensive, practical content for this section.""")
            ])
            
            try:
                if self.gemini_key:
                    chain = prompt | self.llm
                    
                    for section in outline:
                        response = chain.invoke({
                            "section": section,
                            "title": lesson_data.get('title', ''),
                            "subject": lesson_data.get('subject', ''),
                            "age_group": lesson_data.get('age_group', ''),
                            "context": context
                        })
                        details[section] = response.content
                else:
                    for section in outline:
                        details[section] = f"Detailed content for {section} would be generated here using the configured AI model."
                        
                state["details"] = details
                state["response"] = "I've generated detailed content for each section of your lesson plan! You can now review and modify any section as needed. The lesson plan is ready for use in your classroom."
                
            except Exception as e:
                print(f"Error generating details: {e}")
                state["response"] = "Error generating detailed content. Please try again."
                
            return state
        
        def general_chat_node(state: LessonPlanState) -> LessonPlanState:
            """Handle general chat about the lesson plan"""
            lesson_data = state["lesson_plan_data"]
            context = "\n".join(state["context_docs"]) if state["context_docs"] else ""
            user_message = state["user_request"]
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert educational AI assistant helping teachers create lesson plans.
                Provide helpful, professional responses that assist with lesson plan creation.
                Be specific and practical in your suggestions."""),
                ("human", """Current lesson plan context:
                Title: {title}
                Subject: {subject}
                Age Group: {age_group}
                Status: {status}
                
                Context from uploaded documents:
                {context}
                
                Teacher's message: {message}
                
                Provide a helpful response.""")
            ])
            
            try:
                if self.gemini_key:
                    chain = prompt | self.llm
                    response = chain.invoke({
                        "title": lesson_data.get('title', ''),
                        "subject": lesson_data.get('subject', ''),
                        "age_group": lesson_data.get('age_group', ''),
                        "status": lesson_data.get('status', ''),
                        "context": context,
                        "message": user_message
                    })
                    state["response"] = response.content
                else:
                    state["response"] = "I'd be happy to help you with your lesson plan! Please configure your AI API keys in your profile to enable full AI assistance."
                    
            except Exception as e:
                print(f"Error generating chat response: {e}")
                state["response"] = "I'm sorry, I encountered an error while processing your request. Please try again."
                
            return state
        
        # Build the graph
        workflow = StateGraph(LessonPlanState)
        
        # Add nodes
        workflow.add_node("route_request", route_request)
        workflow.add_node("generate_outline", generate_outline_node)
        workflow.add_node("generate_details", generate_details_node)
        workflow.add_node("general_chat", general_chat_node)
        
        # Add edges
        workflow.set_entry_point("route_request")
        
        # Conditional routing based on current_step
        def route_to_handler(state: LessonPlanState) -> str:
            step = state.get("current_step", "general_chat")
            if step == "generate_outline":
                return "generate_outline"
            elif step == "generate_details":
                return "generate_details"
            else:
                return "general_chat"
        
        workflow.add_conditional_edges(
            "route_request",
            route_to_handler,
            {
                "generate_outline": "generate_outline",
                "generate_details": "generate_details", 
                "general_chat": "general_chat"
            }
        )
        
        # All nodes end the workflow
        workflow.add_edge("generate_outline", END)
        workflow.add_edge("generate_details", END)
        workflow.add_edge("general_chat", END)
        
        return workflow.compile()

    async def generate_lesson_outline(self, lesson_plan_data: Dict[str, Any], context_docs: List[str]) -> List[str]:
        """Generate high-level lesson plan outline using LangGraph"""
        initial_state = LessonPlanState(
            messages=[],
            lesson_plan_data=lesson_plan_data,
            context_docs=context_docs,
            current_step="generate_outline",
            outline=None,
            details=None,
            user_request="create outline",
            response=""
        )
        
        try:
            result = await asyncio.to_thread(self.workflow.invoke, initial_state)
            return result.get("outline", [])
        except Exception as e:
            print(f"Error in LangGraph outline generation: {e}")
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

    async def generate_lesson_details(self, lesson_plan_data: Dict[str, Any], outline: List[str], context_docs: List[str]) -> Dict[str, str]:
        """Generate detailed content for each outline section using LangGraph"""
        initial_state = LessonPlanState(
            messages=[],
            lesson_plan_data=lesson_plan_data,
            context_docs=context_docs,
            current_step="generate_details",
            outline=outline,
            details=None,
            user_request="generate details",
            response=""
        )
        
        try:
            result = await asyncio.to_thread(self.workflow.invoke, initial_state)
            return result.get("details", {})
        except Exception as e:
            print(f"Error in LangGraph details generation: {e}")
            return {section: f"Error generating content for {section}. Please try again." for section in outline}

    async def generate_chat_response(self, message: str, lesson_plan_data: Dict[str, Any], context_docs: List[str]) -> str:
        """Generate AI response for chat messages using LangGraph"""
        initial_state = LessonPlanState(
            messages=[],
            lesson_plan_data=lesson_plan_data,
            context_docs=context_docs,
            current_step="",
            outline=lesson_plan_data.get("outline"),
            details=lesson_plan_data.get("details"),
            user_request=message,
            response=""
        )
        
        try:
            result = await asyncio.to_thread(self.workflow.invoke, initial_state)
            return result.get("response", "I'm sorry, I couldn't process your request.")
        except Exception as e:
            print(f"Error in LangGraph chat response: {e}")
            return "I'm sorry, I encountered an error while processing your request. Please try again."

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
    db,
    openai_api_key: Optional[str] = None
):
    """Process uploaded file and create embeddings using OpenAI"""
    try:
        # Extract text from file
        text_content = await extract_text_from_file(file_path, content_type)
        
        if not text_content:
            print(f"No text content extracted from file {file_id}")
            return
        
        # Chunk text
        chunks = chunk_text(text_content)
        
        # Generate embeddings using OpenAI
        if openai_api_key:
            embedding_service = EmbeddingService(openai_api_key)
            embeddings = await embedding_service.generate_embeddings_batch(chunks)
        else:
            print("No OpenAI API key provided, skipping embedding generation")
            return
        
        # Create embedding documents
        embeddings_docs = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            embedding_doc = {
                "file_id": file_id,
                "lesson_plan_id": lesson_plan_id,
                "chunk_text": chunk,
                "embedding": embedding,
                "metadata": {
                    "chunk_index": i,
                    "file_path": file_path,
                    "content_type": content_type,
                    "embedding_model": "text-embedding-3-small",
                    "embedding_dimension": len(embedding)
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
        
        print(f"Successfully processed file {file_id} with {len(embeddings_docs)} chunks using OpenAI embeddings")
        
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

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    try:
        a_np = np.array(a)
        b_np = np.array(b)
        
        dot_product = np.dot(a_np, b_np)
        norm_a = np.linalg.norm(a_np)
        norm_b = np.linalg.norm(b_np)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return dot_product / (norm_a * norm_b)
    except Exception as e:
        print(f"Error calculating cosine similarity: {e}")
        return 0.0

async def get_relevant_context(
    lesson_plan_id: ObjectId, 
    query: str, 
    db, 
    openai_api_key: Optional[str] = None,
    limit: int = 5
) -> List[str]:
    """Get relevant document chunks for a query using vector similarity"""
    try:
        if not openai_api_key:
            print("No OpenAI API key provided for context retrieval")
            return []
        
        # Generate query embedding
        embedding_service = EmbeddingService(openai_api_key)
        query_embedding = await embedding_service.generate_embedding(query)
        
        # Get all embeddings for the lesson plan
        cursor = db.embeddings.find({"lesson_plan_id": lesson_plan_id})
        embeddings = await cursor.to_list(length=None)
        
        if not embeddings:
            return []
        
        # Calculate similarities using cosine similarity
        similarities = []
        for emb_doc in embeddings:
            similarity = cosine_similarity(query_embedding, emb_doc["embedding"])
            similarities.append((similarity, emb_doc["chunk_text"]))
        
        # Sort by similarity and return top chunks
        similarities.sort(reverse=True)
        return [chunk for _, chunk in similarities[:limit]]
        
    except Exception as e:
        print(f"Error getting relevant context: {e}")
        return []