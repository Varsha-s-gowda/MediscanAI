"""
Comprehensive Brain MRI Evaluation Script
Evaluates 'brain_tumor_resnet18.pth' on the complete dataset with detailed metrics,
confusion matrix, per-class metrics, data checks, and single-image prediction support.
"""

import os
import sys
import argparse
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet18
from torchvision.datasets import ImageFolder
import torchvision.transforms as T
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from PIL import Image

CLASS_LABELS = ["glioma", "meningioma", "notumor", "pituitary"]

EVAL_TRANSFORMS = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def locate_model_path(custom_path=None):
    if custom_path and Path(custom_path).exists():
        return Path(custom_path)
    
    candidates = [
        Path("models/brain_tumor_resnet18.pth"),
        Path("brain_mri/models/brain_tumor_resnet18.pth"),
        Path(__file__).resolve().parent / "models" / "brain_tumor_resnet18.pth",
        Path(__file__).resolve().parent / "brain_mri" / "models" / "brain_tumor_resnet18.pth",
    ]
    for c in candidates:
        if c.exists():
            return c.resolve()
    raise FileNotFoundError("Could not find 'brain_tumor_resnet18.pth'. Specify path with --model.")


def locate_data_dir(custom_path=None):
    if custom_path and Path(custom_path).exists():
        return Path(custom_path)
    
    candidates = [
        Path("data/raw"),
        Path("brain_mri/data/raw"),
        Path(__file__).resolve().parent / "data" / "raw",
        Path(__file__).resolve().parent / "brain_mri" / "data" / "raw",
    ]
    for c in candidates:
        if c.exists():
            return c.resolve()
    raise FileNotFoundError("Could not find dataset directory. Specify with --data.")


def load_model(model_path, device):
    model = resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, len(CLASS_LABELS))
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model


def predict_single_image(image_path, model, device):
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(f"Image not found at: {image_path}")
    
    img = Image.open(p).convert("RGB")
    tensor = EVAL_TRANSFORMS(img).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(tensor)
        probs = F.softmax(outputs, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
    
    pred_label = CLASS_LABELS[pred_idx]
    pred_conf = probs[pred_idx].item()
    class_probs = {cls_name: probs[i].item() * 100 for i, cls_name in enumerate(CLASS_LABELS)}
    
    return pred_label, pred_conf * 100, class_probs


def run_full_dataset_evaluation(data_dir, model, device, batch_size=64):
    print("=" * 68)
    print("        COMPREHENSIVE BRAIN MRI MODEL & DATASET EVALUATION")
    print("=" * 68)
    print(f"Dataset Location : {data_dir}")
    print(f"Evaluation Device: {device}")
    
    dataset = ImageFolder(root=data_dir, transform=EVAL_TRANSFORMS)
    print(f"Classes Found    : {dataset.classes}")
    print(f"Total Images     : {len(dataset)}")
    
    # Class breakdown
    class_counts = {cls_name: 0 for cls_name in dataset.classes}
    for _, label_idx in dataset.samples:
        class_counts[dataset.classes[label_idx]] += 1
    
    print("\nDataset Class Distribution:")
    for cls_name, count in class_counts.items():
        print(f"  - {cls_name:<12}: {count:>5} images ({count / len(dataset) * 100:.1f}%)")
    
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            preds = torch.argmax(outputs, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())
            
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    
    overall_acc = accuracy_score(all_targets, all_preds) * 100
    precision, recall, f1, support = precision_recall_fscore_support(all_targets, all_preds, labels=range(len(dataset.classes)))
    
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="macro")
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="weighted")
    
    print("\n" + "=" * 68)
    print("                    EVALUATION METRICS")
    print("=" * 68)
    print(f"Overall Accuracy      : {overall_acc:.2f}%")
    print(f"Macro Avg Precision   : {macro_p * 100:.2f}%")
    print(f"Macro Avg Recall      : {macro_r * 100:.2f}%")
    print(f"Macro Avg F1-Score    : {macro_f1 * 100:.2f}%")
    print(f"Weighted F1-Score     : {weighted_f1 * 100:.2f}%")
    print("-" * 68)
    
    print("\nPer-Class Breakdown:")
    print(f"{'Class':<14} | {'Images (Support)':<16} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("-" * 68)
    for i, cls_name in enumerate(dataset.classes):
        print(f"{cls_name:<14} | {support[i]:>16} | {precision[i]*100:>9.2f}% | {recall[i]*100:>9.2f}% | {f1[i]*100:>9.2f}%")
    print("-" * 68)
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(all_targets, all_preds)
    header = "True \\ Pred   " + " ".join([f"{c[:10]:>10}" for c in dataset.classes])
    print(header)
    print("-" * len(header))
    for i, row in enumerate(cm):
        row_str = " ".join([f"{val:>10}" for val in row])
        print(f"{dataset.classes[i][:12]:<12} | {row_str}")
    print("=" * 68)


def main():
    parser = argparse.ArgumentParser(description="Brain MRI Model Evaluation & Single Prediction")
    parser.add_argument("image", nargs="?", default=None, help="Path to single MRI image for prediction")
    parser.add_argument("--image", dest="img_flag", default=None, help="Path to single MRI image")
    parser.add_argument("--data", default=None, help="Path to dataset directory (e.g., data/raw)")
    parser.add_argument("--model", default=None, help="Path to brain_tumor_resnet18.pth")
    parser.add_argument("--device", default=None, choices=["cpu", "cuda"], help="Force CPU or CUDA")
    
    args = parser.parse_args()
    
    dev = torch.device(args.device) if args.device else torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = locate_model_path(args.model)
    model = load_model(model_path, dev)
    
    img_path = args.img_flag or args.image
    if img_path:
        pred_label, pred_conf, probs = predict_single_image(img_path, model, dev)
        print("\n" + "=" * 50)
        print("          INDIVIDUAL MRI PREDICTION")
        print("=" * 50)
        print(f" Image Path        : {img_path}")
        print(f" Predicted Class   : {pred_label.upper()}")
        print(f" Model Confidence  : {pred_conf:.2f}%")
        print("-" * 50)
        print(" Class Probabilities:")
        for cls_name, prob in probs.items():
            bar = "#" * int(prob / 5)
            print(f"   {cls_name:<12}: {prob:6.2f}%  |{bar:<20}|")
        print("=" * 50)
    else:
        data_dir = locate_data_dir(args.data)
        run_full_dataset_evaluation(data_dir, model, dev)


if __name__ == "__main__":
    main()
