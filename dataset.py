import os
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision.datasets import ImageFolder
from torchvision import transforms
from PIL import Image
from typing import Tuple, Optional, Union, List
from preprocessing import MedicalImagePreprocessor
from constants import DISEASE_CLASSES

class MediScanMultiLabelDataset(Dataset):
    """
    Multi-label Chest X-Ray dataset loader.
    Supports loading from a CSV mapping (NIH ChestX-ray14 / CheXpert style)
    or falls back to a standard folder structure mapping to multi-hot targets.
    """
    def __init__(
        self, 
        root_dir: str, 
        csv_file: Optional[str] = None, 
        is_training: bool = False,
        classes: List[str] = DISEASE_CLASSES
    ):
        self.root_dir = root_dir
        self.is_training = is_training
        self.classes = classes
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
        self.preprocessor = MedicalImagePreprocessor()
        
        # Training augmentations
        self.train_augmentations = transforms.Compose([
            transforms.RandomRotation(15),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
        ])

        if csv_file and os.path.exists(csv_file):
            # CSV file loading (NIH/CheXpert style)
            # Expects columns: Image_Index, Atelectasis, Cardiomegaly, ...
            self.df = pd.read_csv(csv_file)
            self.use_csv = True
            logger_info = f"Loaded multi-label CSV mapping containing {len(self.df)} samples"
        else:
            # Fallback to standard ImageFolder representation
            self.use_csv = False
            self.dataset = ImageFolder(root_dir)
            logger_info = f"Fallback directory loader initialized with {len(self.dataset)} samples"
        
        print(f"Dataset Pipeline: {logger_info}")

    def __len__(self) -> int:
        if self.use_csv:
            return len(self.df)
        return len(self.dataset)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        if self.use_csv:
            row = self.df.iloc[idx]
            img_name = row["Image_Index"]
            img_path = os.path.join(self.root_dir, img_name)
            img = Image.open(img_path).convert("RGB")
            
            # Map classes to multi-hot target vector
            target = np.zeros(len(self.classes), dtype=np.float32)
            for c_idx, c_name in enumerate(self.classes):
                if c_name in row and row[c_name] == 1:
                    target[c_idx] = 1.0
        else:
            img_path, label_idx = self.dataset.samples[idx]
            img = Image.open(img_path).convert("RGB")
            
            # Map single class index to multi-hot target vector
            target = np.zeros(len(self.classes), dtype=np.float32)
            # Find matching class index
            folder_class = self.dataset.classes[label_idx]
            # Match folder class to our target disease classes
            for c_idx, c_name in enumerate(self.classes):
                if c_name.lower() in folder_class.lower():
                    target[c_idx] = 1.0
                    break
            else:
                # Fallback to general assignment if not matching specifically
                # Set 'Normal' if nothing matches, otherwise set folder label
                if "normal" in folder_class.lower():
                    normal_idx = self.class_to_idx.get("Normal", 0)
                    target[normal_idx] = 1.0
                else:
                    # Map to the first class or set index 0
                    target[0] = 1.0

        # Preprocess
        tensor = self.preprocessor(img)

        # Apply augmentation directly on the preprocessed tensor if training
        if self.is_training:
            tensor = self.train_augmentations(tensor)

        return tensor, torch.tensor(target, dtype=torch.float32)


def get_dataloaders(
    data_dir: str, 
    csv_file: Optional[str] = None,
    batch_size: int = 16, 
    val_split: float = 0.2,
    test_split: float = 0.1
) -> Tuple[DataLoader, DataLoader, DataLoader, List[str]]:
    """Splits the multi-label dataset and returns train, val, and test loaders."""
    
    full_dataset = MediScanMultiLabelDataset(
        root_dir=data_dir, 
        csv_file=csv_file,
        is_training=True,
        classes=DISEASE_CLASSES
    )
    
    val_size = int(len(full_dataset) * val_split)
    test_size = int(len(full_dataset) * test_split)
    train_size = len(full_dataset) - val_size - test_size

    train_data, val_data, test_data = random_split(
        full_dataset, 
        [train_size, val_size, test_size]
    )
    
    # Disable training augmentations for val/test
    val_data.dataset.is_training = False
    test_data.dataset.is_training = False

    train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_data, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_data, batch_size=batch_size, shuffle=False, num_workers=0)

    return train_loader, val_loader, test_loader, DISEASE_CLASSES
