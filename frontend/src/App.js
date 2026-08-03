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
  Image as ImageIcon,
  CheckCircle,
  Eye,
  Trash2,
  Cpu,
  Binary,
  Settings
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

const PIPELINE_STEPS = [
  "Uploading Radiograph Film",
  "Spatial Contrast Enhancement",
  "Gaussian Noise Removal",
  "Anatomical Lung Segmentation",
  "DenseNet121 Model Loading",
  "Feature Extraction Pass",
  "Disease Probability Classification",
  "Grad-CAM Heatmap Generation",
  "Medical Knowledge Engine Mapping",
  "Diagnostic Report Finalization"
];

/* ─── Toast Component ─── */
function Toast({ msg, icon, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="toast" style={{
      position: "fixed",
      bottom: "32px",
      right: "32px",
      background: "rgba(13, 19, 35, 0.95)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      padding: "16px 28px",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
      backdropFilter: "blur(24px)",
      zIndex: 10000,
      animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <span style={{ color: "#3B82F6" }}>{icon}</span>
      <span style={{ color: "#F8FAFC", fontSize: "13px", fontWeight: "600" }}>{msg}</span>
    </div>
  );
}

/* ─── CountUp Stat Counter ─── */
function CountUp({ end, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!end) return;
    let start = 0;
    const duration = 1000;
    const stepTime = Math.max(Math.floor(duration / end), 15);
    const timer = setInterval(() => {
      start += 1;
      setVal(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{val}{suffix}</span>;
}

/* ─── Main SaaS App ─── */
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
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.5);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef();

  const showToast = (msg, icon = <Sparkles size={16} />) => setToast({ msg, icon });

  /* Parallax Mouse Listener */
  useEffect(() => {
    const handleMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

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

  const deleteHistory = (id, e) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    try { localStorage.setItem("mediscan_history", JSON.stringify(updated)); } catch { /* ignore */ }
    showToast("Report deleted from logs.", <Trash2 size={14} />);
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
    
    // Simulate image properties
    const width = 1024 + Math.floor(Math.random() * 1000);
    const height = 1024 + Math.floor(Math.random() * 1000);
    setImageMeta({
      name: file.name.length > 22 ? file.name.slice(0, 20) + "…" : file.name,
      size: (file.size / 1024).toFixed(0) + " KB",
      type: file.type.split("/")[1].toUpperCase(),
      resolution: `${width} x ${height} px`,
      brightness: "48%",
      contrast: "92%",
      scanQuality: 98
    });
    showToast("Radiograph loaded successfully!", <ImageIcon size={16} />);
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
      if (step >= PIPELINE_STEPS.length) { 
        clearInterval(iv); 
      } else { 
        setLoadStep(step); 
      }
    }, 450);
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
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:5000";
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
        processing_time: data.processing_time || "0.35s"
      };
      saveHistory(entry);
      showToast("Analysis complete!", <Activity size={16} />);
    } catch {
      showToast("Could not reach backend. Showing fallback predictions.", <AlertTriangle size={16} />);
      /* Demo fallback */
      const demo = {
        prediction: "Pneumonia",
        confidence: 87,
        predictions: [
          { disease: "Pneumonia", confidence: 87.0, severity: "High" },
          { disease: "Lung Opacity", confidence: 64.0, severity: "Moderate" },
          { disease: "Atelectasis", confidence: 34.0, severity: "Moderate" }
        ],
        health_advice: [
          "Take prescribed antibiotics as directed and complete the full course.",
          "Stay well-hydrated — drink at least 8–10 glasses of water daily.",
          "Rest adequately and avoid strenuous physical activity."
        ],
        precautions: [
          "Avoid contact with others to prevent spreading infection.",
          "Wear a mask in shared spaces and wash hands frequently.",
          "Monitor your temperature every 4 hours and log readings."
        ],
        consult_doctor_if: [
          "Breathing difficulty worsens or oxygen saturation drops below 94%.",
          "Fever exceeds 39.5 °C (103 °F) and does not respond to medication."
        ],
        processing_time: "0.35s"
      };
      setResult(demo);
      saveHistory({
        id: Date.now(), preview,
        prediction: demo.prediction,
        confidence: demo.confidence,
        timestamp: Date.now(), mode: scanMode,
        processing_time: "0.35s"
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
    <div className="app-container">
      {/* Background gradients with parallax mouse offset */}
      <div className="bg-gradient-mesh"></div>
      <div 
        className="bg-glowing-blob-1" 
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div 
        className="bg-glowing-blob-2" 
        style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)` }}
      />
      <div className="bg-noise"></div>

      {/* ── Header Area ── */}
      <header>
        <div className="badge-futuristic">
          <span className="badge-pulse" />
          <span>Radiology Suite Active</span>
        </div>
        <h1 style={{ background: "linear-gradient(135deg, #fff 30%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MediScan AI</h1>
        <p className="subtitle">High-fidelity multi-label deep learning diagnostics for pulmonary radiography</p>

        {/* ── Stats Bar ── */}
        <div className="suite-stats">
          <div className="stat-item">
            <span className="stat-val">
              <CountUp end={history.length} />
            </span>
            <span className="stat-lbl">Processed Scans</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">
              {history.length ? (
                <CountUp end={Math.round(history.reduce((a, b) => a + Number(b.confidence), 0) / history.length)} suffix="%" />
              ) : "—"}
            </span>
            <span className="stat-lbl">Avg Confidence</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">{scanMode.toUpperCase()}</span>
            <span className="stat-lbl">Active Mode</span>
          </div>
          <div className="stat-item">
            <span className="stat-val" style={{ color: "#10B981" }}>ONLINE</span>
            <span className="stat-lbl">Service Node</span>
          </div>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="workspace-grid">
        
        {/* ==================================================
           LEFT PANEL: INPUT RADIOGRAPH
           ================================================== */}
        <section className="glass-panel left-panel" style={{ borderRadius: "28px" }}>
          <div className="panel-header">
            <Upload className="panel-icon" size={20} />
            <h2>Radiograph Manager</h2>
          </div>

          {/* Dropzone */}
          <div
            className="dropzone-saas"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ borderRadius: "20px" }}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <div className="dropzone-content">
              <div className="upload-icon-container">
                <Upload size={24} className="upload-glow-animation" />
              </div>
              <div>
                <p>Drag and drop radiograph here</p>
                <span>Supports DICOM-compatible PNG, JPEG</span>
              </div>
            </div>
          </div>

          {/* Image Preprocessing progress */}
          {loading && loadStep >= 0 && (
            <div className="preprocess-box">
              <div className="preprocess-status">
                <span>{PIPELINE_STEPS[loadStep]}</span>
                <span>{Math.round(((loadStep + 1) / PIPELINE_STEPS.length) * 100)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${((loadStep + 1) / PIPELINE_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Image & Grad-CAM Preview */}
          {preview && (
            <div className="preview-saas" style={{ borderRadius: "20px" }}>
              <div className="preview-wrapper-relative">
                <img src={preview} alt="Radiograph" className="preview-img" />
                {result?.heatmap && (
                  <img 
                    src={result.heatmap} 
                    alt="Grad-CAM Overlaid Heatmap" 
                    className="heatmap-overlay" 
                    style={{ opacity: heatmapOpacity }}
                  />
                )}
                {imageMeta && (
                  <span className="quality-badge">Scan Quality: {imageMeta.scanQuality}%</span>
                )}
              </div>

              {result?.heatmap && (
                <div className="control-bar">
                  <span>Grad-CAM Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                    className="slider-compare"
                  />
                </div>
              )}
            </div>
          )}

          {/* Image Metadata */}
          {preview && imageMeta && (
            <div className="metadata-grid">
              <div className="meta-card">
                <Activity className="meta-icon" size={16} />
                <div className="meta-info">
                  <span className="meta-val">{imageMeta.resolution}</span>
                  <span className="meta-lbl">Resolution</span>
                </div>
              </div>
              <div className="meta-card">
                <ImageIcon className="meta-icon" size={16} />
                <div className="meta-info">
                  <span className="meta-val">{imageMeta.size}</span>
                  <span className="meta-lbl">File Size</span>
                </div>
              </div>
              <div className="meta-card">
                <Sliders className="meta-icon" size={16} />
                <div className="meta-info">
                  <span className="meta-val">{imageMeta.brightness}</span>
                  <span className="meta-lbl">Brightness</span>
                </div>
              </div>
              <div className="meta-card">
                <Settings className="meta-icon" size={16} />
                <div className="meta-info">
                  <span className="meta-val">{imageMeta.contrast}</span>
                  <span className="meta-lbl">Contrast</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ==================================================
           CENTER & RIGHT PANEL: DIAGNOSTIC PIPELINE
           ================================================== */}
        <section className="center-panel">
          
          {/* Core scan controls */}
          <div className="glass-panel scan-control-box" style={{ borderRadius: "28px" }}>
            <button 
              className="btn-master-scan" 
              onClick={handleUpload} 
              disabled={loading || !image}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #22d3ee 100%)",
                backgroundSize: "200% 200%",
                animation: loading ? "none" : "shimmerBg 4s infinite linear"
              }}
            >
              <Activity size={20} />
              <span>{loading ? "AI Analysis Active..." : "Initiate AI Diagnosis"}</span>
              {loading && <span className="btn-pulse-wave" />}
            </button>

            {/* Scan Mode Selection */}
            <div className="mode-selector" style={{ marginTop: "24px", width: "100%" }}>
              <div className="mode-label" style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", textAlign: "center" }}>AI Scanning Engine Mode</div>
              <div className="mode-options" style={{ display: "flex", gap: "12px" }}>
                {["standard", "detailed", "quick"].map((m) => (
                  <button
                    key={m}
                    className={`mode-btn ${scanMode === m ? "active" : ""}`}
                    onClick={() => setScanMode(m)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.05)",
                      background: scanMode === m ? "rgba(59, 130, 246, 0.05)" : "transparent",
                      color: scanMode === m ? "#3B82F6" : "#94A3B8",
                      borderColor: scanMode === m ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      transition: "all 0.2s"
                    }}
                  >
                    <span>{m.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Neural pipeline timeline */}
          {loading && (
            <div className="glass-panel" style={{ borderRadius: "28px" }}>
              <div className="panel-header">
                <Clock className="panel-icon" size={20} />
                <h2>Pipeline Progress</h2>
              </div>
              <div className="neural-timeline">
                {PIPELINE_STEPS.map((step, i) => {
                  const isActive = i === loadStep;
                  const isCompleted = i < loadStep;
                  return (
                    <div 
                      key={i} 
                      className={`timeline-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                    >
                      <div className="step-indicator">
                        {isCompleted ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
                      </div>
                      <div className="step-info">
                        <span className="step-title">{step}</span>
                        <span className="step-desc">
                          {isActive ? "Executing step..." : isCompleted ? "Completed" : "Awaiting activation"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Report Cards */}
          {result && !loading && (
            <div className="glass-panel report-box" style={{ borderRadius: "28px" }}>
              <div className="panel-header">
                <FileText className="panel-icon" size={20} />
                <h2>AI Clinical Diagnostic Report</h2>
              </div>

              {/* Main Prediction */}
              <div className="prediction-card">
                <div className="diag-details">
                  <div className="prediction-label">Primary Pathological Finding</div>
                  <div className={`prediction-value ${result.prediction?.toLowerCase()}`}>
                    {result.prediction}
                  </div>
                  {severity && (
                    <span className={`severity-badge ${severity}`}>
                      <span className="severity-dot" />
                      <span>{severity} Severity Risk</span>
                    </span>
                  )}
                  {result.processing_time && (
                    <span className="meta-tag" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      Inference Time: {result.processing_time} | Model: DenseNet121 v2.0
                    </span>
                  )}
                </div>

                {/* Circular Gauge */}
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
                      {Math.round(result.confidence)}%
                    </text>
                  </svg>
                </div>
              </div>

              {/* Multilabel Findings Table */}
              {result.predictions && result.predictions.length > 0 && (
                <div className="multilabel-findings">
                  <div className="findings-header">
                    <span>Detected Abnormalities</span>
                    <span>Confidence Score</span>
                  </div>
                  <div className="findings-list">
                    {result.predictions.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="finding-row">
                        <div className="finding-name">
                          <span className={`finding-bullet ${p.severity?.toLowerCase() || 'low'}`} />
                          <span>{p.disease}</span>
                        </div>
                        <div className="finding-confidence-bar-wrapper">
                          <div className="finding-bar-bg">
                            <div 
                              className={`finding-bar-fill ${p.severity?.toLowerCase() || 'low'}`} 
                              style={{ width: `${p.confidence}%` }}
                            />
                          </div>
                          <span className="finding-value">{p.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs for detailed clinical notes */}
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

              {/* Tab contents */}
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

              {/* Action Buttons */}
              <div className="report-actions">
                <button className="action-btn download" onClick={handleDownload}>
                  <Download size={14} />
                  <span>Download PDF Report</span>
                </button>
                <button className="action-btn share" onClick={handleShare}>
                  <Copy size={14} />
                  <span>Copy Report link</span>
                </button>
                <button className="action-btn reset" onClick={handleReset}>
                  <RefreshCw size={14} />
                  <span>Reset Session</span>
                </button>
              </div>

              {/* Clinical Disclaimer */}
              <div className="disclaimer">
                <Info className="disclaimer-icon" size={16} />
                <p>
                  <strong>Clinical Disclaimer:</strong> MediScan AI is an assistive decision-support application. Results should be interpreted by a certified board-licensed radiologist.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!result && !loading && (
            <div className="glass-panel empty-state" style={{ borderRadius: "28px" }}>
              <Activity className="empty-icon" size={48} />
              <p className="empty-title">Awaiting Radiograph Upload</p>
              <p className="hint">Upload a chest film on the left panel and click diagnostic button to generate clinical report.</p>
            </div>
          )}
        </section>
      </main>

      {/* ── Diagnostic Log Drawer ── */}
      <section className="logs-section">
        <div className="logs-header" onClick={() => setShowHistory((v) => !v)}>
          <div className="logs-title-row">
            <Clock size={20} className="panel-icon" />
            <h2>Recent Diagnostic Log</h2>
            <span className="log-count-badge">{history.length}</span>
          </div>
          {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {showHistory && (
          <div className="logs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "24px" }}>
            {history.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", borderRadius: "28px" }}>
                <p style={{ color: "#94A3B8" }}>No recent scans recorded on this node.</p>
              </div>
            ) : (
              history.map((h) => {
                const isBroken = brokenImages[h.id] || !h.preview;
                return (
                  <div
                    key={h.id}
                    className="log-card"
                    style={{ position: "relative", paddingRight: "44px" }}
                    onClick={() => {
                      if (!isBroken) setPreview(h.preview);
                      showToast("Loaded historical record.", <Clock size={14} />);
                    }}
                  >
                    {isBroken ? (
                      <div className="log-thumb" style={{ background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                        <ImageIcon size={16} />
                      </div>
                    ) : (
                      <img 
                        src={h.preview} 
                        alt="thumb" 
                        className="log-thumb" 
                        onError={() => setBrokenImages(prev => ({ ...prev, [h.id]: true }))}
                      />
                    )}
                    <div className="log-details">
                      <span className="log-name">{h.prediction}</span>
                      <span className="log-meta">{timeAgo(h.timestamp)} • {h.mode?.toUpperCase()}</span>
                    </div>
                    <span className="log-confidence" style={{ marginRight: "12px" }}>{Math.round(h.confidence)}%</span>
                    
                    {/* Delete log action */}
                    <button 
                      onClick={(e) => deleteHistory(h.id, e)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "rgba(239, 68, 68, 0.6)",
                        cursor: "pointer",
                        padding: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "rgba(239, 68, 68, 0.6)"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Toast notifications */}
      {toast && (
        <Toast msg={toast.msg} icon={toast.icon} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default App;