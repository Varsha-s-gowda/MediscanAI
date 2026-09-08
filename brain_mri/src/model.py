import torch.nn as nn
from torchvision.models import resnet18, ResNet18_Weights

def get_brain_tumor_model(num_classes=4):
    model = resnet18(weights=ResNet18_Weights.DEFAULT)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    return model