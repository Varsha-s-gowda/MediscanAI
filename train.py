import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.tensorboard import SummaryWriter
from typing import Optional, List

import sys
# Make backend directory discoverable when train.py is executed from workspace root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

# Modular imports
from model import MediScanModel
from dataset import get_dataloaders
from device import get_device
from logger import get_logger, log_timing
from constants import DISEASE_CLASSES

logger = get_logger("train")

class EarlyStopping:
    def __init__(self, patience: int = 5, min_delta: float = 0.0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss: float) -> bool:
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            logger.info(f"EarlyStopping counter: {self.counter} out of {self.patience}")
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0
        return self.early_stop

@log_timing
def train_model(
    data_dir: str,
    csv_file: Optional[str] = None,
    epochs: int = 10,
    batch_size: int = 16,
    lr: float = 1e-4,
    resume_checkpoint: Optional[str] = None
):
    device = get_device()
    writer = SummaryWriter(log_dir="runs/mediscan_experiment_multilabel")
    
    # Load loaders and classes
    try:
        train_loader, val_loader, _, classes = get_dataloaders(
            data_dir=data_dir, 
            csv_file=csv_file, 
            batch_size=batch_size
        )
    except Exception as e:
        logger.error(f"Error loading datasets from {data_dir}: {e}")
        return
        
    num_classes = len(classes)
    
    # Save classes.json
    with open("classes.json", "w") as f:
        json.dump(classes, f, indent=4)
        
    model = MediScanModel(num_classes=num_classes, freeze_features=True)
    model = model.to(device)
    
    # Multi-label classification loss: BCEWithLogitsLoss
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = ReduceLROnPlateau(optimizer, mode='min', patience=2, factor=0.5)
    early_stopping = EarlyStopping(patience=5)
    scaler = torch.amp.GradScaler(enabled=(device.type == "cuda"))

    start_epoch = 0
    history = {"train_loss": [], "val_loss": []}

    # Resume capability
    if resume_checkpoint and os.path.exists(resume_checkpoint):
        checkpoint = torch.load(resume_checkpoint, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        start_epoch = checkpoint["epoch"] + 1
        history = checkpoint.get("history", history)
        logger.info(f"Resuming training from epoch {start_epoch}")

    best_val_loss = float("inf")

    for epoch in range(start_epoch, epochs):
        model.train()
        train_loss = 0.0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            
            # Mixed precision training
            with torch.amp.autocast(device_type=device.type, enabled=(device.type == "cuda")):
                outputs = model(images)
                loss = criterion(outputs, labels)
                
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            train_loss += loss.item() * images.size(0)

        train_loss /= len(train_loader.dataset)

        # Validation phase
        model.eval()
        val_loss = 0.0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                with torch.amp.autocast(device_type=device.type, enabled=(device.type == "cuda")):
                    outputs = model(images)
                    loss = criterion(outputs, labels)
                
                val_loss += loss.item() * images.size(0)

        val_loss /= len(val_loader.dataset)
        
        scheduler.step(val_loss)
        
        # Log to TensorBoard
        writer.add_scalar("Loss/Train", train_loss, epoch)
        writer.add_scalar("Loss/Validation", val_loss, epoch)
        
        # Save metrics to history dictionary
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        
        logger.info(f"Epoch {epoch+1}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        # Save last checkpoint
        checkpoint_data = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "history": history
        }
        torch.save(checkpoint_data, "last_model.pth")
        
        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), "best_model.pth")
            logger.info("Saved new best model checkpoint to best_model.pth")

        # Early stopping check
        if early_stopping(val_loss):
            logger.info("Early stopping triggered. Training stopped.")
            break

    # Save final metrics and history JSON files
    with open("history.json", "w") as h_file:
        json.dump(history, h_file, indent=4)
        
    writer.close()
    logger.info("Multi-label training process completed.")

if __name__ == "__main__":
    # Example execution (expects path to a dataset)
    train_model(data_dir="datasets chestxray/train", epochs=5)