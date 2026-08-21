from PIL import Image
import torch
from medclip import MedCLIPModel, MedCLIPProcessor
from medclip import MedCLIPVisionModel

# Load model
model = MedCLIPModel(vision_cls=MedCLIPVisionModel)
processor = MedCLIPProcessor()
model.from_pretrained()
model = model.to("cpu")
# Load image
image = Image.open("test.jpg")

labels = [
    "Pneumonia",
    "Tuberculosis",
    "Brain Tumor",
    "Fracture",
    "Normal"
]

inputs = processor(
    text=labels,
    images=image,
    return_tensors="pt",
    padding=True
)

outputs = model(**inputs)
logits = outputs["logits"]
probs = torch.softmax(logits, dim=1)

print("Prediction:", labels[probs.argmax()])
print("Confidence:", torch.max(probs).item() * 100)