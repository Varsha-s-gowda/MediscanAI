import os
import json
import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, 
    roc_curve, auc, classification_report
)
from model import MediScanModel
from dataset import get_dataloaders
from device import get_device
from logger import get_logger, log_timing
from constants import DISEASE_CLASSES
from typing import Optional

logger = get_logger("evaluate")

@log_timing
def evaluate_model(data_dir: str, csv_file: Optional[str] = None, model_path: str = "best_model.pth"):
    device = get_device()
    
    # Load data loaders
    try:
        _, _, test_loader, classes = get_dataloaders(data_dir, csv_file=csv_file)
    except Exception as e:
        logger.error(f"Error loading datasets for evaluation: {e}")
        classes = DISEASE_CLASSES
        
    num_classes = len(classes)
    model = MediScanModel(num_classes=num_classes)
    
    if not os.path.exists(model_path):
        logger.error(f"Model file {model_path} not found. Cannot evaluate.")
        return
        
    model.load_state_dict(torch.load(model_path, map_location=device))
    model = model.to(device)
    model.eval()

    all_targets = []
    all_probs = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            # Apply Sigmoid for multi-label probabilities
            probs = torch.sigmoid(outputs)
            
            all_targets.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())

    all_targets = np.array(all_targets)
    all_probs = np.array(all_probs)
    
    # Classify predictions using 0.50 default threshold
    all_preds = (all_probs >= 0.50).astype(np.float32)

    # Compute overall multi-label metrics
    # average='macro' and average='micro' are appropriate for multilabel evaluation
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(all_targets, all_preds, average='macro', zero_division=0)
    precision_micro, recall_micro, f1_micro, _ = precision_recall_fscore_support(all_targets, all_preds, average='micro', zero_division=0)
    
    logger.info(f"Evaluation Metrics | Macro F1: {f1_macro:.4f} | Micro F1: {f1_micro:.4f}")

    # Generate Per-Class ROC and AUC Curves
    plt.figure(figsize=(12, 10))
    class_auc_scores = {}
    
    for i in range(num_classes):
        if i < all_probs.shape[1] and len(np.unique(all_targets[:, i])) > 1:
            fpr, tpr, _ = roc_curve(all_targets[:, i], all_probs[:, i])
            roc_auc = auc(fpr, tpr)
            class_auc_scores[classes[i]] = float(roc_auc)
            plt.plot(fpr, tpr, label=f'{classes[i]} (AUC = {roc_auc:.2f})')
            
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic (ROC) Curve - Multi-label')
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig('roc_curve_multilabel.png')
    plt.close()

    # Classification report mapping
    report = classification_report(all_targets, all_preds, target_names=classes, output_dict=True, zero_division=0)
    
    metrics_summary = {
        "macro_precision": precision_macro,
        "macro_recall": recall_macro,
        "macro_f1": f1_macro,
        "micro_precision": precision_micro,
        "micro_recall": recall_micro,
        "micro_f1": f1_micro,
        "per_class_auc": class_auc_scores,
        "classification_report": report
    }

    # Save to metrics.json
    with open("metrics.json", "w") as f:
        json.dump(metrics_summary, f, indent=4)
        
    logger.info("Evaluation complete. Metrics saved to metrics.json and roc_curve_multilabel.png")

if __name__ == "__main__":
    evaluate_model(data_dir="database/pnemonia database/chest_xray/chest_xray/test")
