"""
Point d'entrée principal de l'API FastAPI pour le Career Coach
"""
import logging
import time
from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .config import settings
from .routes import api_router
from .routes import recommendations, analysis, resume_match

# Try to import anonymization service
try:
    from .routes import anonymization
    from .services.anonymization import check_service_availability
    ANONYMIZATION_AVAILABLE = True
except ImportError as e:
    anonymization = None
    def check_service_availability():
        return False, ["Service not initialized"]
    ANONYMIZATION_AVAILABLE = False

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création de l'application FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API pour le chatbot de conseil en carrière aéronautique",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Middleware pour ajouter le temps de traitement et gérer les erreurs globales"""
    try:
        start_time = time.time()
        response = await call_next(request)
        
        # Ajouter le temps de traitement dans le header
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        logger.info(f"Request {request.method} {request.url.path} completed in {process_time:.3f}s")
        return response
    except Exception as e:
        logger.exception(f"Erreur non gérée dans le middleware pour {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Une erreur inattendue est survenue: {str(e)}"}
        )

# Configuration CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Erreur non gérée: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Une erreur interne est survenue"},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Erreur de validation: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )

# Route de santé
@app.get("/health")
async def health_check():
    """Endpoint de vérification de l'état de l'API"""
    health_status = {
        "status": "healthy",
        "version": settings.VERSION,
        "project": settings.PROJECT_NAME,
        "services": {}
    }
    
    # Check anonymization service status if available
    try:
        anonymization_ready, anonymization_missing = check_service_availability()
        health_status["services"]["anonymization"] = {
            "available": anonymization_ready,
            "missing": anonymization_missing if not anonymization_ready else []
        }
    except Exception as e:
        health_status["services"]["anonymization"] = {
            "available": False,
            "error": str(e)
        }
    
    return health_status

@app.get("/")
async def root():
    return {
        "message": f"Bienvenue sur l'API {settings.PROJECT_NAME} - Version {settings.VERSION}",
        "documentation": "/docs",
        "health_check": "/health"
    }

# Inclure les routeurs
app.include_router(api_router, prefix=settings.API_V1_STR)
# Les routeurs sont déjà préfixés dans leur propre module
app.include_router(recommendations.router, prefix=settings.API_V1_STR, tags=["recommendations"])
app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=["analysis"])
app.include_router(resume_match.router, prefix="/api/v1/resume-match", tags=["resume-match"])

# Include anonymization router if available
if ANONYMIZATION_AVAILABLE and anonymization:
    app.include_router(anonymization.router, prefix="/api/v1/anonymization", tags=["anonymization"])
    # Check anonymization service on startup
    try:
        anonymization_ready, anonymization_missing = check_service_availability()
        if anonymization_ready:
            logger.info("✅ Anonymization service ready")
        else:
            logger.warning(f"⚠️ Anonymization service not fully ready: {anonymization_missing}")
    except Exception as e:
        logger.warning(f"⚠️ Anonymization service check failed: {e}")
else:
    logger.warning("⚠️ Anonymization service not available (import failed)")

logger.info(f"✅ API {settings.PROJECT_NAME} initialisée avec succès")

if __name__ == "__main__":
    import uvicorn
    logger.info("Démarrage du serveur avec uvicorn...")
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )