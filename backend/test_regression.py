import os
import sys
from PIL import Image

# Ensure backend directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from predict import InferenceEngine

def run_test():
    engine = InferenceEngine()
    test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "testingimage")
    images = [f for f in os.listdir(test_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    print("Running baseline predictions:")
    print("---------------------------------------------")
    print(f"{'Image':<25} | {'Prediction':<20} | {'Confidence':<10}")
    print("---------------------------------------------")
    
    for img_name in sorted(images):
        img_path = os.path.join(test_dir, img_name)
        try:
            image = Image.open(img_path).convert("RGB")
            res = engine.predict(image)
            print(f"{img_name:<25} | {res.get('prediction'):<20} | {res.get('confidence'):<10}")
        except Exception as e:
            print(f"{img_name:<25} | Error: {str(e)}")

if __name__ == "__main__":
    run_test()
