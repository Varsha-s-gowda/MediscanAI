import os
import sys
import argparse
import time
from typing import List, Tuple

from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


# ---------------------------------------------------------
# Classes used by THIS classifier
# 0 = Normal
# 1 = Cavity
# ---------------------------------------------------------
CAVITY_CLASSES = ["Normal", "Cavity"]


# ---------------------------------------------------------
# Dataset
# ---------------------------------------------------------
class CavityDataset(Dataset):

    def __init__(self, root_split_dir: str, transform=None):
        self.split_dir = root_split_dir
        self.images_dir = os.path.join(root_split_dir, "images")
        self.labels_dir = os.path.join(root_split_dir, "labelTxt")
        self.transform = transform

        self.samples: List[Tuple[str, int]] = []

        if not os.path.exists(self.images_dir):
            raise ValueError(f"Images folder not found: {self.images_dir}")

        image_files = [
            f for f in os.listdir(self.images_dir)
            if f.lower().endswith((".png", ".jpg", ".jpeg"))
        ]

        for img_name in sorted(image_files):

            img_path = os.path.join(self.images_dir, img_name)

            txt_name = os.path.splitext(img_name)[0] + ".txt"
            txt_path = os.path.join(self.labels_dir, txt_name)

            # Default = Normal
            label_idx = 0

            if os.path.exists(txt_path):

                try:
                    with open(
                        txt_path,
                        "r",
                        encoding="utf-8",
                        errors="ignore"
                    ) as lf:

                        content = lf.read().lower()

                        # If ANY annotation contains "cavity",
                        # classify the whole image as Cavity.
                        if "cavity" in content:
                            label_idx = 1

                except Exception as e:
                    print(f"Warning reading {txt_path}: {e}")

            else:

                # Fallback based on filename
                lower_name = img_name.lower()

                if "cavity" in lower_name or "unhealthy" in lower_name:
                    label_idx = 1

            self.samples.append((img_path, label_idx))

        cavity_count = sum(
            1 for _, label in self.samples if label == 1
        )

        normal_count = sum(
            1 for _, label in self.samples if label == 0
        )

        print(
            f"Loaded {len(self.samples)} images from {root_split_dir}"
        )

        print(
            f"    Cavity: {cavity_count}"
        )

        print(
            f"    Normal: {normal_count}"
        )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):

        img_path, label = self.samples[idx]

        img = Image.open(img_path).convert("RGB")

        if self.transform:
            img = self.transform(img)

        return img, torch.tensor(label, dtype=torch.long)


