import re
import os
import requests
from typing import Dict, Any, List
from config import GEMINI_API_KEY

# Reference ranges for common medical tests
REFERENCE_RANGES = {
    "hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "wbc": {"min": 4000.0, "max": 11000.0, "unit": "/µL"},
    "rbc": {"min": 4.0, "max": 5.9, "unit": "M/µL"},
    "platelets": {"min": 150000.0, "max": 450000.0, "unit": "/µL"},
    "cholesterol": {"min": 100.0, "max": 199.0, "unit": "mg/dL"},
    "glucose": {"min": 70.0, "max": 99.0, "unit": "mg/dL"},
    "hematocrit": {"min": 36.0, "max": 50.0, "unit": "%"},
    "creatinine": {"min": 0.5, "max": 1.2, "unit": "mg/dL"}
}

TEST_SYNONYMS = {
    "hemoglobin": ["hemoglobin", "hb", "hemo"],
    "wbc": ["wbc", "white blood cell", "leukocyte", "white blood cells"],
    "rbc": ["rbc", "red blood cell", "erythrocyte", "red blood cells"],
    "platelets": ["platelets", "platelet count", "plt"],
    "cholesterol": ["cholesterol", "total cholesterol", "chol"],
    "glucose": ["glucose", "blood sugar", "fasting glucose", "sugar"],
    "hematocrit": ["hematocrit", "hct"],
    "creatinine": ["creatinine", "creat", "cr"]
}

def clean_and_normalize_text(text: str) -> str:
    """Preprocesses report text for parsing."""
    # Convert to lowercase and normalize whitespace
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    return text

def parse_lab_values(text: str) -> List[Dict[str, Any]]:
    """Extracts test names, values, reference ranges, and abnormal status using regex rules."""
    normalized = clean_and_normalize_text(text)
    findings = []
    
    # Try finding patterns like: TestName [value] [unit] [reference range]
    # Example: hemoglobin 11.2 g/dl reference: 12-16
    for canonical_name, synonyms in TEST_SYNONYMS.items():
        ref = REFERENCE_RANGES[canonical_name]
        for syn in synonyms:
            # Match test name followed by optional characters, then a decimal number, then optional unit
            pattern = rf"\b{re.escape(syn)}\b\s*[:\-\s]?\s*(\d+(?:\.\d+)?)\s*(?:g/dl|/µl|m/µl|mg/dl|%|/ul|m/ul)?"
            match = re.search(pattern, normalized)
            if match:
                value = float(match.group(1))
                status = "Normal"
                if value < ref["min"]:
                    status = "Low"
                elif value > ref["max"]:
                    status = "High"
                
                findings.append({
                    "test_name": canonical_name.upper(),
                    "value": value,
                    "unit": ref["unit"],
                    "reference": f"{ref['min']}–{ref['max']}",
                    "status": status
                })
                break # Only extract once per test type
                
    return findings

def generate_report_summary(text: str, findings: List[Dict[str, Any]]) -> str:
    """Generates summary using Gemini if API key is present, fallback to local rule summary."""
    abnormals = [f for f in findings if f["status"] in ["High", "Low", "Abnormal"]]
    
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={GEMINI_API_KEY}"
            
            prompt = (
                f"You are a medical data summarization bot. Review this medical text and list of parsed findings. "
                f"Generate a very concise, professional clinical summary (max 3 sentences) for a doctor. "
                f"Identify the primary abnormalities. Include a standard medical warning/disclaimer at the end.\n\n"
                f"Raw Text:\n{text[:2000]}\n\n"
                f"Parsed Findings:\n{findings}\n\n"
                f"Response format: plain text paragraph (no markdown or titles)."
            )
            
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            res = requests.post(url, json=payload, timeout=12)
            if res.status_code == 200:
                text_out = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                return text_out
        except Exception as e:
            print(f"[SUMMARY] Gemini report summary failed, fallback to local: {e}")
            
    # Local fallback summary generator
    if not findings:
        return "General medical report uploaded. No standard hematology or metabolic metrics were automatically recognized. AI Decision Support: Please review the original report document carefully."
        
    if not abnormals:
        return "Hematology/metabolic findings are within the standard reference ranges. Patient metrics appear clinically stable at this time. AI Decision Support: This is an automated assessment, correlate with patient symptoms."
        
    abnormal_desc = ", ".join([f"{f['test_name']} ({f['value']} {f['unit']}, {f['status']})" for f in abnormals])
    return (
        f"Critical analysis shows out-of-range values: {abnormal_desc}. "
        f"All other recognized markers are within standard reference parameters. "
        f"AI Decision Support: Check patient clinical presentation and re-evaluate."
    )
