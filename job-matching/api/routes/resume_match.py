from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import io
import PyPDF2
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from collections import Counter
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import logging
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.services.anonymization import get_anonymization_service, check_service_availability

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize components
lemmatizer = WordNetLemmatizer()
model = SentenceTransformer("all-MiniLM-L6-v2")

# Pydantic models
class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=10, description="Job description text")
    num_keywords: Optional[int] = Field(default=10, ge=1, le=50, description="Number of keywords to extract")

class KeywordAnalysis(BaseModel):
    present_keywords: List[str]
    missing_keywords: List[str]
    match_percentage: float

class MatchResponse(BaseModel):
    match_score: float
    fit_level: str
    message: str
    color: str
    keyword_analysis: KeywordAnalysis
    resume_text: Optional[str] = None
    job_text: Optional[str] = None

class CSVReportResponse(BaseModel):
    csv_data: str
    filename: str

# Helper functions
def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def clean_text(text: str) -> str:
    """Clean and normalize text"""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def remove_stopwords(text: str) -> str:
    """Remove stopwords and lemmatize"""
    stop_words = set(stopwords.words('english'))
    words = word_tokenize(text)
    words = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
    return " ".join(words)

def extract_keywords(text: str, num_keywords: int = 10) -> List[str]:
    """Extract top keywords from text"""
    words = word_tokenize(text)
    words = [w for w in words if len(w) > 2]
    word_freq = Counter(words)
    return [w for w, _ in word_freq.most_common(num_keywords)]

def match_keywords(resume_text: str, job_text: str, num_keywords: int = 10) -> tuple:
    """Match keywords between resume and job description"""
    job_keywords = extract_keywords(job_text, num_keywords)
    resume_keywords = set(word_tokenize(resume_text))
    present = [w for w in job_keywords if w in resume_keywords]
    missing = [w for w in job_keywords if w not in resume_keywords]
    return present, missing

def get_fit_level(score: float) -> tuple:
    """Determine fit level based on score"""
    if score < 40:
        return "Low Fit", "⚠ Low Fit: Consider improving your CV for this job", "#ff4b4b"
    elif score < 70:
        return "Good Fit", "ℹ Good Fit: Your CV aligns fairly well", "#ffa726"
    else:
        return "Excellent Fit", "✅ Excellent Fit: This job suits you very well!", "#0f9d58"

def generate_csv_report(score: float, present: List[str], missing: List[str]) -> str:
    """Generate CSV report"""
    df = pd.DataFrame({
        "Keyword": present + missing,
        "Status": ["Present"] * len(present) + ["Missing"] * len(missing)
    })
    df.loc[-1] = ["Overall Match Score", f"{score:.2f}%"]
    df.index = df.index + 1
    df = df.sort_index()
    return df.to_csv(index=False)

# API Endpoints
@router.get("/")
async def resume_match_info():
    """Resume Match API information"""
    return {
        "title": "Resume Job Match API",
        "description": "API for analyzing resume-job description matches using semantic similarity",
        "endpoints": {
            "POST /analyze": "Analyze resume against job description",
            "POST /analyze/text": "Analyze text resume against job description",
            "POST /download-report": "Generate CSV report"
        }
    }

@router.post("/analyze", response_model=MatchResponse)
async def analyze_resume_match(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
    num_keywords: int = Form(default=10)
):
    """
    Analyze resume against job description
    
    - **resume_file**: PDF file of the resume
    - **job_description**: Text of the job description
    - **num_keywords**: Number of keywords to extract (default: 10)
    
    Returns match score, keyword analysis, and recommendations
    
    Note: PII is automatically anonymized before processing
    """
    
    # Check service availability
    is_ready, missing = check_service_availability()
    if not is_ready:
        logger.warning(f"Anonymization service not fully ready: {missing}")
        # Continue anyway, but log the warning
    
    # Validate file type
    if not resume_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Extract text from PDF
    pdf_bytes = await resume_file.read()
    resume_text = extract_text_from_pdf(pdf_bytes)
    
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Anonymize PII from resume text before processing
    anonymization_service = get_anonymization_service()
    anonymized_result = anonymization_service.anonymize_text(resume_text)
    resume_text_anonymized = anonymized_result["anonymized_text"]
    
    # Log anonymization results
    if anonymized_result.get("anonymization_applied"):
        logger.info(f"Anonymized resume: found {anonymized_result.get('entities_count', 0)} PII entities")
        logger.debug(f"Entities found: {anonymized_result.get('entities_found', [])}")
    
    # Use anonymized text for AI processing
    # Clean texts (use anonymized version)
    resume_clean = remove_stopwords(clean_text(resume_text_anonymized))
    job_clean = remove_stopwords(clean_text(job_description))
    
    # Calculate semantic similarity (using anonymized text)
    resume_emb = model.encode(resume_clean, convert_to_tensor=True)
    job_emb = model.encode(job_clean, convert_to_tensor=True)
    similarity_score = util.cos_sim(resume_emb, job_emb).item() * 100
    
    # Get fit level
    fit_level, message, color = get_fit_level(similarity_score)
    
    # Keyword analysis
    present, missing = match_keywords(resume_clean, job_clean, num_keywords)
    keyword_match_percentage = (len(present) / (len(present) + len(missing))) * 100 if (present or missing) else 0
    
    keyword_analysis = KeywordAnalysis(
        present_keywords=present,
        missing_keywords=missing,
        match_percentage=keyword_match_percentage
    )
    
    # Return anonymized text in response (never return original PII)
    return MatchResponse(
        match_score=similarity_score,
        fit_level=fit_level,
        message=message,
        color=color,
        keyword_analysis=keyword_analysis,
        resume_text=resume_text_anonymized[:500] + "..." if len(resume_text_anonymized) > 500 else resume_text_anonymized,
        job_text=job_description[:500] + "..." if len(job_description) > 500 else job_description
    )

