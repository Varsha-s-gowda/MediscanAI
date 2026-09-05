import os
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import numpy as np
import base64
import io
import time
from typing import Dict, Any, Optional

from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from gradcam import GradCAM, overlay_heatmap
from logger import get_logger

logger = get_logger("cavity_engine")

class CavityClassifier(nn.Module):
    def __init__(self, num_classes: int = 2):
        super(CavityClassifier, self).__init__()
        self.backbone = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        num_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_features, 256),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.backbone(x)

class CavityInferenceEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(CavityInferenceEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_path: str = "backend/cavity_model.pth"):
        if getattr(self, "_initialized", False):
            return

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = model_path
        self.classes = ["Normal / Healthy", "Cavity Detected"]
        self.model: Optional[CavityClassifier] = None
        self.grad_cam: Optional[GradCAM] = None
        self.target_layer = None

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self._initialized = True

    def _load_model(self):
        if self.model is not None:
            return

        logger.info("Initializing Cavity Detection Model (EfficientNet-B0)...")
        model = CavityClassifier(num_classes=2)
        
        # Check if custom trained weights exist
        weight_candidate = self.model_path
        if not os.path.exists(weight_candidate):
            # Check relative to backend directory or project root
            alt_path = os.path.join(os.path.dirname(__file__), "cavity_model.pth")
            if os.path.exists(alt_path):
                weight_candidate = alt_path

        if os.path.exists(weight_candidate):
            try:
                state_dict = torch.load(weight_candidate, map_location="cpu")
                model.load_state_dict(state_dict)
                logger.info(f"Loaded trained cavity model weights from: {weight_candidate}")
            except Exception as e:
                logger.error(f"Error loading cavity model weights: {e}. Running with pretrained EfficientNet-B0 features.")
        else:
            logger.info(f"No custom cavity weights at {weight_candidate}. Running with pretrained EfficientNet-B0 features.")

        model = model.to(self.device)
        model.eval()

        self.model = model
        # Target the final convolutional stage of EfficientNet-B0 for Grad-CAM
        self.target_layer = self.model.backbone.features[-1][0]
        try:
            self.grad_cam = GradCAM(self.model, self.target_layer)
        except Exception as e:
            logger.warn(f"Could not hook Grad-CAM for cavity model: {e}")
            self.grad_cam = None

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        """Runs inference on a dental photo/X-ray to detect caries/cavities."""
        self._load_model()

        if image.mode != "RGB":
            image = image.convert("RGB")

        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx]) * 100.0
        prediction_label = self.classes[pred_idx]

        # Grad-CAM heatmap generation
        heatmap_base64 = None
        overlay_base64 = None

        if self.grad_cam is not None:
            try:
                cam_tensor = input_tensor.clone().requires_grad_(True)
                heatmap = self.grad_cam.generate_heatmap(cam_tensor, class_idx=pred_idx)
                heatmap_base64, overlay_base64 = overlay_heatmap(heatmap, image, alpha=0.45)
            except Exception as e:
                logger.warn(f"Failed generating Grad-CAM for cavity: {e}")

        is_cavity = (pred_idx == 1)
        severity = "Moderate to High Risk" if (is_cavity and confidence > 75) else ("Mild / Incipient" if is_cavity else "Normal")
        recommendation = (
            "Dental caries lesion detected. Clinical evaluation, bitewing radiograph confirmation, and restorative filling/fluoride seal treatment are advised."
            if is_cavity else
            "Dentition appears sound without prominent carious cavitation. Maintain standard oral hygiene, twice-daily brushing, and 6-month routine prophylaxis."
        )

        return {
            "success": True,
            "prediction": prediction_label,
            "confidence": round(confidence, 1),
            "is_cavity": is_cavity,
            "severity": severity,
            "recommendation": recommendation,
            "class_probabilities": {
                "Normal": round(float(probs[0]) * 100, 1),
                "Cavity": round(float(probs[1]) * 100, 1)
            },
            "heatmap": overlay_base64,
            "heatmap_only": heatmap_base64
        }
