from report_analysis.ocr_engine import ReportTextExtractor
from report_analysis.text_cleaner import clean_extracted_text
from report_analysis.medical_extractor import extract_medical_data
from report_analysis.report_summary import analyze_and_compare, generate_findings_summary
from typing import Dict, Any

class MedicalReportAnalyzer:
    def __init__(self):
        self.extractor = ReportTextExtractor()

    def analyze_report(self, file_content: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """Runs the entire report analysis pipeline on the given file contents."""
        # 1. Extraction (PDF / OCR)
        ocr_result = self.extractor.extract_text(file_content, file_name, mime_type)
        raw_text = ocr_result.get("raw_text", "")
        
        # 2. Cleaning
        cleaned_text = clean_extracted_text(raw_text)
        
        # 3. Extraction
        findings = extract_medical_data(cleaned_text)
        
        # 4. Comparison
        analyzed_findings = analyze_and_compare(findings)
        
        # 5. Textual summary
        summary = generate_findings_summary(analyzed_findings)
        
        return {
            "metadata": {
                "patient_name": ocr_result.get("patient_name"),
                "age": ocr_result.get("age"),
                "gender": ocr_result.get("gender"),
                "hospital": ocr_result.get("hospital"),
                "date": ocr_result.get("date"),
                "report_number": ocr_result.get("report_number")
            },
            "raw_text": raw_text,
            "cleaned_text": cleaned_text,
            "findings": analyzed_findings,
            "summary": summary
        }
