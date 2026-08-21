import io
import time
from PIL import Image
import numpy as np
from typing import Dict, Any, Union
from ocr.extract_text import MedicalReportOCR

class ReportTextExtractor:
    def __init__(self):
        self.ocr_processor = MedicalReportOCR()

    def extract_from_pdf(self, pdf_bytes: bytes, file_name: str) -> tuple:
        """Extracts text from digital PDF using PyMuPDF, sorting words horizontally to preserve rows."""
        start_time = time.time()
        print(f"[REPORT] Starting PDF extraction for {file_name}")
        try:
            import fitz  # Lazy import PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = len(doc)
            print(f"[REPORT] PDF pages: {page_count}")
            
            text = ""
            for idx, page in enumerate(doc):
                words = page.get_text("words")
                
                # Group words that share a similar Y coordinate to reconstruct horizontal rows
                lines_dict = {}
                for w in words:
                    x0, y0, x1, y1, word_str = w[0], w[1], w[2], w[3], w[4]
                    # Find a line group within 3.5 points threshold
                    found = False
                    for existing_y in lines_dict:
                        if abs(existing_y - y0) < 3.5:
                            lines_dict[existing_y].append((x0, word_str))
                            found = True
                            break
                    if not found:
                        lines_dict[y0] = [(x0, word_str)]
                
                # Sort rows vertically (top to bottom)
                sorted_y = sorted(lines_dict.keys())
                for y in sorted_y:
                    # Sort words horizontally (left to right)
                    sorted_line_words = sorted(lines_dict[y], key=lambda x: x[0])
                    line_text = " ".join([word for _, word in sorted_line_words])
                    text += line_text + "\n"
                
            elapsed = time.time() - start_time
            print(f"[REPORT] PDF extraction completed in {elapsed:.2f}s")
            return text.strip(), page_count
        except Exception as e:
            print(f"[REPORT] PDF extraction failed: {e}")
            return "", 0

    def extract_text(self, file_content: bytes, file_name: str, mime_type: str) -> Dict[str, Any]:
        """Extracts text and metadata from PDF or Image."""
        raw_text = ""
        file_name_lower = file_name.lower()
        page_count = 0

        # Handle PDF
        if file_name_lower.endswith(".pdf") or mime_type == "application/pdf":
            raw_text, page_count = self.extract_from_pdf(file_content, file_name)
            
            print(f"[REPORT] Filename: {file_name}")
            print(f"[REPORT] Number of pages: {page_count}")
            print(f"[REPORT] Extracted text length: {len(raw_text)} characters")
            print(f"[REPORT] First 500 characters of extracted text:\n{raw_text[:500]}")
            
            # Threshold: If extracted text is usable (>50 chars), do not call EasyOCR
            if len(raw_text.strip()) > 50:
                print("[REPORT] Digital PDF text extracted successfully. Skipping OCR fallback.")
            else:
                # If no text could be extracted, treat it as a scanned PDF
                print("[REPORT] Extracted text is empty or too short. Running OCR fallback on first page...")
                try:
                    import fitz  # Lazy import PyMuPDF
                    start_ocr_time = time.time()
                    doc = fitz.open(stream=file_content, filetype="pdf")
                    if len(doc) > 0:
                        page = doc[0]
                        pix = page.get_pixmap()
                        img_data = pix.tobytes("png")
                        image = Image.open(io.BytesIO(img_data)).convert("RGB")
                        
                        print("[REPORT] Launching EasyOCR engine on scanned page...")
                        ocr_data = self.ocr_processor.extract_text(image)
                        raw_text = ocr_data.get("raw_text", "")
                        
                        elapsed = time.time() - start_ocr_time
                        print(f"[REPORT] EasyOCR scanning completed in {elapsed:.2f}s")
                except Exception as e:
                    print(f"[REPORT] Scanned OCR fallback failed: {e}")
        else:
            # Handle Image formats directly via OCR
            print(f"[REPORT] File type detected as Image: {file_name}")
            try:
                start_ocr_time = time.time()
                image = Image.open(io.BytesIO(file_content)).convert("RGB")
                
                print("[REPORT] Launching EasyOCR engine on image...")
                ocr_data = self.ocr_processor.extract_text(image)
                raw_text = ocr_data.get("raw_text", "")
                
                elapsed = time.time() - start_ocr_time
                print(f"[REPORT] EasyOCR scanning completed in {elapsed:.2f}s")
            except Exception as e:
                print(f"[REPORT] OCR image parsing failed: {e}")

        print(f"[REPORT] Text extracted: {len(raw_text)} characters")
        return self.ocr_processor.parse_fields(raw_text)
