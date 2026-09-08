import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
from typing import Dict, Any, Optional

from gradcam import GradCAM, overlay_heatmap
from logger import get_logger

logger = get_logger("ct_engine")

class CTInferenceEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(CTInferenceEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_path: Optional[str] = None):
        if getattr(self, "_initialized", False):
            return

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = model_path
        self.classes = ["Normal / No Stone Detected", "Kidney Stone Detected"]
        self.model: Optional[nn.Module] = None
        self.grad_cam: Optional[GradCAM] = None
        self.target_layer = None

        # Preprocessing matching ct-scan-classifier exactly
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self._initialized = True

    def _get_candidate_model_paths(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(script_dir, ".."))
        candidates = []
        if self.model_path:
            candidates.append(self.model_path)
        candidates.extend([
            os.path.join(project_root, "ct-scan-classifier", "src", "kidney_stone_model.pth"),
            os.path.join(script_dir, "kidney_stone_model.pth"),
            os.path.join(script_dir, "models", "kidney_stone_model.pth"),
            os.path.join(project_root, "src", "kidney_stone_model.pth"),
            os.path.join(os.getcwd(), "ct-scan-classifier", "src", "kidney_stone_model.pth"),
            os.path.join(os.getcwd(), "src", "kidney_stone_model.pth"),
            os.path.join(os.getcwd(), "kidney_stone_model.pth")
        ])
        return candidates

    def _load_model(self):
        if self.model is not None:
            return

        logger.info("Initializing CT Scan Kidney Stone Model (MobileNetV2)...")
        # MobileNetV2 architecture matching training.py and test_model.py
        model = models.mobilenet_v2(weights=None)
        model.classifier[1] = nn.Linear(model.last_channel, 1)

        candidate_paths = self._get_candidate_model_paths()
        loaded = False
        for path in candidate_paths:
            if os.path.exists(path):
                try:
                    state_dict = torch.load(path, map_location=self.device)
                    model.load_state_dict(state_dict)
                    logger.info(f"Loaded trained kidney stone model weights from: {path}")
                    loaded = True
                    break
                except Exception as e:
                    logger.error(f"Failed to load weights from {path}: {e}")

        if not loaded:
            logger.warning(f"No trained kidney_stone_model.pth found in candidates: {candidate_paths[:3]}")

        model = model.to(self.device)
        model.eval()
        self.model = model

        # Hook Grad-CAM on the last feature layer of MobileNetV2
        try:
            self.target_layer = self.model.features[-1]
            self.grad_cam = GradCAM(self.model, self.target_layer)
        except Exception as e:
            logger.warning(f"Could not hook Grad-CAM for CT scan model: {e}")
            self.grad_cam = None

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        """Runs inference on a CT scan slice to detect kidney stones."""
        self._load_model()

        if image.mode != "RGB":
            image = image.convert("RGB")

        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(input_tensor)
            stone_prob = torch.sigmoid(logits).item()

        is_stone = bool(stone_prob > 0.5)
        if is_stone:
            prediction_label = "Kidney Stone Detected"
            confidence = float(stone_prob) * 100.0
            pred_class_idx = 0
            severity = "High Priority" if confidence > 80.0 else "Moderate"
            recommendation = (
                "CT scan slice indicates radiographic evidence of renal calculi (kidney stone). "
                "Clinical correlation with non-contrast abdominal/pelvic CT, renal function tests, and urological consultation is recommended."
            )
        else:
            prediction_label = "Normal / No Stone Detected"
            confidence = float(1.0 - stone_prob) * 100.0
            pred_class_idx = 0
            severity = "Normal"
            recommendation = (
                "No prominent renal calculi or kidney stone opacities detected on the scanned slice. "
                "Maintain adequate hydration and routine metabolic evaluation if symptomatic."
            )

        # Grad-CAM heatmap generation
        heatmap_base64 = None
        overlay_base64 = None

        if self.grad_cam is not None:
            try:
                cam_tensor = input_tensor.clone().requires_grad_(True)
                heatmap = self.grad_cam.generate_heatmap(cam_tensor, class_idx=pred_class_idx)
                heatmap_base64, overlay_base64 = overlay_heatmap(heatmap, image, alpha=0.45)
            except Exception as e:
                logger.warning(f"Failed generating Grad-CAM for CT scan: {e}")

        return {
            "success": True,
            "prediction": prediction_label,
            "confidence": round(confidence, 1),
            "is_stone": is_stone,
            "severity": severity,
            "recommendation": recommendation,
            "stone_probability": round(float(stone_prob) * 100.0, 1),
            "class_probabilities": {
                "Normal": round(float(1.0 - stone_prob) * 100.0, 1),
                "Stone": round(float(stone_prob) * 100.0, 1)
            },
            "heatmap": overlay_base64,
            "heatmap_only": heatmap_base64
        }
