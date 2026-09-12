import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  Activity,
  ShieldAlert,
  ArrowRight,
  Search,
  Plus,
  User,
  LogOut,
  Layers,
  Brain,
  History,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Zap,
  Check,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import "./App.css";
import PostAnalysisWorkflow from "./components/PostAnalysisWorkflow";

const API_BASE = "http://localhost:5000";

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("doctor_token") || "");
  const [doctorName, setDoctorName] = useState(localStorage.getItem("doctor_name") || "");
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, patients, patient-profile

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSessionActive, setKeepSessionActive] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [publicMode, setPublicMode] = useState("login"); // login, xray, cavity, ct_scan, mri, report, history
  const [publicResult, setPublicResult] = useState(null);
  const [publicHistory, setPublicHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("mediscan_public_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);

  // Helper: Get target URL path for current state
  const getPathForState = (mode, tab, patient) => {
    if (token) {
      if (tab === "dashboard") return "/dashboard";
      if (tab === "patients") return "/patients";
      if (tab === "patient-profile") return `/patients/${patient?.patientId || patient?.id || "profile"}`;
    }
    if (mode === "xray") return "/analysis/chest-xray";
    if (mode === "cavity") return "/analysis/dental-cavity";
    if (mode === "ct_scan") return "/analysis/kidney-stone";
    if (mode === "mri") return "/analysis/brain-mri";
    if (mode === "report") return "/analysis/blood-report";
    if (mode === "history") return "/history";
    if (mode === "login") return "/login";
    return "/";
  };

  // Sync state from URL location on direct page loads and browser Back/Forward
  useEffect(() => {
    const path = location.pathname;
    if (path === "/dashboard") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("login");
    } else if (path === "/patients") {
      if (token) setActiveTab("patients");
      else setPublicMode("login");
    } else if (path.startsWith("/patients/")) {
      if (token) setActiveTab("patient-profile");
      else setPublicMode("login");
    } else if (path === "/analysis/chest-xray") {
      setPublicMode("xray");
    } else if (path === "/analysis/dental-cavity") {
      setPublicMode("cavity");
    } else if (path === "/analysis/kidney-stone") {
      setPublicMode("ct_scan");
    } else if (path === "/analysis/brain-mri") {
      setPublicMode("mri");
    } else if (path === "/analysis/blood-report") {
      setPublicMode("report");
    } else if (path === "/history") {
      setPublicMode("history");
    } else if (path === "/login" || path === "/") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("login");
    }
  }, [location.pathname, token]);

  // Keep browser URL bar in sync when publicMode or activeTab changes
  useEffect(() => {
    const targetPath = getPathForState(publicMode, activeTab, selectedPatient);
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: false });
    }
  }, [publicMode, activeTab, selectedPatient, token]);

  const [newPatient, setNewPatient] = useState({ name: "", age: "", gender: "Male", contact: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [uploadError, setUploadError] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg("");
    }, 5000);
  };

  const handlePublicUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadError("");
    setPublicResult(null);

    const formData = new FormData();
    if (publicMode === "xray" || publicMode === "cavity" || publicMode === "ct_scan" || publicMode === "mri") {
      formData.append("image", uploadFile);
    } else {
      formData.append("file", uploadFile);
    }

    let endpoint = "/predict";
    if (publicMode === "cavity") {
      endpoint = "/predict/cavity";
    } else if (publicMode === "ct_scan") {
      endpoint = "/predict/ct";
    } else if (publicMode === "mri") {
      endpoint = "/predict/mri";
    } else if (publicMode === "report") {
      endpoint = "/api/reports/analyze";
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_valid === false || data.success === false || data.prediction === "Invalid Medical Image" || data.prediction?.toLowerCase().includes("invalid")) {
          const errMsg = data.error || data.detail || "Invalid image detected: Please upload an authentic medical radiograph or scan.";
          setUploadError(errMsg);
          showToast(errMsg);
          setPublicResult(null);
          setUploadFile(null);
          return;
        }

        const modalityName = publicMode === "mri"
          ? "Brain MRI"
          : publicMode === "cavity"
            ? "Dental X-Ray"
            : publicMode === "ct_scan"
              ? "Kidney Stone CT"
              : publicMode === "xray"
                ? "Chest X-Ray"
                : "Medical Report";

        const enriched = {
          ...data,
          modality: modalityName,
          fileType: modalityName,
          fileName: uploadFile.name,
          date: new Date().toISOString()
        };

        setPublicResult(enriched);

        // Persist to public history
        setPublicHistory(prev => {
          const reportId = enriched.report_id || enriched.post_analysis?.report_id || `MED-${Date.now()}`;
          enriched.report_id = reportId;
          const updated = [enriched, ...prev.filter(item => (item.report_id || item.analysisId) !== reportId)].slice(0, 50);
          try {
            localStorage.setItem("mediscan_public_history", JSON.stringify(updated));
          } catch (e) {
            console.warn("Could not save to localStorage:", e);
          }
          return updated;
        });

        showToast("AI analysis completed successfully.");
        setUploadFile(null);
      } else {
        const err = await res.json();
        const errMsg = err.detail || err.error || "Analysis failed.";
        setUploadError(errMsg);
        showToast(errMsg);
      }
    } catch (err) {
      const errMsg = "Connection to AI server failed. Please ensure the backend is running.";
      setUploadError(errMsg);
      showToast(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const [period, setPeriod] = useState("30d");
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [loadingPatients, setLoadingPatients] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [loadingError, setLoadingError] = useState("");
  const [registryPatients, setRegistryPatients] = useState([]);
  const [registryStats, setRegistryStats] = useState({ total_patients: 0, active_cases: 0, analyses_this_month: 0, recently_added: 0 });
  const [loadingRegistry, setLoadingRegistry] = useState(true);

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [genderFilter, setGenderFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All");
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState("All");

  const [sortBy, setSortBy] = useState("registrationDate");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showEditModal, setShowEditModal] = useState(false);
  const [editPatientData, setEditPatientData] = useState({ patientId: "", name: "", age: "", gender: "Male", contact: "" });

  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("All");
  const [timelineSort, setTimelineSort] = useState("Newest");
  const [timelineDateFilter, setTimelineDateFilter] = useState("All");
  const [timelineResultFilter, setTimelineResultFilter] = useState("All");

  const [overallSummary, setOverallSummary] = useState("");
  const [profileStats, setProfileStats] = useState(null);
  const [editingAnalysis, setEditingAnalysis] = useState(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [compareIds, setCompareIds] = useState([]);

  const fetchRegistryData = async () => {
    setLoadingRegistry(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/registry/data`);
      if (res.ok) {
        const data = await res.json();
        setRegistryPatients(data.patients || []);
        setRegistryStats(data.stats || { total_patients: 0, active_cases: 0, analyses_this_month: 0, recently_added: 0 });
      }
    } catch (err) {
      console.error("Error loading registry stats:", err);
    } finally {
      setLoadingRegistry(false);
    }
  };

  const fetchDashboardData = async (filterPeriod = period) => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/summary?period=${filterPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        setDashboardError("Unable to load dashboard data.");
      }
    } catch (err) {
      setDashboardError("Unable to load dashboard data.");
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchPatients = async () => {
    setLoadingPatients(true);
    setLoadingError("");
    try {
      const res = await fetch(`${API_BASE}/api/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      } else {
        setLoadingError("Unable to load patient data. Please try again.");
      }
    } catch (err) {
      setLoadingError("Unable to load patient data. Please try again.");
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPatients();
      fetchDashboardData(period);
      fetchRegistryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name: regName })
      });
      if (res.ok) {
        showToast("Registration successful. Please log in.");
        setIsRegistering(false);
        setRegName("");
      } else {
        const err = await res.json();
        setAuthError(err.detail || "Registration failed.");
      }
    } catch (err) {
      setAuthError("Failed to connect to authentication server.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("doctor_token", data.token);
        localStorage.setItem("doctor_name", data.name);
        setToken(data.token);
        setDoctorName(data.name);
        showToast("Welcome back, Doctor.");
      } else {
        const err = await res.json();
        setAuthError(err.detail || "Authentication failed.");
      }
    } catch (err) {
      setAuthError("Failed to connect to authentication server.");
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("doctor_token");
    localStorage.removeItem("doctor_name");
    setToken("");
    setDoctorName("");
    setSelectedPatient(null);
    setActiveTab("dashboard");
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.age) return;
    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPatient.name,
          age: parseInt(newPatient.age),
          gender: newPatient.gender,
          contact: newPatient.contact
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Patient ${data.name} created.`);
        fetchPatients();
        fetchDashboardData(period);
        fetchRegistryData();
        setShowCreateModal(false);
        setNewPatient({ name: "", age: "", gender: "Male", contact: "" });
        selectPatient(data);
      }
    } catch (err) {
      showToast("Error creating patient.");
    }
  };
  const selectPatient = async (patient, targetAnalysisId = null) => {
    setSelectedPatient(patient);
    setActiveTab("patient-profile");
    setAnalysisResult(null);
    setCompareIds([]);
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patient.patientId}/history`);
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(data.history || []);
        setOverallSummary(data.overallSummary || "No previous AI-assisted analysis is available.");
        setProfileStats(data.stats || null);
        if (targetAnalysisId) {
          const match = (data.history || []).find(h => h.analysisId === targetAnalysisId);
          if (match) {
            setAnalysisResult(match);
          }
        }
      }
    } catch (err) {
      showToast("Could not load patient timeline.");
    }
  };

  if (!token) {
    if (publicResult) {
      return (
        <PostAnalysisWorkflow
          result={publicResult}
          modality={publicResult.modality || (
            publicMode === "mri" ? "Brain MRI" :
              publicMode === "cavity" ? "Dental X-Ray" :
                publicMode === "ct_scan" ? "Kidney Stone CT" :
                  publicMode === "report" ? "Medical Report" : "Chest X-Ray"
          )}
          apiBase={API_BASE}
          historyList={publicHistory}
          onSelectHistory={(item) => setPublicResult(item)}
          onClearHistory={() => {
            if (window.confirm("Clear all public analysis history?")) {
              setPublicHistory([]);
              localStorage.removeItem("mediscan_public_history");
            }
          }}
          onDeleteHistoryItem={(id) => {
            setPublicHistory(prev => {
              const filtered = prev.filter(h => (h.report_id || h.analysisId) !== id);
              localStorage.setItem("mediscan_public_history", JSON.stringify(filtered));
              return filtered;
            });
          }}
          onBackToUpload={() => {
            setPublicResult(null);
            setUploadFile(null);
          }}
          publicMode={publicMode}
          setPublicMode={setPublicMode}
          onBackToLogin={() => {
            setPublicMode("login");
            setPublicResult(null);
            setUploadFile(null);
          }}
        />
      );
    }

    if (publicMode === "history") {
      return (
        <div className="login-container" style={{ padding: "40px 20px", alignItems: "flex-start" }}>
          <div className="login-card" style={{ maxWidth: "1000px", width: "100%", padding: "32px" }}>
            <div className="logo-section" style={{ marginBottom: "24px" }}>
              <div className="pulse-circle">
                <History size={32} color="#3B82F6" />
              </div>
              <h2>Public Scan History</h2>
              <p>Chronological audit record of past AI-assisted diagnostic evaluations</p>
            </div>

            {publicHistory.length > 0 ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Total Saved Analyses: <strong>{publicHistory.length}</strong>
                  </span>
                  <button
                    className="clear-history-btn"
                    onClick={() => {
                      if (window.confirm("Clear all public scan history?")) {
                        setPublicHistory([]);
                        localStorage.removeItem("mediscan_public_history");
                      }
                    }}
                  >
                    Clear All History
                  </button>
                </div>
                <div className="history-grid-flow">
                  {publicHistory.map((item, idx) => (
                    <div
                      key={item.report_id || idx}
                      className="history-card-item"
                      onClick={() => {
                        setPublicResult(item);
                        const modLower = (item.modality || item.fileType || "").toLowerCase();
                        if (modLower.includes("cavity") || modLower.includes("dental")) setPublicMode("cavity");
                        else if (modLower.includes("ct") || modLower.includes("kidney") || modLower.includes("stone")) setPublicMode("ct_scan");
                        else if (modLower.includes("mri") || modLower.includes("brain")) setPublicMode("mri");
                        else if (modLower.includes("report") || modLower.includes("lab")) setPublicMode("report");
                        else setPublicMode("xray");
                      }}
                    >
                      <div className="h-card-top">
                        <span className="h-modality-badge">{item.modality || "Diagnostic Scan"}</span>
                        <span
                          className="h-severity-pill"
                          style={{
                            backgroundColor: item.post_analysis?.severity === "High" ? "#EF4444" : item.post_analysis?.severity === "Moderate" ? "#F59E0B" : "#10B981",
                            color: "#fff"
                          }}
                        >
                          {item.post_analysis?.severity || "Analyzed"}
                        </span>
                      </div>
                      <h4 className="h-pred-title" style={{ color: "#fff" }}>{item.prediction}</h4>
                      <div className="h-meta-row">
                        <span>Confidence: <strong>{item.confidence}%</strong></span>
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <p className="h-snippet">{item.post_analysis?.explanation || "View comprehensive medical explanation and structured clinical report."}</p>
                      <div className="h-card-actions">
                        <button className="h-view-btn">
                          <Eye size={12} /> View Flow & Report
                        </button>
                        <button
                          className="h-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idToDel = item.report_id || item.analysisId;
                            setPublicHistory(prev => {
                              const filtered = prev.filter(h => (h.report_id || h.analysisId) !== idToDel);
                              localStorage.setItem("mediscan_public_history", JSON.stringify(filtered));
                              return filtered;
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-history-state" style={{ padding: "40px 0" }}>
                <History size={40} color="var(--text-muted)" />
                <p>No scans analyzed in this browser session yet.</p>
                <span>Select any diagnostic module below to run an AI assessment.</span>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: "28px", display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => { setPublicMode("xray"); }}
                className="outline-btn"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                Start New Scan
              </button>
              <button
                onClick={() => { setPublicMode("login"); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3B82F6",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Back to Portal Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (publicMode === "xray" || publicMode === "report" || publicMode === "cavity" || publicMode === "ct_scan" || publicMode === "mri") {
      return (
        <div className="studio-preupload-workspace">
          {/* Top Navbar */}
          <header className="studio-nav-bar">
            <div className="results-nav-left">
              <div className="results-nav-brand">
                <div className="results-brand-orb">
                  <Sparkles size={18} color="#2DD4BF" />
                </div>
                <div>
                  <div className="results-brand-title">
                    MediScan<span className="ai-dot">.AI</span> <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "600" }}>v2.8</span>
                  </div>
                  <div className="results-brand-subtitle">CLINICAL RADIOGRAPHIC STUDIO</div>
                </div>
              </div>

              <div className="results-system-badge">
                <span className="glowing-green-dot"></span>
                NEURAL ENGINE ONLINE
              </div>

              <div className="results-hipaa-badge">
                DICOM 3.0 PACS READY
              </div>
            </div>

            {/* Center Modality Tabs */}
            <div className="results-modality-tabs">
              <button
                className={`results-mod-tab ${publicMode === "xray" ? "active" : ""}`}
                onClick={() => { setPublicMode("xray"); setUploadFile(null); setPublicResult(null); setUploadError(""); }}
              >
                Chest X-Ray
              </button>
              <button
                className={`results-mod-tab ${publicMode === "cavity" ? "active" : ""}`}
                onClick={() => { setPublicMode("cavity"); setUploadFile(null); setPublicResult(null); setUploadError(""); }}
              >
                Dental Cavity
              </button>
              <button
                className={`results-mod-tab ${publicMode === "ct_scan" ? "active" : ""}`}
                onClick={() => { setPublicMode("ct_scan"); setUploadFile(null); setPublicResult(null); setUploadError(""); }}
              >
                CT Kidney Stone
              </button>
              <button
                className={`results-mod-tab ${publicMode === "mri" ? "active" : ""}`}
                onClick={() => { setPublicMode("mri"); setUploadFile(null); setPublicResult(null); setUploadError(""); }}
              >
                Brain MRI
              </button>
              <button
                className={`results-mod-tab ${publicMode === "report" ? "active" : ""}`}
                onClick={() => { setPublicMode("report"); setUploadFile(null); setPublicResult(null); setUploadError(""); }}
              >
                Lab Report
              </button>
              <button
                className="results-mod-tab history-tab"
                onClick={() => { setPublicMode("history"); setUploadError(""); }}
              >
                History <span className="tab-count-badge">{publicHistory.length || 0}</span>
              </button>
            </div>

            {/* Right Action */}
            <div className="results-nav-right">
              <button
                className="studio-portal-btn"
                onClick={() => { setPublicMode("login"); setUploadFile(null); setPublicResult(null); setUploadError(""); }}
              >
                Portal Login
              </button>

              <div className="studio-audit-badge">
                AUDIT ID: #MED-8910
              </div>
            </div>
          </header>

          {/* Workflow Stepper */}
          <div className="studio-stepper-container">
            <div className="results-stepper-track">
              {publicMode === "cavity" ? (
                <>
                  <div className="stepper-node active">
                    <div className="stepper-circle">1</div>
                    <span className="stepper-label">Upload Radiograph</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">2</div>
                    <span className="stepper-label">Preprocessing & Contrast</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">3</div>
                    <span className="stepper-label">Caries & Demineralization Map</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">4</div>
                    <span className="stepper-label">ICDAS Grade Assessment</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">5</div>
                    <span className="stepper-label">Clinical Report Export</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="stepper-node active">
                    <div className="stepper-circle">1</div>
                    <span className="stepper-label">Upload Scan</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">2</div>
                    <span className="stepper-label">AI Prediction</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">3</div>
                    <span className="stepper-label">Explanation</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">4</div>
                    <span className="stepper-label">Severity</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">5</div>
                    <span className="stepper-label">Action Plan</span>
                  </div>
                  <div className="stepper-connector" />
                  <div className="stepper-node">
                    <div className="stepper-circle">6</div>
                    <span className="stepper-label">Report</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Studio Content */}
          <main className="studio-main-content">
            {/* Header Block */}
            <div className="studio-header-block">
              <div className="studio-engine-pill">
                <span className="cyan-dot">●</span>
                PUBLIC DIAGNOSTIC ENGINE
              </div>

              <h1 className="studio-main-title">
                {publicMode === "cavity"
                  ? "Dental Cavity & Caries AI Detection"
                  : publicMode === "xray"
                    ? "Chest Radiograph AI Thoracic Analysis"
                    : publicMode === "ct_scan"
                      ? "Abdominal CT Kidney Stone AI Detection"
                      : publicMode === "mri"
                        ? "Brain MRI Neural Tumor Classifier"
                        : "Diagnostic Medical Lab Report Analyzer"}
              </h1>

              <p className="studio-main-sub">
                {publicMode === "cavity"
                  ? "Upload bitewing, periapical, panoramic radiographs, or intraoral photos for automated enamel breakdown, demineralization, and early caries screening."
                  : publicMode === "xray"
                    ? "Upload posteroanterior (PA) or anteroposterior (AP) chest radiographs for multi-label pneumonia, effusion, and cardiomegaly screening."
                    : publicMode === "ct_scan"
                      ? "Upload unenhanced helical CT cross-section slices for automated renal calculi sizing and urolithiasis classification."
                      : publicMode === "mri"
                        ? "Upload brain MRI scans for AI multi-class neoplasm classification (Glioma, Meningioma, Pituitary, or Normal)."
                        : "Upload laboratory test sheets, hematology panels, or metabolic profiles for automated OCR biomarker parsing."}
              </p>
            </div>

            {uploadError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "10px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                color: "#FCA5A5",
                boxShadow: "0 4px 20px rgba(239, 68, 68, 0.15)"
              }}>
                <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", color: "#EF4444", fontSize: "14px", marginBottom: "4px", letterSpacing: "0.3px" }}>
                    INVALID MEDICAL IMAGE DETECTED
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.5", color: "#FEE2E2" }}>
                    {uploadError}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError("")}
                  style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "18px", fontWeight: "700", padding: "0 4px" }}
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Central Drag & Drop Viewport */}
            <form onSubmit={handlePublicUpload} className="studio-upload-viewport">
              <div className="viewport-corner tl" />
              <div className="viewport-corner tr" />
              <div className="viewport-corner bl" />
              <div className="viewport-corner br" />

              <div className="upload-icon-circle">
                <Upload size={30} />
              </div>

              <div className="upload-prompt-primary">
                {publicMode === "cavity"
                  ? "Select or drag Dental X-ray / intraoral photo here"
                  : publicMode === "xray"
                    ? "Select or drag Chest X-Ray scan here"
                    : publicMode === "ct_scan"
                      ? "Select or drag CT scan slice here"
                      : publicMode === "mri"
                        ? "Select or drag Brain MRI scan here"
                        : "Select or drag Medical Report image or PDF here"}
              </div>

              <p className="upload-prompt-sub">
                Drag files directly into this viewport. Automated radiograph orientation and quality normalization applied on ingest.
              </p>

              <input
                type="file"
                id="studio-file-upload"
                style={{ display: "none" }}
                required={!uploadFile}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />

              {!uploadFile ? (
                <label htmlFor="studio-file-upload" className="studio-browse-btn">
                  <Upload size={15} />
                  <span>Browse Local Files</span>
                </label>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                  <div className="selected-file-banner">
                    <span style={{ fontWeight: "700", color: "#2DD4BF" }}>Selected File:</span>
                    <span>{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", marginLeft: "8px", fontWeight: "700" }}
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="studio-run-btn"
                    disabled={uploading}
                  >
                    {uploading ? (
                      "Executing AI Engine..."
                    ) : (
                      <>
                        <span>
                          {publicMode === "cavity"
                            ? "Run AI Cavity Detection"
                            : publicMode === "xray"
                              ? "Analyze Chest X-Ray"
                              : publicMode === "ct_scan"
                                ? "Detect Kidney Stone"
                                : publicMode === "mri"
                                  ? "Detect Brain Tumor"
                                  : "Analyze Lab Report"}
                        </span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Format Badges Row */}
              <div className="studio-badges-row">
                <span className="format-pill">DICOM (.dcm)</span>
                <span className="format-pill">JPEG, PNG, TIFF (Up to 60MB)</span>
                <span className="format-pill highlight-teal">
                  {publicMode === "cavity"
                    ? "Bitewing • Periapical • OPG"
                    : publicMode === "xray"
                      ? "PA • AP • Lateral"
                      : publicMode === "ct_scan"
                        ? "Axial • Coronal Helical"
                        : publicMode === "mri"
                          ? "T1+C • T2/FLAIR • DWI"
                          : "Hematology • Panels • PDF"}
                </span>
              </div>
            </form>

            {/* Benchmarks Section */}
            <div className="studio-benchmarks-card">
              <div className="benchmarks-header">
                <div className="benchmarks-title">
                  <span className="cyan-dot">●</span>
                  <span>NO IMAGE HANDY? RUN VERIFICATION BENCHMARKS</span>
                </div>
                <span className="benchmarks-sub">Pre-validated clinical test cases</span>
              </div>

              <div className="benchmark-cases-grid">
                {publicMode === "cavity" ? (
                  <>
                    <div
                      className="benchmark-case-item"
                      onClick={() => {
                        const mockResult = {
                          prediction: "Cavity Detected",
                          confidence: 96.4,
                          modality: "Dental X-Ray",
                          fileName: "benchmark_molar_bitewing.png",
                          date: new Date().toISOString(),
                          post_analysis: {
                            modality: "Dental X-Ray",
                            prediction: "Cavity Detected",
                            confidence: 96.4,
                            severity: "High",
                            severity_color: "#EF4444",
                            severity_description: "Active dental caries detected in interproximal enamel margin.",
                            explanation: "Dental radiographic assessment reveals focal radiolucency and mineral loss within enamel/dentin, indicating active dental caries (tooth decay).",
                            recommendations: [
                              "Schedule a dental restoration appointment for bitewing confirmation.",
                              "Perform composite resin restoration or ceramic inlay.",
                              "Apply fluoridated topical varnish to adjacent contact zones.",
                              "Practice daily interdental flossing and reduce fermentable carbohydrate intake."
                            ],
                            disclaimer: "⚠️ MEDICAL DISCLAIMER: This is an AI-assisted diagnostic evaluation generated for informational and clinical decision-support purposes only.",
                            report_id: "MED-BITEWING-964",
                            generated_at: new Date().toLocaleString()
                          }
                        };
                        setPublicResult(mockResult);
                      }}
                    >
                      <div className="benchmark-icon-box">
                        <Activity size={16} color="#EF4444" />
                      </div>
                      <div className="benchmark-case-info">
                        <div className="benchmark-case-name">Case A: Interproximal</div>
                        <div className="benchmark-case-sub">Molar Bitewing</div>
                        <div className="benchmark-case-action">
                          Ready to load <ArrowRight size={10} />
                        </div>
                      </div>
                      <span className="benchmark-status-badge red">CARIES</span>
                    </div>

                    <div
                      className="benchmark-case-item"
                      onClick={() => {
                        const mockResult = {
                          prediction: "Early Caries / Demineralization",
                          confidence: 84.2,
                          modality: "Dental X-Ray",
                          fileName: "benchmark_occlusal_premolar.png",
                          date: new Date().toISOString(),
                          post_analysis: {
                            modality: "Dental X-Ray",
                            prediction: "Early Caries / Demineralization",
                            confidence: 84.2,
                            severity: "Moderate",
                            severity_color: "#F59E0B",
                            severity_description: "Incipient enamel demineralization noted in occlusal fissure.",
                            explanation: "Localized subsurface radiolucency observed in occlusal pit without cavitation. Remineralization protocols indicated.",
                            recommendations: [
                              "Apply high-concentration fluoride sealing varnish (5% NaF).",
                              "Implement resin fissure sealant over susceptible occlusal anatomy.",
                              "Monitor with 6-month interval bitewing radiography.",
                              "Prescribe 5000 ppm fluoride dentifrice for home application."
                            ],
                            disclaimer: "⚠️ MEDICAL DISCLAIMER: This is an AI-assisted diagnostic evaluation generated for informational and clinical decision-support purposes only.",
                            report_id: "MED-OCCLUSAL-842",
                            generated_at: new Date().toLocaleString()
                          }
                        };
                        setPublicResult(mockResult);
                      }}
                    >
                      <div className="benchmark-icon-box">
                        <Activity size={16} color="#F59E0B" />
                      </div>
                      <div className="benchmark-case-info">
                        <div className="benchmark-case-name">Case B: Occlusal Enamel</div>
                        <div className="benchmark-case-sub">Premolar Demineralization</div>
                        <div className="benchmark-case-action">
                          Ready to load <ArrowRight size={10} />
                        </div>
                      </div>
                      <span className="benchmark-status-badge amber">EARLY</span>
                    </div>

                    <div
                      className="benchmark-case-item"
                      onClick={() => {
                        const mockResult = {
                          prediction: "No Cavity Detected",
                          confidence: 99.1,
                          modality: "Dental X-Ray",
                          fileName: "benchmark_healthy_dentition.png",
                          date: new Date().toISOString(),
                          post_analysis: {
                            modality: "Dental X-Ray",
                            prediction: "No Cavity Detected",
                            confidence: 99.1,
                            severity: "Low",
                            severity_color: "#10B981",
                            severity_description: "Sound enamel surfaces with preserved alveolar bone crests.",
                            explanation: "Dental radiograph exhibits intact enamel margins, uniform dentin density, and sound periodontal bone support with no active cavitation.",
                            recommendations: [
                              "Maintain twice-daily brushing with fluoridated toothpaste.",
                              "Practice daily interdental flossing.",
                              "Schedule routine 6-month preventive dental check-ups.",
                              "Maintain balanced nutrition with minimal sugar exposure."
                            ],
                            disclaimer: "⚠️ MEDICAL DISCLAIMER: This is an AI-assisted diagnostic evaluation generated for informational and clinical decision-support purposes only.",
                            report_id: "MED-HEALTHY-991",
                            generated_at: new Date().toLocaleString()
                          }
                        };
                        setPublicResult(mockResult);
                      }}
                    >
                      <div className="benchmark-icon-box">
                        <Check size={16} color="#10B981" />
                      </div>
                      <div className="benchmark-case-info">
                        <div className="benchmark-case-name">Case C: Negative Control</div>
                        <div className="benchmark-case-sub">Healthy Intact Dentition</div>
                        <div className="benchmark-case-action">
                          Ready to load <ArrowRight size={10} />
                        </div>
                      </div>
                      <span className="benchmark-status-badge green">CLEAN</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="benchmark-case-item"
                      onClick={() => {
                        alert("Please select a diagnostic file using 'Browse Local Files' or drag a scan into the viewport.");
                      }}
                    >
                      <div className="benchmark-icon-box">
                        <Activity size={16} color="#EF4444" />
                      </div>
                      <div className="benchmark-case-info">
                        <div className="benchmark-case-name">Case A: Acute Pathology</div>
                        <div className="benchmark-case-sub">Positive Benchmark Sample</div>
                        <div className="benchmark-case-action">
                          Select Local File <ArrowRight size={10} />
                        </div>
                      </div>
                      <span className="benchmark-status-badge red">HIGH</span>
                    </div>

                    <div
                      className="benchmark-case-item"
                      onClick={() => {
                        alert("Please select a diagnostic file using 'Browse Local Files' or drag a scan into the viewport.");
                      }}
                    >
                      <div className="benchmark-icon-box">
                        <Activity size={16} color="#F59E0B" />
                      </div>
                      <div className="benchmark-case-info">
                        <div className="benchmark-case-name">Case B: Moderate Finding</div>
                        <div className="benchmark-case-sub">Equivocal Infiltration</div>
                        <div className="benchmark-case-action">
                          Select Local File <ArrowRight size={10} />
                        </div>
                      </div>
                      <span className="benchmark-status-badge amber">MOD</span>
                    </div>

                    <div
                      className="benchmark-case-item"
                      onClick={() => {
                        alert("Please select a diagnostic file using 'Browse Local Files' or drag a scan into the viewport.");
                      }}
                    >
                      <div className="benchmark-icon-box">
                        <Check size={16} color="#10B981" />
                      </div>
                      <div className="benchmark-case-info">
                        <div className="benchmark-case-name">Case C: Baseline Control</div>
                        <div className="benchmark-case-sub">Clear Radiological Scan</div>
                        <div className="benchmark-case-action">
                          Select Local File <ArrowRight size={10} />
                        </div>
                      </div>
                      <span className="benchmark-status-badge green">CLEAN</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Clinical Decision Support Disclaimer */}
            <div className="studio-disclaimer-box">
              <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p className="studio-disclaimer-text">
                Clinical Decision Support Notice: AI-generated segmentation boundaries and probability scores are intended for informational, triage, and clinician decision-support purposes only. They do not constitute an autonomous medical or dental diagnosis. Final clinical diagnosis and treatment plans must always be confirmed by a licensed dentist or oral radiologist.
              </p>
            </div>
          </main>

          {/* Studio Footer */}
          <footer className="studio-footer">
            <button
              className="studio-back-link"
              onClick={() => { setPublicMode("login"); setUploadFile(null); setPublicResult(null); }}
            >
              ← Back to Portal Login
            </button>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              <span>ISO 13485 CERTIFIED</span>
              <span>•</span>
              <span>HIPAA BAA COMPLIANT</span>
              <span>•</span>
              <span>DICOM WG-28 STANDARD</span>
              <span>•</span>
              <span>© 2026 MediScan.AI Neural Engine</span>
            </div>

            <div style={{ color: "#38BDF8", fontWeight: "700" }}>
              ● NODE: US-EAST-CLINICAL-04
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="portal-landing-bg">
        {/* Top Navbar */}
        <header className="portal-navbar">
          <div className="portal-nav-brand">
            <div className="portal-logo-orb">
              <Sparkles size={20} color="#2DD4BF" />
            </div>
            <div>
              <div className="portal-brand-title">
                MediScan <span className="brand-ai">AI</span>
                <span className="portal-system-badge">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", boxShadow: "0 0 6px #10B981" }}></span>
                  SYSTEM ONLINE
                </span>
              </div>
              <div className="portal-brand-sub">Clinical Decision Support & Patient Management System</div>
            </div>
          </div>

          <div className="portal-nav-right">
            <div className="portal-hipaa-badge">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0EA5E9", display: "inline-block" }}></span>
              HIPAA COMPLIANT &nbsp;|&nbsp; DICOM v3.0 READY
            </div>
            <button
              className="portal-support-link"
              onClick={() => alert("MediScan Clinical Support Portal\n24/7 Hotline: +1 (800) 555-MEDI\nEmail: clinical.support@mediscan.ai\nStatus: All neural inference engines operating nominal.")}
            >
              <HelpCircle size={14} /> Clinical Support
            </button>
          </div>
        </header>

        {/* Main 2-Column Split */}
        <main className="portal-main-grid">
          {/* Left Column: Hero Typography + Feature Badges + 5 Diagnostic Modules + Pipeline */}
          <div className="portal-hero-left">
            <div className="portal-top-pill">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2DD4BF", display: "inline-block", boxShadow: "0 0 6px #2DD4BF" }}></span>
              NEXT-GEN NEURAL DIAGNOSTIC SUITE
            </div>

            <h1 className="portal-hero-title">
              Intelligent Medical <br />
              Imaging. <br />
              <span className="highlight-cyan">Smarter Clinical</span>
              <span className="highlight-cyan">Decisions.</span>
            </h1>

            <p className="portal-hero-desc">
              MediScan AI ingests multi-modal radiological scans, synthesizes contextual
              patient records, and delivers instant, explainable deep learning decision
              support directly to your clinical workflow.
            </p>

            {/* Feature Pills */}
            <div className="portal-feature-pills">
              <div className="portal-feature-pill cyan-border">
                <Check size={13} color="#2DD4BF" />
                <span>AI-Powered Clinical Analysis</span>
              </div>
              <div className="portal-feature-pill">
                <Layers size={13} color="#38BDF8" />
                <span>Multimodal Medical Imaging</span>
              </div>
              <div className="portal-feature-pill">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", display: "inline-block", boxShadow: "0 0 6px #34D399" }}></span>
                <span>99.4% Model Confidence</span>
              </div>
            </div>

            {/* AI Diagnostic Modules Card */}
            <div className="portal-modules-card">
              <div className="portal-modules-header">
                <div className="portal-modules-title">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2DD4BF", display: "inline-block", boxShadow: "0 0 6px #2DD4BF" }}></span>
                  AI Diagnostic Modules <span className="sub">| Multimodal medical imaging analysis</span>
                </div>
                <div className="portal-types-badge">5 ANALYSIS TYPES</div>
              </div>

              {/* 2x2 + 1 Grid */}
              <div className="portal-modules-grid">
                {/* 1. Chest X-Ray */}
                <div
                  className="portal-module-item"
                  onClick={() => { setPublicMode("xray"); setAuthError(""); setPublicResult(null); }}
                  title="Launch Public Chest X-Ray AI Analysis"
                >
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4v16" />
                        <path d="M7 6a5 5 0 0 0-4 4.5c0 3.5 2.5 6.5 5 7.5" />
                        <path d="M17 6a5 5 0 0 1 4 4.5c0 3.5-2.5 6.5-5 7.5" />
                        <path d="M8 10h8" />
                        <path d="M8 14h8" />
                      </svg>
                    </div>
                    <span className="portal-mod-ready-badge">
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                      Ready to Analyze
                    </span>
                  </div>
                  <div className="portal-mod-name">Chest X-Ray</div>
                  <div className="portal-mod-sub">AI-powered chest abnormality analysis</div>
                </div>

                {/* 2. Dental Analysis */}
                <div
                  className="portal-module-item"
                  onClick={() => { setPublicMode("cavity"); setAuthError(""); setPublicResult(null); }}
                  title="Launch Public Dental Cavity Detection"
                >
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 3C4.2 3 2 8 2 10.5c0 3.8 2 7 4 10.5 1 1.8 2 1.8 3 0 .8-1.5 1.5-3.5 2.5-3.5s1.7 2 2.5 3.5c1 1.8 2 1.8 3 0 2-3.5 4-6.7 4-10.5C20.5 8 18.3 3 15.5 3c-2 0-3 1-4.2 2-1.2-1-2.2-2-4.3-2z" />
                      </svg>
                    </div>
                    <span className="portal-mod-ready-badge">
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                      Ready to Analyze
                    </span>
                  </div>
                  <div className="portal-mod-name">Dental Analysis</div>
                  <div className="portal-mod-sub">AI cavity and dental condition analysis</div>
                </div>

                {/* 3. Brain MRI */}
                <div
                  className="portal-module-item"
                  onClick={() => { setPublicMode("mri"); setAuthError(""); setPublicResult(null); }}
                  title="Launch Public Brain MRI Classifier"
                >
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box">
                      <Brain size={18} />
                    </div>
                    <span className="portal-mod-ready-badge">
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                      Ready to Analyze
                    </span>
                  </div>
                  <div className="portal-mod-name">Brain MRI</div>
                  <div className="portal-mod-sub">AI-assisted brain imaging analysis</div>
                </div>

                {/* 4. Kidney Stone CT */}
                <div
                  className="portal-module-item"
                  onClick={() => { setPublicMode("ct_scan"); setAuthError(""); setPublicResult(null); }}
                  title="Launch Public CT Kidney Stone Classifier"
                >
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="12" cy="2" r="1.5" />
                      </svg>
                    </div>
                    <span className="portal-mod-ready-badge">
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                      Ready to Analyze
                    </span>
                  </div>
                  <div className="portal-mod-name">Kidney Stone CT</div>
                  <div className="portal-mod-sub">Kidney stone detection and analysis</div>
                </div>

                {/* 5. Blood Report Analysis */}
                <div
                  className="portal-module-item"
                  style={{ gridColumn: "1 / -1", maxWidth: "48.5%" }}
                  onClick={() => { setPublicMode("report"); setAuthError(""); setPublicResult(null); }}
                  title="Launch Public Lab Report Analyzer"
                >
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                      </svg>
                    </div>
                    <span className="portal-mod-ready-badge">
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                      Ready to Analyze
                    </span>
                  </div>
                  <div className="portal-mod-name">Blood Report Analysis</div>
                  <div className="portal-mod-sub">AI hematology & biomarker lab report analysis</div>
                </div>
              </div>

              {/* Pipeline Footer Bar */}
              <div className="portal-pipeline-bar">
                <div className="portal-pipeline-steps">
                  <span style={{ color: "#64748B", fontSize: "10px", letterSpacing: "0.5px" }}>PIPELINE:</span>
                  <span className="portal-pipe-chip active">Prediction</span>
                  <span className="portal-pipe-arrow">→</span>
                  <span className="portal-pipe-chip">Explanation</span>
                  <span className="portal-pipe-arrow">→</span>
                  <span className="portal-pipe-chip">Severity</span>
                  <span className="portal-pipe-arrow">→</span>
                  <span className="portal-pipe-chip">Recommendation</span>
                  <span className="portal-pipe-arrow">→</span>
                  <span className="portal-pipe-chip">Report</span>
                </div>

                <button
                  className="portal-history-btn"
                  onClick={() => { setPublicMode("history"); setAuthError(""); }}
                  title="View Public Analysis History Audit Record"
                >
                  <History size={13} />
                  <span>Analysis History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek Glowing Portal Login Card */}
          <div className="portal-auth-card">
            <div className="portal-auth-header">
              <div className="portal-auth-icon-orb">
                <Zap size={22} color="#2DD4BF" />
              </div>
              <div className="portal-auth-title">
                {isRegistering ? "Register Doctor Account" : "MediScan AI Portal"}
              </div>
              <div className="portal-auth-sub">
                {isRegistering
                  ? "Create your practitioner credentials"
                  : "Clinical Decision Support & Patient Management System"}
              </div>
              <div className="portal-gateway-tag">• SECURE PRACTITIONER GATEWAY •</div>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleLogin}>
              {authError && <div className="error-alert">{authError}</div>}

              {isRegistering && (
                <div className="portal-input-group">
                  <label className="portal-input-label">Practitioner Full Name</label>
                  <div className="portal-input-wrap">
                    <User size={15} className="portal-input-icon" />
                    <input
                      type="text"
                      required
                      className="portal-input"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Varsha Gowda"
                    />
                  </div>
                </div>
              )}

              <div className="portal-input-group">
                <label className="portal-input-label">Username / Clinical Email</label>
                <div className="portal-input-wrap">
                  <Mail size={15} className="portal-input-icon" />
                  <input
                    type="text"
                    required
                    className="portal-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="doctor.id@hospital-network.org"
                  />
                </div>
              </div>

              <div className="portal-input-group">
                <label className="portal-input-label">Security Passcode</label>
                <div className="portal-input-wrap">
                  <Lock size={15} className="portal-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="portal-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    className="portal-pass-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="portal-form-options">
                <label className="portal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={keepSessionActive}
                    onChange={(e) => setKeepSessionActive(e.target.checked)}
                  />
                  <span>Keep session active (24h)</span>
                </label>

                <div className="portal-ssl-link">
                  <span
                    className="link"
                    onClick={() => alert("Institutional password recovery: Please contact IT security at security@hospital-network.org")}
                  >
                    Forgot password?
                  </span>
                  &nbsp;• 256-Bit SSL
                </div>
              </div>

              <button type="submit" className="portal-submit-btn">
                {isRegistering ? "Register Account" : "Authenticate Portal"}
                <ArrowRight size={15} />
              </button>
            </form>

            <div className="portal-mode-toggle">
              {isRegistering ? (
                <span>
                  Already have an account?
                  <button onClick={() => { setIsRegistering(false); setAuthError(""); }}>
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Need an account?
                  <button onClick={() => { setIsRegistering(true); setAuthError(""); }}>
                    Sign Up
                  </button>
                </span>
              )}
            </div>
          </div>
        </main>

        {/* Bottom Footer */}
        <footer className="portal-footer">
          <div className="portal-footer-left">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2DD4BF", display: "inline-block" }}></span>
            <span>Powered by Multi-Modal Deep Neural Networks & Medical Decision Support Engine</span>
          </div>

          <div className="portal-footer-right">
            <span>v2.8.4-PROD</span>
            <span>•</span>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Security Protocol: AES-256 GCM encryption enabled with TLS 1.3 cryptographic transport.")}>Security Protocol</span>
            <span>•</span>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Privacy Notice: MediScan AI strictly adheres to HIPAA and GDPR diagnostic telemetry standards.")}>Privacy Notice</span>
          </div>
        </footer>
      </div>
    );
  }

  const formatRelativeTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hrs ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    } catch (e) {
      return "Recently";
    }
  };

  const renderLineChart = (trends) => {
    if (!trends || trends.length === 0) return <div className="no-chart-data">No data available yet.</div>;

    const width = 500;
    const height = 180;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(...trends.map(t => Math.max(t.xray, t.report)), 4);

    const xrayPoints = trends.map((t, idx) => {
      const x = padding + (idx * (chartWidth / (trends.length - 1 || 1)));
      const y = padding + chartHeight - ((t.xray / maxVal) * chartHeight);
      return `${x},${y}`;
    }).join(" ");

    const reportPoints = trends.map((t, idx) => {
      const x = padding + (idx * (chartWidth / (trends.length - 1 || 1)));
      const y = padding + chartHeight - ((t.report / maxVal) * chartHeight);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-line-chart" style={{ width: "100%", height: "100%" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + chartHeight - (r * chartHeight);
          return (
            <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          );
        })}

        {trends.length > 1 && (
          <>
            <text x={padding} y={height - 2} fill="var(--text-muted)" fontSize="9" textAnchor="start">
              {new Date(trends[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
            <text x={width / 2} y={height - 2} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
              {new Date(trends[Math.floor(trends.length / 2)].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
            <text x={width - padding} y={height - 2} fill="var(--text-muted)" fontSize="9" textAnchor="end">
              {new Date(trends[trends.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
          </>
        )}

        <polyline fill="none" stroke="#3B82F6" strokeWidth="2.5" points={xrayPoints} strokeLinecap="round" strokeLinejoin="round" />
        <polyline fill="none" stroke="#F59E0B" strokeWidth="2.5" points={reportPoints} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderDonutChart = (xrayCount, reportCount) => {
    const total = xrayCount + reportCount;
    const xrayPct = total > 0 ? Math.round((xrayCount / total) * 100) : 0;
    const reportPct = total > 0 ? Math.round((reportCount / total) * 100) : 0;

    const r = 36;
    const c = 2 * Math.PI * r; // ~226.2
    const xrayOffset = 0;
    const reportOffset = -((xrayPct / 100) * c);

    return (
      <div className="donut-chart-container" style={{ position: "relative", width: "120px", height: "120px" }}>
        <svg viewBox="0 0 100 100" className="svg-donut" style={{ width: "100%", height: "100%" }}>
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
          {total > 0 ? (
            <>
              <circle cx="50" cy="50" r={r} fill="transparent" stroke="#3B82F6" strokeWidth="8"
                strokeDasharray={`${(xrayPct / 100) * c} ${c}`} strokeDashoffset={xrayOffset}
                strokeLinecap="round" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r={r} fill="transparent" stroke="#F59E0B" strokeWidth="8"
                strokeDasharray={`${(reportPct / 100) * c} ${c}`} strokeDashoffset={reportOffset}
                strokeLinecap="round" transform="rotate(-90 50 50)" />
            </>
          ) : (
            <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          )}
        </svg>
        <div className="donut-center" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="total-num" style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)" }}>{total}</span>
          <span className="total-lbl" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>Total</span>
        </div>
      </div>
    );
  };

  const handleEditPatient = async (e) => {
    e.preventDefault();
    if (!editPatientData.name || !editPatientData.age) return;
    try {
      const res = await fetch(`${API_BASE}/api/patients/${editPatientData.patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editPatientData.name,
          age: parseInt(editPatientData.age),
          gender: editPatientData.gender,
          contact: editPatientData.contact
        })
      });
      if (res.ok) {
        showToast("Patient record updated successfully.");
        setShowEditModal(false);
        fetchPatients();
        fetchRegistryData();
        if (selectedPatient && selectedPatient.patientId === editPatientData.patientId) {
          setSelectedPatient({ ...selectedPatient, name: editPatientData.name, age: editPatientData.age, gender: editPatientData.gender, contact: editPatientData.contact });
        }
      } else {
        showToast("Failed to update patient demographics.");
      }
    } catch (err) {
      showToast("Error updating patient.");
    }
  };

  const handleArchivePatient = async (patientId) => {
    if (!window.confirm("Archiving this patient will hide the patient from the active registry.\n\nDo you want to proceed?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/archive`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("Patient archived successfully.");
        setActiveTab("patients");
        fetchRegistryData();
        fetchDashboardData(period);
      } else {
        showToast("Failed to archive patient.");
      }
    } catch (err) {
      showToast("Server communication error.");
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (!window.confirm("Delete this analysis?\n\nThis will permanently remove this analysis from the patient's history.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/analyses/${analysisId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Analysis deleted successfully.");
        selectPatient(selectedPatient);
        fetchDashboardData(period);
        fetchRegistryData();
      } else {
        showToast("Failed to delete analysis.");
      }
    } catch (err) {
      showToast("Server communication error.");
    }
  };

  const handleUpdateAnalysisNote = async (e) => {
    e.preventDefault();
    if (!editingAnalysis) return;
    try {
      const res = await fetch(`${API_BASE}/api/analyses/${editingAnalysis.analysisId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_note: editNoteText })
      });
      if (res.ok) {
        showToast("Analysis note updated successfully.");
        setEditingAnalysis(null);
        selectPatient(selectedPatient);
      } else {
        showToast("Failed to update analysis note.");
      }
    } catch (err) {
      showToast("Server communication error.");
    }
  };

  const getFilteredRegistryPatients = () => {
    return registryPatients.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || p.patientId.toLowerCase().includes(q);

      const matchGender = genderFilter === "All" || p.gender === genderFilter;

      let matchAge = true;
      if (ageFilter === "Under 30") matchAge = p.age < 30;
      else if (ageFilter === "30-50") matchAge = p.age >= 30 && p.age <= 50;
      else if (ageFilter === "Over 50") matchAge = p.age > 50;

      let matchAnalysis = true;
      if (analysisTypeFilter === "X-Ray") matchAnalysis = p.lastAnalysis && p.lastAnalysis.type === "X-Ray";
      else if (analysisTypeFilter === "Cavity") matchAnalysis = p.lastAnalysis && p.lastAnalysis.type === "Dental Cavity";
      else if (analysisTypeFilter === "CT Scan") matchAnalysis = p.lastAnalysis && p.lastAnalysis.type === "CT Scan";
      else if (analysisTypeFilter === "MRI") matchAnalysis = p.lastAnalysis && (p.lastAnalysis.type === "Brain MRI" || p.lastAnalysis.type === "MRI");
      else if (analysisTypeFilter === "Report") matchAnalysis = p.lastAnalysis && p.lastAnalysis.type === "Report";

      return matchSearch && matchGender && matchAge && matchAnalysis;
    }).sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "patientId") {
        return a.patientId.localeCompare(b.patientId);
      } else if (sortBy === "registrationDate") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === "lastAnalysis") {
        const aDate = a.lastAnalysis ? new Date(a.lastAnalysis.date) : new Date(0);
        const bDate = b.lastAnalysis ? new Date(b.lastAnalysis.date) : new Date(0);
        return bDate - aDate;
      }
      return 0;
    });
  };

  const filteredRegPatients = getFilteredRegistryPatients();
  const totalRegPages = Math.ceil(filteredRegPatients.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRegPatients = filteredRegPatients.slice(indexOfFirstItem, indexOfLastItem);

  const filteredTimeline = patientHistory.filter(item => {
    const q = timelineSearch.toLowerCase();
    const matchSearch = item.fileName.toLowerCase().includes(q) ||
      (item.prediction && item.prediction.toLowerCase().includes(q)) ||
      (item.reportSummary && item.reportSummary.toLowerCase().includes(q));

    const matchFilter = timelineFilter === "All" ||
      (timelineFilter === "X-Ray" && item.fileType === "Chest X-Ray") ||
      (timelineFilter === "Cavity" && item.fileType === "Dental Cavity") ||
      (timelineFilter === "CT Scan" && (item.fileType === "CT Scan" || item.fileType === "Kidney Stone CT")) ||
      (timelineFilter === "MRI" && (item.fileType === "Brain MRI" || item.fileType === "MRI")) ||
      (timelineFilter === "Reports" && item.fileType === "Medical Report");

    return matchSearch && matchFilter;
  });

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Activity size={24} color="#10B981" />
          <span>MediScan Portal</span>
        </div>

        <div className="doctor-profile-widget">
          <div className="avatar">
            <User size={20} color="#3B82F6" />
          </div>
          <div className="info">
            <span className="name">{doctorName}</span>
            <span className="role">Primary Physician</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("dashboard");
              setSelectedPatient(null);
              fetchPatients();
              fetchDashboardData();
            }}
          >
            <Layers size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === "patients" ? "active" : ""}`}
            onClick={() => setActiveTab("patients")}
          >
            <User size={18} />
            <span>Patients Registry</span>
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout Portal</span>
        </button>
      </aside>

      <main className="main-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-view">
            <header className="view-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <h1>Doctor Command Dashboard</h1>
                <p>AI-assisted medical analysis and patient monitoring. Review the latest diagnostic insights below.</p>
              </div>
              <div className="system-status-pill">
                <span className="dot"></span>
                <span>System Status: Healthy</span>
              </div>
            </header>

            {dashboardLoading && !dashboardData ? (
              <div className="dashboard-loading">
                <Brain size={48} className="brain-loader animate-pulse" />
                <p>Retrieving diagnostic records and real-time statistics...</p>
              </div>
            ) : dashboardError ? (
              <div className="dashboard-error-card">
                <ShieldAlert size={48} className="error-icon" />
                <h3>{dashboardError}</h3>
                <button className="primary-btn" onClick={() => fetchDashboardData(period)}>Retry Connection</button>
              </div>
            ) : (
              <>
                {/* 1. Dashboard Statistics Cards */}
                <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "32px" }}>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="label">Total Patients</span>
                      <User size={16} color="var(--accent)" />
                    </div>
                    <span className="value">{dashboardData.stats.total_patients}</span>
                    <span className="indicator green">{dashboardData.stats.patients_trend}</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="label">Total Analyses</span>
                      <Layers size={16} color="var(--accent)" />
                    </div>
                    <span className="value">{dashboardData.stats.total_analyses}</span>
                    <span className="indicator green">{dashboardData.stats.analyses_trend}</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="label">X-Ray Analyses</span>
                      <Layers size={16} color="var(--warning)" />
                    </div>
                    <span className="value">{dashboardData.stats.total_xray}</span>
                    <span className="indicator yellow">Awaiting review: {dashboardData.stats.xray_awaiting}</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-header">
                      <span className="label">Report Analyses</span>
                      <Layers size={16} color="var(--cyan)" />
                    </div>
                    <span className="value">{dashboardData.stats.total_reports}</span>
                    <span className="indicator blue">Awaiting review: {dashboardData.stats.reports_awaiting}</span>
                  </div>
                </div>

                {/* 2. Middle charts row */}
                <div className="charts-row" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px", marginBottom: "32px" }}>
                  <div className="chart-card line-chart-card">
                    <div className="chart-header">
                      <h3>Analysis Activity</h3>
                      <div className="period-selector">
                        {["7d", "30d", "3m"].map((p) => (
                          <button
                            key={p}
                            className={`period-btn ${period === p ? "active" : ""}`}
                            onClick={() => setPeriod(p)}
                          >
                            {p.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="chart-body" style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {dashboardData.trends && dashboardData.trends.length > 0 ? (
                        renderLineChart(dashboardData.trends)
                      ) : (
                        <span className="no-data">Not enough historical data</span>
                      )}
                    </div>
                    <div className="chart-legend" style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "8px" }}>
                      <span className="legend-item"><span className="color-dot xray"></span>X-Ray</span>
                      <span className="legend-item"><span className="color-dot report"></span>Report</span>
                    </div>
                  </div>

                  <div className="chart-card donut-chart-card">
                    <h3>Analysis Overview</h3>
                    <div className="chart-body" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "180px" }}>
                      {renderDonutChart(dashboardData.stats.total_xray, dashboardData.stats.total_reports)}
                    </div>
                    <div className="donut-legend" style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
                      <span className="legend-item"><span className="color-dot xray"></span>X-Ray ({dashboardData.stats.total_analyses > 0 ? Math.round((dashboardData.stats.total_xray / dashboardData.stats.total_analyses) * 100) : 0}%)</span>
                      <span className="legend-item"><span className="color-dot report"></span>Report ({dashboardData.stats.total_analyses > 0 ? Math.round((dashboardData.stats.total_reports / dashboardData.stats.total_analyses) * 100) : 0}%)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Lower disease and system status row */}
                <div className="lower-row" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px", marginBottom: "32px" }}>
                  <div className="distribution-card">
                    <h3>Disease Distribution</h3>
                    <p className="subtitle">Distribution of predictions in analyzed X-rays</p>
                    <div className="distribution-list" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                      {Object.entries(dashboardData.distribution).map(([disease, count]) => {
                        const total = Object.values(dashboardData.distribution).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={disease} className="dist-item">
                            <div className="dist-meta">
                              <span className="dist-name">{disease}</span>
                              <span className="dist-val">{percentage}% ({count})</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div className={`progress-bar-fill ${disease.toLowerCase().replace("-", "")}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="system-health-card">
                    <h3>System Health</h3>
                    <div className="health-list" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                      <div className="health-item">
                        <span className="health-label">AI X-Ray Model</span>
                        <span className={`health-status ${dashboardData.system_health.xray_model.toLowerCase()}`}>
                          {dashboardData.system_health.xray_model}
                        </span>
                      </div>
                      <div className="health-item">
                        <span className="health-label">X-Ray Validation</span>
                        <span className={`health-status ${dashboardData.system_health.validation.toLowerCase()}`}>
                          {dashboardData.system_health.validation}
                        </span>
                      </div>
                      <div className="health-item">
                        <span className="health-label">Report Analysis</span>
                        <span className={`health-status ${dashboardData.system_health.report_analysis.toLowerCase()}`}>
                          {dashboardData.system_health.report_analysis}
                        </span>
                      </div>
                      <div className="health-item">
                        <span className="health-label">Database</span>
                        <span className={`health-status ${dashboardData.system_health.database.toLowerCase()}`}>
                          {dashboardData.system_health.database}
                        </span>
                      </div>
                    </div>
                    <div className="ai-engine-card" style={{ marginTop: "24px", background: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <Brain size={16} color="var(--accent)" />
                        <span style={{ fontSize: "12px", fontWeight: "700" }}>AI Analysis Engine</span>
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4", margin: 0 }}>
                        Powered by DenseNet121 architecture. Visual explanations provided via Grad-CAM mapping for high-confidence regional highlighting. Device: {dashboardData.system_health.device || "CPU"}.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Quick Actions */}
                <div className="quick-actions-card" style={{ marginBottom: "32px" }}>
                  <h3>Quick Actions</h3>
                  <div className="quick-actions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginTop: "16px" }}>
                    <button className="action-card-btn" onClick={() => setShowCreateModal(true)}>
                      <User size={20} color="var(--accent)" />
                      <span>Register Patient</span>
                    </button>
                    <button className="action-card-btn" onClick={() => {
                      setActiveTab("patients");
                      showToast("Select a patient from the directory to analyze their X-Ray.");
                    }}>
                      <Layers size={20} color="var(--warning)" />
                      <span>Analyze X-Ray</span>
                    </button>
                    <button className="action-card-btn" onClick={() => {
                      setActiveTab("patients");
                      showToast("Select a patient from the directory to analyze their Lab Report.");
                    }}>
                      <Brain size={20} color="var(--cyan)" />
                      <span>Analyze Report</span>
                    </button>
                  </div>
                </div>

                {/* 5. Recent Analyses Table */}
                <div className="recent-analyses-card" style={{ display: "grid", gridTemplateColumns: "1.70fr 1fr", gap: "24px" }}>
                  <div className="table-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h3>Recent Analyses</h3>
                      <button className="text-btn" onClick={() => setActiveTab("patients")}>View All</button>
                    </div>
                    <table className="patients-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Patient</th>
                          <th>Result</th>
                          <th>Confidence</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recent_analyses.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="no-data">No analysis data available yet.</td>
                          </tr>
                        ) : (
                          dashboardData.recent_analyses.map((row) => (
                            <tr key={row.analysisId}>
                              <td>
                                <span className={`type-tag ${row.type.toLowerCase()}`}>{row.type}</span>
                              </td>
                              <td className="patient-id">{row.patientId}</td>
                              <td>
                                <span className={`result-tag ${row.result.toLowerCase()}`}>{row.result}</span>
                              </td>
                              <td>{row.confidence ? `${row.confidence}%` : "N/A"}</td>
                              <td>{formatRelativeTime(row.date)}</td>
                              <td>
                                <button className="action-btn" onClick={() => {
                                  const pat = patients.find(p => p.patientId === row.patientId);
                                  if (pat) {
                                    selectPatient(pat, row.analysisId);
                                  } else {
                                    showToast("Patient record not found.");
                                  }
                                }}>
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="recent-activity-card">
                    <h3>Recent Activity</h3>
                    <div className="activity-list" style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
                      {dashboardData.activities.length === 0 ? (
                        <p className="no-data">No activity logged yet.</p>
                      ) : (
                        dashboardData.activities.map((act, index) => (
                          <div key={index} className="activity-item" style={{ display: "flex", gap: "12px" }}>
                            <div className={`activity-icon-container ${act.type}`}>
                              {act.type === "patient" ? <User size={14} /> : <Brain size={14} />}
                            </div>
                            <div className="activity-details">
                              <p className="activity-text" style={{ fontSize: "13px", margin: 0 }}>{act.text}</p>
                              <span className="activity-time" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatRelativeTime(act.date)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "patients" && (
          <div className="dashboard-view">
            <header className="view-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div>
                <h1>PATIENTS REGISTRY</h1>
                <p>Manage patient records, medical analyses, and longitudinal history.</p>
              </div>
              <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
                <Plus size={18} />
                <span>Add Patient</span>
              </button>
            </header>

            {/* 1. Summary Cards */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "32px" }}>
              <div className="stat-card">
                <span className="label">Total Patients</span>
                <span className="value">{loadingRegistry ? "..." : registryStats.total_patients}</span>
                <span className="indicator green">Portal Active</span>
              </div>
              <div className="stat-card">
                <span className="label">Active Cases</span>
                <span className="value">{loadingRegistry ? "..." : registryStats.active_cases}</span>
                <span className="indicator blue">Direct DB Query</span>
              </div>
              <div className="stat-card">
                <span className="label">Analyses This Month</span>
                <span className="value">{loadingRegistry ? "..." : registryStats.analyses_this_month}</span>
                <span className="indicator green">X-Ray + Report</span>
              </div>
              <div className="stat-card">
                <span className="label">Recently Added</span>
                <span className="value">{loadingRegistry ? "..." : registryStats.recently_added}</span>
                <span className="indicator blue">Last 30 Days</span>
              </div>
            </div>

            {/* 2. Search & Collapsible Filters */}
            <div className="action-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "16px", width: "100%" }}>
                <div className="search-bar" style={{ flex: 1 }}>
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by patient ID, name, or other registered information..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <button className="outline-btn" onClick={() => setShowFilterDrawer(!showFilterDrawer)}>
                  <span>Filter</span>
                </button>
                <div className="sorting-selector" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "700" }}>Sort by:</span>
                  <select
                    className="period-selector"
                    style={{ background: "rgba(13,19,35,0.75)", border: "1px solid var(--border-color)", color: "#fff", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="registrationDate">Registration Date</option>
                    <option value="name">Name</option>
                    <option value="patientId">Patient ID</option>
                    <option value="lastAnalysis">Last Active</option>
                  </select>
                </div>
              </div>

              {showFilterDrawer && (
                <div className="filter-drawer-card" style={{ background: "rgba(13,19,35,0.3)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "16px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700" }}>Gender</span>
                    <select
                      value={genderFilter}
                      onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                      style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "6px 12px", borderRadius: "8px", fontSize: "13px" }}
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700" }}>Age Range</span>
                    <select
                      value={ageFilter}
                      onChange={(e) => { setAgeFilter(e.target.value); setCurrentPage(1); }}
                      style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "6px 12px", borderRadius: "8px", fontSize: "13px" }}
                    >
                      <option value="All">All Ages</option>
                      <option value="Under 30">Under 30</option>
                      <option value="30-50">30 - 50</option>
                      <option value="Over 50">Over 50</option>
                    </select>
                  </div>
                  <div className="filter-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700" }}>Last Analysis Type</span>
                    <select
                      value={analysisTypeFilter}
                      onChange={(e) => { setAnalysisTypeFilter(e.target.value); setCurrentPage(1); }}
                      style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "6px 12px", borderRadius: "8px", fontSize: "13px" }}
                    >
                      <option value="All">All Types</option>
                      <option value="X-Ray">Chest X-Ray</option>
                      <option value="Cavity">Dental Cavity</option>
                      <option value="CT Scan">CT Scan</option>
                      <option value="MRI">Brain MRI</option>
                      <option value="Report">Lab Report</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setGenderFilter("All");
                        setAgeFilter("All");
                        setAnalysisTypeFilter("All");
                        setSortBy("registrationDate");
                        setCurrentPage(1);
                      }}
                      style={{ fontSize: "12px", paddingBottom: "6px" }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Patient List Directory */}
            <div className="table-card">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Patient ID</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Last Analysis</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRegistry ? (
                    <tr>
                      <td colSpan="7" className="no-data">Querying patient registry database records...</td>
                    </tr>
                  ) : currentRegPatients.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        {searchQuery || genderFilter !== "All" || ageFilter !== "All" || analysisTypeFilter !== "All"
                          ? "No matching patients found. Adjust filters or search parameters."
                          : "No patients registered yet."}
                      </td>
                    </tr>
                  ) : (
                    currentRegPatients.map((p) => {
                      const isActive = p.lastAnalysis !== null;
                      return (
                        <tr key={p.patientId}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <User size={16} color="var(--text-muted)" />
                              <span className="patient-name">{p.name}</span>
                            </div>
                          </td>
                          <td className="patient-id">{p.patientId}</td>
                          <td>{p.age} Yrs</td>
                          <td>{p.gender}</td>
                          <td>
                            {p.lastAnalysis ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: p.lastAnalysis.type === "X-Ray" ? "var(--warning)" : "var(--cyan)" }}>
                                  {p.lastAnalysis.type}
                                </span>
                                <span style={{ fontSize: "13px", color: "var(--text-main)" }}>
                                  {p.lastAnalysis.type === "X-Ray"
                                    ? `${p.lastAnalysis.result} • ${p.lastAnalysis.confidence}%`
                                    : `${p.lastAnalysis.abnormalCount} abnormal findings`}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>No analysis yet</span>
                            )}
                          </td>
                          <td>
                            <span className={`health-status ${isActive ? "online" : "unavailable"}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
                              {isActive ? "Active" : "No Recent Activity"}
                            </span>
                          </td>
                          <td style={{ display: "flex", gap: "8px" }}>
                            <button className="action-btn" onClick={() => selectPatient(p)}>
                              View Profile
                            </button>
                            <button
                              className="action-btn"
                              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
                              onClick={() => {
                                setEditPatientData({ patientId: p.patientId, name: p.name, age: p.age, gender: p.gender });
                                setShowEditModal(true);
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* 4. Pagination */}
              {!loadingRegistry && filteredRegPatients.length > itemsPerPage && (
                <div className="pagination-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Showing {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredRegPatients.length)} of {filteredRegPatients.length} patients
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="outline-btn"
                      style={{ padding: "8px 16px", fontSize: "12px" }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalRegPages }).map((_, i) => (
                      <button
                        key={i}
                        className={`outline-btn ${currentPage === i + 1 ? "active" : ""}`}
                        style={{
                          padding: "8px 14px",
                          fontSize: "12px",
                          background: currentPage === i + 1 ? "var(--accent)" : "transparent",
                          borderColor: currentPage === i + 1 ? "var(--accent)" : "var(--border-color)",
                          color: "#fff"
                        }}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="outline-btn"
                      style={{ padding: "8px 16px", fontSize: "12px" }}
                      disabled={currentPage === totalRegPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalRegPages))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "patient-profile" && selectedPatient && (
          <div className="profile-view" style={{ color: "var(--text-main)" }}>
            {/* 1. Patient Profile Header */}
            <header className="profile-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "24px", marginBottom: "24px" }}>
              <div className="header-info">
                <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px", color: "#fff" }}>{selectedPatient.name}</h1>
                <div className="patient-meta" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <span className="badge" style={{ padding: "4px 10px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "6px", fontFamily: "monospace", fontWeight: "700", color: "var(--accent)", fontSize: "12px" }}>
                    ID: {selectedPatient.patientId}
                  </span>
                  <span className="meta-item" style={{ fontSize: "14px", color: "var(--text-muted)" }}>• &nbsp; {selectedPatient.age} Years</span>
                  <span className="meta-item" style={{ fontSize: "14px", color: "var(--text-muted)" }}>• &nbsp; {selectedPatient.gender}</span>
                  {selectedPatient.contact && <span className="meta-item" style={{ fontSize: "14px", color: "var(--text-muted)" }}>• &nbsp; Contact: {selectedPatient.contact}</span>}
                  <span className="meta-item" style={{ fontSize: "14px", color: "var(--text-muted)" }}>• &nbsp; Registered: {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "Unknown"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button
                  className="primary-btn"
                  style={{ background: "var(--warning)", border: "none", color: "#000" }}
                  onClick={() => {
                    setPublicMode("login"); // tab for X-ray upload
                    document.getElementById("analyze-file-sec")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Analyze X-Ray
                </button>
                <button
                  className="primary-btn"
                  style={{ background: "#F59E0B", border: "none", color: "#000" }}
                  onClick={() => {
                    setPublicMode("cavity_patient"); // tab for Dental Cavity upload
                    document.getElementById("analyze-file-sec")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Analyze Cavity
                </button>
                <button
                  className="primary-btn"
                  style={{ background: "#8B5CF6", border: "none", color: "#fff" }}
                  onClick={() => {
                    setPublicMode("ct_patient"); // tab for CT Scan upload
                    document.getElementById("analyze-file-sec")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Analyze CT Scan
                </button>
                <button
                  className="primary-btn"
                  style={{ background: "#EC4899", border: "none", color: "#fff" }}
                  onClick={() => {
                    setPublicMode("mri_patient"); // tab for Brain MRI upload
                    document.getElementById("analyze-file-sec")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Analyze Brain MRI
                </button>
                <button
                  className="primary-btn"
                  style={{ background: "var(--cyan)", border: "none", color: "#fff" }}
                  onClick={() => {
                    setPublicMode("xray"); // tab for Report upload
                    document.getElementById("analyze-file-sec")?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Analyze Report
                </button>
                <button
                  className="outline-btn"
                  onClick={() => {
                    setEditPatientData({ patientId: selectedPatient.patientId, name: selectedPatient.name, age: selectedPatient.age, gender: selectedPatient.gender, contact: selectedPatient.contact || "" });
                    setShowEditModal(true);
                  }}
                >
                  Edit Patient
                </button>
                <button
                  className="outline-btn"
                  style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "rgba(239, 68, 68, 0.9)" }}
                  onClick={() => handleArchivePatient(selectedPatient.patientId)}
                >
                  Archive Patient
                </button>
                <button
                  className="outline-btn"
                  onClick={() => {
                    setActiveTab("patients");
                    fetchRegistryData();
                  }}
                >
                  Back to Registry
                </button>
              </div>
            </header>

            {/* 2. Overall Patient Analysis Section */}
            <section className="overall-analysis" style={{ background: "rgba(13, 19, 35, 0.6)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Overall Patient Analysis</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>Summary of findings from the patient's available X-ray and medical report analyses.</p>
              <div style={{ background: "rgba(0,0,0,0.2)", borderLeft: "4px solid var(--accent)", padding: "14px 18px", borderRadius: "0 10px 10px 0", fontSize: "14px", lineHeight: "1.6", color: "#fff" }}>
                {(() => {
                  if (!overallSummary) return <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>No previous AI-assisted analysis is available.</span>;
                  const raw = typeof overallSummary === "string" ? overallSummary : String(overallSummary);
                  const points = raw
                    .split(/(?:•|\n|\. (?=[A-Z]))/)
                    .map(p => p.trim().replace(/^•\s*/, '').replace(/\.$/, ''))
                    .filter(p => p.length > 0);
                  if (points.length === 0) return <span>{raw}</span>;
                  return (
                    <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {points.map((pt, idx) => (
                        <li key={idx} style={{ color: "#F8FAFC", fontSize: "13px", lineHeight: "1.6" }}>
                          {pt.endsWith('.') ? pt : `${pt}.`}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </section>

            {/* 3. Summary Statistics Grid */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" }}>
              <div className="stat-card" style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                <span className="label" style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Total Analyses</span>
                <span className="value" style={{ fontSize: "24px", fontWeight: "800", color: "#fff" }}>{profileStats?.total || 0}</span>
                <span className="indicator green" style={{ fontSize: "11px", color: "var(--green)", display: "block", marginTop: "4px" }}>All Time</span>
              </div>
              <div className="stat-card" style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                <span className="label" style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>X-Ray Analyses</span>
                <span className="value" style={{ fontSize: "24px", fontWeight: "800", color: "var(--warning)" }}>{profileStats?.xrays || 0}</span>
                <span className="indicator yellow" style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Radiographs</span>
              </div>
              <div className="stat-card" style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                <span className="label" style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Report Analyses</span>
                <span className="value" style={{ fontSize: "24px", fontWeight: "800", color: "var(--cyan)" }}>{profileStats?.reports || 0}</span>
                <span className="indicator blue" style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Lab Reports</span>
              </div>
              <div className="stat-card" style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                <span className="label" style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Last Analysis</span>
                <span className="value" style={{ fontSize: "14px", fontWeight: "700", color: "#fff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profileStats?.lastAnalysis || "No analyses yet"}
                </span>
                <span className="indicator green" style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Most Recent</span>
              </div>
            </div>

            {/* 4. Findings Summary Cards & Overview Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--warning)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>X-Ray Findings</h3>
                <p style={{ fontSize: "14px", color: "#fff", margin: 0 }}>
                  <strong>{profileStats?.xrayFindings || "No X-ray findings yet."}</strong>
                </p>
                <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {profileStats?.xrayOverview && Object.keys(profileStats.xrayOverview).length > 0 ? (
                    Object.entries(profileStats.xrayOverview).map(([cls, cnt]) => (
                      <span key={cls} style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", color: "var(--warning)" }}>
                        {cls} × {cnt}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>No overview chips available.</span>
                  )}
                </div>
              </div>
              <div style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--cyan)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Report Findings</h3>
                <p style={{ fontSize: "14px", color: "#fff", margin: 0 }}>
                  {profileStats?.reports && profileStats.reports > 0 ? (
                    <>
                      Abnormal values: <strong style={{ color: "#EF4444" }}>{profileStats.reportFindingsAbnormal}</strong> &nbsp;|&nbsp; Normal values: <strong style={{ color: "#10B981" }}>{profileStats.reportFindingsNormal}</strong>
                    </>
                  ) : (
                    "No report findings yet."
                  )}
                </p>
                <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {profileStats?.reportOverview && (profileStats.reportOverview.HIGH > 0 || profileStats.reportOverview.LOW > 0 || profileStats.reportOverview.NORMAL > 0) ? (
                    <>
                      {profileStats.reportOverview.HIGH > 0 && <span style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", color: "#EF4444" }}>HIGH × {profileStats.reportOverview.HIGH}</span>}
                      {profileStats.reportOverview.LOW > 0 && <span style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", color: "var(--accent)" }}>LOW × {profileStats.reportOverview.LOW}</span>}
                      {profileStats.reportOverview.NORMAL > 0 && <span style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", color: "var(--green)" }}>NORMAL × {profileStats.reportOverview.NORMAL}</span>}
                    </>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>No overview chips available.</span>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Recent Analyses Quick Row */}
            <section style={{ background: "rgba(13, 19, 35, 0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "16px", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Recent Activity</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {patientHistory.slice(0, 3).map((item, index) => (
                  <div
                    key={item.analysisId || index}
                    style={{ background: "rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "12px", cursor: "pointer", transition: "var(--transition)" }}
                    onClick={() => setAnalysisResult(item)}
                    className="recent-item-hover"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: item.fileType === "Chest X-Ray" ? "var(--warning)" : item.fileType === "Dental Cavity" ? "#F59E0B" : item.fileType === "CT Scan" ? "#8B5CF6" : "var(--cyan)" }}>
                        {item.fileType === "Chest X-Ray" ? "X-Ray" : item.fileType === "Dental Cavity" ? "Cavity" : item.fileType === "CT Scan" ? "CT Scan" : "Report"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.fileName}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {item.fileType === "Medical Report" ? (item.reportFindings?.length || 0) + " tests detected" : `${item.prediction} (${item.confidence}%)`}
                    </div>
                  </div>
                ))}
                {patientHistory.length === 0 && (
                  <div style={{ gridColumn: "span 3", textAlign: "center", color: "var(--text-muted)", padding: "12px", fontSize: "12px" }}>
                    No recent analyses.
                  </div>
                )}
              </div>
            </section>

            {/* 6. Main Workspace Grid */}
            <div id="analyze-file-sec" className="profile-grid" style={{ marginBottom: "24px" }}>
              <div className="profile-left">
                {/* Analyze New File Card */}
                <div className="upload-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h3>Analyze New File</h3>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className={`period-btn ${publicMode === "login" ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => { setPublicMode("login"); setUploadFile(null); }}
                      >
                        X-Ray
                      </button>
                      <button
                        className={`period-btn ${publicMode === "cavity_patient" ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "11px", background: publicMode === "cavity_patient" ? "#F59E0B" : undefined, color: publicMode === "cavity_patient" ? "#000" : undefined }}
                        onClick={() => { setPublicMode("cavity_patient"); setUploadFile(null); }}
                      >
                        Cavity
                      </button>
                      <button
                        className={`period-btn ${publicMode === "ct_patient" ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "11px", background: publicMode === "ct_patient" ? "#8B5CF6" : undefined, color: publicMode === "ct_patient" ? "#fff" : undefined }}
                        onClick={() => { setPublicMode("ct_patient"); setUploadFile(null); }}
                      >
                        CT Scan
                      </button>
                      <button
                        className={`period-btn ${publicMode === "mri_patient" ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "11px", background: publicMode === "mri_patient" ? "#EC4899" : undefined, color: publicMode === "mri_patient" ? "#fff" : undefined }}
                        onClick={() => { setPublicMode("mri_patient"); setUploadFile(null); }}
                      >
                        Brain MRI
                      </button>
                      <button
                        className={`period-btn ${publicMode === "xray" ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => { setPublicMode("xray"); setUploadFile(null); }}
                      >
                        Report
                      </button>
                    </div>
                  </div>
                  <p className="upload-subtitle">
                    {publicMode === "login"
                      ? "Upload a Chest X-ray image film for immediate AI model classification."
                      : publicMode === "cavity_patient"
                        ? "Upload a dental intraoral photo or radiograph for AI caries lesion detection."
                        : publicMode === "ct_patient"
                          ? "Upload an abdominal/pelvic CT scan slice for AI kidney stone detection."
                          : publicMode === "mri_patient"
                            ? "Upload a Brain MRI slice image for AI 4-class brain tumor classification (Glioma, Meningioma, Pituitary, Normal)."
                            : "Upload a structured medical/hematology laboratory report document (PNG/JPG/PDF)."}
                  </p>

                  <div className="upload-form">
                    <label className="drag-area">
                      <Upload size={32} className="upload-icon" />
                      <span>{uploadFile ? uploadFile.name : (publicMode === "mri_patient" ? "Select or drag Brain MRI scan here" : "Select or drag file here")}</span>
                      <span className="supported">
                        {publicMode === "xray" ? "Supported: JPEG, PNG, PDF" : "Supported: JPEG, PNG"}
                      </span>
                      <input
                        type="file"
                        required
                        style={{ display: "none" }}
                        onChange={(e) => setUploadFile(e.target.files[0])}
                      />
                    </label>

                    {uploadFile && (
                      <button
                        type="button"
                        className={`submit-btn ${uploading ? "disabled" : ""}`}
                        disabled={uploading}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!uploadFile) return;
                          setUploading(true);
                          const formData = new FormData();
                          formData.append("file", uploadFile);
                          const chosenType = publicMode === "login"
                            ? "Chest X-Ray"
                            : publicMode === "cavity_patient"
                              ? "Dental Cavity"
                              : publicMode === "ct_patient"
                                ? "CT Scan"
                                : publicMode === "mri_patient"
                                  ? "Brain MRI"
                                  : "Medical Report";
                          try {
                            const res = await fetch(`${API_BASE}/api/patients/${selectedPatient.patientId}/files?analysis_type=${encodeURIComponent(chosenType)}`, {
                              method: "POST",
                              body: formData
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setAnalysisResult(data);
                              showToast("Analysis Completed successfully.");
                              selectPatient(selectedPatient);
                              fetchDashboardData(period);
                              fetchRegistryData();
                              setUploadFile(null);
                            } else {
                              const err = await res.json();
                              showToast(err.detail || "Analysis failed.");
                            }
                          } catch (err) {
                            showToast("Server communication error.");
                          } finally {
                            setUploading(false);
                          }
                        }}
                      >
                        {uploading
                          ? "Executing AI Engine..."
                          : `Analyze ${publicMode === "login" ? "X-Ray" : publicMode === "cavity_patient" ? "Cavity" : publicMode === "ct_patient" ? "CT Scan" : publicMode === "mri_patient" ? "Brain MRI" : "Report"}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Viewer (Right hand Workspace) */}
              <div className="profile-right" style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "24px", padding: "24px", minHeight: "350px", display: "flex", flexDirection: "column" }}>
                {analysisResult ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "16px", marginBottom: "16px" }}>
                      <div>
                        <span style={{
                          background: analysisResult.fileType === "Chest X-Ray"
                            ? "rgba(245,158,11,0.15)"
                            : analysisResult.fileType === "Dental Cavity"
                              ? "rgba(245,158,11,0.15)"
                              : analysisResult.fileType === "CT Scan"
                                ? "rgba(139,92,246,0.15)"
                                : analysisResult.fileType === "Brain MRI"
                                  ? "rgba(236,72,153,0.15)"
                                  : "rgba(6,182,212,0.15)",
                          color: analysisResult.fileType === "Chest X-Ray"
                            ? "var(--warning)"
                            : analysisResult.fileType === "Dental Cavity"
                              ? "#F59E0B"
                              : analysisResult.fileType === "CT Scan"
                                ? "#8B5CF6"
                                : analysisResult.fileType === "Brain MRI"
                                  ? "#EC4899"
                                  : "var(--cyan)",
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          display: "inline-block",
                          marginBottom: "6px"
                        }}>
                          {analysisResult.fileType} Analysis
                        </span>
                        <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>{analysisResult.fileName}</h2>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Date: {new Date(analysisResult.date).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="outline-btn"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => {
                            setEditingAnalysis(analysisResult);
                            setEditNoteText(analysisResult.doctorNote || analysisResult.doctor_note || "");
                          }}
                        >
                          Edit Note
                        </button>
                        <button
                          className="outline-btn"
                          style={{ padding: "6px 12px", fontSize: "12px", borderColor: "rgba(239, 68, 68, 0.4)", color: "rgba(239, 68, 68, 0.9)" }}
                          onClick={() => handleDeleteAnalysis(analysisResult.analysisId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      {analysisResult.fileType !== "Medical Report" ? (
                        <PostAnalysisWorkflow
                          result={analysisResult}
                          modality={analysisResult.fileType || analysisResult.modality || "Chest X-Ray"}
                          apiBase={API_BASE}
                          isPatientMode={true}
                          patientData={selectedPatient}
                          historyList={patientHistory}
                          onSelectHistory={(item) => setAnalysisResult(item)}
                          onDeleteHistoryItem={(id) => handleDeleteAnalysis(id)}
                        />
                      ) : (
                        <div>
                          <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "20px" }}>
                            <h4 style={{ fontSize: "12px", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px 0" }}>Report Summary</h4>
                            <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#fff", margin: 0 }}>{analysisResult.reportSummary || "No summary text generated."}</p>
                          </div>

                          <h4 style={{ fontSize: "13px", color: "#fff", marginBottom: "8px" }}>Extracted Lab Metrics</h4>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Test</th>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Value</th>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Unit</th>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Reference Range</th>
                                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisResult.reportFindings && Array.isArray(analysisResult.reportFindings) && analysisResult.reportFindings.length > 0 ? (
                                  analysisResult.reportFindings.map((row, rIdx) => (
                                    <tr key={rIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                      <td style={{ padding: "8px 12px", fontWeight: "600", color: "#fff" }}>{row.test_name}</td>
                                      <td style={{ padding: "8px 12px" }}>{row.value}</td>
                                      <td style={{ padding: "8px 12px" }}>{row.unit}</td>
                                      <td style={{ padding: "8px 12px" }}>{row.reference || "-"}</td>
                                      <td style={{ padding: "8px 12px" }}>
                                        <span style={{
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                          fontWeight: "700",
                                          background: row.status === "HIGH" ? "rgba(239,68,68,0.15)" : row.status === "LOW" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                                          color: row.status === "HIGH" ? "#EF4444" : row.status === "LOW" ? "var(--accent)" : "var(--green)"
                                        }}>
                                          {row.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="5" style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>No lab metrics extracted.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Doctor Notes Box */}
                      {(analysisResult.doctorNote || analysisResult.doctor_note) && (
                        <div style={{ marginTop: "20px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "12px", padding: "12px 16px" }}>
                          <h4 style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 6px 0", letterSpacing: "0.05em" }}>Doctor Note</h4>
                          <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#fff", margin: 0 }}>
                            {analysisResult.doctorNote || analysisResult.doctor_note}
                          </p>
                        </div>
                      )}

                      {analysisResult.filePath && (
                        <div style={{ marginTop: "16px", textAlign: "right" }}>
                          <a
                            href={analysisResult.filePath.startsWith("http") ? analysisResult.filePath : `${API_BASE}${analysisResult.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}
                          >
                            View Original File &rarr;
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <Brain size={48} className="brain-icon" style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
                    <h3 style={{ fontSize: "16px", color: "#fff", margin: "0 0 8px 0" }}>Awaiting Selection</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>Select an analysis from history or upload a new file.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Compare Selected Panel (Visible when exactly 2 compare checkbox keys are selected) */}
            {compareIds.length === 2 && (
              <section style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", margin: 0 }}>Side-by-Side Comparison</h2>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Comparing two historical medical records</span>
                  </div>
                  <button className="outline-btn" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setCompareIds([])}>
                    Clear Comparison
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {[...patientHistory].filter(h => compareIds.includes(h.analysisId)).map((item, cIdx) => (
                    <div key={item.analysisId || cIdx} style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: item.fileType === "Chest X-Ray" ? "var(--warning)" : item.fileType === "Dental Cavity" ? "#F59E0B" : item.fileType === "CT Scan" ? "#8B5CF6" : item.fileType === "Brain MRI" ? "#EC4899" : "var(--cyan)" }}>
                          {item.fileType === "Chest X-Ray" ? "X-Ray" : item.fileType === "Dental Cavity" ? "Cavity" : item.fileType === "CT Scan" ? "CT Scan" : item.fileType === "Brain MRI" ? "Brain MRI" : "Report"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <h4 style={{ fontSize: "13px", color: "#fff", margin: "0 0 8px 0" }}>{item.fileName}</h4>
                      {item.fileType === "CT Scan" || item.fileType === "Dental Cavity" || item.fileType === "Chest X-Ray" || item.fileType === "Brain MRI" ? (
                        <div>
                          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                            <div>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Prediction</span>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: item.fileType === "Brain MRI" ? ((item.prediction?.toLowerCase().includes("normal") || item.prediction?.toLowerCase().includes("no tumor")) ? "#10B981" : "#EF4444") : item.prediction?.includes("Stone") || item.prediction?.includes("Cavity") ? "#EF4444" : "#fff" }}>{item.prediction}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence</span>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: item.fileType === "Brain MRI" ? "#EC4899" : item.fileType === "CT Scan" ? "#8B5CF6" : item.fileType === "Dental Cavity" ? "#F59E0B" : "var(--warning)" }}>{item.confidence}%</div>
                            </div>
                          </div>
                          <div style={{ position: "relative", paddingBottom: "100%", background: "#000", borderRadius: "8px", overflow: "hidden" }}>
                            <img
                              src={item.gradcamPath ? (item.gradcamPath.startsWith("http") ? item.gradcamPath : `${API_BASE}${item.gradcamPath}`) : (item.filePath.startsWith("http") ? item.filePath : `${API_BASE}${item.filePath}`)}
                              alt="Scan check"
                              style={{ position: "absolute", width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Report Metrics</span>
                          <div style={{ marginTop: "6px" }}>
                            {item.reportFindings && Array.isArray(item.reportFindings) ? (
                              item.reportFindings.slice(0, 5).map((row, rIdx) => (
                                <div key={rIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "4px 0", borderBottom: "1px dashed rgba(255,255,255,0.03)" }}>
                                  <span style={{ color: "#fff" }}>{row.test_name}</span>
                                  <span>{row.value} {row.unit} &nbsp;
                                    <span style={{ color: row.status === "HIGH" ? "#EF4444" : row.status === "LOW" ? "var(--accent)" : "var(--green)", fontWeight: "700" }}>{row.status}</span>
                                  </span>
                                </div>
                              ))
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 8. Analysis History Timeline section */}
            <section className="timeline-card" style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "24px", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Analysis History</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Complete chronological history of this patient's AI-assisted analyses.</p>
                </div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Search history by name, prediction, note..."
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    style={{ flex: 2, minWidth: "200px", background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <select
                    value={timelineFilter}
                    onChange={(e) => { setTimelineFilter(e.target.value); setTimelineResultFilter("All"); }}
                    style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "12px" }}
                  >
                    <option value="All">All Types</option>
                    <option value="X-Ray">X-Ray Files</option>
                    <option value="Cavity">Dental Cavity</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="MRI">Brain MRI</option>
                    <option value="Reports">Medical Reports</option>
                  </select>

                  <select
                    value={timelineResultFilter}
                    onChange={(e) => setTimelineResultFilter(e.target.value)}
                    style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "12px" }}
                  >
                    <option value="All">All Findings</option>
                    {timelineFilter === "X-Ray" ? (
                      <>
                        <option value="Normal">Normal</option>
                        <option value="Pneumonia">Pneumonia</option>
                        <option value="COVID-19">COVID-19</option>
                        <option value="Tuberculosis">Tuberculosis</option>
                      </>
                    ) : timelineFilter === "Cavity" ? (
                      <>
                        <option value="Cavity">Cavity Detected</option>
                        <option value="Normal">Normal</option>
                      </>
                    ) : timelineFilter === "CT Scan" ? (
                      <>
                        <option value="Stone">Kidney Stone Detected</option>
                        <option value="Normal">Normal</option>
                      </>
                    ) : timelineFilter === "MRI" ? (
                      <>
                        <option value="Glioma">Glioma</option>
                        <option value="Meningioma">Meningioma</option>
                        <option value="Pituitary">Pituitary</option>
                        <option value="Normal">Normal / No Tumor</option>
                      </>
                    ) : timelineFilter === "Reports" ? (
                      <>
                        <option value="High">High Values</option>
                        <option value="Low">Low Values</option>
                        <option value="Normal">Normal Values</option>
                      </>
                    ) : (
                      <>
                        <option value="Normal">Normal</option>
                        <option value="Pneumonia">Pneumonia</option>
                        <option value="Cavity">Cavity</option>
                        <option value="Stone">Kidney Stone</option>
                        <option value="High">High (Lab)</option>
                        <option value="Low">Low (Lab)</option>
                      </>
                    )}
                  </select>

                  <select
                    value={timelineDateFilter}
                    onChange={(e) => setTimelineDateFilter(e.target.value)}
                    style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "12px" }}
                  >
                    <option value="All">All Dates</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="3m">Last 3 Months</option>
                  </select>

                  <select
                    value={timelineSort}
                    onChange={(e) => setTimelineSort(e.target.value)}
                    style={{ background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "12px" }}
                  >
                    <option value="Newest">Newest First</option>
                    <option value="Oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              <div className="timeline-list" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                {filteredTimeline.map((item, idx) => {
                  const isCompareChecked = compareIds.includes(item.analysisId);
                  return (
                    <div
                      className={`timeline-item-row`}
                      style={{ display: "flex", gap: "16px", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", alignItems: "center" }}
                      key={item.analysisId || idx}
                    >
                      <input
                        type="checkbox"
                        checked={isCompareChecked}
                        onChange={() => {
                          if (isCompareChecked) {
                            setCompareIds(prev => prev.filter(id => id !== item.analysisId));
                          } else {
                            if (compareIds.length >= 2) {
                              showToast("You can only compare two analyses side-by-side.");
                            } else {
                              setCompareIds(prev => [...prev, item.analysisId]);
                            }
                          }
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setAnalysisResult(item)}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            color: item.fileType === "Chest X-Ray" ? "var(--warning)" : item.fileType === "Dental Cavity" ? "#F59E0B" : item.fileType === "CT Scan" ? "#8B5CF6" : item.fileType === "Brain MRI" ? "#EC4899" : "var(--cyan)"
                          }}>
                            {item.fileType}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: "0 0 6px 0" }}>{item.fileName}</h4>
                        {item.fileType === "Brain MRI" ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Prediction: <strong style={{ color: (item.prediction?.toLowerCase().includes("normal") || item.prediction?.toLowerCase().includes("no tumor")) ? "#10B981" : "#EF4444" }}>{item.prediction}</strong> ({item.confidence}%)
                            {item.gradcamPath && <span style={{ color: "#EC4899", marginLeft: "12px" }}>• Brain Heatmap Available</span>}
                          </div>
                        ) : item.fileType === "CT Scan" ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Prediction: <strong style={{ color: item.prediction?.includes("Stone") ? "#EF4444" : "#10B981" }}>{item.prediction}</strong> ({item.confidence}%)
                            {item.gradcamPath && <span style={{ color: "#8B5CF6", marginLeft: "12px" }}>• CT Heatmap Available</span>}
                          </div>
                        ) : item.fileType === "Dental Cavity" ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Prediction: <strong style={{ color: item.prediction?.includes("Cavity") ? "#EF4444" : "#10B981" }}>{item.prediction}</strong> ({item.confidence}%)
                            {item.gradcamPath && <span style={{ color: "var(--green)", marginLeft: "12px" }}>• Caries Heatmap Available</span>}
                          </div>
                        ) : item.fileType === "Chest X-Ray" ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Prediction: <strong style={{ color: "#fff" }}>{item.prediction}</strong> ({item.confidence}%)
                            {item.gradcamPath && <span style={{ color: "var(--green)", marginLeft: "12px" }}>• Grad-CAM Overlay Available</span>}
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {item.reportFindings?.length || 0} tests detected &nbsp;|&nbsp;
                            Abnormal findings: <span style={{ color: "#EF4444", fontWeight: "700" }}>{item.reportFindings?.filter(f => ["HIGH", "LOW", "ABNORMAL"].includes(f.status?.toUpperCase())).length || 0}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="action-btn"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => setAnalysisResult(item)}
                        >
                          View Analysis
                        </button>
                        <button
                          className="action-btn"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => {
                            setEditingAnalysis(item);
                            setEditNoteText(item.doctorNote || item.doctor_note || "");
                          }}
                        >
                          Edit Note
                        </button>
                        <button
                          className="action-btn"
                          style={{ padding: "6px 12px", fontSize: "12px", borderColor: "rgba(239, 68, 68, 0.4)", color: "rgba(239, 68, 68, 0.9)" }}
                          onClick={() => handleDeleteAnalysis(item.analysisId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredTimeline.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "16px 0", textAlign: "center" }}>
                    {timelineSearch ? "No matching history found." : "No medical analyses yet. Start by uploading files."}
                  </p>
                )}
              </div>
            </section>

            {/* 9. Patient Overview Section at Bottom */}
            <section style={{ background: "rgba(13, 19, 35, 0.45)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Patient Overview & Registry Info</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Registration Date</span>
                  <span style={{ color: "#fff", fontWeight: "600" }}>{selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Total Uploads</span>
                  <span style={{ color: "#fff", fontWeight: "600" }}>{profileStats?.total || 0} Files</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Last Activity Date</span>
                  <span style={{ color: "#fff", fontWeight: "600" }}>{patientHistory.length > 0 ? new Date(patientHistory[0].date).toLocaleDateString() : "No Activity"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>X-Ray Count</span>
                  <span style={{ color: "var(--warning)", fontWeight: "600" }}>{profileStats?.xrays || 0} X-Rays</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Lab Report Count</span>
                  <span style={{ color: "var(--cyan)", fontWeight: "600" }}>{profileStats?.reports || 0} Reports</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Register Patient</h3>
            <form onSubmit={handleCreatePatient}>
              <div className="input-group">
                <label>Full Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="input-group half">
                  <label>Age (Years)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 35"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                  />
                </div>
                <div className="input-group half">
                  <label>Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Contact Info (Optional)</label>
                <input
                  type="text"
                  placeholder="Phone number or Email"
                  value={newPatient.contact}
                  onChange={(e) => setNewPatient({ ...newPatient, contact: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="confirm-btn">
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Patient Demographics</h3>
            <form onSubmit={handleEditPatient}>
              <div className="input-group">
                <label>Full Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={editPatientData.name}
                  onChange={(e) => setEditPatientData({ ...editPatientData, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="input-group half">
                  <label>Age (Years)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 35"
                    value={editPatientData.age}
                    onChange={(e) => setEditPatientData({ ...editPatientData, age: e.target.value })}
                  />
                </div>
                <div className="input-group half">
                  <label>Gender</label>
                  <select
                    value={editPatientData.gender}
                    onChange={(e) => setEditPatientData({ ...editPatientData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Contact Number / Info</label>
                <input
                  type="text"
                  placeholder="e.g. +1 234 5678"
                  value={editPatientData.contact || ""}
                  onChange={(e) => setEditPatientData({ ...editPatientData, contact: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="confirm-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAnalysis && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Analysis Metadata & Notes</h3>
            <form onSubmit={handleUpdateAnalysisNote}>
              <div className="input-group">
                <label>File Name (Read-only)</label>
                <input type="text" disabled value={editingAnalysis.fileName} style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-muted)" }} />
              </div>
              <div className="input-group">
                <label>AI Prediction (Read-only)</label>
                <input type="text" disabled value={editingAnalysis.fileType === "Chest X-Ray" ? `${editingAnalysis.prediction} (${editingAnalysis.confidence}%)` : "Lab Report Analysis"} style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-muted)" }} />
              </div>
              <div className="input-group">
                <label>Doctor Note</label>
                <textarea
                  required
                  placeholder="Enter clinical follow-up recommendations, remarks, or notes..."
                  value={editNoteText}
                  onChange={(e) => setEditNoteText(e.target.value)}
                  rows="4"
                  style={{ width: "100%", padding: "10px", background: "rgba(5,8,22,0.8)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "#fff", fontSize: "13px" }}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingAnalysis(null)}>
                  Cancel
                </button>
                <button type="submit" className="confirm-btn">
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="toast-notification">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default App;