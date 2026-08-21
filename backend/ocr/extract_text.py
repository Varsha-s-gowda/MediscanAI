import re
from typing import Dict, Any, Union
from PIL import Image
import numpy as np

class MedicalReportOCR:
    def __init__(self):
        # Reader is initialized lazily on first request
        self.reader = None

    def parse_fields(self, text: str) -> Dict[str, Any]:
        """Uses regex and heuristics to parse key medical report parameters."""
        data = {
            "patient_name": "N/A",
            "age": "N/A",
            "gender": "N/A",
            "hospital": "N/A",
            "date": "N/A",
            "report_number": "N/A",
            "raw_text": text
        }

        # Lowercase for uniform parsing
        lowercase_text = text.lower()

        # Regular Expressions for parsing
        name_match = re.search(r"(?:patient\s*name|name)\s*[:\-]\s*([a-zA-Z\s\.]+)", lowercase_text)
        if name_match:
            data["patient_name"] = name_match.group(1).strip().title()

        age_match = re.search(r"(?:age|yr|years)\s*[:\-]?\s*(\d{1,3})", lowercase_text)
        if age_match:
            data["age"] = age_match.group(1).strip()

        gender_match = re.search(r"(?:gender|sex)\s*[:\-]\s*(male|female|m|f|other)", lowercase_text)
        if gender_match:
            gen = gender_match.group(1).strip().lower()
            if gen in ['m', 'male']:
                data["gender"] = "Male"
            elif gen in ['f', 'female']:
                data["gender"] = "Female"
            else:
                data["gender"] = gen.title()

        hospital_match = re.search(r"(?:hospital|clinic|center|lab)\s*[:\-]?\s*([a-zA-Z0-9\s\.,]+)", lowercase_text)
        if hospital_match:
            data["hospital"] = hospital_match.group(1).strip().title()

        date_match = re.search(r"(?:date|dt)\s*[:\-]\s*(\d{2}[/\-\.]\d{2}[/\-\.]\d{4}|\d{4}[/\-\.]\d{2}[/\-\.]\d{2})", lowercase_text)
        if date_match:
            data["date"] = date_match.group(1).strip()

        report_num_match = re.search(r"(?:report\s*no|id|ref\s*no|report\s*number)\s*[:\-]\s*([a-zA-Z0-9\-]+)", lowercase_text)
        if report_num_match:
            data["report_number"] = report_num_match.group(1).strip().upper()

        return data

    def extract_text(self, image_input: Union[str, Image.Image, np.ndarray]) -> Dict[str, Any]:
        """Extracts text from report image and returns parsed fields."""
        if self.reader is None:
            import easyocr
            import gc
            self.reader = easyocr.Reader(['en'], gpu=False)
            gc.collect()

        if isinstance(image_input, Image.Image):
            image_input = np.array(image_input)
            
        results = self.reader.readtext(image_input)
        extracted_text = "\n".join([res[1] for res in results])
        
        return self.parse_fields(extracted_text)