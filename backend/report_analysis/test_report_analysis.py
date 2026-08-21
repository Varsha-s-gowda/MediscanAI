import unittest
from report_analysis.text_cleaner import clean_extracted_text
from report_analysis.reference_parser import parse_reference_range
from report_analysis.medical_extractor import extract_medical_data
from report_analysis.report_summary import analyze_and_compare, generate_findings_summary

class TestMedicalReportAnalysis(unittest.TestCase):

    def test_hemoglobin_low(self):
        text = "Hemoglobin: 10.2 g/dL (Reference Range: 12.0 - 16.0 g/dL)"
        cleaned = clean_extracted_text(text)
        extracted = extract_medical_data(cleaned)
        analyzed = analyze_and_compare(extracted)
        
        self.assertEqual(len(analyzed), 1)
        self.assertEqual(analyzed[0]["test_name"], "HEMOGLOBIN")
        self.assertEqual(analyzed[0]["value"], 10.2)
        self.assertEqual(analyzed[0]["status"], "LOW")

    def test_wbc_high(self):
        text = "WBC: 12500 /µL Reference: 4000 - 11000"
        cleaned = clean_extracted_text(text)
        extracted = extract_medical_data(cleaned)
        analyzed = analyze_and_compare(extracted)
        
        self.assertEqual(len(analyzed), 1)
        self.assertEqual(analyzed[0]["test_name"], "WBC")
        self.assertEqual(analyzed[0]["value"], 12500.0)
        self.assertEqual(analyzed[0]["status"], "HIGH")

    def test_platelets_normal(self):
        text = "Platelets: 2.1 lakh/µL (1.5 - 4.5 lakh/µL)"
        cleaned = clean_extracted_text(text)
        extracted = extract_medical_data(cleaned)
        analyzed = analyze_and_compare(extracted)
        
        self.assertEqual(len(analyzed), 1)
        self.assertEqual(analyzed[0]["test_name"], "PLATELETS")
        self.assertEqual(analyzed[0]["value"], 2.1)
        self.assertEqual(analyzed[0]["status"], "NORMAL")

    def test_unknown_reference(self):
        text = "Sugar: 125 mg/dL"
        cleaned = clean_extracted_text(text)
        extracted = extract_medical_data(cleaned)
        analyzed = analyze_and_compare(extracted)
        
        self.assertEqual(len(analyzed), 1)
        self.assertEqual(analyzed[0]["status"], "UNKNOWN")

    def test_metadata_ignored_as_values(self):
        text = "Patient Age: 45 Years\nPhone: 9876543210\nDate: 12/08/2026\nHemoglobin: 14.5 g/dL"
        cleaned = clean_extracted_text(text)
        extracted = extract_medical_data(cleaned)
        
        # Should only match Hemoglobin, ignoring metadata numbers
        self.assertEqual(len(extracted), 1)
        self.assertEqual(extracted[0]["test_name"], "HEMOGLOBIN")

    def test_less_than_range(self):
        range_data = parse_reference_range("< 200")
        self.assertEqual(range_data["reference_high"], 200.0)
        self.assertEqual(range_data["reference_type"], "less_than")

    def test_greater_than_range(self):
        range_data = parse_reference_range("> 40")
        self.assertEqual(range_data["reference_low"], 40.0)
        self.assertEqual(range_data["reference_type"], "greater_than")

if __name__ == '__main__':
    unittest.main()
