import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix, accuracy_score
import numpy as np

# 1. Define paths and constants
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../Data'))
TRAIN_DIR = os.path.join(DATA_DIR, 'train')

BATCH_SIZE = 32
EPOCHS = 25
IMG_SIZE = 224

# 2. Data Transforms and automated 80/20 train/val split
transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

print("Loading dataset...")
full_dataset = datasets.ImageFolder(TRAIN_DIR, transform=transform)

train_size = int(0.8 * len(full_dataset))
val_size = len(full_dataset) - train_size
train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

# 3. Build model using PyTorch Transfer Learning (MobileNetV2)
print("Building model...")
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

for param in model.parameters():
    param.requires_grad = False

model.classifier[1] = nn.Linear(model.last_channel, 1)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)

criterion = nn.BCEWithLogitsLoss()
optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)

# 4. Training loop with epoch-by-epoch loss and accuracy
print("Starting training...")
for epoch in range(EPOCHS):
    model.train()
    running_loss = 0.0
    correct_train = 0
    total_train = 0
    
    for images, labels in train_loader:
        images, labels = images.to(device), labels.float().unsqueeze(1).to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        preds = (torch.sigmoid(outputs) > 0.5).float()
        correct_train += (preds == labels).sum().item()
        total_train += labels.size(0)

    epoch_train_loss = running_loss / len(train_loader)
    epoch_train_acc = (correct_train / total_train) * 100

    # Validation phase per epoch
    model.eval()
    running_val_loss = 0.0
    correct_val = 0
    total_val = 0
    
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.float().unsqueeze(1).to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            running_val_loss += loss.item()
            
            preds = (torch.sigmoid(outputs) > 0.5).float()
            correct_val += (preds == labels).sum().item()
            total_val += labels.size(0)

    epoch_val_loss = running_val_loss / len(val_loader)
    epoch_val_acc = (correct_val / total_val) * 100

    print(f"Epoch [{epoch+1}/{EPOCHS}] | "
          f"Train Loss: {epoch_train_loss:.4f} - Train Acc: {epoch_train_acc:.2f}% | "
          f"Val Loss: {epoch_val_loss:.4f} - Val Acc: {epoch_val_acc:.2f}%")

# 5. Comprehensive Final Evaluation (Metrics, Confidence Score, Confusion Matrix)
print("\nRunning final evaluation on validation set...")
model.eval()
all_preds = []
all_labels = []
all_confidences = []

with torch.no_grad():
    for images, labels in val_loader:
        images, labels = images.to(device), labels.float().unsqueeze(1).to(device)
        outputs = model(images)

        probs = torch.sigmoid(outputs)
        preds = (probs > 0.5).float()

        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_confidences.extend(probs.cpu().numpy())

all_preds = np.array(all_preds)
all_labels = np.array(all_labels)
all_confidences = np.array(all_confidences)

accuracy = accuracy_score(all_labels, all_preds)
precision, recall, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='binary', zero_division=0)
conf_matrix = confusion_matrix(all_labels, all_preds)
avg_confidence = np.mean(all_confidences)

print("\n" + "=" * 40)
print("FINAL EVALUATION METRICS:")
print("=" * 40)
print(f"Validation Accuracy   : {accuracy * 100:.2f}%")
print(f"Average Confidence    : {avg_confidence * 100:.2f}%")
print(f"Precision             : {precision:.4f}")
print(f"Recall (Sensitivity)  : {recall:.4f}")
print(f"F1-Score              : {f1:.4f}")
print("-" * 40)
print("Confusion Matrix (Rows: True, Cols: Predicted):")
print(conf_matrix)
print("=" * 40)

# Save the model
torch.save(model.state_dict(), os.path.join(os.path.dirname(__file__), 'kidney_stone_model.pth'))
print("Model saved successfully as 'kidney_stone_model.pth' inside src!")