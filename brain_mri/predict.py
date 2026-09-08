"""
Brain Tumor MRI Classification - Standalone Inference & Testing Script
Supports standalone prediction using existing trained ResNet-18 model checkpoint.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, Any, Union, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet18
from PIL import Image
import torchvision.transforms as T

# Exact class labels matching ImageFolder sorted directory names
CLASS_LABELS = ["glioma", "meningioma", "notumor", "pituitary"]

# Exact preprocessing transforms used in dataset.py / training.py
INFERENCE_TRANSFORMS = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def find_model_path(custom_path: Optional[str] = None) -> Path:
    """Find the model weights file across common relative locations."""
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p
        raise FileNotFoundError(f"Specified model path does not exist: {custom_path}")

    current_dir = Path(__file__).resolve().parent
    candidates = [
        current_dir / "models" / "brain_tumor_resnet18.pth",
        current_dir / "brain_mri" / "models" / "brain_tumor_resnet18.pth",
        Path.cwd() / "models" / "brain_tumor_resnet18.pth",
        Path.cwd() / "brain_mri" / "models" / "brain_tumor_resnet18.pth",
        current_dir.parent / "models" / "brain_tumor_resnet18.pth",
        current_dir.parent / "brain_mri" / "models" / "brain_tumor_resnet18.pth",
    ]

    for cand in candidates:
        if cand.exists():
            return cand

    raise FileNotFoundError(
        "Could not automatically locate 'brain_tumor_resnet18.pth'. "
        "Please provide --model path explicitly."
    )


def load_model(
    model_path: Optional[str] = None,
    device: Optional[torch.device] = None,
    num_classes: int = 4
) -> nn.Module:
    """
    Builds the ResNet-18 architecture and loads trained checkpoint weights.
    Seamlessly supports both CPU and GPU (CUDA).
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    weights_file = find_model_path(model_path)
    
    # Initialize ResNet-18 architecture without downloading ImageNet weights
    model = resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)

    # Load checkpoint onto target device
    state_dict = torch.load(weights_file, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    return model


def preprocess_image(image_input: Union[str, Path, Image.Image]) -> torch.Tensor:
    """
    Loads and preprocesses an MRI image for model inference.
    Accepts a filepath or PIL Image instance.
    """
    if isinstance(image_input, (str, Path)):
        img_path = Path(image_input)
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found at: {img_path}")
        image = Image.open(img_path)
    elif isinstance(image_input, Image.Image):
        image = image_input
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    # Ensure 3-channel RGB
    image = image.convert("RGB")
    tensor = INFERENCE_TRANSFORMS(image)
    return tensor.unsqueeze(0)  # Shape: [1, 3, 224, 224]


def predict_image(
    image_input: Union[str, Path, Image.Image],
    model: Optional[nn.Module] = None,
    device: Optional[torch.device] = None,
    model_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Runs prediction on a single MRI image.
    Returns predicted class, confidence, and full probability distribution.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if model is None:
        model = load_model(model_path=model_path, device=device)

    tensor = preprocess_image(image_input).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = F.softmax(outputs, dim=1)[0]
        predicted_idx = torch.argmax(probabilities).item()

    pred_label = CLASS_LABELS[predicted_idx]
    pred_conf = probabilities[predicted_idx].item()

    class_probs = {
        label: round(probabilities[i].item() * 100, 2)
        for i, label in enumerate(CLASS_LABELS)
    }

    return {
        "prediction": pred_label,
        "confidence_pct": round(pred_conf * 100, 2),
        "confidence_raw": pred_conf,
        "class_probabilities": class_probs,
        "device": str(device)
    }


def run_tests():
    """Runs prediction across available sample MRI images in the dataset."""
    print("=" * 65)
    print("      RUNNING BRAIN MRI MODEL STANDALONE TEST SUITE")
    print("=" * 65)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_file = find_model_path()
    print(f"Model Checkpoint : {model_file}")
    print(f"Inference Device : {device}")
    print(f"Classes          : {CLASS_LABELS}")
    print("-" * 65)

    model = load_model(device=device)

    # Search for sample images across categories
    base_dirs = [
        Path(__file__).resolve().parent / "data" / "raw",
        Path(__file__).resolve().parent / "brain_mri" / "data" / "raw",
        Path.cwd() / "data" / "raw",
        Path.cwd() / "brain_mri" / "data" / "raw",
    ]

    sample_images = []
    for base in base_dirs:
        if base.exists():
            for label in CLASS_LABELS:
                folder = base / label
                if folder.exists():
                    files = list(folder.glob("*.jpg")) + list(folder.glob("*.png")) + list(folder.glob("*.jpeg"))
                    if files:
                        sample_images.append((label, files[0]))
            if sample_images:
                break

    if not sample_images:
        print("No sample images found in data/raw to run automated test.")
        return

    correct_count = 0
    for expected_label, img_path in sample_images:
        result = predict_image(img_path, model=model, device=device)
        is_match = result["prediction"] == expected_label
        if is_match:
            correct_count += 1
        status = "[PASS]" if is_match else "[FAIL]"
        
        print(f"{status} Image: {img_path.name}")
        print(f"       Expected  : {expected_label}")
        print(f"       Predicted : {result['prediction']} ({result['confidence_pct']}%)")
        print(f"       All Probs : {result['class_probabilities']}")
        print("-" * 65)

    print(f"Summary: {correct_count}/{len(sample_images)} samples matched expected labels.")
    print("=" * 65)


def main():
    parser = argparse.ArgumentParser(description="Brain Tumor MRI Classifier Inference")
    parser.add_argument("image", nargs="?", default=None, help="Path to MRI image file for prediction")
    parser.add_argument("--image", dest="img_flag", default=None, help="Path to MRI image file")
    parser.add_argument("--model", default=None, help="Path to brain_tumor_resnet18.pth checkpoint")
    parser.add_argument("--device", default=None, choices=["cpu", "cuda"], help="Force cpu or cuda device")
    parser.add_argument("--test", action="store_true", help="Run self-test on sample dataset images")

    args = parser.parse_args()
    image_path = args.img_flag or args.image

    if args.test or image_path is None:
        if image_path is None and not args.test:
            print("No image provided. Running sample test suite...")
        run_tests()
        if image_path is None:
            return

    dev = torch.device(args.device) if args.device else torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nAnalyzing MRI Image: {image_path}")
    print(f"Using Device: {dev}")
    
    result = predict_image(image_path, model_path=args.model, device=dev)
    
    print("\n" + "=" * 45)
    print("           PREDICTION RESULT")
    print("=" * 45)
    print(f" Diagnosis / Class : {result['prediction'].upper()}")
    print(f" Confidence        : {result['confidence_pct']}%")
    print("-" * 45)
    print(" Class Probabilities:")
    for cls_name, prob in result["class_probabilities"].items():
        bar = "#" * int(prob / 5)
        print(f"   {cls_name:<12}: {prob:6.2f}%  |{bar:<20}|")
    print("=" * 45)


if __name__ == "__main__":
    main()
