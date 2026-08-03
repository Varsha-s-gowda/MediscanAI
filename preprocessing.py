import cv2
import numpy as np
from PIL import Image
import torch
from torchvision import transforms
from typing import Union

class MedicalImagePreprocessor:
    def __init__(self, target_size: int = 224):
        self.target_size = target_size
        self.normalize_transform = transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )

    def preprocess_cv2(self, img_np: np.ndarray, apply_clahe: bool = False, apply_denoise: bool = False) -> np.ndarray:
        """Applies denoising, CLAHE, and standardizes channels for chest X-rays."""
        # Convert to grayscale if it is RGB
        if len(img_np.shape) == 3:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_np.copy()

        # Denoising
        if apply_denoise:
            gray = cv2.GaussianBlur(gray, (3, 3), 0)

        # CLAHE (Contrast Limited Adaptive Histogram Equalization) for lung features
        if apply_clahe:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)

        # Convert back to 3 channel RGB representation
        rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
        return rgb

    def __call__(self, img: Union[Image.Image, np.ndarray], apply_clahe: bool = False, apply_denoise: bool = False) -> torch.Tensor:
        """Converts PIL or numpy image to fully preprocessed PyTorch Tensor ready for model input."""
        if not apply_clahe and not apply_denoise:
            # Bypass OpenCV entirely to maintain exact pixel parity with the original PIL training pipeline
            if isinstance(img, np.ndarray):
                img_pil = Image.fromarray(img).convert("RGB")
            else:
                img_pil = img.convert("RGB")
        else:
            if isinstance(img, Image.Image):
                img_np = np.array(img.convert("RGB"))
            else:
                img_np = img.copy()

            # Preprocess using CV2 methods
            proc_np = self.preprocess_cv2(img_np, apply_clahe=apply_clahe, apply_denoise=apply_denoise)
            img_pil = Image.fromarray(proc_np)

        # Resize, ToTensor, and Normalize
        eval_transform = transforms.Compose([
            transforms.Resize((self.target_size, self.target_size)),
            transforms.ToTensor(),
            self.normalize_transform
        ])
        
        return eval_transform(img_pil)
