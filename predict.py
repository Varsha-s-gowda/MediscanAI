import os
import time
import json
import torch
from PIL import Image
import threading
from typing import Dict, Any, List, Tuple
import requests
import base64
import io
from model import MediScanModel
from preprocessing import MedicalImagePreprocessor
from device import get_device
from constants import DISEASE_CLASSES, SEVERITY_MAPPING, DISEASE_INFO
from config import MODEL_PATH, CONFIDENCE_THRESHOLD, GEMINI_API_KEY, OPENROUTER_API_KEY
from gradcam import GradCAM, overlay_heatmap
from logger import get_logger

logger = get_logger("predict")

# Configure PyTorch threading limits immediately to save memory and CPU
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

class InferenceEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(InferenceEngine, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, model_weight_path: str = MODEL_PATH):
        if self._initialized:
            return
        
        self.device = get_device()
        self.preprocessor = MedicalImagePreprocessor()
        self.classes = DISEASE_CLASSES
        self.num_classes = len(self.classes)
        self.model_weight_path = model_weight_path
        
        # Local model components initialized lazily
        self.model = None
        self.target_layer = None
        self.grad_cam = None
        
        # Load custom classes if classes.json exists
        if os.path.exists("classes.json"):
            try:
                with open("classes.json", "r") as f:
                    self.classes = json.load(f)
                    self.num_classes = len(self.classes)
                logger.info(f"Loaded class mapping from classes.json: {self.classes}")
            except Exception as e:
                logger.warn(f"Could not load classes.json: {e}")

        self._initialized = True

    def _load_local_model(self):
        """Lazily builds model architecture and loads weights into memory."""
        logger.info("Initializing local PyTorch model (lazy loading)...")
        
        # Check weights path
        final_path = self.model_weight_path
        if not os.path.exists(final_path):
            if os.path.exists("pneumonia_model.pth"):
                final_path = "pneumonia_model.pth"
                logger.info(f"best_model.pth not found. Falling back to {final_path}")
            else:
                logger.warn("No trained weights found. Initializing model with default weights.")

        # Determine number of classes from checkpoint
        model_classes = self.num_classes
        is_legacy_resnet = False
        
        if os.path.exists(final_path):
            try:
                state_dict = torch.load(final_path, map_location="cpu")
                if "backbone.classifier.3.weight" in state_dict:
                    model_classes = state_dict["backbone.classifier.3.weight"].shape[0]
                elif "fc.weight" in state_dict:
                    model_classes = state_dict["fc.weight"].shape[0]
                    is_legacy_resnet = True
                logger.info(f"Detected checkpoint output size: {model_classes} classes")
            except Exception as e:
                logger.error(f"Error parsing checkpoint {final_path}: {e}")

        # Override classes if model size doesn't match
        if model_classes == 2:
            self.classes = ["Normal", "Pneumonia"]
            self.num_classes = 2
        elif model_classes != len(self.classes):
            self.classes = DISEASE_CLASSES[:model_classes]
            self.num_classes = model_classes

        # Setup model architecture
        if is_legacy_resnet:
            from torchvision.models import resnet50
            import torch.nn as nn
            self.model = resnet50()
            self.model.fc = nn.Linear(self.model.fc.in_features, model_classes)
            self.target_layer = self.model.layer4[2].conv3
        else:
            self.model = MediScanModel(num_classes=model_classes, freeze_features=False)
            self.target_layer = self.model.backbone.features.denseblock4.denselayer16.conv2

        # Load weights
        if os.path.exists(final_path):
            try:
                self.model.load_state_dict(torch.load(final_path, map_location="cpu"))
                logger.info(f"Successfully loaded model weights from {final_path}")
            except Exception as e:
                logger.error(f"Error loading state dict: {e}")

        self.model = self.model.to(self.device)
        self.model.eval()

        # Initialize Grad-CAM
        self.grad_cam = GradCAM(self.model, self.target_layer)
        
        # Run garbage collection to clean up any temporary buffers
        import gc
        gc.collect()

    def get_severity(self, confidence: float) -> str:
        """Estimates severity from prediction confidence percentage."""
        # 0-30% Low, 30-70% Moderate, 70-100% High
        if confidence < 30.0:
            return "Low"
        elif confidence < 70.0:
            return "Moderate"
        return "High"

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        """Runs inference on a single image and returns multi-label predictions."""
        start_time = time.time()
        
        # Check if OpenRouter API Key is configured
        if OPENROUTER_API_KEY:
            try:
                # Resize image to max 512x512 before encoding — full-res X-rays cause silent API failures
                api_image = image.convert("RGB")
                api_image.thumbnail((512, 512), Image.LANCZOS)
                buffered = io.BytesIO()
                api_image.save(buffered, format="JPEG", quality=85)
                img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                logger.info(f"Image resized for API: {api_image.size}, base64 size: {len(img_b64)} chars")

                # Setup OpenRouter payload using Gemini 2.5 Flash
                url = "https://openrouter.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                }
                
                prompt = (
                    "You are an expert board-certified thoracic radiologist. "
                    "Analyze this chest radiograph and differentiate between Normal, standard Pneumonia, COVID-19 Pneumonia, and Tuberculosis (TB). "
                    "To do this accurately, follow these specific radiological guidelines:\n"
                    "- COVID-19 Pneumonia features bilateral, peripheral ground-glass opacities (GGOs) or consolidations, predominantly in the lower zones.\n"
                    "- Tuberculosis (TB) typically shows upper lobe consolidations, cavitary lesions, apical scarring, hilar/mediastinal lymphadenopathy, or pleural effusion.\n"
                    "- Standard Pneumonia features lobar consolidation, air bronchograms, or focal opacity.\n"
                    "- Normal shows clear lung fields, normal cardiomediastinal silhouette, and sharp costophrenic angles.\n\n"
                    "Estimate the probability percentages (0.0 to 100.0) for exactly these 4 conditions:\n"
                    "1. Pneumonia\n"
                    "2. COVID-19 Pneumonia\n"
                    "3. Tuberculosis (TB)\n"
                    "4. Normal\n\n"
                    "Your response must be ONLY a single valid JSON object mapping these exactly 4 condition names to their probability percentage value (as floats between 0.0 and 100.0). Ensure the probabilities reflect the visual evidence carefully. Do not include markdown code block syntax (like ```json)."
                )

                payload = {
                    "model": "google/gemini-2.5-flash",
                    "max_tokens": 150,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{img_b64}"
                                    }
                                }
                            ]
                        }
                    ],
                    "response_format": {
                        "type": "json_object"
                    }
                }

                res = requests.post(url, headers=headers, json=payload, timeout=45)
                if res.status_code == 402:
                    # Out of credits — retry with a free model
                    logger.warning("Primary model out of credits, retrying with free model...")
                    payload["model"] = "google/gemini-flash-1.5-8b"
                    payload["max_tokens"] = 150
                    res = requests.post(url, headers=headers, json=payload, timeout=45)
                if res.status_code != 200:
                    logger.error(f"OpenRouter API error {res.status_code}: {res.text[:500]}")
                else:
                    res_json = res.json()
                    choices = res_json.get("choices", [])
                    if not choices:
                        logger.error(f"OpenRouter returned empty choices. Full response: {res_json}")
                    if choices:
                        content_text = choices[0]["message"]["content"].strip()
                        if content_text.startswith("```"):
                            lines = content_text.split("\n")
                            content_text = "\n".join([line for line in lines if not line.strip().startswith("```")])
                        
                        gemini_probs = json.loads(content_text)
                        
                        # Populate predictions list
                        predictions_list = []
                        normal_conf = gemini_probs.get("Normal", 0.0)
                        
                        for finding_name, val in gemini_probs.items():
                            conf_val = float(val)
                            conf_val = round(conf_val, 2)
                            
                            if finding_name.lower() == "normal":
                                normal_conf = conf_val
                                
                            threshold_percentage = 30.0  # Lower threshold so TB/COVID-19 surface properly
                            if conf_val >= threshold_percentage:
                                severity = self.get_severity(conf_val)
                                info = DISEASE_INFO.get(finding_name, {
                                    "description": f"Radiological finding of {finding_name} detected.",
                                    "symptoms": ["Shortness of breath", "Cough", "Fever"],
                                    "precautions": ["Consult a medical professional", "Clinical correlation"],
                                    "follow_up": "Seek physician advice for detailed assessment."
                                })
                                predictions_list.append({
                                    "disease": finding_name,
                                    "confidence": conf_val,
                                    "severity": severity,
                                    "description": info["description"],
                                    "symptoms": info["symptoms"],
                                    "precautions": info["precautions"],
                                    "follow_up": info["follow_up"]
                                })
                                
                        # Sort predictions by confidence
                        predictions_list = sorted(predictions_list, key=lambda x: x["confidence"], reverse=True)
                        if len(predictions_list) == 0:
                            normal_info = DISEASE_INFO.get("Normal")
                            predictions_list.append({
                                "disease": "Normal",
                                "confidence": max(normal_conf, 100.0),
                                "severity": "Low",
                                "description": normal_info["description"],
                                "symptoms": normal_info["symptoms"],
                                "precautions": normal_info["precautions"],
                                "follow_up": normal_info["follow_up"]
                            })

                        processing_time = time.time() - start_time
                        primary = predictions_list[0]
                        
                        return {
                            "success": True,
                            "predictions": predictions_list,
                            "prediction": primary["disease"],
                            "confidence": primary["confidence"],
                            "severity": primary["severity"],
                            "normal_probability": round(normal_conf, 2),
                            "heatmap": "",  # Grad-CAM not supported directly on OpenRouter
                            "heatmap_only": "",
                            "scan_quality": "Good",
                            "processing_time": f"{processing_time:.2f} sec (OpenRouter Gemini 2.5 Flash)",
                            "health_advice": primary.get("precautions", ["Maintain healthy habits"]),
                            "precautions": primary.get("precautions", ["Standard checkup"]),
                            "consult_doctor_if": primary.get("symptoms", ["Symptoms persist"]),
                            "symptoms": primary.get("symptoms", ["Cough", "Fever"])
                        }
            except Exception as open_err:
                logger.error(f"OpenRouter Vision API prediction failed: {open_err}. Falling back...")

        # Check if Gemini API Key is configured for 18-disease zero-shot vision prediction
        if GEMINI_API_KEY:
            try:
                # Convert PIL Image to base64 JPEG
                buffered = io.BytesIO()
                image.convert("RGB").save(buffered, format="JPEG")
                img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

                # Setup payload
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
                prompt = (
                    "Analyze this chest X-ray and return a JSON mapping of probability percentages (0 to 100) for these 18 thoracic conditions: "
                    "Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema, Fibrosis, Hernia, Infiltration, Mass, Nodule, Pleural Thickening, Pneumonia, Pneumothorax, COVID-19, Tuberculosis, Lung Opacity, Normal. "
                    "Make sure that your response is ONLY a single valid JSON object containing exactly these 18 keys mapped to their estimated probability values (as floats between 0.0 and 100.0). Do not include markdown code block syntax (like ```json)."
                )
                
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt},
                                {
                                    "inlineData": {
                                        "mimeType": "image/jpeg",
                                        "data": img_b64
                                    }
                                }
                            ]
                        }
                    ],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }

                res = requests.post(url, json=payload, timeout=20)
                if res.status_code == 200:
                    res_json = res.json()
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        content_text = candidates[0]["content"]["parts"][0]["text"].strip()
                        if content_text.startswith("```"):
                            lines = content_text.split("\n")
                            content_text = "\n".join([line for line in lines if not line.strip().startswith("```")])
                        
                        gemini_probs = json.loads(content_text)
                        
                        # Populate predictions list
                        predictions_list = []
                        normal_conf = gemini_probs.get("Normal", 0.0)
                        
                        for class_name in DISEASE_CLASSES:
                            found_key = next((k for k in gemini_probs if k.lower() == class_name.lower()), None)
                            conf_val = float(gemini_probs[found_key]) if found_key else 0.0
                            conf_val = round(conf_val, 2)
                            
                            if class_name == "Normal":
                                normal_conf = conf_val
                                
                            threshold_percentage = CONFIDENCE_THRESHOLD * 100.0
                            if conf_val >= threshold_percentage:
                                severity = self.get_severity(conf_val)
                                info = DISEASE_INFO.get(class_name, {
                                    "description": "No detailed clinical description available.",
                                    "symptoms": ["Mild symptoms"],
                                    "precautions": ["Consult a medical professional"],
                                    "follow_up": "Routine checkup"
                                })
                                predictions_list.append({
                                    "disease": class_name,
                                    "confidence": conf_val,
                                    "severity": severity,
                                    "description": info["description"],
                                    "symptoms": info["symptoms"],
                                    "precautions": info["precautions"],
                                    "follow_up": info["follow_up"]
                                })
                                
                        # Sort predictions by confidence
                        predictions_list = sorted(predictions_list, key=lambda x: x["confidence"], reverse=True)
                        if len(predictions_list) == 0:
                            normal_info = DISEASE_INFO.get("Normal")
                            predictions_list.append({
                                "disease": "Normal",
                                "confidence": max(normal_conf, 100.0),
                                "severity": "Low",
                                "description": normal_info["description"],
                                "symptoms": normal_info["symptoms"],
                                "precautions": normal_info["precautions"],
                                "follow_up": normal_info["follow_up"]
                            })

                        processing_time = time.time() - start_time
                        primary = predictions_list[0]
                        
                        return {
                            "success": True,
                            "predictions": predictions_list,
                            "prediction": primary["disease"],
                            "confidence": primary["confidence"],
                            "severity": primary["severity"],
                            "normal_probability": round(normal_conf, 2),
                            "heatmap": "",  # Grad-CAM not supported directly on Gemini API
                            "heatmap_only": "",
                            "scan_quality": "Good",
                            "processing_time": f"{processing_time:.2f} sec (Gemini Vision AI)",
                            "health_advice": primary.get("precautions", ["Maintain healthy habits"]),
                            "precautions": primary.get("precautions", ["Standard checkup"]),
                            "consult_doctor_if": primary.get("symptoms", ["Symptoms persist"])
                        }
            except Exception as gem_err:
                logger.error(f"Gemini Vision API prediction failed: {gem_err}. Falling back to local PyTorch model...")

        # --- Fallback to local PyTorch model ---
        if self.model is None:
            self._load_local_model()

        # Preprocess using the default (no CLAHE, matches training)
        tensor = self.preprocessor(image).unsqueeze(0).to(self.device)

        # Predict
        with torch.no_grad():
            outputs = self.model(tensor)
            # Use Sigmoid for multi-label classification probabilities
            probabilities = torch.sigmoid(outputs)[0]

        predictions_list = []
        normal_conf = 0.0

        for idx, prob in enumerate(probabilities):
            class_name = self.classes[idx]
            conf_val = round(prob.item() * 100, 2)
            
            if class_name == "Normal":
                normal_conf = conf_val
                
            # Filter based on threshold
            # Default threshold is 50.0% (0.50)
            threshold_percentage = CONFIDENCE_THRESHOLD * 100.0
            if conf_val >= threshold_percentage:
                severity = self.get_severity(conf_val)
                info = DISEASE_INFO.get(class_name, {
                    "description": "No detailed clinical description available.",
                    "symptoms": ["Mild symptoms"],
                    "precautions": ["Consult a medical professional"],
                    "follow_up": "Routine checkup"
                })
                
                predictions_list.append({
                    "disease": class_name,
                    "confidence": conf_val,
                    "severity": severity,
                    "description": info["description"],
                    "symptoms": info["symptoms"],
                    "precautions": info["precautions"],
                    "follow_up": info["follow_up"]
                })

        # Sort predictions by confidence
        predictions_list = sorted(predictions_list, key=lambda x: x["confidence"], reverse=True)

        # Grad-CAM heatmap generation for top prediction (if any)
        heatmap_b64 = ""
        overlay_b64 = ""
        
        if len(predictions_list) > 0:
            top_class = predictions_list[0]["disease"]
            try:
                top_class_idx = self.classes.index(top_class)
                # Enable gradients for backward pass
                tensor.requires_grad = True
                heatmap = self.grad_cam.generate_heatmap(tensor, top_class_idx)
                heatmap_b64, overlay_b64 = overlay_heatmap(heatmap, image)
            except Exception as e:
                logger.error(f"Grad-CAM error: {e}")

        # If no diseases detected, return Normal
        if len(predictions_list) == 0:
            normal_info = DISEASE_INFO.get("Normal")
            predictions_list.append({
                "disease": "Normal",
                "confidence": max(normal_conf, 100.0 - sum(p.item() for p in probabilities)),
                "severity": "Low",
                "description": normal_info["description"],
                "symptoms": normal_info["symptoms"],
                "precautions": normal_info["precautions"],
                "follow_up": normal_info["follow_up"]
            })

        processing_time = time.time() - start_time
        
        # Populate dynamic lists for legacy frontend compatibility
        primary = predictions_list[0]
        health_advice = primary.get("precautions", ["Maintain healthy habits"])
        precautions = primary.get("precautions", ["Standard checkup"])
        consult_doctor_if = primary.get("symptoms", ["Symptoms persist"])

        return {
            "success": True,
            "predictions": predictions_list,
            "prediction": primary["disease"],  # Legacy compatibility
            "confidence": primary["confidence"],  # Legacy compatibility
            "severity": primary["severity"],  # Legacy compatibility
            "normal_probability": round(normal_conf, 2),
            "heatmap": overlay_b64,  # Overlaid Grad-CAM
            "heatmap_only": heatmap_b64,
            "scan_quality": "Good",
            "processing_time": f"{processing_time:.2f} sec",
            "health_advice": health_advice,  # Legacy compatibility
            "precautions": precautions,  # Legacy compatibility
            "consult_doctor_if": consult_doctor_if,  # Legacy compatibility
            "symptoms": primary.get("symptoms", ["Cough", "Fever"])
        }