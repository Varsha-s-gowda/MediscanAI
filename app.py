from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
torch.set_num_threads(1) # Minimize RAM usage on Render free tier
from torchvision import models, transforms
from PIL import Image
import numpy as np
import gc

app = Flask(__name__)
CORS(app)

# Load trained model
model = models.resnet50()
model.fc = torch.nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load("pneumonia_model.pth", map_location="cpu"))
model.eval()

# Image transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

# Function to check if image looks like X-ray
def is_xray(img):
    img_np = np.array(img)

    # Check if mostly grayscale
    if len(img_np.shape) == 3:
        r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
        diff_rg = np.mean(np.abs(r - g))
        diff_rb = np.mean(np.abs(r - b))
        diff_gb = np.mean(np.abs(g - b))

        if diff_rg > 15 or diff_rb > 15 or diff_gb > 15:
            return False

    return True

@app.route('/predict', methods=['POST'])
def predict():
    try:
        file = request.files['image']
        img = Image.open(file)

        # Check invalid image
        if not is_xray(img):
            return jsonify({
                "prediction": "Invalid image / Not an X-ray",
                "confidence": 0
            })

        # Convert to grayscale then RGB
        img = img.convert("L").convert("RGB")
        img_tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            output = model(img_tensor)
            probs = torch.softmax(output, dim=1)
            confidence = probs.max().item()
            _, predicted = torch.max(output, 1)

        print("Output:", output)
        print("Probabilities:", probs)
        print("Prediction:", predicted.item())

        prediction_val = predicted.item()

        # Free memory immediately
        del img_tensor
        del output
        del probs
        gc.collect()

        classes = ['NORMAL', 'PNEUMONIA']

        if confidence < 0.65:
            result = "Uncertain / Please upload clearer X-ray"
        else:
            result = classes[predicted.item()]

        if result == "PNEUMONIA":
            health_advice = [
                "Take adequate rest and stay hydrated.",
                "Eat nutritious food.",
                "Maintain hygiene."
            ]
            precautions = [
                "Wear a mask.",
                "Avoid close contact.",
                "Take medicines on time."
            ]
            consult_doctor_if = [
                "Breathing difficulty increases.",
                "High fever persists.",
                "Chest pain worsens."
            ]

        elif result == "NORMAL":
            health_advice = [
                "Maintain a healthy lifestyle.",
                "Exercise regularly.",
                "Eat balanced meals."
            ]
            precautions = [
                "Avoid smoking.",
                "Regular health checkups.",
                "Maintain respiratory hygiene."
            ]
            consult_doctor_if = [
                "Persistent cough occurs.",
                "Breathing becomes difficult.",
                "Chest pain occurs."
            ]

        else:
            health_advice = ["Upload a clearer chest X-ray."]
            precautions = ["Ensure proper image quality."]
            consult_doctor_if = ["Consult doctor for diagnosis."]

        return jsonify({
            "prediction": result,
            "confidence": round(confidence * 100, 2),
            "health_advice": health_advice,
            "precautions": precautions,
            "consult_doctor_if": consult_doctor_if
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        })

if __name__ == '__main__':
    app.run(debug=True)