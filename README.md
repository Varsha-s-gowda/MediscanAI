# MediScan AI 🫁

Hi Varsha! Welcome to the **MediScan AI** project. This is a premium Chest X-ray diagnostic platform that uses deep learning and AI to identify thoracic conditions (like Pneumonia, COVID-19, and Tuberculosis) from a single radiograph film.

I've set up the project to be modular, secure, and production-ready. Here is a step-by-step guide to get everything running on your machine.

---

## 📦 What You Need Before Starting

Since we ignore security credentials and heavy model binaries in Git to keep the repository clean and secure, **make sure to ask for these two files externally**:

1. **`.env`**: Place this directly in the root directory.
2. **`pneumonia_model.pth`**: Place this directly in the root directory.

---

## 🚀 Local Setup Guide

### 1. Backend Setup (Python API)
Make sure you have Python 3.10+ installed.

1. Open your terminal in the **root directory** of the project.
2. Create and activate a virtual environment (optional but recommended):
   ```powershell
   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: This uses the CPU-only PyTorch build to save massive amounts of disk space and download time).*
4. Start the backend server:
   ```powershell
   $env:PYTHONIOENCODING="utf-8"
   python app.py
   ```
   The backend will start listening on `http://127.0.0.1:5000`.

---

### 2. Frontend Setup (React App)
Make sure you have Node.js installed.

1. Open a new terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the frontend packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```
   This will start the browser interface at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is busy).

---

## 🛠️ How it Works Under the Hood

- **OpenRouter & Gemini 2.5 Flash**: If `OPENROUTER_API_KEY` is present in your `.env` file, the backend will send X-ray images to Gemini's vision intelligence to predict all 7 main lung conditions dynamically.
- **Local Fallback**: If no API key is present, the backend automatically falls back to your local PyTorch model (`pneumonia_model.pth`) to classify Normal vs Pneumonia, and generates Grad-CAM heatmap highlights for the lung regions!

---

## ☁️ Cloud Deployment

### Backend (Render Free Tier)
The root folder includes a `render.yaml` and a `Dockerfile`.
- When deploying on Render, create a new Web Service from your repository.
- Render will read the Dockerfile and automatically build a lightweight CPU-optimized Docker container.
- Make sure to add `OPENROUTER_API_KEY` to the **Environment Variables** in Render!

### Frontend (Vercel)
- Link the repository on Vercel and select the `frontend` folder as the root directory.
- Add the environment variable:
  - `REACT_APP_BACKEND_URL` = `https://your-render-backend-url.onrender.com`
- Vercel will build and deploy the frontend, automatically linking it to your live cloud backend.
