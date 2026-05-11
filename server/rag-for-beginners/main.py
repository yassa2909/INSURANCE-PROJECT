#!/usr/bin/env python3
"""
FastAPI wrapper for RAG system.
Exposes the RAG chatbot as HTTP endpoints.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import Field
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import logging
import sys
from pathlib import Path

# Add parent directory to path to import RAG modules
sys.path.insert(0, str(Path(__file__).parent))

try:
    from rag_answer_simple import get_answer
    from rag_answer_simple import get_answer_details
except ImportError:
    print("Warning: Could not import get_answer from rag_answer_simple")
    get_answer = None
    get_answer_details = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG Chatbot API",
    description="Insurance RAG API for policy questions",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str] = Field(default_factory=list)
    llm_comparison: Dict[str, Any] = Field(default_factory=dict)

class ChatRequest(BaseModel):
    question: str
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    success: bool
    question: str
    answer: str
    user_id: Optional[str] = None
    sources: List[str] = Field(default_factory=list)
    llm_comparison: Dict[str, Any] = Field(default_factory=dict)

# Health check endpoint
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "RAG API",
        "rag_available": get_answer is not None
    }

# Primary endpoint for frontend - returns simple answer
@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Query endpoint for insurance chatbot.
    Accepts a question and returns the RAG-retrieved answer.
    
    Args:
        request: QueryRequest with question
    
    Returns:
        QueryResponse with answer from knowledge base
    """
    try:
        question = request.question.strip()
        
        if not question:
            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )
        
        if not get_answer:
            raise HTTPException(
                status_code=503,
                detail="RAG system not initialized"
            )
        
        logger.info(f"Processing query: {question}")
        
        # Get answer from RAG system
        if get_answer_details:
            details = get_answer_details(question)
            answer = details.get("answer", get_answer(question))
            sources = details.get("sources", []) or []
            llm_comparison = details.get("llm_comparison", {}) or {}
        else:
            answer = get_answer(question)
            sources = []
            llm_comparison = {}
        
        return QueryResponse(answer=answer, sources=sources, llm_comparison=llm_comparison)
        
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Query error: {err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process your question"
        )

# Legacy endpoint for backend compatibility
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint that accepts a user question and returns RAG answer.
    Routes questions to appropriate insurance category handlers.
    
    Args:
        request: ChatRequest with question and optional user_id
    
    Returns:
        ChatResponse with answer
    """
    try:
        question = request.question.strip()
        user_id = request.user_id
        
        if not question:
            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )
        
        if not get_answer:
            raise HTTPException(
                status_code=503,
                detail="RAG system not initialized"
            )
        
        logger.info(f"Processing question from user {user_id}: {question}")
        
        # Detect insurance category
        q_lower = question.lower()
        if any(k in q_lower for k in ["health", "medical", "hospitalization", "doctor", "hospital"]):
            category = "Health Insurance"
        elif any(k in q_lower for k in ["motor", "vehicle", "car", "bike", "driving", "accident"]):
            category = "Motor Insurance"
        elif any(k in q_lower for k in ["life", "term plan", "maturity", "nominee", "death"]):
            category = "Life Insurance"
        else:
            category = None
        
        # Call RAG function
        if get_answer_details:
            details = get_answer_details(question)
            answer = details.get("answer", get_answer(question))
            sources = details.get("sources", []) or []
            llm_comparison = details.get("llm_comparison", {}) or {}
        else:
            answer = get_answer(question)
            sources = []
            llm_comparison = {}
        
        # Log category detection
        if category:
            logger.info(f"Question categorized as: {category}")
        
        return ChatResponse(
            success=True,
            question=question,
            answer=answer,
            user_id=user_id
            ,sources=sources,
            llm_comparison=llm_comparison,
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Chat error: {err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process your question"
        )

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Allow port configuration via environment variable, default to 5001 (Express expects this)
    port = int(os.getenv("RAG_PORT", 5001))
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
