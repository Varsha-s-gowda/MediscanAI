from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from torchvision import models, transforms
from PIL import Image
import numpy as np
import gc

torch.set_num_threads(1)

app = Flask(__name__)
CORS(app)

# ----------------------------
# Load Model (Loads only once)
# ----------------------------
model = models.resnet50(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, 2)

model.load_state_dict(
    torch.load("pneumonia_model.pth", map_location=torch.device("cpu"))
)

model.eval()

print("✅ Pneumonia model loaded successfully")

# ----------------------------
# Image Transform
# ----------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ----------------------------
# Check if uploaded image looks like an X-ray
# ----------------------------
def is_xray(img):
    img_np = np.array(img)

    if len(img_np.shape) == 3:
        r = img_np[:, :, 0]
        g = img_np[:, :, 1]
        b = img_np[:, :, 2]

        diff_rg = np.mean(np.abs(r - g))
        diff_rb = np.mean(np.abs(r - b))
        diff_gb = np.mean(np.abs(g - b))

        if diff_rg > 15 or diff_rb > 15 or diff_gb > 15:
            return False

    return True


# ----------------------------
# Home Route
# ----------------------------
@app.route("/")
def home():
    return "Mediscan AI Backend Running"


# ----------------------------
# Prediction Route
# ----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:

        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]

        img = Image.open(file).convert("RGB")

        print("Image Mode :", img.mode)
        print("Image Size :", img.size)

        if not is_xray(img):
            return jsonify({
                "prediction": "Invalid image / Not an X-ray",
                "confidence": 0
            })

        img_tensor = transform(img).unsqueeze(0)

        print("Tensor Shape :", img_tensor.shape)

        with torch.no_grad():
            output = model(img_tensor)
            probabilities = torch.softmax(output, dim=1)

            confidence = probabilities.max().item()
            predicted = torch.argmax(probabilities, dim=1).item()

        print("Raw Output :", output)
        print("Probabilities :", probabilities)
        print("Predicted Class :", predicted)
        print("Confidence :", confidence)

        classes = [
            "NORMAL",
            "PNEUMONIA"
        ]

        if confidence < 0.65:
            prediction = "Uncertain / Please upload a clearer chest X-ray"
        else:
            prediction = classes[predicted]

        if prediction == "PNEUMONIA":

            health_advice = [
                "Take adequate rest.",
                "Drink plenty of fluids.",
                "Eat nutritious food."
            ]

            precautions = [
                "Wear a mask.",
                "Avoid close contact with others.",
                "Take medicines as prescribed."
            ]

            consult_doctor_if = [
                "High fever continues.",
                "Breathing becomes difficult.",
                "Chest pain increases."
            ]

        elif prediction == "NORMAL":

            health_advice = [
                "Maintain a healthy lifestyle.",
                "Exercise regularly.",
                "Eat a balanced diet."
            ]

            precautions = [
                "Avoid smoking.",
                "Maintain respiratory hygiene.",
                "Get regular health checkups."
            ]

            consult_doctor_if = [
                "Persistent cough develops.",
                "Breathing difficulty occurs.",
                "Chest pain develops."
            ]

        else:

            health_advice = [
                "Please upload a clear chest X-ray."
            ]

            precautions = [
                "Ensure the image is a chest X-ray."
            ]

            consult_doctor_if = [
                "Consult a medical professional."
            ]

        del img_tensor
        del output
        del probabilities
        gc.collect()

        return jsonify({
            "prediction": prediction,
            "confidence": round(confidence * 100, 2),
            "health_advice": health_advice,
            "precautions": precautions,
            "consult_doctor_if": consult_doctor_if
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)