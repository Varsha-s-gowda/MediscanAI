import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  Upload, 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Sliders, 
  Database, 
  ArrowRight, 
  Download, 
  Copy, 
  RefreshCw, 
  Sparkles, 
  Flame, 
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from "lucide-react";
import "./App.css";
 
/* ─── helpers ─── */
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};
 
const severityFor = (pred, conf) => {
  if (!pred) return null;
  const p = pred.toLowerCase();
  if (p.includes("normal")) return "low";
  if (conf > 85) return "high";
  return "medium";
};
 
const LOADING_STEPS = [
  "Preprocessing image",
  "Running AI model",
  "Evaluating features",
  "Generating report",
];
 
/* ─── Toast ─── */
function Toast({ msg, icon, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="toast">
      <span className="toast-icon">{icon}</span>
      <span className="toast-text">{msg}</span>
    </div>
  );
}
 
/* ─── Main App ─── */
function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(-1);
  const [dragging, setDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("advice");
  const [scanMode, setScanMode] = useState("standard");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [toast, setToast] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [brokenImages, setBrokenImages] = useState({});
  const fileInputRef = useRef();
 
  const showToast = (msg, icon = <Sparkles size={16} />) => setToast({ msg, icon });
 
  /* Load history from localStorage */
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mediscan_history") || "[]");
      setHistory(stored);
    } catch { /* ignore */ }
  }, []);
 
  const saveHistory = (entry) => {
    const updated = [entry, ...history].slice(0, 8);
    setHistory(updated);
    try { localStorage.setItem("mediscan_history", JSON.stringify(updated)); } catch { /* ignore */ }
  };
 
  /* File selection */
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please select a valid image file.", <ShieldAlert size={16} />);
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setActiveTab("advice");
    setImageMeta({
      name: file.name.length > 22 ? file.name.slice(0, 20) + "…" : file.name,
      size: (file.size / 1024).toFixed(0) + " KB",
      type: file.type.split("/")[1].toUpperCase(),
    });
    showToast("Image loaded successfully!", <ImageIcon size={16} />);
  }, []);
 
  const handleImageChange = (e) => handleFile(e.target.files[0]);
 
  /* Drag & drop */
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };
 
  /* Simulate loading steps */
  const runLoadingSteps = () => {
    let step = 0;
    setLoadStep(0);
    const iv = setInterval(() => {
      step++;
      if (step >= LOADING_STEPS.length) { clearInterval(iv); }
      else { setLoadStep(step); }
    }, 700);
  };
 
  /* Analyze */
  const handleUpload = async () => {
    if (!image) { showToast("Please upload an X-ray image first.", <AlertTriangle size={16} />); return; }
 
    const formData = new FormData();
    formData.append("image", image);
    setLoading(true);
    setResult(null);
    runLoadingSteps();
 
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://mediscanai-uhtt.onrender.com";
      const res = await fetch(`${backendUrl}/predict`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
      const entry = {
        id: Date.now(),
        preview,
        prediction: data.prediction,
        confidence: data.confidence,
        timestamp: Date.now(),
        mode: scanMode,
      };
      saveHistory(entry);
      showToast("Analysis complete!", <Activity size={16} />);
    } catch {
      showToast("Could not reach backend. Showing demo data.", <AlertTriangle size={16} />);
      /* Demo fallback */
      const demo = {
        prediction: "Pneumonia",
        confidence: 87,
        health_advice: [
          "Take prescribed antibiotics as directed and complete the full course.",
          "Stay well-hydrated — drink at least 8–10 glasses of water daily.",
          "Rest adequately and avoid strenuous physical activity.",
          "Use a humidifier to ease breathing discomfort.",
        ],
        precautions: [
          "Avoid contact with others to prevent spreading infection.",
          "Wear a mask in shared spaces and wash hands frequently.",
          "Monitor your temperature every 4 hours and log readings.",
        ],
        consult_doctor_if: [
          "Breathing difficulty worsens or oxygen saturation drops below 94%.",
          "Fever exceeds 39.5 °C (103 °F) and does not respond to medication.",
          "You experience sharp chest pain or persistent confusion.",
          "Symptoms have not improved after 3 days of treatment.",
        ],
      };
      setResult(demo);
      saveHistory({
        id: Date.now(), preview,
        prediction: demo.prediction,
        confidence: demo.confidence,
        timestamp: Date.now(), mode: scanMode,
      });
    } finally {
      setLoadStep(-1);
      setLoading(false);
    }
  };
 
  /* Reset */
  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setImageMeta(null);
    setLoadStep(-1);
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("Cleared. Ready for new scan.", <RefreshCw size={16} />);
  };
 
  /* Download report as text */
  const handleDownload = () => {
    if (!result) return;
    const lines = [
      "MediScan AI — Analysis Report",
      "================================",
      `Prediction : ${result.prediction}`,
      `Confidence : ${result.confidence}%`,
      `Scan Mode  : ${scanMode}`,
      `Date       : ${new Date().toLocaleString()}`,
      "",
      "Health Advice:",
      ...(result.health_advice || []).map((l, i) => `  ${i + 1}. ${l}`),
      "",
      "Precautions:",
      ...(result.precautions || []).map((l, i) => `  ${i + 1}. ${l}`),
      "",
      "Consult Doctor If:",
      ...(result.consult_doctor_if || []).map((l, i) => `  ${i + 1}. ${l}`),
      "",
      "⚠ This report is for informational purposes only. Always consult a licensed physician.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `MediScan_Report_${Date.now()}.txt`;
    a.click();
    showToast("Report downloaded!", <Download size={16} />);
  };
 
  /* Share (copy to clipboard) */
  const handleShare = async () => {
    if (!result) return;
    const text = `MediScan AI Result: ${result.prediction} (${result.confidence}% confidence). Scanned on ${new Date().toLocaleDateString()}.`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Result copied to clipboard!", <Copy size={16} />);
    } catch {
      showToast("Copy failed. Try manually.", <ShieldAlert size={16} />);
    }
  };
 
  const severity = severityFor(result?.prediction, result?.confidence);
 
  const tabSections = {
    advice: { label: "Advice", data: result?.health_advice, heading: "Health Advice", icon: <Flame size={16} /> },
    precautions: { label: "Precautions", data: result?.precautions, heading: "Precautions", icon: <ShieldCheck size={16} /> },
    consult: { label: "Consultation", data: result?.consult_doctor_if, heading: "Clinical Indicators", icon: <ShieldAlert size={16} /> },
  };
 
  return (
    <div className="app">
      <div className="container">
 
        {/* ── Header ── */}
        <div className="header-area">
          <div className="badge">
            <Sparkles className="badge-glow-icon" size={12} />
            <span>AI Powered • Radiology Suite</span>
          </div>
          <h1>
            <span>MediScan</span> <span className="h1-cyan">AI</span>
          </h1>
          <p>Autonomous Deep Learning Diagnostic Tool for Pulmonary Pathology</p>
        </div>
 
        {/* ── Stats bar ── */}
        <div className="stats-bar">
          <div className="stat-chip">
            <Activity className="icon text-primary" size={16} />
            <span>Scans: <strong>{history.length}</strong></span>
          </div>
          <div className="stat-chip">
            <Sparkles className="icon text-purple" size={16} />
            <span>Avg Conf: <strong>{history.length ? Math.round(history.reduce((a, b) => a + Number(b.confidence), 0) / history.length) + "%" : "—"}</strong></span>
          </div>
          <div className="stat-chip">
            <Sliders className="icon text-cyan" size={16} />
            <span>Mode: <strong style={{ textTransform: "capitalize" }}>{scanMode}</strong></span>
          </div>
          <div className="stat-chip">
            <Database className="icon text-green" size={16} />
            <span>Status: <strong>Active</strong></span>
          </div>
        </div>
 
        {/* ── Main Section ── */}
        <div className="main-section">
 
          {/* ── Upload Box ── */}
          <div className="upload-box">
            <div className="section-title">
              <Upload size={16} />
              <span>Input Radiograph</span>
            </div>
 
            {/* Drag-and-drop zone */}
            <div
              className={`drop-zone ${dragging ? "dragging" : ""} ${preview ? "has-preview" : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {!preview ? (
                <>
                  <div className="drop-zone-glow-ring">
                    <Upload className="drop-zone-icon" size={32} />
                  </div>
                  <div className="drop-zone-text">
                    <strong>Drag & drop</strong> your X-ray here
                    <span className="drop-subtext">or click to browse files</span>
                  </div>
                </>
              ) : (
                <div className="preview-container">
                  <div className="preview-wrapper">
                    <img src={preview} alt="preview" className="preview" />
                    {loading && (
                      <div className="scanning-overlay">
                        <div className="scan-line" />
                        <div className="scan-grid" />
                      </div>
                    )}
                  </div>
                  <div className="preview-overlay-info">
                    <span>{imageMeta?.name}</span>
                    <span>{imageMeta?.size}</span>
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                onClick={(e) => e.stopPropagation()}
                style={{ display: "none" }}
              />
            </div>
 
            {/* Image metadata tags */}
            {preview && imageMeta && (
              <div className="image-meta">
                <span className="meta-tag">Format: {imageMeta.type}</span>
                <span className="meta-tag">Size: {imageMeta.size}</span>
              </div>
            )}
 
            {/* Scan mode selector */}
            <div className="mode-selector">
              <div className="mode-label">AI Scanning Mode</div>
              <div className="mode-options">
                {["standard", "detailed", "quick"].map((m) => (
                  <button
                    key={m}
                    className={`mode-btn ${scanMode === m ? "active" : ""}`}
                    onClick={() => setScanMode(m)}
                  >
                    <span className="btn-icon">
                      {m === "standard" ? <Activity size={12} /> : m === "detailed" ? <Sliders size={12} /> : <Sparkles size={12} />}
                    </span>
                    <span>{m.charAt(0).toUpperCase() + m.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
 
            <button className="primary-scan-btn" onClick={handleUpload} disabled={loading || !image}>
              {loading ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={18} />
                  <span>Processing Analysis...</span>
                </>
              ) : (
                <>
                  <Activity size={18} />
                  <span>Initiate AI Diagnosis</span>
                </>
              )}
            </button>
 
            {image && !loading && (
              <button className="btn-secondary" onClick={handleReset}>
                <RefreshCw size={14} />
                <span>Reset Scan</span>
              </button>
            )}
          </div>
 
          {/* ── Report Box ── */}
          <div className="report-box">
            <h2>
              <FileText size={20} />
              <span>Diagnostic Report</span>
            </h2>
 
            {loading ? (
              <div className="loading-wrapper">
                <div className="radar-spinner">
                  <div className="radar-circle"></div>
                  <div className="radar-circle delay-1"></div>
                  <div className="radar-circle delay-2"></div>
                </div>
                <div className="loading-text">Performing Pulmonary Assessment...</div>
                <div className="loading-steps">
                  {LOADING_STEPS.map((step, i) => (
                    <div
                      key={i}
                      className={`loading-step ${i < loadStep ? "done" : i === loadStep ? "active" : ""}`}
                    >
                      <div className="step-dot" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : result ? (
              <div className="result-content">
                {/* Prediction card */}
                <div className="prediction-card">
                  <div className="diag-details">
                    <div className="prediction-label">AI Diagnosis</div>
                    <div className={`prediction-value ${result.prediction?.toLowerCase()}`}>
                      {result.prediction}
                    </div>
                    {severity && (
                      <span className={`severity-badge ${severity}`}>
                        <span className="severity-dot" />
                        <span>{severity.charAt(0).toUpperCase() + severity.slice(1)} Severity</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Gauge style Confidence display */}
                  <div className="confidence-block">
                    <div className="confidence-label">Accuracy Conf.</div>
                    <div className="gauge-container">
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle className="gauge-bg" cx="40" cy="40" r="32" />
                        <circle 
                          className={`gauge-fill ${severity}`} 
                          cx="40" 
                          cy="40" 
                          r="32" 
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={2 * Math.PI * 32 * (1 - result.confidence / 100)}
                        />
                        <text className="gauge-text" x="40" y="44" textAnchor="middle">
                          {result.confidence}%
                        </text>
                      </svg>
                    </div>
                  </div>
                </div>
 
                {/* Tabs */}
                <div className="report-tabs">
                  {Object.entries(tabSections).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      className={`tab-btn ${activeTab === key ? "active" : ""}`}
                      onClick={() => setActiveTab(key)}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
 
                {/* Tab content */}
                {Object.entries(tabSections).map(([key, { data, heading }]) => (
                  <div key={key} className={`tab-content ${activeTab === key ? "active" : ""}`}>
                    <div className="tab-heading-row">
                      <div className="tab-decor-line" />
                      <h3>{heading}</h3>
                    </div>
                    <ul className="clinical-list">
                      {(data || []).map((item, i) => (
                        <li key={i} className="clinical-item">
                          <ArrowRight className="list-bullet" size={14} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
 
                {/* Actions */}
                <div className="report-actions">
                  <button className="action-btn download" onClick={handleDownload}>
                    <Download size={14} />
                    <span>Download PDF</span>
                  </button>
                  <button className="action-btn share" onClick={handleShare}>
                    <Copy size={14} />
                    <span>Copy Link</span>
                  </button>
                  <button className="action-btn reset" onClick={handleReset}>
                    <RefreshCw size={14} />
                    <span>Clear Scan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="pulse-icon-container">
                  <Activity className="empty-icon" size={40} />
                </div>
                <p className="empty-title">Awaiting Radiograph Upload</p>
                <p className="hint">Upload chest film in PNG, JPG, or DICOM-compatible format to generate report.</p>
              </div>
            )}
 
            {/* Disclaimer */}
            <div className="disclaimer">
              <Info className="disclaimer-icon" size={16} />
              <p>
                <strong>Clinical Disclaimer:</strong> MediScan AI is an assistive decision-support application. Results should be interpreted by a certified board-licensed radiologist.
              </p>
            </div>
          </div>
        </div>
 
        {/* ── History Panel ── */}
        <div className="history-panel">
          <div className="history-header" onClick={() => setShowHistory((v) => !v)}>
            <div className="history-title">
              <Clock size={16} />
              <span>Recent Diagnostic Log</span>
              <span className="history-count-badge">
                {history.length}
              </span>
            </div>
            <span className="history-toggle">
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
          {showHistory && (
            <div className="history-body">
              {history.length === 0 ? (
                <div className="empty-history">
                  <Database size={16} style={{ marginBottom: 4 }} />
                  <p>No recent diagnostic reports found.</p>
                </div>
              ) : (
                <div className="history-grid">
                  {history.map((h) => {
                    const isBroken = brokenImages[h.id] || !h.preview;
                    return (
                      <div
                        key={h.id}
                        className="history-item"
                        onClick={() => {
                          if (!isBroken) {
                            setPreview(h.preview);
                          }
                          showToast("Loaded history scan.", <Clock size={14} />);
                        }}
                      >
                        {isBroken ? (
                          <div className="history-thumb-placeholder">
                            <ImageIcon size={16} />
                          </div>
                        ) : (
                          <img 
                            src={h.preview} 
                            alt="thumb" 
                            className="history-thumb" 
                            onError={() => setBrokenImages(prev => ({ ...prev, [h.id]: true }))}
                          />
                        )}
                        <div className="history-info">
                          <div className="history-diagnosis">{h.prediction}</div>
                          <div className="history-time">
                            {h.mode && <span className="history-mode-tag">{h.mode}</span>}
                            <span>{timeAgo(h.timestamp)}</span>
                          </div>
                        </div>
                        <div className="history-conf">{h.confidence}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
 
      </div>
 
      {/* Toast notification */}
      {toast && <Toast msg={toast.msg} icon={toast.icon} onClose={() => setToast(null)} />}
    </div>
  );
}
 
export default App;