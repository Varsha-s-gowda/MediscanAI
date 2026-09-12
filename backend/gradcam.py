import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
import base64
from io import BytesIO
from typing import Tuple, Optional, Union
import os
import time
import logging

logger = logging.getLogger(__name__)

def find_target_layer(model: nn.Module) -> nn.Module:
    """
    Automatically discovers the most appropriate final convolutional or feature 
    normalization layer in any PyTorch vision model.
    """
    if model is None:
        raise ValueError("Model is None; cannot locate target layer.")

    # 1. DenseNet / EfficientNet with backbone
    if hasattr(model, "backbone"):
        bb = model.backbone
        if hasattr(bb, "features"):
            if hasattr(bb.features, "denseblock4"):
                # DenseNet121: last denselayer in denseblock4 or norm5
                if hasattr(bb.features.denseblock4, "denselayer16"):
                    return bb.features.denseblock4.denselayer16.conv2
                return bb.features.denseblock4
            elif isinstance(bb.features, (nn.Sequential, list)) and len(bb.features) > 0:
                # EfficientNet: last stage
                last_stage = bb.features[-1]
                if isinstance(last_stage, (nn.Sequential, list)) and len(last_stage) > 0:
                    return last_stage[0]
                return last_stage
            return bb.features

    # 2. ResNet architectures (ResNet-18, ResNet-50, etc.)
    if hasattr(model, "layer4"):
        last_block = model.layer4[-1]
        if hasattr(last_block, "conv3"):
            return last_block.conv3
        elif hasattr(last_block, "conv2"):
            return last_block.conv2
        return last_block

    # 3. MobileNet / VGG features
    if hasattr(model, "features"):
        if isinstance(model.features, nn.Sequential) and len(model.features) > 0:
            return model.features[-1]
        return model.features

    # 4. Reverse search for the last Conv2d or BatchNorm2d layer
    for name, module in reversed(list(model.named_modules())):
        if isinstance(module, (nn.Conv2d, nn.BatchNorm2d)):
            return module

    raise ValueError("Could not automatically locate a convolutional target layer in the model.")


class GradCAM:
    """
    Refined, clinically targeted Grad-CAM engine with automatic layer discovery,
    robust gradient targeting, feature-map contrast enhancement, and background suppression.
    """
    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        if target_layer is None:
            self.target_layer = find_target_layer(model)
        else:
            self.target_layer = target_layer
            
        self.gradients = None
        self.activations = None

    def save_activation(self, module, input, output):
        self.activations = output.detach()

    def save_gradient(self, module, grad_input, grad_output):
        if grad_output is not None and len(grad_output) > 0 and grad_output[0] is not None:
            self.gradients = grad_output[0].detach()

    def generate_heatmap(self, input_tensor: torch.Tensor, class_idx: int = 0) -> np.ndarray:
        """
        Generates a high-fidelity, clinically localized Grad-CAM heatmap for the specified class index.
        """
        self.model.eval()
        self.gradients = None
        self.activations = None

        # Verify target layer
        target = self.target_layer
        if target is None:
            target = find_target_layer(self.model)
            self.target_layer = target

        # Register forward and backward hooks dynamically
        f_hook = target.register_forward_hook(self.save_activation)
        b_hook = target.register_full_backward_hook(self.save_gradient)

        try:
            # Ensure input requires gradient
            if not input_tensor.requires_grad:
                input_tensor = input_tensor.clone().detach().requires_grad_(True)

            self.model.zero_grad()
            output = self.model(input_tensor)

            # Determine loss scalar based on output dimension
            if output.dim() == 1:
                loss = output[0]
            elif output.dim() == 2:
                if output.shape[1] == 1:
                    # Single-output binary classifier (e.g. sigmoid CT stone logit)
                    loss = output[0, 0] if class_idx == 0 or class_idx == 1 else -output[0, 0]
                else:
                    safe_idx = min(max(0, class_idx), output.shape[1] - 1)
                    loss = output[0, safe_idx]
            else:
                loss = output.view(-1)[class_idx]

            loss.backward(retain_graph=False)

            if self.gradients is None or self.activations is None:
                logger.warning("Grad-CAM hooks did not capture gradients or activations; returning blank heatmap.")
                return np.zeros((input_tensor.shape[-2], input_tensor.shape[-1]), dtype=np.float32)

            gradients = self.gradients[0]     # [C, H, W]
            activations = self.activations[0] # [C, H, W]

            # Global average pooling over spatial dimensions
            weights = torch.mean(gradients, dim=(1, 2), keepdim=True) # [C, 1, 1]

            # Weighted linear combination of activation maps
            cam = torch.sum(weights * activations, dim=0) # [H, W]

            # Rectify with ReLU to retain only positively contributing features
            cam = torch.clamp(cam, min=0)

            cam_np = cam.cpu().numpy().astype(np.float32)

            # Handle completely dark/zero activations gracefully
            if np.all(cam_np <= 0) or np.isnan(cam_np).all():
                return np.zeros((input_tensor.shape[-2], input_tensor.shape[-1]), dtype=np.float32)

            # Normalize to [0, 1] with robust scaling
            min_val = np.min(cam_np)
            max_val = np.max(cam_np)
            if max_val - min_val > 1e-7:
                cam_np = (cam_np - min_val) / (max_val - min_val)
            else:
                return np.zeros((input_tensor.shape[-2], input_tensor.shape[-1]), dtype=np.float32)

            # Clinical refinement: Contrast power curve & soft background thresholding
            # This suppresses broad, diffuse background glow while sharpening focal diagnostic targets (lesions, caries, stones)
            cam_np = np.power(cam_np, 1.5)
            
            # Smoothly attenuate weak ambient activations (< 0.12)
            bg_threshold = 0.12
            cam_np = np.where(
                cam_np < bg_threshold,
                0.0,
                (cam_np - bg_threshold) / (1.0 - bg_threshold)
            )

            return cam_np.astype(np.float32)

        except Exception as e:
            logger.error(f"Grad-CAM generation error: {e}")
            return np.zeros((input_tensor.shape[-2], input_tensor.shape[-1]), dtype=np.float32)
        finally:
            f_hook.remove()
            b_hook.remove()


