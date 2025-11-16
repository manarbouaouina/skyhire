"""
Test script for PII anonymization
Run with: python test_anonymization.py
"""
import sys
import os

# Add api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from api.services.anonymization import get_anonymization_service, check_service_availability

def test_anonymization():
    """Test anonymization with sample CV text containing PII"""
    
    print("=" * 60)
    print("PII Anonymization Test")
    print("=" * 60)
    print()
    
    # Check service availability
    print("1. Checking service availability...")
    is_ready, missing = check_service_availability()
    if not is_ready:
        print(f"   ❌ Service not ready: {missing}")
        print("   Please install Presidio: pip install presidio-analyzer presidio-anonymizer spacy")
        print("   Then download spaCy model: python -m spacy download en_core_web_lg")
        return
    print("   ✅ Service ready")
    print()
    
    # Sample CV text with PII
    sample_cv_text = """
    John Smith
    123 Main Street, New York, NY 10001
    Phone: (555) 123-4567
    Email: john.smith@email.com
    
    PROFESSIONAL SUMMARY
    Experienced software engineer with 5 years of experience in Python development.
    Currently working at Tech Corp in San Francisco, CA.
    
    WORK EXPERIENCE
    Senior Software Engineer | Tech Corp | San Francisco, CA
    January 2020 - Present
    - Developed web applications using Python and React
    - Led team of 5 developers
    - Contact: john.smith@techcorp.com
    
    EDUCATION
    Bachelor of Science in Computer Science
    University of California, Berkeley
    Graduated: May 2018
    
    SKILLS
    Python, JavaScript, React, SQL, Docker, AWS
    
    REFERENCES
    Available upon request. Contact: john.smith@email.com or (555) 123-4567
    """
    
    print("2. Original Text (with PII):")
    print("-" * 60)
    print(sample_cv_text)
    print()
    
    # Anonymize
    print("3. Anonymizing text...")
    anonymization_service = get_anonymization_service()
    result = anonymization_service.anonymize_text(sample_cv_text)
    print()
    
    print("4. Anonymized Text:")
    print("-" * 60)
    print(result["anonymized_text"])
    print()
    
    print("5. Detected PII Entities:")
    print("-" * 60)
    if result["entities_found"]:
        for entity in result["entities_found"]:
            print(f"   - {entity['entity_type']}: '{entity['text']}' (confidence: {entity['score']:.2f})")
    else:
        print("   No PII entities detected")
    print()
    
    print("6. Summary:")
    print("-" * 60)
    print(f"   Entities found: {result['entities_count']}")
    print(f"   Anonymization applied: {result['anonymization_applied']}")
    if result.get("error"):
        print(f"   Error: {result['error']}")
    print()
    
    print("=" * 60)
    print("Test Complete")
    print("=" * 60)

if __name__ == "__main__":
    test_anonymization()

