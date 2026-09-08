import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import numpy as np
from typing import Dict, Any, Optional

try:
    from gradcam import GradCAM, overlay_heatmap
    from logger import get_logger
except ImportError:
    from backend.gradcam import GradCAM, overlay_heatmap
    from backend.logger import get_logger

logger = get_logger("mri_engine")

# Exact class labels matching ImageFolder sorted order from standalone training/prediction
CLASS_LABELS = ["glioma", "meningioma", "notumor", "pituitary"]

DISPLAY_NAMES = {
    "glioma": "Glioma Tumor",
    "meningioma": "Meningioma Tumor",
    "notumor": "No Tumor Detected (Normal)",
    "pituitary": "Pituitary Tumor"
}

SEVERITY_MAPPING = {
    "glioma": "High Priority",
    "meningioma": "Moderate to High Risk",
    "notumor": "Normal",
    "pituitary": "Moderate Risk"
}

RECOMMENDATIONS = {
    "glioma": (
        "MRI findings exhibit radiographic features consistent with Glioma (intra-axial brain lesion). "
        "Urgent neuro-oncology and neurosurgical consultation recommended for multi-sequence contrast MRI and stereotactic biopsy/resection planning."
    ),
    "meningioma": (
        "MRI analysis indicates imaging characteristics consistent with Meningioma (extra-axial dural-based mass). "
        "Neurosurgical assessment advised to evaluate tumor mass effect, vascular proximity, and optimal intervention or surveillance."
    ),
    "pituitary": (
        "MRI features suggest a Sellar/Pituitary mass lesion. "
        "Comprehensive endocrine hormone profile (Prolactin, ACTH, GH, TSH, Cortisol) and visual field ophthalmology evaluation recommended."
    ),
    "notumor": (
        "No focal intracranial neoplasm, parenchymal mass lesion, or abnormal brain tumor enhancement detected. "
        "Brain parenchyma and ventricular dimensions appear within normal limits."
    )
}

class MRIInferenceEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(MRIInferenceEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_path: Optional[str] = None):
        if getattr(self, "_initialized", False):
            return

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = model_path
        self.classes = CLASS_LABELS
        self.num_classes = len(self.classes)
        self.model: Optional[nn.Module] = None
        self.grad_cam: Optional[GradCAM] = None
        self.target_layer = None

        # Exact preprocessing transforms used in standalone predict.py
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
            os.path.join(project_root, "brain_mri", "models", "brain_tumor_resnet18.pth"),
            os.path.join(script_dir, "brain_tumor_resnet18.pth"),
            os.path.join(script_dir, "models", "brain_tumor_resnet18.pth"),
            os.path.join(project_root, "models", "brain_tumor_resnet18.pth"),
            os.path.join(os.getcwd(), "brain_mri", "models", "brain_tumor_resnet18.pth"),
            os.path.join(os.getcwd(), "models", "brain_tumor_resnet18.pth"),
            os.path.join(os.getcwd(), "brain_tumor_resnet18.pth")
        ])
        return candidates

    def _load_model(self):
        if self.model is not None:
            return

        logger.info("Initializing Brain MRI Tumor Model (ResNet-18)...")
        # Build ResNet-18 architecture matching standalone training/predict
        model = models.resnet18(weights=None)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, self.num_classes)

        candidate_paths = self._get_candidate_model_paths()
        loaded = False
        for path in candidate_paths:
            if os.path.exists(path):
                try:
                    state_dict = torch.load(path, map_location=self.device)
                    model.load_state_dict(state_dict)
                    logger.info(f"Loaded trained brain MRI model weights from: {path}")
                    loaded = True
                    break
                except Exception as e:
                    logger.error(f"Failed to load brain MRI weights from {path}: {e}")

        if not loaded:
            logger.warning(f"No trained brain_tumor_resnet18.pth found in candidate paths: {candidate_paths[:3]}")

        model = model.to(self.device)
        model.eval()
        self.model = model

        # Hook Grad-CAM on layer4 of ResNet-18
        try:
            self.target_layer = self.model.layer4[-1]
            self.grad_cam = GradCAM(self.model, self.target_layer)
        except Exception as e:
            logger.warning(f"Could not hook Grad-CAM for MRI model: {e}")
            self.grad_cam = None

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        """Runs inference on a Brain MRI scan image for 4-class tumor classification."""
        self._load_model()

        if image.mode != "RGB":
            image = image.convert("RGB")

        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = F.softmax(outputs, dim=1)[0]
            predicted_idx = torch.argmax(probabilities).item()

        raw_label = CLASS_LABELS[predicted_idx]
        confidence_raw = probabilities[predicted_idx].item()
        confidence_pct = round(confidence_raw * 100, 2)
        display_label = DISPLAY_NAMES.get(raw_label, raw_label.capitalize())

        is_tumor = (raw_label != "notumor")
        severity = SEVERITY_MAPPING.get(raw_label, "Moderate")
        recommendation = RECOMMENDATIONS.get(raw_label, "Clinical MRI evaluation recommended.")

        class_probs = {
            label: round(probabilities[i].item() * 100, 2)
            for i, label in enumerate(CLASS_LABELS)
        }

        # Grad-CAM heatmap generation
        heatmap_base64 = None
        overlay_base64 = None

        if self.grad_cam is not None:
            try:
                cam_tensor = input_tensor.clone().requires_grad_(True)
                heatmap = self.grad_cam.generate_heatmap(cam_tensor, class_idx=predicted_idx)
                heatmap_base64, overlay_base64 = overlay_heatmap(heatmap, image, alpha=0.45)
            except Exception as e:
                logger.warning(f"Failed generating Grad-CAM for Brain MRI: {e}")

        return {
            "success": True,
            "prediction": display_label,
            "raw_class": raw_label,
            "confidence": confidence_pct,
            "confidence_pct": confidence_pct,
            "confidence_raw": confidence_raw,
            "is_tumor": is_tumor,
            "severity": severity,
            "recommendation": recommendation,
            "class_probabilities": class_probs,
            "device": str(self.device),
            "heatmap": overlay_base64,
            "heatmap_only": heatmap_base64
        }