@router.post("/analyze/text", response_model=MatchResponse)
async def analyze_text_match(request: MatchRequest):
    """
    Analyze text resume against job description (for testing without file upload)
    
    - **job_description**: Text of the job description
    - **num_keywords**: Number of keywords to extract (default: 10)
    
    Note: PII is automatically anonymized before processing
    """
    
    # Check service availability
    is_ready, missing = check_service_availability()
    if not is_ready:
        logger.warning(f"Anonymization service not fully ready: {missing}")
    
    # Sample resume text for demonstration
    sample_resume = """
    Experienced software engineer with 5 years of experience in Python development.
    Skilled in machine learning, data analysis, and web development.
    Proficient in React, JavaScript, and SQL databases.
    Strong communication skills and teamwork experience.
    """
    
    # Anonymize sample resume text
    anonymization_service = get_anonymization_service()
    anonymized_result = anonymization_service.anonymize_text(sample_resume)
    sample_resume_anonymized = anonymized_result["anonymized_text"]
    
    # Clean texts (use anonymized version)
    resume_clean = remove_stopwords(clean_text(sample_resume_anonymized))
    job_clean = remove_stopwords(clean_text(request.job_description))
    
    # Calculate semantic similarity
    resume_emb = model.encode(resume_clean, convert_to_tensor=True)
    job_emb = model.encode(job_clean, convert_to_tensor=True)
    similarity_score = util.cos_sim(resume_emb, job_emb).item() * 100
    
    # Get fit level
    fit_level, message, color = get_fit_level(similarity_score)
    
    # Keyword analysis
    present, missing = match_keywords(resume_clean, job_clean, request.num_keywords)
    keyword_match_percentage = (len(present) / (len(present) + len(missing))) * 100 if (present or missing) else 0
    
    keyword_analysis = KeywordAnalysis(
        present_keywords=present,
        missing_keywords=missing,
        match_percentage=keyword_match_percentage
    )
    
    # Return anonymized text (never return original PII)
    return MatchResponse(
        match_score=similarity_score,
        fit_level=fit_level,
        message=message,
        color=color,
        keyword_analysis=keyword_analysis,
        resume_text=sample_resume_anonymized[:500] + "..." if len(sample_resume_anonymized) > 500 else sample_resume_anonymized,
        job_text=request.job_description[:500] + "..." if len(request.job_description) > 500 else request.job_description
    )

@router.post("/download-report", response_model=CSVReportResponse)
async def download_csv_report(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
    num_keywords: int = Form(default=10)
):
    """
    Generate and return CSV report of the analysis
    
    - **resume_file**: PDF file of the resume
    - **job_description**: Text of the job description
    - **num_keywords**: Number of keywords to extract (default: 10)
    """
    
    # Validate file type
    if not resume_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Extract text from PDF
    pdf_bytes = await resume_file.read()
    resume_text = extract_text_from_pdf(pdf_bytes)
    
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Anonymize PII from resume text before processing
    anonymization_service = get_anonymization_service()
    anonymized_result = anonymization_service.anonymize_text(resume_text)
    resume_text_anonymized = anonymized_result["anonymized_text"]
    
    # Clean texts (use anonymized version)
    resume_clean = remove_stopwords(clean_text(resume_text_anonymized))
    job_clean = remove_stopwords(clean_text(job_description))
    
    # Calculate semantic similarity
    resume_emb = model.encode(resume_clean, convert_to_tensor=True)
    job_emb = model.encode(job_clean, convert_to_tensor=True)
    similarity_score = util.cos_sim(resume_emb, job_emb).item() * 100
    
    # Keyword analysis
    present, missing = match_keywords(resume_clean, job_clean, num_keywords)
    
    # Generate CSV
    csv_data = generate_csv_report(similarity_score, present, missing)
    
    return CSVReportResponse(
        csv_data=csv_data,
        filename="resume_job_match_report.csv"
    )
