"""
Data Anonymization Service using Presidio
Removes PII from text before sending to AI microservices
"""
import os
import logging
from typing import Dict, List, Optional, Tuple
from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

logger = logging.getLogger(__name__)

# Initialize Presidio components
try:
    # Try to initialize with spaCy model
    try:
        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()
        PRESIDIO_AVAILABLE = True
        logger.info("Presidio initialized successfully")
    except Exception as spacy_error:
        # If spaCy model not found, try to download it
        logger.warning(f"Presidio initialization failed: {spacy_error}")
        logger.info("Attempting to use default configuration...")
        # Try again with default (may work without spaCy for basic functionality)
        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()
        PRESIDIO_AVAILABLE = True
        logger.info("Presidio initialized with default configuration")
except Exception as e:
    logger.error(f"Failed to initialize Presidio: {e}")
    logger.error("Anonymization will not be available. Install: pip install presidio-analyzer presidio-anonymizer spacy")
    logger.error("Then download model: python -m spacy download en_core_web_lg")
    PRESIDIO_AVAILABLE = False
    analyzer = None
    anonymizer = None


class AnonymizationService:
    """Service for anonymizing PII in text data"""
    
    def __init__(self):
        self.analyzer = analyzer
        self.anonymizer = anonymizer
        self.available = PRESIDIO_AVAILABLE
        
        # Default entities to detect and anonymize
        self.default_entities = [
            "PERSON",           # Names
            "EMAIL_ADDRESS",    # Email addresses
            "PHONE_NUMBER",     # Phone numbers
            "CREDIT_CARD",      # Credit card numbers
            "IBAN_CODE",        # Bank account numbers
            "IP_ADDRESS",       # IP addresses
            "DATE_TIME",        # Dates (can contain PII context)
            "LOCATION",         # Addresses, cities, countries
            "US_SSN",           # Social Security Numbers
            "US_PASSPORT",      # Passport numbers
            "US_DRIVER_LICENSE", # Driver license numbers
        ]
        
        # Custom operators for anonymization
        self.operators = {
            "PERSON": OperatorConfig("replace", {"new_value": "[NAME]"}),
            "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[EMAIL]"}),
            "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "[PHONE]"}),
            "LOCATION": OperatorConfig("replace", {"new_value": "[LOCATION]"}),
            "DATE_TIME": OperatorConfig("replace", {"new_value": "[DATE]"}),
            "CREDIT_CARD": OperatorConfig("replace", {"new_value": "[CREDIT_CARD]"}),
            "IBAN_CODE": OperatorConfig("replace", {"new_value": "[IBAN]"}),
            "IP_ADDRESS": OperatorConfig("replace", {"new_value": "[IP_ADDRESS]"}),
            "US_SSN": OperatorConfig("replace", {"new_value": "[SSN]"}),
            "US_PASSPORT": OperatorConfig("replace", {"new_value": "[PASSPORT]"}),
            "US_DRIVER_LICENSE": OperatorConfig("replace", {"new_value": "[DRIVER_LICENSE]"}),
        }
    
    def check_environment(self) -> Tuple[bool, List[str]]:
        """
        Check if required environment variables and dependencies are available
        Returns: (is_ready, missing_items)
        """
        missing = []
        
        # Check if Presidio is available
        if not self.available:
            missing.append("Presidio library not initialized")
        
        # Check for optional API keys (if using cloud services)
        # Add your API key checks here if needed
        # if not os.getenv("GEMINI_API_KEY"):
        #     missing.append("GEMINI_API_KEY")
        
        return len(missing) == 0, missing
    
    def anonymize_text(
        self, 
        text: str, 
        entities: Optional[List[str]] = None,
        language: str = "en"
    ) -> Dict[str, any]:
        """
        Anonymize PII in text
        
        Args:
            text: Input text containing potential PII
            entities: List of entity types to detect (default: all supported)
            language: Language code (default: "en")
        
        Returns:
            Dictionary with anonymized text and metadata
        """
        if not self.available:
            logger.warning("Presidio not available, returning original text")
            return {
                "anonymized_text": text,
                "original_text": text,
                "entities_found": [],
                "anonymization_applied": False,
                "error": "Presidio not available"
            }
        
        if not text or not text.strip():
            return {
                "anonymized_text": text,
                "original_text": text,
                "entities_found": [],
                "anonymization_applied": False
            }
        
        try:
            # Use default entities if none specified
            entities_to_detect = entities or self.default_entities
            
            # Analyze text for PII
            results: List[RecognizerResult] = self.analyzer.analyze(
                text=text,
                entities=entities_to_detect,
                language=language
            )
            
            # Extract entity information
            entities_found = [
                {
                    "entity_type": result.entity_type,
                    "start": result.start,
                    "end": result.end,
                    "score": result.score,
                    "text": text[result.start:result.end]
                }
                for result in results
            ]
            
            # Anonymize text
            anonymized_result = self.anonymizer.anonymize(
                text=text,
                analyzer_results=results,
                operators=self.operators
            )
            
            anonymized_text = anonymized_result.text
            
            logger.info(f"Anonymized text: found {len(entities_found)} PII entities")
            
            return {
                "anonymized_text": anonymized_text,
                "original_text": text,
                "entities_found": entities_found,
                "anonymization_applied": len(entities_found) > 0,
                "entities_count": len(entities_found)
            }
            
        except Exception as e:
            logger.error(f"Error during anonymization: {e}")
            return {
                "anonymized_text": text,
                "original_text": text,
                "entities_found": [],
                "anonymization_applied": False,
                "error": str(e)
            }
    
    def anonymize_batch(
        self, 
        texts: List[str],
        entities: Optional[List[str]] = None,
        language: str = "en"
    ) -> List[Dict[str, any]]:
        """
        Anonymize multiple texts
        
        Args:
            texts: List of texts to anonymize
            entities: List of entity types to detect
            language: Language code
        
        Returns:
            List of anonymization results
        """
        return [
            self.anonymize_text(text, entities, language)
            for text in texts
        ]


# Global instance
anonymization_service = AnonymizationService()


def get_anonymization_service() -> AnonymizationService:
    """Get the global anonymization service instance"""
    return anonymization_service


def check_service_availability() -> Tuple[bool, List[str]]:
    """
    Check if anonymization service is ready to use
    Returns: (is_ready, missing_items)
    """
    return anonymization_service.check_environment()

