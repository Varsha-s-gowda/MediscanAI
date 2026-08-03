import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import base64
from io import BytesIO
from typing import Tuple

class GradCAM:
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output.detach()

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate_heatmap(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """Generates a Grad-CAM heatmap for the specified class index."""
        self.model.eval()
        output = self.model(input_tensor)
        
        self.model.zero_grad()
        loss = output[0, class_idx]
        loss.backward()

        # Get gradients and activations
        gradients = self.gradients[0]  # shape: [C, H, W]
        activations = self.activations[0]  # shape: [C, H, W]

        # Global average pool gradients
        weights = torch.mean(gradients, dim=(1, 2), keepdim=True)  # shape: [C, 1, 1]

        # Weighted combination of activations
        cam = torch.sum(weights * activations, dim=0)  # shape: [H, W]
        
        # Apply ReLU
        cam = torch.clamp(cam, min=0)
        
        # Normalize cam between 0 and 1
        cam_np = cam.cpu().numpy()
        if cam_np.max() > 0:
            cam_np = cam_np / cam_np.max()
        
        return cam_np

def overlay_heatmap(heatmap: np.ndarray, original_img: Image.Image, alpha: float = 0.4) -> Tuple[str, str]:
    """Overlays heatmap on original image, returns Base64 string of Heatmap and Overlay."""
    # Convert original PIL image to numpy array in BGR
    orig_np = np.array(original_img)
    if len(orig_np.shape) == 2:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_GRAY2BGR)
    else:
        orig_np = cv2.cvtColor(orig_np, cv2.COLOR_RGB2BGR)

    # Resize heatmap to match original image size
    heatmap_resized = cv2.resize(heatmap, (orig_np.shape[1], orig_np.shape[0]))
    
    # Scale heatmap to [0, 255] and convert to colormap
    heatmap_color = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_color, cv2.COLORMAP_JET)

    # Superimpose heatmap on original image
    overlay = cv2.addWeighted(heatmap_color, alpha, orig_np, 1 - alpha, 0)

    # Save to base64
    _, overlay_buffer = cv2.imencode('.png', overlay)
    overlay_base64 = base64.b64encode(overlay_buffer).decode('utf-8')

    _, heatmap_buffer = cv2.imencode('.png', heatmap_color)
    heatmap_base64 = base64.b64encode(heatmap_buffer).decode('utf-8')

    return heatmap_base64, overlay_base64
