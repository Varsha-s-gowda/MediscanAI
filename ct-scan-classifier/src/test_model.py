import os
import sys
import argparse
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# 1. Constants & Preprocessing (Matching training.py)
IMG_SIZE = 224

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def get_model_path():
    """Find kidney_stone_model.pth in common locations."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, 'kidney_stone_model.pth'),
        os.path.join(script_dir, '../src/kidney_stone_model.pth'),
        os.path.join(os.getcwd(), 'kidney_stone_model.pth'),
        os.path.join(os.getcwd(), 'src', 'kidney_stone_model.pth')
    ]
    for p in candidates:
        if os.path.exists(p):
            return os.path.abspath(p)
    return candidates[0]

def load_model(model_path, device):
    """Build MobileNetV2 model architecture and load trained weights."""
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model weights not found at '{model_path}'. "
            "Please ensure 'kidney_stone_model.pth' is present in the 'src' directory."
        )

    # Initialize MobileNetV2 architecture matching training.py
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.last_channel, 1)

    # Load weights
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model

def predict_image(image_path, model, device):
    """Preprocess image and return prediction, confidence, and stone probability."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at '{image_path}'.")

    # Load and ensure RGB
    img = Image.open(image_path).convert('RGB')
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(tensor)
        stone_prob = torch.sigmoid(output).item()

    if stone_prob > 0.5:
        prediction = "STONE"
        confidence = stone_prob
    else:
        prediction = "NORMAL"
        confidence = 1.0 - stone_prob

    return {
        "image_path": image_path,
        "prediction": prediction,
        "confidence": confidence,
        "stone_probability": stone_prob
    }

def print_result(result):
    """Display prediction output in a clean, formatted view."""
    print("=" * 50)
    print(f"Image Path        : {result['image_path']}")
    print(f"Prediction        : {result['prediction']}")
    print(f"Confidence        : {result['confidence'] * 100:.2f}% ({result['confidence']:.4f})")
    print(f"Stone Probability : {result['stone_probability'] * 100:.2f}% ({result['stone_probability']:.4f})")
    print("=" * 50)

def main():
    parser = argparse.ArgumentParser(description="Test Kidney Stone CT-Scan Classifier Model")
    parser.add_argument("image_path", nargs="?", default=None, help="Path to the CT scan image (e.g., .jpg, .png)")
    parser.add_argument("--model_path", type=str, default=None, help="Path to kidney_stone_model.pth")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model_file = args.model_path if args.model_path else get_model_path()
    print(f"Using Device     : {device}")
    print(f"Loading Model From: {model_file}")

    model = load_model(model_file, device)
    print("Model loaded successfully.\n")

    if args.image_path:
        result = predict_image(args.image_path, model, device)
        print_result(result)
    else:
        # Default testing: demonstrate on sample NORMAL and STONE images if available
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        sample_normal = os.path.join(base_dir, 'Data', 'train', 'normal', 'Non-Stone', '0.jpg')
        sample_stone = os.path.join(base_dir, 'Data', 'train', 'stone', '0.jpg')

        test_images = []
        if os.path.exists(sample_normal):
            test_images.append(("Sample NORMAL Image", sample_normal))
        if os.path.exists(sample_stone):
            test_images.append(("Sample STONE Image", sample_stone))

        if test_images:
            print("No image path provided. Running demo on sample dataset images:\n")
            for label, img_path in test_images:
                print(f"--- Testing {label} ---")
                res = predict_image(img_path, model, device)
                print_result(res)
                print()
            print("Tip: You can pass any image path directly:")
            print("  python src/test_model.py <path_to_image.jpg>")
        else:
            print("Please provide an image path to test:")
            print("  python src/test_model.py <path_to_image.jpg>")

if __name__ == "__main__":
    main()
