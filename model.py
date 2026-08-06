import torch
import torch.nn as nn
from torchvision.models import densenet121, DenseNet121_Weights
from constants import DISEASE_CLASSES

class MediScanModel(nn.Module):
    def __init__(self, num_classes: int = len(DISEASE_CLASSES), freeze_features: bool = True):
        super(MediScanModel, self).__init__()
        # Load DenseNet121 pretrained model
        self.backbone = densenet121(weights=DenseNet121_Weights.DEFAULT)
        
        # Freezing feature extractor
        if freeze_features:
            self.freeze_backbone()
        
        # Modify the classifier to map to 18 classes
        num_features = self.backbone.classifier.in_features
        self.backbone.classifier = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )

    def freeze_backbone(self):
        """Freeze all layers in DenseNet121 except the classifier."""
        for param in self.backbone.features.parameters():
            param.requires_grad = False

    def unfreeze_backbone(self):
        """Fine-tune the model by unfreezing final layers of DenseNet121 features."""
        # Unfreeze features.denseblock4 and features.norm5
        for param in self.backbone.features.denseblock4.parameters():
            param.requires_grad = True
        for param in self.backbone.features.norm5.parameters():
            param.requires_grad = True

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Returns raw logits (no activation).
        # Sigmoid activation will be applied in train.py (implicitly via BCEWithLogitsLoss) 
        # and in predict.py during inference.
        return self.backbone(x)
