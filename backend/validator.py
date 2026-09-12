import numpy as np
import cv2
from PIL import Image
from typing import Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

def validate_medical_scan(img: Image.Image, modality: str = "chest") -> Tuple[bool, str]:
    """
    Validates whether an uploaded image is an authentic medical diagnostic scan
    (Chest X-Ray, Dental X-Ray/intraoral photo, Brain MRI, or Kidney CT Scan)
    and rejects invalid everyday photos (selfies, outdoor scenes, nature, cars, documents, etc.).
    
    Returns:
        (is_valid: bool, reason_message: str)
    """
    if img is None:
        return False, "No image provided."

    # Convert to RGB numpy array
    if img.mode != "RGB":
        img_rgb = img.convert("RGB")
    else:
        img_rgb = img

    arr = np.array(img_rgb)
    h, w = arr.shape[:2]

    # 1. Dimension validation
    if h < 64 or w < 64:
        return False, "Image resolution too low for diagnostic analysis. Minimum dimensions: 64x64."

    # 2. Check for solid/blank images
    std_dev = np.std(arr)
    if std_dev < 10.0:
        return False, "Image appears blank or has insufficient contrast for medical diagnosis."

    # 3. Color space analysis (HSV)
    hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)
    h_channel = hsv[:, :, 0]  # 0 - 179 in OpenCV
    s_channel = hsv[:, :, 1]  # 0 - 255
    v_channel = hsv[:, :, 2]  # 0 - 255

    mean_saturation = float(np.mean(s_channel))
    high_sat_pixels_ratio = float(np.mean(s_channel > 50))
    very_high_sat_ratio = float(np.mean(s_channel > 90))

    # Channel differences (R vs G vs B)
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    channel_diff = float(np.mean(np.abs(r - g)) + np.mean(np.abs(g - b)) + np.mean(np.abs(r - b))) / 3.0

    mod_lower = modality.lower()

    # =========================================================================
    # MODALITY 1: CHEST X-RAY / RADIOGRAPH
    # Radiographs are strictly transmission grayscale / monochrome images.
    # =========================================================================
    if "chest" in mod_lower or "xray" in mod_lower or "x-ray" in mod_lower:
        # Genuine X-rays have very low color saturation (nearly identical R, G, B channels)
        if channel_diff > 22.0 or mean_saturation > 35.0 or high_sat_pixels_ratio > 0.18:
            logger.info(f"Rejected non-X-ray image: channel_diff={channel_diff:.1f}, mean_sat={mean_saturation:.1f}, high_sat_ratio={high_sat_pixels_ratio:.2f}")
            return False, "Invalid image detected: The uploaded file appears to be a color photo or non-medical image. Please upload an authentic Chest Radiograph (PA/AP X-ray)."

        # Check edge density for anatomical structures (ribs, lung fields, mediastinum)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 40, 120)
        edge_density = float(np.mean(edges > 0))
        if edge_density < 0.005:
            return False, "Invalid image: Lack of anatomical pulmonary contours. Please upload a clear chest X-ray."

        return True, "Valid Chest Radiograph"

    # =========================================================================
    # MODALITY 2: BRAIN MRI
    # Brain MRI scans are grayscale cross-sections with central parenchymal structure.
    # =========================================================================
    elif "mri" in mod_lower or "brain" in mod_lower:
        if channel_diff > 20.0 or mean_saturation > 32.0 or high_sat_pixels_ratio > 0.15:
            logger.info(f"Rejected non-MRI image: channel_diff={channel_diff:.1f}, mean_sat={mean_saturation:.1f}")
            return False, "Invalid image detected: The uploaded file is a colored or everyday photo. Please upload a valid Brain MRI scan (T1/T2/FLAIR)."

        # Check for dark perimeter / background typical of MRI scans
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        corner_pixels = np.concatenate([
            gray[:int(h*0.1), :int(w*0.1)].flatten(),
            gray[:int(h*0.1), -int(w*0.1):].flatten(),
            gray[-int(h*0.1):, :int(w*0.1)].flatten(),
            gray[-int(h*0.1):, -int(w*0.1):].flatten()
        ])
        if np.mean(corner_pixels) > 180:  # Bright corners indicate non-scan document or photo
            return False, "Invalid image: Missing characteristic MRI field margins. Please upload a genuine Brain MRI scan."

        return True, "Valid Brain MRI Scan"

    # =========================================================================
    # MODALITY 3: KIDNEY STONE CT SCAN
    # Unenhanced Helical CT scans are grayscale cross-sections.
    # =========================================================================
    elif "ct" in mod_lower or "kidney" in mod_lower or "stone" in mod_lower:
        if channel_diff > 20.0 or mean_saturation > 32.0 or high_sat_pixels_ratio > 0.15:
            logger.info(f"Rejected non-CT image: channel_diff={channel_diff:.1f}, mean_sat={mean_saturation:.1f}")
            return False, "Invalid image detected: The uploaded file is not a CT scan. Please upload an authentic axial/coronal CT scan slice."

        return True, "Valid Kidney CT Scan"

    # =========================================================================
    # MODALITY 4: DENTAL CAVITY (Normal camera photos, tooth images, or radiographs)
    # Accepts normal photos, intraoral photos, and radiographs for dental analysis.
    # =========================================================================
    elif "dental" in mod_lower or "cavity" in mod_lower or "caries" in mod_lower:
        return True, "Valid Dental Image"

    # Default fallback check
    if channel_diff > 45.0 and mean_saturation > 60.0:
        return False, "Invalid image: Non-medical photo detected. Please upload an authentic medical radiograph."

    return True, "Valid Medical Image"