def overlay_heatmap(
    heatmap: np.ndarray,
    original_img: Image.Image,
    alpha: float = 0.55
) -> Tuple[str, str]:
    """
    Overlays a smooth, clinically localized heatmap onto the original image using 
    adaptive intensity-weighted alpha blending so non-pathological areas remain sharp.
    
    Returns:
        Tuple of (heatmap_base64, overlay_base64) data URLs.
    """
    orig_np = np.array(original_img)
    if len(orig_np.shape) == 2:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_GRAY2BGR)
    elif orig_np.shape[2] == 4:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_RGBA2BGR)
    else:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_RGB2BGR)

    h_target, w_target = orig_np.shape[0], orig_np.shape[1]

    # Resize heatmap with bicubic interpolation for smooth medical gradients
    heatmap_resized = cv2.resize(heatmap, (w_target, h_target), interpolation=cv2.INTER_CUBIC)
    heatmap_resized = np.clip(heatmap_resized, 0.0, 1.0)

    # Optional gentle spatial Gaussian smoothing to eliminate blocky pixel edges
    if heatmap_resized.max() > 0:
        kernel_size = max(5, int(min(h_target, w_target) * 0.03))
        if kernel_size % 2 == 0:
            kernel_size += 1
        heatmap_resized = cv2.GaussianBlur(heatmap_resized, (kernel_size, kernel_size), 0)
        heatmap_resized = np.clip(heatmap_resized, 0.0, 1.0)

    # Convert to 8-bit color map
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    # Adaptive intensity-weighted overlay:
    # Where heatmap activation is near 0, alpha is 0 (original image has 100% clarity).
    # Where heatmap reaches peak hotspot, alpha smoothly rises to ~0.60.
    alpha_mask = np.clip(heatmap_resized[:, :, np.newaxis] * alpha * 1.3, 0.0, 0.65)
    overlay = (heatmap_color.astype(np.float32) * alpha_mask + orig_np.astype(np.float32) * (1.0 - alpha_mask))
    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    # Encode to Base64
    _, overlay_buffer = cv2.imencode('.png', overlay)
    overlay_base64 = base64.b64encode(overlay_buffer).decode('utf-8')

    _, heatmap_buffer = cv2.imencode('.png', heatmap_color)
    heatmap_base64 = base64.b64encode(heatmap_buffer).decode('utf-8')

    return f"data:image/png;base64,{heatmap_base64}", f"data:image/png;base64,{overlay_base64}"


def save_gradcam_images(
    heatmap: np.ndarray,
    original_img: Image.Image,
    output_dir: str,
    prefix: str,
    alpha: float = 0.55
) -> Tuple[str, str]:
    """
    Saves high-fidelity heatmap and overlay files to disk, returning their relative filenames.
    """
    os.makedirs(output_dir, exist_ok=True)

    orig_np = np.array(original_img)
    if len(orig_np.shape) == 2:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_GRAY2BGR)
    elif orig_np.shape[2] == 4:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_RGBA2BGR)
    else:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_RGB2BGR)

    h_target, w_target = orig_np.shape[0], orig_np.shape[1]

    # Resize and smooth
    heatmap_resized = cv2.resize(heatmap, (w_target, h_target), interpolation=cv2.INTER_CUBIC)
    heatmap_resized = np.clip(heatmap_resized, 0.0, 1.0)

    if heatmap_resized.max() > 0:
        kernel_size = max(5, int(min(h_target, w_target) * 0.03))
        if kernel_size % 2 == 0:
            kernel_size += 1
        heatmap_resized = cv2.GaussianBlur(heatmap_resized, (kernel_size, kernel_size), 0)
        heatmap_resized = np.clip(heatmap_resized, 0.0, 1.0)

    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    alpha_mask = np.clip(heatmap_resized[:, :, np.newaxis] * alpha * 1.3, 0.0, 0.65)
    overlay = (heatmap_color.astype(np.float32) * alpha_mask + orig_np.astype(np.float32) * (1.0 - alpha_mask))
    overlay = np.clip(overlay, 0, 255).astype(np.uint8)

    timestamp = int(time.time() * 1000)
    heatmap_filename = f"{prefix}_{timestamp}_heatmap.png"
    overlay_filename = f"{prefix}_{timestamp}_overlay.png"

    heatmap_path = os.path.join(output_dir, heatmap_filename)
    overlay_path = os.path.join(output_dir, overlay_filename)

    cv2.imwrite(heatmap_path, heatmap_color)
    cv2.imwrite(overlay_path, overlay)

    return heatmap_filename, overlay_filename
