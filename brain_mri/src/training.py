import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
import torchvision.transforms as T
from torchvision.datasets import ImageFolder
from torchvision.models import resnet18, ResNet18_Weights
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

def run_pipeline():
    print("1. Setting up device and configurations...", flush=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"   Running on device: {device}", flush=True)

    data_dir = "data/raw"
    batch_size = 32
    epochs = 10
    learning_rate = 0.0001

    # --- Step 1: Preprocessing & Data Loading ---
    print("\n2. Preprocessing images and loading dataset...", flush=True)
    transform = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Directory '{data_dir}' not found. Please ensure images exist in data/raw/")

    full_dataset = ImageFolder(root=data_dir, transform=transform)
    classes = full_dataset.classes
    print(f"   Classes found: {classes}", flush=True)
    print(f"   Total images: {len(full_dataset)}", flush=True)

    # 80/20 Train/Validation Split
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    # Note: num_workers=0 to prevent Windows process locks
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # --- Step 2: Model Definition ---
    print("\n3. Building ResNet-18 Architecture...", flush=True)
    model = resnet18(weights=ResNet18_Weights.DEFAULT)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, len(classes))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    # --- Step 3: Model Training ---
    print("\n4. Starting Model Training...", flush=True)
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
        avg_train_loss = running_loss / len(train_loader)
        print(f"   Epoch [{epoch+1}/{epochs}] - Loss: {avg_train_loss:.4f}", flush=True)

    # Save Model Weights
    os.makedirs("models", exist_ok=True)
    model_save_path = "models/brain_tumor_resnet18.pth"
    torch.save(model.state_dict(), model_save_path)
    print(f"\nModel checkpoint saved to: {model_save_path}", flush=True)

    # --- Step 4: Model Evaluation ---
    print("\n5. Running Evaluation on Validation Set...", flush=True)
    model.eval()
    all_preds = []
    all_targets = []
    val_loss = 0.0

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            val_loss += loss.item()
            
            preds = outputs.argmax(dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.cpu().numpy())

    avg_val_loss = val_loss / len(val_loader)
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    accuracy = (all_preds == all_targets).mean() * 100

    # --- Step 5: Printing Evaluation Metrics ---
    print("\n" + "="*50)
    print("           EVALUATION METRICS REPORT")
    print("="*50)
    print(f"Validation Loss     : {avg_val_loss:.4f}")
    print(f"Validation Accuracy : {accuracy:.2f}%\n")

    print("Detailed Classification Report:")
    print("-" * 55)
    print(classification_report(all_targets, all_preds, target_names=classes))

    print("Confusion Matrix:")
    print("-" * 55)
    cm = confusion_matrix(all_targets, all_preds)
    
    # Format Confusion Matrix with labels
    header = "          " + " ".join([f"{c[:8]:>8}" for c in classes])
    print(header)
    for i, row in enumerate(cm):
        row_str = " ".join([f"{val:>8}" for val in row])
        print(f"{classes[i][:8]:<8}  {row_str}")
    print("="*50)

if __name__ == "__main__":
    run_pipeline()