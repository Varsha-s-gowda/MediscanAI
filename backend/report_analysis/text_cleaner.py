import re

def clean_extracted_text(text: str) -> str:
    """Cleans raw extracted OCR/PDF text by normalising whitespaces and lines."""
    if not text:
        return ""
    
    # Remove excessive repeated spaces
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Remove triple or more newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Standardise test formatting like "TestName  :  value" to "TestName: value"
    text = re.sub(r'\s*:\s*', ': ', text)
    
    return text.strip()
