# Presidio Anonymization Installation Guide

## Quick Setup

### 1. Install Python Dependencies

```bash
cd job-matching
pip install -r requirements.txt
```

This will install:
- `presidio-analyzer==2.2.33`
- `presidio-anonymizer==2.2.33`
- `spacy==3.7.2`

### 2. Download spaCy Language Model

```bash
# For English (large model - better accuracy)
python -m spacy download en_core_web_lg

# OR for smaller model (faster, less accurate)
python -m spacy download en_core_web_sm
```

### 3. Verify Installation

```bash
python test_anonymization.py
```

You should see:
```
✅ Service ready
```

## Troubleshooting

### Issue: ModuleNotFoundError: No module named 'presidio_analyzer'

**Solution**:
```bash
pip install presidio-analyzer presidio-anonymizer spacy
```

### Issue: Can't find model 'en_core_web_lg'

**Solution**:
```bash
python -m spacy download en_core_web_lg
```

### Issue: OSError: [E050] Can't find model 'en_core_web_lg'

**Solution**:
1. Verify model is installed: `python -m spacy info en_core_web_lg`
2. If not found, download again: `python -m spacy download en_core_web_lg`
3. Check Python environment matches where you installed the model

## Testing

### Test via Python Script

```bash
python test_anonymization.py
```

### Test via API

```bash
# Start the API server
cd job-matching
python -m uvicorn api.main:app --reload

# In another terminal, test anonymization
curl -X POST http://localhost:8000/api/v1/anonymization/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Contact John Smith at john@example.com or call (555) 123-4567"
  }'
```

## Environment Variables (Optional)

No environment variables are required for basic Presidio functionality. If you need to configure:

```env
# Optional: Custom spaCy model
SPACY_MODEL=en_core_web_lg

# Optional: API keys for cloud services (if using)
GEMINI_API_KEY=your_key_here
```

## Next Steps

1. Test with sample CV text
2. Verify PII is detected and anonymized
3. Check that anonymized text is used in AI processing
4. Monitor anonymization logs

