import torch
from torchvision import models, transforms
from PIL import Image

# Load model
model = models.resnet50()
model.fc = torch.nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load("pneumonia_model.pth", map_location="cpu"))
model.eval()

# Transform image
transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# Load image
img = Image.open("test.jpg").convert("RGB")
img = transform(img).unsqueeze(0)

# Predict
with torch.no_grad():
    output = model(img)
    _, pred = torch.max(output, 1)


    classes = ["Normal", "Pneumonia"]
print("Prediction:", classes[pred.item()])