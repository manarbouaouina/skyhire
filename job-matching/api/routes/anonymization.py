"""
Anonymization API endpoints for testing and direct access
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.services.anonymization import get_anonymization_service, check_service_availability

router = APIRouter()
logger = logging.getLogger(__name__)

class AnonymizeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to anonymize")
    entities: Optional[List[str]] = Field(None, description="Specific entity types to detect (optional)")
    language: str = Field(default="en", description="Language code (default: en)")

class AnonymizeResponse(BaseModel):
    anonymized_text: str
    original_text: str
    entities_found: List[Dict[str, Any]]
    anonymization_applied: bool
    entities_count: int
    error: Optional[str] = None

class ServiceStatusResponse(BaseModel):
    available: bool
    missing_items: List[str]
    message: str

@router.get("/status", response_model=ServiceStatusResponse)
async def get_service_status():
    """
    Check anonymization service availability and configuration
    """
    is_ready, missing = check_service_availability()
    
    return ServiceStatusResponse(
        available=is_ready,
        missing_items=missing,
        message="Service ready" if is_ready else f"Service not ready: {', '.join(missing)}"
    )

@router.post("/anonymize", response_model=AnonymizeResponse)
async def anonymize_text(request: AnonymizeRequest):
    """
    Anonymize PII from text
    
    - **text**: Text containing potential PII
    - **entities**: Optional list of entity types to detect
    - **language**: Language code (default: en)
    
    Returns anonymized text and detected entities
    """
    # Check service availability
    is_ready, missing = check_service_availability()
    if not is_ready:
        raise HTTPException(
            status_code=503,
            detail=f"Anonymization service not available: {', '.join(missing)}"
        )
    
    anonymization_service = get_anonymization_service()
    result = anonymization_service.anonymize_text(
        text=request.text,
        entities=request.entities,
        language=request.language
    )
    
    return AnonymizeResponse(**result)

@router.post("/anonymize/batch")
async def anonymize_batch(texts: List[str], entities: Optional[List[str]] = None, language: str = "en"):
    """
    Anonymize multiple texts in batch
    
    - **texts**: List of texts to anonymize
    - **entities**: Optional list of entity types to detect
    - **language**: Language code (default: en)
    """
    # Check service availability
    is_ready, missing = check_service_availability()
    if not is_ready:
        raise HTTPException(
            status_code=503,
            detail=f"Anonymization service not available: {', '.join(missing)}"
        )
    
    anonymization_service = get_anonymization_service()
    results = anonymization_service.anonymize_batch(
        texts=texts,
        entities=entities,
        language=language
    )
    
    return {"results": results}

