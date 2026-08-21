import re
from typing import Dict, Any, Optional

def parse_reference_range(range_str: str) -> Dict[str, Any]:
    """Parses a reference range string into a structured representation."""
    result = {
        "reference_low": None,
        "reference_high": None,
        "reference_type": "range",
        "reference_text": range_str
    }
    
    if not range_str:
        return result

    # Normalize range_str (e.g. en-dash to hyphen)
    norm = range_str.replace("–", "-").replace("—", "-").strip()
    
    # Try parsing range "low - high" (e.g., "12-16", "4.0-5.9")
    range_match = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)", norm)
    if range_match:
        result["reference_low"] = float(range_match.group(1))
        result["reference_high"] = float(range_match.group(2))
        result["reference_type"] = "range"
        return result
        
    # Try parsing "< value" or "less than value"
    lt_match = re.search(r"<\s*(\d+(?:\.\d+)?)", norm)
    if lt_match:
        result["reference_high"] = float(lt_match.group(1))
        result["reference_type"] = "less_than"
        return result

    # Try parsing "> value" or "greater than value"
    gt_match = re.search(r">\s*(\d+(?:\.\d+)?)", norm)
    if gt_match:
        result["reference_low"] = float(gt_match.group(1))
        result["reference_type"] = "greater_than"
        return result

    return result
