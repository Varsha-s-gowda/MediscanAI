import re
from typing import Dict, Any, List
from report_analysis.reference_parser import parse_reference_range

COMMON_TESTS = {
    "hemoglobin": ["hemoglobin", "haemoglobin", "hb"],
    "wbc": ["wbc", "white blood cell count", "white blood cells", "leukocytes"],
    "rbc": ["rbc", "red blood cell count", "red blood cells", "erythrocytes"],
    "platelets": ["platelets", "platelet count", "plt"],
    "glucose": ["glucose", "blood sugar", "sugar", "fasting glucose"],
    "cholesterol": ["cholesterol", "total cholesterol"],
    "creatinine": ["creatinine", "cr"],
    "urea": ["urea", "blood urea nitrogen", "bun"],
    "bilirubin": ["bilirubin", "total bilirubin"],
    "sgot": ["sgot", "ast", "aspartate aminotransferase"],
    "sgpt": ["sgpt", "alt", "alanine aminotransferase"],
    "tsh": ["tsh", "thyroid stimulating hormone"],
    "t3": ["t3", "triiodothyronine"],
    "t4": ["t4", "thyroxine"]
}

# Unit normalisation mapping
UNIT_MAP = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "mmol/l": "mmol/L",
    "/ul": "/µL",
    "/µl": "/µL",
    "cells/ul": "/µL",
    "lakh/ul": "lakh/µL",
    "million/ul": "million/µL"
}

def normalize_unit(unit_str: str) -> str:
    if not unit_str:
        return ""
    u_lower = unit_str.lower().strip()
    return UNIT_MAP.get(u_lower, unit_str.strip())

def extract_reference_from_line(line: str) -> str:
    """Finds a reference range substring in the line."""
    # Look for range e.g. "12.0 - 16.0" or "< 200" or "> 40"
    match = re.search(r"(\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?)", line)
    if match:
        return match.group(1)
        
    lt_match = re.search(r"(<\s*\d+(?:\.\d+)?)", line)
    if lt_match:
        return lt_match.group(1)
        
    gt_match = re.search(r"(>\s*\d+(?:\.\d+)?)", line)
    if gt_match:
        return gt_match.group(1)
        
    return ""

def extract_medical_data(text: str) -> List[Dict[str, Any]]:
    """Extracts test names, numeric values, units, and reference ranges."""
    findings = []
    lines = text.split("\n")
    
    matched_names = set()

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
            
        # Skip lines that are clearly metadata
        if any(kw in line_clean.lower() for kw in ["patient", "doctor", "phone", "date", "id", "age", "years", "sex", "gender"]):
            continue

        # Pattern to extract Test Name and numerical Value
        pattern = r"\b([a-zA-Z\s]{2,30})\b\s*[:\-]?\s*([<>]?\s*\d+(?:[\.,]\d+)?)"
        match = re.search(pattern, line_clean)
        
        if match:
            raw_test = match.group(1).strip()
            raw_val = match.group(2).strip().replace(",", "")
            
            test_lower = raw_test.lower().strip()
            if test_lower in ["test", "result", "value", "range", "status", "unit", "no", "number", "id", "ref", "reference", "patient", "doctor", "age", "gender", "sex"]:
                continue
                
            # Extract unit if present near the value
            # e.g., "10.2 g/dL" or "10.2g/dL"
            unit_match = re.search(rf"{re.escape(raw_val)}\s*([a-zA-Z/%µLul\-/]+)", line_clean)
            raw_unit = unit_match.group(1) if unit_match else ""
            
            # Normalize float value
            try:
                val_clean = re.sub(r'[<>\s]', '', raw_val)
                value = float(val_clean)
            except ValueError:
                continue
                
            # Match against known tests first for naming consistency
            canonical_name = raw_test.title()
            for key, synonyms in COMMON_TESTS.items():
                if any(syn in raw_test.lower() for syn in synonyms):
                    canonical_name = key.upper()
                    break

            if canonical_name in matched_names:
                continue
                
            matched_names.add(canonical_name)
            
            # Find the reference range in the same line (excluding the main test value)
            remaining_part = line_clean.replace(raw_test, "", 1).replace(raw_val, "", 1)
            raw_ref = extract_reference_from_line(remaining_part)
            
            ref_data = parse_reference_range(raw_ref)
            
            findings.append({
                "test_name": canonical_name,
                "value": value,
                "unit": normalize_unit(raw_unit),
                "reference_low": ref_data["reference_low"],
                "reference_high": ref_data["reference_high"],
                "reference_type": ref_data["reference_type"],
                "reference_text": ref_data["reference_text"] if raw_ref else None
            })
            
    return findings
