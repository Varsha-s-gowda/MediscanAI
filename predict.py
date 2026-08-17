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
from config import MODEL_PATH, CONFIDENCE_THRESHOLD, GEMINI_API_KEY, OPENROUTER_API_KEY, HF_API_KEY, DISABLE_GRADCAM
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
        if not DISABLE_GRADCAM:
            self.grad_cam = GradCAM(self.model, self.target_layer)
        else:
            logger.info("Skipping Grad-CAM initialization to save memory.")
        
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
        
        # Check if API Keys are configured
        gemini_probs = None
        
        # 1. Try Direct Google Gemini API first if key is present
        used_api = "Direct Gemini API"
        if GEMINI_API_KEY:
            gemini_models = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]
            for model_name in gemini_models:
                try:
                    # Resize image to max 512x512 before encoding — full-res X-rays cause silent API failures
                    api_image = image.convert("RGB")
                    api_image.thumbnail((512, 512), Image.LANCZOS)
                    buffered = io.BytesIO()
                    api_image.save(buffered, format="JPEG", quality=85)
                    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                    logger.info(f"Image resized for Direct {model_name} API: {api_image.size}, base64 size: {len(img_b64)} chars")

                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
                    headers = {"Content-Type": "application/json"}
                    
                    prompt = (
                        "You are an expert board-certified thoracic radiologist. "
                        "You must analyze the input image and return a JSON object with exactly 13 keys:\n"
                        "1. 'is_chest_xray': boolean (true if the image is a frontal/lateral chest radiograph/X-ray, false if it is a cartoon, illustration, portrait of a person, pet, everyday object, or any non-chest-X-ray image).\n"
                        "2. 'Normal': float (percentage 0.0 to 100.0 representing probability of normal lung fields).\n"
                        "3. 'Pneumonia': float (percentage 0.0 to 100.0 representing probability of standard pneumonia).\n"
                        "4. 'Tuberculosis': float (percentage 0.0 to 100.0 representing probability of tuberculosis).\n"
                        "5. 'COVID-19': float (percentage 0.0 to 100.0 representing probability of COVID-19 infection or COVID pneumonia).\n"
                        "6. 'Pleural Effusion': float (percentage 0.0 to 100.0 representing probability of abnormal fluid in the pleural space).\n"
                        "7. 'Pneumothorax': float (percentage 0.0 to 100.0 representing probability of collapsed lung/air in pleural space).\n"
                        "8. 'Atelectasis': float (percentage 0.0 to 100.0 representing probability of partial/complete lung collapse).\n"
                        "9. 'Pulmonary Edema': float (percentage 0.0 to 100.0 representing probability of fluid accumulation in lung tissue).\n"
                        "10. 'Lung Mass/Nodule': float (percentage 0.0 to 100.0 representing probability of abnormal lung growths or lesions).\n"
                        "11. 'Emphysema': float (percentage 0.0 to 100.0 representing probability of damaged air sacs).\n"
                        "12. 'Fibrosis': float (percentage 0.0 to 100.0 representing probability of lung tissue scarring).\n"
                        "13. 'Cardiomegaly': float (percentage 0.0 to 100.0 representing probability of enlarged heart).\n\n"
                        "If 'is_chest_xray' is false, set all the probability float scores to 0.0.\n"
                        "If 'is_chest_xray' is true, estimate the probability for each of these conditions based on radiographic features.\n"
                        "Ensure your response is ONLY the raw JSON object matching this schema. Do not include markdown code block formatting (like ```json)."
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

                    res = requests.post(url, headers=headers, json=payload, timeout=45)
                    if res.status_code != 200:
                        logger.error(f"Direct {model_name} API error {res.status_code}: {res.text[:500]}")
                    else:
                        res_json = res.json()
                        candidates = res_json.get("candidates", [])
                        if not candidates:
                            logger.error(f"Direct {model_name} API returned empty candidates. Response: {res_json}")
                        else:
                            content_text = candidates[0]["content"]["parts"][0]["text"].strip()
                            # Extract JSON object substring robustly (handles markdown code blocks and conversational filler)
                            start_idx = content_text.find('{')
                            end_idx = content_text.rfind('}')
                            if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
                                content_text = content_text[start_idx:end_idx+1]
                            gemini_probs = json.loads(content_text)
                            used_api = f"Direct {model_name} API"
                            logger.info(f"Successfully fetched predictions using Direct {model_name} API")
                            break
                except Exception as api_err:
                    logger.error(f"Direct {model_name} API call failed: {api_err}")


        # 2. Try Hugging Face API fallback if Direct Gemini API failed and HF_API_KEY is present
        used_api = "Direct Gemini 3.1 Flash Lite API"
        if not gemini_probs and HF_API_KEY:
            try:
                # Resize image to max 512x512 before encoding — full-res X-rays cause silent API failures
                api_image = image.convert("RGB")
                api_image.thumbnail((512, 512), Image.LANCZOS)
                buffered = io.BytesIO()
                api_image.save(buffered, format="JPEG", quality=85)
                img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                logger.info(f"Image resized for Hugging Face API: {api_image.size}, base64 size: {len(img_b64)} chars")

                url = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {HF_API_KEY}",
                    "Content-Type": "application/json"
                }

                prompt = (
                    "You are an expert board-certified thoracic radiologist. "
                    "You must analyze the input image and return a JSON object with exactly 13 keys:\n"
                    "1. 'is_chest_xray': boolean (true if the image is a frontal/lateral chest radiograph/X-ray, false if it is a cartoon, illustration, portrait of a person, pet, everyday object, or any non-chest-X-ray image).\n"
                    "2. 'Normal': float (percentage 0.0 to 100.0 representing probability of normal lung fields).\n"
                    "3. 'Pneumonia': float (percentage 0.0 to 100.0 representing probability of standard pneumonia).\n"
                    "4. 'Tuberculosis': float (percentage 0.0 to 100.0 representing probability of tuberculosis).\n"
                    "5. 'COVID-19': float (percentage 0.0 to 100.0 representing probability of COVID-19 infection or COVID pneumonia).\n"
                    "6. 'Pleural Effusion': float (percentage 0.0 to 100.0 representing probability of abnormal fluid in the pleural space).\n"
                    "7. 'Pneumothorax': float (percentage 0.0 to 100.0 representing probability of collapsed lung/air in pleural space).\n"
                    "8. 'Atelectasis': float (percentage 0.0 to 100.0 representing probability of partial/complete lung collapse).\n"
                    "9. 'Pulmonary Edema': float (percentage 0.0 to 100.0 representing probability of fluid accumulation in lung tissue).\n"
                    "10. 'Lung Mass/Nodule': float (percentage 0.0 to 100.0 representing probability of abnormal lung growths or lesions).\n"
                    "11. 'Emphysema': float (percentage 0.0 to 100.0 representing probability of damaged air sacs).\n"
                    "12. 'Fibrosis': float (percentage 0.0 to 100.0 representing probability of lung tissue scarring).\n"
                    "13. 'Cardiomegaly': float (percentage 0.0 to 100.0 representing probability of enlarged heart).\n\n"
                    "If 'is_chest_xray' is false, set all the probability float scores to 0.0.\n"
                    "If 'is_chest_xray' is true, estimate the probability for each of these conditions based on radiographic features.\n"
                    "Ensure your response is ONLY the raw JSON object matching this schema. Do not include markdown code block formatting (like ```json)."
                )

                payload = {
                    "model": "Qwen/Qwen2.5-VL-7B-Instruct",
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
                    ]
                }

                res = requests.post(url, headers=headers, json=payload, timeout=45)
                if res.status_code != 200:
                    logger.error(f"Hugging Face API error {res.status_code}: {res.text[:500]}")
                else:
                    res_json = res.json()
                    choices = res_json.get("choices", [])
                    if choices:
                        content_text = choices[0]["message"]["content"].strip()
                        if content_text.startswith("```"):
                            lines = content_text.split("\n")
                            content_text = "\n".join([line for line in lines if not line.strip().startswith("```")])
                        gemini_probs = json.loads(content_text)
                        used_api = "Hugging Face Qwen2.5-VL API"
                        logger.info("Successfully fetched predictions using Hugging Face API")
            except Exception as hf_err:
                logger.error(f"Hugging Face API call failed: {hf_err}")

        # Process the predictions if Direct Gemini API or Hugging Face succeeded
        if gemini_probs:
            try:
                # Handle invalid image error returned by LLM
                if "error" in gemini_probs or not gemini_probs.get("is_chest_xray", True):

                    processing_time = time.time() - start_time
                    return {
                        "success": False,
                        "predictions": [],
                        "prediction": "Invalid image / Not an X-ray",
                        "confidence": 0.0,
                        "severity": "Low",
                        "normal_probability": 0.0,
                        "heatmap": "",
                        "heatmap_only": "",
                        "scan_quality": "Invalid",
                        "processing_time": f"{processing_time:.2f} sec ({used_api})",
                        "health_advice": ["Please upload a valid chest X-ray image for diagnosis."],
                        "precautions": ["Ensure image is a frontal/lateral chest radiograph"],
                        "consult_doctor_if": ["N/A"],
                        "symptoms": ["N/A"]
                    }

                predictions_list = []
                normal_conf = gemini_probs.get("Normal", 0.0)
                
                for finding_name, val in gemini_probs.items():
                    if finding_name == "is_chest_xray" or finding_name.lower() == "lung opacity":
                        continue
                    conf_val = float(val)
                    conf_val = round(conf_val, 2)
                    
                    if finding_name.lower() == "normal":
                        normal_conf = conf_val
                        
                    threshold_percentage = 30.0  # Lower threshold so TB/COVID-19 surface properly
                    if conf_val >= threshold_percentage:
                        severity = self.get_severity(conf_val)
                        
                        # Map to existing disease metadata keys
                        mapped_name = finding_name
                        if finding_name == "Pleural Effusion":
                            mapped_name = "Effusion"
                        elif finding_name == "Pulmonary Edema":
                            mapped_name = "Edema"
                        elif finding_name == "Lung Mass/Nodule":
                            mapped_name = "Mass"
                            
                        info = DISEASE_INFO.get(mapped_name, {
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
                    "heatmap": "",  # Grad-CAM not supported directly on API
                    "heatmap_only": "",
                    "scan_quality": "Good",
                    "processing_time": f"{processing_time:.2f} sec ({used_api})",
                    "health_advice": primary.get("precautions", ["Maintain healthy habits"]),
                    "precautions": primary.get("precautions", ["Standard checkup"]),
                    "consult_doctor_if": primary.get("symptoms", ["Symptoms persist"]),
                    "symptoms": primary.get("symptoms", ["Cough", "Fever"])
                }
            except Exception as parse_err:
                logger.error(f"Failed to parse API predictions: {parse_err}. Falling back to local model...")

        # Check if Gemini API Key is configured for 18-disease zero-shot vision prediction
        if GEMINI_API_KEY:
            try:
                # Convert PIL Image to base64 JPEG
                buffered = io.BytesIO()
                image.convert("RGB").save(buffered, format="JPEG")
                img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

                # Setup payload
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={GEMINI_API_KEY}"
                prompt = (
                    "Analyze this chest X-ray and return a JSON mapping of probability percentages (0 to 100) for these 17 thoracic conditions: "
                    "Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema, Fibrosis, Hernia, Infiltration, Mass, Nodule, Pleural Thickening, Pneumonia, Pneumothorax, COVID-19, Tuberculosis, Normal. "
                    "Make sure that your response is ONLY a single valid JSON object containing exactly these 17 keys mapped to their estimated probability values (as floats between 0.0 and 100.0). Do not include markdown code block syntax (like ```json)."
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
        
        if len(predictions_list) > 0 and not DISABLE_GRADCAM:
            top_class = predictions_list[0]["disease"]
            try:
                top_class_idx = self.classes.index(top_class)
                # Enable gradients for backward pass
                tensor.requires_grad = True
                heatmap = self.grad_cam.generate_heatmap(tensor, top_class_idx)
                heatmap_b64, overlay_b64 = overlay_heatmap(heatmap, image)
            except Exception as e:
                logger.error(f"Grad-CAM error: {e}")
        elif DISABLE_GRADCAM:
            logger.info("Grad-CAM generation is disabled to optimize memory footprint.")

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