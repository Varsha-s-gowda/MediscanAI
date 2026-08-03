import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "best_model.pth")
IMAGE_SIZE = int(os.getenv("IMAGE_SIZE", "224"))
DEVICE_CONFIG = os.getenv("DEVICE", "auto")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.50"))
API_VERSION = os.getenv("API_VERSION", "1.0.0")
PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "0.0.0.0")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
