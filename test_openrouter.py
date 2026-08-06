"""Quick test script to diagnose why OpenRouter vision calls fail in predict.py"""
import requests, json, base64, io, os, sys
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("OPENROUTER_API_KEY", "")
print(f"[KEY] Found: {bool(key)}, prefix: {key[:25]}...")

# Tiny dummy image (simulating what predict.py does)
img = Image.new("RGB", (64, 64), color=(100, 100, 100))
buf = io.BytesIO()
img.convert("RGB").save(buf, format="JPEG")
img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
print(f"[IMG] Base64 size: {len(img_b64)} chars")

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

prompt = (
    "You are an expert board-certified thoracic radiologist. "
    "Analyze this chest radiograph and differentiate between Normal, standard Pneumonia, COVID-19 Pneumonia, and Tuberculosis (TB). "
    "Estimate the probability percentages (0.0 to 100.0) for exactly these 4 conditions:\n"
    "1. Pneumonia\n2. COVID-19 Pneumonia\n3. Tuberculosis (TB)\n4. Normal\n\n"
    "Your response must be ONLY a single valid JSON object mapping these exactly 4 condition names to their probability values."
)

payload = {
    "model": "google/gemini-2.5-flash",
    "max_tokens": 500,
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
        ]
    }],
    "response_format": {"type": "json_object"}
}

print("[API] Sending request to OpenRouter...")
try:
    res = requests.post(url, headers=headers, json=payload, timeout=45)
    print(f"[STATUS] {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        choices = data.get("choices", [])
        print(f"[CHOICES] Count: {len(choices)}")
        if choices:
            content = choices[0]["message"]["content"]
            print(f"[CONTENT] {content}")
            parsed = json.loads(content)
            print(f"[PARSED OK] {parsed}")
        else:
            print(f"[NO CHOICES] Full response: {data}")
    else:
        print(f"[ERROR BODY] {res.text[:1000]}")
except Exception as e:
    print(f"[EXCEPTION] {type(e).__name__}: {e}")
