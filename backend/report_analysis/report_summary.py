from typing import Dict, Any, List

def analyze_and_compare(findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compares the extracted values with their reference ranges."""
    analyzed_findings = []
    
    for f in findings:
        status = "UNKNOWN"
        val = f["value"]
        
        # Check if reference range is available
        has_low = f["reference_low"] is not None
        has_high = f["reference_high"] is not None
        
        if not has_low and not has_high:
            status = "UNKNOWN"
        else:
            ref_type = f["reference_type"]
            if ref_type == "range":
                if val < f["reference_low"]:
                    status = "LOW"
                elif val > f["reference_high"]:
                    status = "HIGH"
                else:
                    status = "NORMAL"
            elif ref_type == "less_than":
                if val >= f["reference_high"]:
                    status = "HIGH"
                else:
                    status = "NORMAL"
            elif ref_type == "greater_than":
                if val <= f["reference_low"]:
                    status = "LOW"
                else:
                    status = "NORMAL"
                    
        f_copy = f.copy()
        f_copy["status"] = status
        analyzed_findings.append(f_copy)
        
    return analyzed_findings

def generate_findings_summary(findings: List[Dict[str, Any]]) -> str:
    """Generates a concise textual summary based strictly on the findings."""
    if not findings:
        return "No laboratory values were recognized in the uploaded report."
        
    abnormals = [f for f in findings if f["status"] in ["HIGH", "LOW"]]
    normal_count = sum(1 for f in findings if f["status"] == "NORMAL")
    unknown_count = sum(1 for f in findings if f["status"] == "UNKNOWN")
    
    total = len(findings)
    summary_parts = [f"{total} laboratory value{'s' if total > 1 else ''} identified."]
    
    if abnormals:
        abnormal_descs = []
        for f in abnormals:
            ref_str = f" (reference: {f['reference_text']})" if f['reference_text'] else ""
            abnormal_descs.append(f"{f['test_name']} is {f['status']}{ref_str}")
        summary_parts.append("Out-of-range markers: " + ", ".join(abnormal_descs) + ".")
    else:
        summary_parts.append("All recognized parameters are within normal reference ranges.")
        
    if unknown_count > 0:
        summary_parts.append(f"{unknown_count} parameter{'s' if unknown_count > 1 else ''} could not be evaluated due to missing reference ranges.")
        
    return " ".join(summary_parts)
