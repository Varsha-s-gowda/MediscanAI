import React, { useState, useEffect } from "react";
import {
  Upload,
  Activity,
  ShieldAlert,
  ArrowRight,
  Info,
  Search,
  Plus,
  User,
  LogOut,
  Layers,
  Brain
} from "lucide-react";
import "./App.css";

const API_BASE = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("doctor_token") || "");
  const [doctorName, setDoctorName] = useState(localStorage.getItem("doctor_name") || "");
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, patients, patient-profile

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [publicMode, setPublicMode] = useState("login"); // login, xray, report
  const [publicResult, setPublicResult] = useState(null);

  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);

  const [newPatient, setNewPatient] = useState({ name: "", age: "", gender: "Male", contact: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const handlePublicUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setPublicResult(null);

    const formData = new FormData();
    if (publicMode === "xray") {
      formData.append("image", uploadFile);
    } else {
      formData.append("file", uploadFile);
    }

    const endpoint = publicMode === "xray" ? "/predict" : "/api/reports/analyze";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setPublicResult(data);
        showToast("AI analysis completed successfully.");
        setUploadFile(null);
      } else {
        const err = await res.json();
        showToast(err.detail || "Analysis failed.");
      }
    } catch (err) {
      showToast("Connection failed.");
    } finally {
      setUploading(false);
    }
  };

  const [period, setPeriod] = useState("30d");
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);
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

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

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
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedPatient) return;
    setUploading(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const res = await fetch(`${API_BASE}/api/patients/${selectedPatient.patientId}/files`, {
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
  };



  if (!token) {
    if (publicMode === "xray" || publicMode === "report") {
      return (
        <div className="login-container" style={{ padding: "40px" }}>
          <div className="login-card" style={{ maxWidth: "800px", width: "100%" }}>
            <div className="logo-section">
              <div className="pulse-circle">
                <Activity size={32} color="#10B981" />
              </div>
              <h2>Public AI Diagnostic Analysis</h2>
              <p>
                {publicMode === "xray"
                  ? "Upload a Chest X-ray film for DenseNet121 multi-label prediction"
                  : "Upload a lab/medical report image for parsing and summary extraction"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: publicResult ? "1fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
              {/* Left Side: Upload Column */}
              <div>
                <form onSubmit={handlePublicUpload} className="upload-form">
                  <label className="drag-area" style={{ minHeight: "220px" }}>
                    <Upload size={32} className="upload-icon" />
                    <span>{uploadFile ? uploadFile.name : "Select or drag diagnostic file here"}</span>
                    <span className="supported">Supported: JPEG, PNG</span>
                    <input
                      type="file"
                      required
                      style={{ display: "none" }}
                      onChange={(e) => setUploadFile(e.target.files[0])}
                    />
                  </label>

                  {uploadFile && (
                    <button
                      type="submit"
                      className={`submit-btn ${uploading ? "disabled" : ""}`}
                      disabled={uploading}
                      style={{ width: "100%" }}
                    >
                      {uploading ? "Analyzing Diagnostic File..." : "Analyze Diagnostic File"}
                    </button>
                  )}
                </form>

                <div className="disclaimer-alert" style={{ marginTop: "24px" }}>
                  <Info size={18} style={{ color: "var(--warning)" }} />
                  <p style={{ fontSize: "12px", color: "var(--warning)", lineHeight: "1.5" }}>
                    AI-generated results are for informational and decision-support purposes only and should not be considered a medical diagnosis. Please consult a qualified healthcare professional.
                  </p>
                </div>
              </div>

              {/* Right Side: Analysis Output */}
              {publicResult && (
                <div className="analysis-result-card" style={{ background: "rgba(0, 0, 0, 0.2)", border: "none", padding: "20px" }}>
                  <div className="header" style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "800" }}>Analysis Results</h3>
                  </div>

                  {publicMode === "xray" ? (
                    <div className="xray-diagnostic" style={{ gap: "16px" }}>
                      <div className="metric-row" style={{ gap: "16px" }}>
                        <div className="metric">
                          <span className="label" style={{ fontSize: "10px" }}>Finding</span>
                          <span className="value red" style={{ fontSize: "20px" }}>{publicResult.prediction}</span>
                        </div>
                        <div className="metric">
                          <span className="label" style={{ fontSize: "10px" }}>Confidence</span>
                          <span className="value" style={{ fontSize: "20px" }}>{publicResult.confidence}%</span>
                        </div>
                      </div>

                      <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
                        <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Brain size={16} /> Explainable AI — Grad-CAM
                        </h4>

                        <div className="visuals-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div className="img-holder">
                            <span style={{ fontSize: "10px", color: "var(--muted)" }}>Original X-ray</span>
                            <img
                              src={publicResult.original_image ? `${API_BASE}${publicResult.original_image}` : (publicResult.heatmap ? publicResult.heatmap : "")}
                              alt="Original Xray"
                              style={{ borderRadius: "8px", marginTop: "4px", width: "100%", border: "1px solid rgba(255,255,255,0.05)" }}
                            />
                          </div>
                          <div className="img-holder">
                            <span style={{ fontSize: "10px", color: "var(--muted)" }}>Grad-CAM Overlay</span>
                            <img
                              src={publicResult.gradcam_image ? `${API_BASE}${publicResult.gradcam_image}` : (publicResult.heatmap ? publicResult.heatmap : "")}
                              alt="Grad-CAM Overlay"
                              style={{ borderRadius: "8px", marginTop: "4px", width: "100%", border: "1px solid rgba(255,255,255,0.05)" }}
                            />
                          </div>
                        </div>

                        <div className="info-alert" style={{ display: "flex", gap: "8px", alignItems: "center", background: "rgba(59, 130, 246, 0.05)", padding: "10px", borderRadius: "6px", marginTop: "12px", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
                          <Info size={16} color="#3B82F6" />
                          <span style={{ fontSize: "11px", color: "#93C5FD", lineHeight: "1.4" }}>
                            Highlighted regions indicate areas of the X-ray that contributed most strongly to the model's prediction.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="report-diagnostic" style={{ gap: "16px" }}>
                      <table className="lab-table">
                        <thead>
                          <tr>
                            <th style={{ fontSize: "10px" }}>Metric</th>
                            <th style={{ fontSize: "10px" }}>Value</th>
                            <th style={{ fontSize: "10px" }}>Range</th>
                            <th style={{ fontSize: "10px" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {publicResult.reportFindings && publicResult.reportFindings.map((f, idx) => (
                            <tr key={idx} className={f.status !== "Normal" ? "abnormal-row" : ""}>
                              <td style={{ fontSize: "12px" }}>{f.test_name}</td>
                              <td style={{ fontSize: "12px" }}>{f.value} {f.unit}</td>
                              <td style={{ fontSize: "12px" }}>{f.reference_text || f.reference || "Reference range not provided"}</td>
                              <td>
                                <span className={`status-badge ${f.status.toLowerCase()}`} style={{ fontSize: "9px" }}>
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="summary-block" style={{ padding: "14px" }}>
                        <h4 style={{ fontSize: "12px" }}>AI Summary</h4>
                        <p style={{ fontSize: "12px" }}>{publicResult.reportSummary}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                onClick={() => { setPublicMode("login"); setPublicResult(null); setUploadFile(null); }}
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
                Back to Portal Landing
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="login-container">
        <div className="login-card">
          <div className="logo-section">
            <div className="pulse-circle">
              <Activity size={32} color="#10B981" />
            </div>
            <h2>{isRegistering ? "Register Doctor Account" : "MediScan AI Portal"}</h2>
            <p>{isRegistering ? "Create your practitioner credentials" : "Clinical Decision Support & Patient Management System"}</p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            {authError && <div className="error-alert">{authError}</div>}

            {isRegistering && (
              <div className="input-group">
                <label>Practitioner Full Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Dr. Varsha Gowda"
                />
              </div>
            )}

            <div className="input-group">
              <label>Username / Email</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter credentials"
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="login-btn">
              {isRegistering ? "Register Account" : "Authenticate Portal"} <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); }}
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
              {isRegistering ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>

            {!isRegistering && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", display: "flex", justifyContent: "space-around" }}>
                <button
                  onClick={() => { setPublicMode("xray"); setAuthError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#10B981",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Public X-ray Analysis
                </button>
                <button
                  onClick={() => { setPublicMode("report"); setAuthError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#22D3EE",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Public Report Analysis
                </button>
              </div>
            )}
          </div>

          <div className="login-footer">
            <span>Powered by DenseNet121 Model & Medical OCR Parser</span>
          </div>
        </div>
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
              <div style={{ background: "rgba(0,0,0,0.2)", borderLeft: "4px solid var(--accent)", padding: "12px 16px", borderRadius: "0 8px 8px 0", fontSize: "14px", lineHeight: "1.6", color: "#fff" }}>
                "{overallSummary}"
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
                      <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: item.fileType === "Chest X-Ray" ? "var(--warning)" : "var(--cyan)" }}>
                        {item.fileType === "Chest X-Ray" ? "X-Ray" : "Report"}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.fileName}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {item.fileType === "Chest X-Ray" ? `${item.prediction} (${item.confidence}%)` : (item.reportFindings?.length || 0) + " tests detected"}
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
                      : "Upload a structured medical/hematology laboratory report document (PNG/JPG/PDF)."}
                  </p>

                  <div className="upload-form">
                    <label className="drag-area">
                      <Upload size={32} className="upload-icon" />
                      <span>{uploadFile ? uploadFile.name : "Select or drag file here"}</span>
                      <span className="supported">
                        {publicMode === "login" ? "Supported: JPEG, PNG" : "Supported: JPEG, PNG, PDF"}
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
                          const chosenType = publicMode === "login" ? "Chest X-Ray" : "Medical Report";
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
                        {uploading ? "Executing AI Engine..." : `Analyze ${publicMode === "login" ? "X-Ray" : "Report"}`}
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
                        <span style={{ background: analysisResult.fileType === "Chest X-Ray" ? "rgba(245,158,11,0.15)" : "rgba(6,182,212,0.15)", color: analysisResult.fileType === "Chest X-Ray" ? "var(--warning)" : "var(--cyan)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", padding: "4px 8px", borderRadius: "6px", display: "inline-block", marginBottom: "6px" }}>
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
                      {analysisResult.fileType === "Chest X-Ray" ? (
                        <div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
                            <div>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>AI Prediction</span>
                              <div style={{ fontSize: "20px", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
                                {analysisResult.prediction}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Model Confidence</span>
                              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--warning)", marginTop: "4px" }}>
                                {analysisResult.confidence}%
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "16px" }}>
                            <div>
                              <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Original X-Ray</h4>
                              <div style={{ position: "relative", paddingBottom: "100%", background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
                                <img
                                  src={analysisResult.filePath.startsWith("http") ? analysisResult.filePath : `${API_BASE}${analysisResult.filePath}`}
                                  alt="Original X-ray"
                                  style={{ position: "absolute", width: "100%", height: "100%", objectFit: "contain" }}
                                />
                              </div>
                            </div>
                            <div>
                              <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Grad-CAM Visualization</h4>
                              {analysisResult.gradcamPath ? (
                                <div style={{ position: "relative", paddingBottom: "100%", background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
                                  <img
                                    src={analysisResult.gradcamPath.startsWith("http") ? analysisResult.gradcamPath : `${API_BASE}${analysisResult.gradcamPath}`}
                                    alt="Gradcam heatmap"
                                    style={{ position: "absolute", width: "100%", height: "100%", objectFit: "contain" }}
                                  />
                                </div>
                              ) : (
                                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", background: "rgba(0,0,0,0.1)" }}>
                                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Heatmap overlay not available.</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontStyle: "italic", textAlign: "center" }}>
                            "Highlighted regions indicate areas of the X-ray that contributed most strongly to the model's prediction."
                          </p>
                        </div>
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
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: item.fileType === "Chest X-Ray" ? "var(--warning)" : "var(--cyan)" }}>
                          {item.fileType === "Chest X-Ray" ? "X-Ray" : "Report"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <h4 style={{ fontSize: "13px", color: "#fff", margin: "0 0 8px 0" }}>{item.fileName}</h4>
                      {item.fileType === "Chest X-Ray" ? (
                        <div>
                          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                            <div>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Prediction</span>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>{item.prediction}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence</span>
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--warning)" }}>{item.confidence}%</div>
                            </div>
                          </div>
                          <div style={{ position: "relative", paddingBottom: "100%", background: "#000", borderRadius: "8px", overflow: "hidden" }}>
                            <img
                              src={item.gradcamPath ? (item.gradcamPath.startsWith("http") ? item.gradcamPath : `${API_BASE}${item.gradcamPath}`) : (item.filePath.startsWith("http") ? item.filePath : `${API_BASE}${item.filePath}`)}
                              alt="X-ray check"
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
                          <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: item.fileType === "Chest X-Ray" ? "var(--warning)" : "var(--cyan)" }}>
                            {item.fileType}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#fff", margin: "0 0 6px 0" }}>{item.fileName}</h4>
                        {item.fileType === "Chest X-Ray" ? (
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