# ---------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------
def get_transforms(img_size=224):

    train_transform = transforms.Compose([

        transforms.Resize((img_size, img_size)),

        # Mild augmentation suitable for dental X-rays
        transforms.RandomHorizontalFlip(p=0.5),

        transforms.RandomRotation(
            degrees=10
        ),

        transforms.RandomAffine(
            degrees=0,
            translate=(0.05, 0.05),
            scale=(0.95, 1.05)
        ),

        transforms.ColorJitter(
            brightness=0.08,
            contrast=0.12
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    val_transform = transforms.Compose([

        transforms.Resize((img_size, img_size)),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    return train_transform, val_transform


# ---------------------------------------------------------
# EfficientNet-B0 classifier
# ---------------------------------------------------------
class CavityClassifier(nn.Module):

    def __init__(self, num_classes=2):

        super().__init__()

        self.backbone = efficientnet_b0(
            weights=EfficientNet_B0_Weights.DEFAULT
        )

        num_features = self.backbone.classifier[1].in_features

        self.backbone.classifier = nn.Sequential(

            nn.Dropout(0.35),

            nn.Linear(
                num_features,
                256
            ),

            nn.SiLU(),

            nn.Dropout(0.20),

            nn.Linear(
                256,
                num_classes
            )
        )

    def forward(self, x):
        return self.backbone(x)


# ---------------------------------------------------------
# Evaluation function
# ---------------------------------------------------------
def evaluate(model, loader, criterion, device):

    model.eval()

    total_loss = 0.0
    total = 0
    correct = 0

    tp = 0
    tn = 0
    fp = 0
    fn = 0

    with torch.no_grad():

        for images, labels in loader:

            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            total_loss += (
                loss.item() * images.size(0)
            )

            predictions = torch.argmax(
                outputs,
                dim=1
            )

            correct += (
                predictions == labels
            ).sum().item()

            total += labels.size(0)

            tp += (
                ((predictions == 1) & (labels == 1))
            ).sum().item()

            tn += (
                ((predictions == 0) & (labels == 0))
            ).sum().item()

            fp += (
                ((predictions == 1) & (labels == 0))
            ).sum().item()

            fn += (
                ((predictions == 0) & (labels == 1))
            ).sum().item()

    loss = total_loss / max(total, 1)

    accuracy = (
        correct / max(total, 1)
    ) * 100

    precision = tp / max(tp + fp, 1)

    recall = tp / max(tp + fn, 1)

    f1 = (
        2 * precision * recall
        / max(precision + recall, 1e-8)
    )

    return (
        loss,
        accuracy,
        precision * 100,
        recall * 100,
        f1 * 100,
        tp,
        tn,
        fp,
        fn
    )


# ---------------------------------------------------------
# Training
# ---------------------------------------------------------
def train_cavity_model(
    data_dir="datasets/cavity",
    epochs=25,
    batch_size=16,
    lr=3e-5,
    output_model_path="backend/cavity_model.pth"
):

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "cpu"
    )

    print()
    print("=" * 60)
    print(f"Training device: {device}")
    print("=" * 60)

    train_path = os.path.join(
        data_dir,
        "train"
    )

    val_path = os.path.join(
        data_dir,
        "valid"
    )

    test_path = os.path.join(
        data_dir,
        "test"
    )

    if not os.path.exists(val_path):
        val_path = test_path

    train_tf, val_tf = get_transforms(224)

    # -----------------------------------------------------
    # Datasets
    # -----------------------------------------------------

    train_dataset = CavityDataset(
        train_path,
        transform=train_tf
    )

    val_dataset = CavityDataset(
        val_path,
        transform=val_tf
    )

    test_dataset = None

    if os.path.exists(test_path):

        test_dataset = CavityDataset(
            test_path,
            transform=val_tf
        )

    # -----------------------------------------------------
    # DataLoaders
    # -----------------------------------------------------

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,
        pin_memory=torch.cuda.is_available()
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=torch.cuda.is_available()
    )

    test_loader = None

    if test_dataset is not None:

        test_loader = DataLoader(
            test_dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=0,
            pin_memory=torch.cuda.is_available()
        )

    # -----------------------------------------------------
    # Model
    # -----------------------------------------------------

    model = CavityClassifier(
        num_classes=2
    ).to(device)

    # -----------------------------------------------------
    # Class weights
    # -----------------------------------------------------

    labels_list = [
        label
        for _, label in train_dataset.samples
    ]

    cavity_count = sum(
        1 for label in labels_list if label == 1
    )

    normal_count = sum(
        1 for label in labels_list if label == 0
    )

    print()
    print("Class distribution:")
    print(f"Normal : {normal_count}")
    print(f"Cavity : {cavity_count}")

    total_count = normal_count + cavity_count

    if total_count > 0:

        normal_weight = (
            total_count /
            (2 * max(normal_count, 1))
        )

        cavity_weight = (
            total_count /
            (2 * max(cavity_count, 1))
        )

        class_weights = torch.tensor(
            [
                normal_weight,
                cavity_weight
            ],
            dtype=torch.float32,
            device=device
        )

    else:

        class_weights = torch.tensor(
            [1.0, 1.0],
            dtype=torch.float32,
            device=device
        )

    print()
    print("Class weights:")
    print(
        f"Normal: {class_weights[0].item():.4f}"
    )
    print(
        f"Cavity: {class_weights[1].item():.4f}"
    )

    criterion = nn.CrossEntropyLoss(
        weight=class_weights,
        label_smoothing=0.05
    )

    # -----------------------------------------------------
    # Optimizer
    # -----------------------------------------------------

    optimizer = optim.AdamW(
        model.parameters(),
        lr=lr,
        weight_decay=1e-4
    )

    # -----------------------------------------------------
    # Learning-rate scheduler
    # -----------------------------------------------------

    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=3,
        min_lr=1e-7
    )

    # -----------------------------------------------------
    # Best model tracking
    # -----------------------------------------------------

    best_val_acc = 0.0
    best_f1 = 0.0
    epochs_without_improvement = 0

    patience = 6

    print()
    print("=" * 60)
    print(
        f"Starting Cavity Detection Training "
        f"({epochs} epochs)"
    )
    print("=" * 60)

    start_time = time.time()

    # -----------------------------------------------------
    # Epoch loop
    # -----------------------------------------------------

    for epoch in range(1, epochs + 1):

        model.train()

        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:

            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            loss.backward()

            # Prevent exploding gradients
            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                max_norm=1.0
            )

            optimizer.step()

            running_loss += (
                loss.item() * images.size(0)
            )

            predictions = torch.argmax(
                outputs,
                dim=1
            )

            correct += (
                predictions == labels
            ).sum().item()

            total += labels.size(0)

        train_loss = (
            running_loss /
            max(total, 1)
        )

        train_acc = (
            correct /
            max(total, 1)
        ) * 100

        # -------------------------------------------------
        # Validation
        # -------------------------------------------------

        (
            val_loss,
            val_acc,
            precision,
            recall,
            f1,
            tp,
            tn,
            fp,
            fn
        ) = evaluate(
            model,
            val_loader,
            criterion,
            device
        )

        scheduler.step(val_acc)

        current_lr = optimizer.param_groups[0]["lr"]

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] "
            f"| Train Loss: {train_loss:.4f} "
            f"| Train Acc: {train_acc:.2f}% "
            f"| Val Loss: {val_loss:.4f} "
            f"| Val Acc: {val_acc:.2f}% "
            f"| F1: {f1:.2f}% "
            f"| LR: {current_lr:.2e}"
        )

        print(
            f"    Precision: {precision:.2f}% "
            f"| Recall: {recall:.2f}%"
        )

        # -------------------------------------------------
        # Save best model
        # -------------------------------------------------

        improved = (
            val_acc > best_val_acc
            or (
                abs(val_acc - best_val_acc) < 0.01
                and f1 > best_f1
            )
        )

        if improved:

            best_val_acc = val_acc
            best_f1 = f1
            epochs_without_improvement = 0

            os.makedirs(
                os.path.dirname(output_model_path),
                exist_ok=True
            )

            torch.save(
                model.state_dict(),
                output_model_path
            )

            print(
                f"    -> BEST MODEL SAVED "
                f"(Val Acc: {val_acc:.2f}%, "
                f"F1: {f1:.2f}%)"
            )

        else:

            epochs_without_improvement += 1

        # -------------------------------------------------
        # Early stopping
        # -------------------------------------------------

        if epochs_without_improvement >= patience:

            print()
            print(
                f"Early stopping triggered after "
                f"{epoch} epochs."
            )

            break

    elapsed = time.time() - start_time

    print()
    print("=" * 60)
    print("Training Complete")
    print("=" * 60)

    print(
        f"Time: {elapsed / 60:.2f} minutes"
    )

    print(
        f"Best Validation Accuracy: "
        f"{best_val_acc:.2f}%"
    )

    print(
        f"Best Validation F1: "
        f"{best_f1:.2f}%"
    )

    print(
        f"Model saved at: "
        f"{output_model_path}"
    )

    # -----------------------------------------------------
    # Final TEST evaluation
    # -----------------------------------------------------

    if test_loader is not None:

        print()
        print("=" * 60)
        print("FINAL TEST SET EVALUATION")
        print("=" * 60)

        # Load best model
        model.load_state_dict(
            torch.load(
                output_model_path,
                map_location=device
            )
        )

        (
            test_loss,
            test_acc,
            test_precision,
            test_recall,
            test_f1,
            tp,
            tn,
            fp,
            fn
        ) = evaluate(
            model,
            test_loader,
            criterion,
            device
        )

        print(
            f"Test Loss      : {test_loss:.4f}"
        )

        print(
            f"Test Accuracy  : {test_acc:.2f}%"
        )

        print(
            f"Test Precision : {test_precision:.2f}%"
        )

        print(
            f"Test Recall    : {test_recall:.2f}%"
        )

        print(
            f"Test F1 Score  : {test_f1:.2f}%"
        )

        print()
        print("Confusion Matrix:")
        print(
            f"True Normal  : {tn}"
        )
        print(
            f"False Cavity : {fp}"
        )
        print(
            f"False Normal : {fn}"
        )
        print(
            f"True Cavity  : {tp}"
        )

    print("=" * 60)
    print()


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="Train Dental Cavity Detection Model"
    )

    parser.add_argument(
        "--data_dir",
        type=str,
        default="datasets/cavity"
    )

    parser.add_argument(
        "--epochs",
        type=int,
        default=25
    )

    parser.add_argument(
        "--batch_size",
        type=int,
        default=16
    )

    parser.add_argument(
        "--lr",
        type=float,
        default=3e-5
    )

    parser.add_argument(
        "--output",
        type=str,
        default="backend/cavity_model.pth"
    )

    args = parser.parse_args()

    train_cavity_model(
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        output_model_path=args.output
    )