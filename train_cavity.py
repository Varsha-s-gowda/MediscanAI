import os
import sys
import argparse
import time
from typing import Optional, List, Tuple
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

CAVITY_CLASSES = ["Normal", "Cavity"]

class CavityDataset(Dataset):
    """
    Dataset loader for Cavity Dataset containing train/valid/test directories
    with 'images/' and 'labelTxt/'.
    Labels are mapped: if 'cavity' appears in any label line, class is 1 (Cavity); otherwise 0 (Normal).
    """
    def __init__(self, root_split_dir: str, transform=None):
        self.split_dir = root_split_dir
        self.images_dir = os.path.join(root_split_dir, "images")
        self.labels_dir = os.path.join(root_split_dir, "labelTxt")
        self.transform = transform
        self.samples: List[Tuple[str, int]] = []

        if not os.path.exists(self.images_dir):
            raise ValueError(f"Images folder not found: {self.images_dir}")

        image_files = [f for f in os.listdir(self.images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

        for img_name in image_files:
            img_path = os.path.join(self.images_dir, img_name)
            
            # Look for matching label text file
            txt_name = os.path.splitext(img_name)[0] + ".txt"
            txt_path = os.path.join(self.labels_dir, txt_name)
            
            label_idx = 0 # Default: Normal
            if os.path.exists(txt_path):
                try:
                    with open(txt_path, "r", encoding="utf-8", errors="ignore") as lf:
                        content = lf.read().lower()
                        if "cavity" in content:
                            label_idx = 1
                except Exception:
                    pass
            else:
                # If filename itself has indicators
                lower_name = img_name.lower()
                if "unhealthy" in lower_name or "cavity" in lower_name:
                    label_idx = 1
            
            self.samples.append((img_path, label_idx))

        print(f"Loaded {len(self.samples)} images from {root_split_dir}. (Cavity: {sum(1 for _, l in self.samples if l == 1)}, Normal: {sum(1 for _, l in self.samples if l == 0)})")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        img = Image.open(img_path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, torch.tensor(label, dtype=torch.long)


def get_transforms(img_size: int = 224):
    train_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    val_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return train_transform, val_transform


class CavityClassifier(nn.Module):
    def __init__(self, num_classes: int = 2):
        super(CavityClassifier, self).__init__()
        self.backbone = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        num_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_features, 256),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.backbone(x)


def train_cavity_model(
    data_dir: str = "datasets/cavity",
    epochs: int = 10,
    batch_size: int = 16,
    lr: float = 1e-4,
    output_model_path: str = "backend/cavity_model.pth"
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training on device: {device}")

    train_path = os.path.join(data_dir, "train")
    val_path = os.path.join(data_dir, "valid")
    if not os.path.exists(val_path):
        val_path = os.path.join(data_dir, "test")

    train_tf, val_tf = get_transforms(224)

    train_dataset = CavityDataset(train_path, transform=train_tf)
    val_dataset = CavityDataset(val_path, transform=val_tf)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    model = CavityClassifier(num_classes=2).to(device)

    # Class weighting for balanced loss
    labels_list = [s[1] for s in train_dataset.samples]
    cav_count = sum(labels_list)
    norm_count = len(labels_list) - cav_count
    weights = torch.tensor([1.0, float(norm_count) / max(1, cav_count)], device=device)
    criterion = nn.CrossEntropyLoss(weight=weights)

    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    best_val_acc = 0.0

    print("\n" + "=" * 50)
    print(f"Starting Cavity Detection Model Training ({epochs} epochs)")
    print("=" * 50)

    start_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

        train_loss = running_loss / total
        train_acc = (correct / total) * 100

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += torch.sum(preds == labels.data).item()
                val_total += labels.size(0)

        val_loss = val_loss / val_total
        val_acc = (val_correct / val_total) * 100

        print(f"Epoch [{epoch:02d}/{epochs:02d}] "
              f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            os.makedirs(os.path.dirname(output_model_path), exist_ok=True)
            torch.save(model.state_dict(), output_model_path)
            print(f"  -> Saved best model checkpoint to {output_model_path} (Val Acc: {val_acc:.2f}%)")

    elapsed = time.time() - start_time
    print("\n" + "=" * 50)
    print(f"Training Complete in {elapsed:.2f}s! Best Validation Accuracy: {best_val_acc:.2f}%")
    print(f"Model saved at: {output_model_path}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Dental Cavity Detection Model")
    parser.add_argument("--data_dir", type=str, default="datasets/cavity", help="Path to cavity dataset directory")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--output", type=str, default="backend/cavity_model.pth", help="Output model path")

    args = parser.parse_args()
    train_cavity_model(
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        output_model_path=args.output
    )
