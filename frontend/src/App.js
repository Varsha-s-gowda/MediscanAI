import React, { useState, useEffect, useCallback, useRef } from "react";
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
  AlertTriangle,
  ShieldCheck,
  Cpu,
  FileText,
  ChevronRight,
  Clock,
  Key,
  FileCheck,
  Bell,
  Settings,
  TrendingUp,
  HeartPulse,
  Calendar,
  Download,
  CheckCircle2,
  Database,
  FileUp,
  LayoutDashboard,
  Stethoscope,
  FolderOpen,
  BarChart2,
  GitBranch,
  HardDrive,
  UserCircle,
  ChevronLeft,
  Menu,
  X,
  RefreshCw,
  FileImage,
  Microscope,
  ScanLine,
  Shield,
  Heart,
  FileCheck2
} from "lucide-react";
import "./App.css";
import PostAnalysisWorkflow from "./components/PostAnalysisWorkflow";

const API_BASE = process.env.REACT_APP_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000" : "https://mediscan-ai-backend.onrender.com");

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
  const [publicMode, setPublicMode] = useState("home"); // home, login, xray, cavity, ct_scan, report, history
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
  const getPathForState = useCallback((mode, tab, patient) => {
    if (token) {
      if (tab === "dashboard") return "/dashboard";
      if (tab === "patients") return "/patients";
      if (tab === "patient-profile") return `/patients/${patient?.patientId || patient?.id || "profile"}`;
      if (tab === "new-analysis") return "/new-analysis";
      if (tab === "my-reports") return "/my-reports";
      if (tab === "analysis-history") return "/analysis-history";
      if (tab === "health-insights") return "/health-insights";
      if (tab === "health-timeline") return "/health-timeline";
      if (tab === "vault") return "/vault";
      if (tab === "profile") return "/profile";
      if (tab === "settings") return "/settings";
    }
    if (mode === "xray") return "/analysis/chest-xray";
    if (mode === "cavity") return "/analysis/dental-cavity";
    if (mode === "ct_scan") return "/analysis/kidney-stone";
    if (mode === "report") return "/analysis/blood-report";
    if (mode === "history") return "/history";
    if (mode === "login") return "/login";
    if (mode === "home") return "/";
    return "/";
  }, [token]);

  // Sync state from URL location on direct page loads and browser Back/Forward
  useEffect(() => {
    const path = location.pathname;
    // When navigating to a new URL, clear publicResult so the page view updates
    setPublicResult(null);
    setUploadFile(null);

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
    } else if (path === "/analysis/blood-report") {
      setPublicMode("report");
    } else if (path === "/history") {
      setPublicMode("history");
    } else if (path === "/login") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("login");
    } else if (path === "/") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("home");
    }
  }, [location.pathname, token]);

  // Keep browser URL bar in sync when user clicks buttons that change publicMode or activeTab
  useEffect(() => {
    const targetPath = getPathForState(publicMode, activeTab, selectedPatient);
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: false });
    }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicMode, activeTab, selectedPatient, getPathForState]);

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
    if (publicMode === "xray" || publicMode === "cavity" || publicMode === "ct_scan") {
      formData.append("image", uploadFile);
    } else {
      formData.append("file", uploadFile);
    }

    let endpoint = "/predict";
    if (publicMode === "cavity") {
      endpoint = "/predict/cavity";
    } else if (publicMode === "ct_scan") {
      endpoint = "/predict/ct";
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

        const modalityName = publicMode === "cavity"
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

  // NEW INDIVIDUAL HEALTHCARE DASHBOARD STATES
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [myPatientId, setMyPatientId] = useState(null);
  const [myAnalysisHistory, setMyAnalysisHistory] = useState([]);
  const [loadingMyHistory, setLoadingMyHistory] = useState(false);
  const [dashboardUploadFile, setDashboardUploadFile] = useState(null);
  const [dashboardUploading, setDashboardUploading] = useState(false);
  const [dashboardUploadError, setDashboardUploadError] = useState("");
  const [dashboardResult, setDashboardResult] = useState(null);
  const [dashboardAnalysisMode, setDashboardAnalysisMode] = useState("xray");
  const [notifOpen, setNotifOpen] = useState(false);
  const dashboardFileRef = useRef(null);

  // Dashboard navigation drawer + About panel
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const getAuthHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchRegistryData = async () => {
    setLoadingRegistry(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/registry/data`, {
        headers: getAuthHeaders()
      });
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
      const res = await fetch(`${API_BASE}/api/dashboard/summary?period=${filterPeriod}`, {
        headers: getAuthHeaders()
      });
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
      const res = await fetch(`${API_BASE}/api/patients`, {
        headers: getAuthHeaders()
      });
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

  // Auto-associate all uploads/analyses with authenticated user
  const ensureUserPatient = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/patients`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMyPatientId(data[0].patientId);
          return data[0].patientId;
        }
        const uname = token.replace("mock-jwt-token-", "");
        const createRes = await fetch(`${API_BASE}/api/patients`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: doctorName || uname, age: 25, gender: "Other", contact: "" })
        });
        if (createRes.ok) {
          const created = await createRes.json();
          setMyPatientId(created.patientId);
          return created.patientId;
        }
      }
    } catch (err) { console.error("ensureUserPatient error", err); }
    return null;
  };

  const fetchMyAnalyses = async () => {
    setLoadingMyHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients`, { headers: getAuthHeaders() });
      if (res.ok) {
        const pats = await res.json();
        let allHistory = [];
        for (const p of (pats || [])) {
          try {
            const hr = await fetch(`${API_BASE}/api/patients/${p.patientId}/history`, { headers: getAuthHeaders() });
            if (hr.ok) {
              const hd = await hr.json();
              const hist = (hd.history || []).map(item => ({ ...item, patientName: p.name, patientId: p.patientId }));
              allHistory = [...allHistory, ...hist];
            }
          } catch(_) {}
          if (!myPatientId && p.patientId) setMyPatientId(p.patientId);
        }
        allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMyAnalysisHistory(allHistory);
      }
    } catch (err) { console.error("fetchMyAnalyses error", err); }
    finally { setLoadingMyHistory(false); }
  };

  const handleDashboardUpload = async (e) => {
    e.preventDefault();
    if (!dashboardUploadFile) return;
    setDashboardUploading(true);
    setDashboardUploadError("");
    setDashboardResult(null);

    let pid = myPatientId;
    if (!pid) pid = await ensureUserPatient();

    const modalityName = dashboardAnalysisMode === "cavity"
      ? "Dental Cavity"
      : dashboardAnalysisMode === "ct_scan"
        ? "CT Scan"
        : dashboardAnalysisMode === "xray"
          ? "Chest X-Ray"
          : "Medical Report";

    try {
      let data = null;
      // If we have a patient record for the user, upload directly to the patient endpoint to store in their history!
      if (pid) {
        const saveForm = new FormData();
        saveForm.append("file", dashboardUploadFile);
        const res = await fetch(`${API_BASE}/api/patients/${pid}/files?analysis_type=${encodeURIComponent(modalityName)}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: saveForm
        });
        if (res.ok) {
          data = await res.json();
        } else {
          // If error returned from patient endpoint
          const err = await res.json();
          const errMsg = err.detail || err.error || "Analysis failed.";
          setDashboardUploadError(errMsg);
          showToast(errMsg);
          setDashboardUploading(false);
          return;
        }
      }

      // If patient endpoint didn't execute or fallback needed, use public predict endpoint
      if (!data) {
        const formData = new FormData();
        if (dashboardAnalysisMode === "xray" || dashboardAnalysisMode === "cavity" || dashboardAnalysisMode === "ct_scan") {
          formData.append("image", dashboardUploadFile);
        } else {
          formData.append("file", dashboardUploadFile);
        }
        let endpoint = "/predict";
        if (dashboardAnalysisMode === "cavity") endpoint = "/predict/cavity";
        else if (dashboardAnalysisMode === "ct_scan") endpoint = "/predict/ct";
        else if (dashboardAnalysisMode === "report") endpoint = "/api/reports/analyze";

        const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", body: formData });
        if (res.ok) {
          data = await res.json();
        } else {
          const err = await res.json();
          const errMsg = err.detail || err.error || "Analysis failed.";
          setDashboardUploadError(errMsg);
          showToast(errMsg);
          setDashboardUploading(false);
          return;
        }
      }

      if (data.is_valid === false || data.success === false || (data.prediction && data.prediction.toLowerCase().includes("invalid"))) {
        const errMsg = data.error || data.detail || "Invalid image detected.";
        setDashboardUploadError(errMsg);
        showToast(errMsg);
        setDashboardUploadFile(null);
        setDashboardUploading(false);
        return;
      }

      const enriched = {
        ...data,
        modality: modalityName,
        fileType: modalityName,
        fileName: dashboardUploadFile.name,
        date: new Date().toISOString()
      };
      setDashboardResult(enriched);
      showToast("AI analysis completed and saved to your personal records.");
      setDashboardUploadFile(null);
      await fetchMyAnalyses();
      await fetchDashboardData(period);
    } catch (err) {
      setDashboardUploadError("Connection to AI server failed.");
      showToast("Connection to AI server failed.");
    } finally {
      setDashboardUploading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPatients();
      fetchDashboardData(period);
      fetchRegistryData();
      fetchMyAnalyses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period]);

  // Close navigation overlays with Escape, and lock background scrolling while open
  useEffect(() => {
    if (!navDrawerOpen && !showAbout) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNavDrawerOpen(false);
        setShowAbout(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navDrawerOpen, showAbout]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    const cleanUsername = username.trim();
    const cleanName = regName.trim();
    if (!cleanUsername || !password || !cleanName) {
      setAuthError("Please fill in all registration fields.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password, name: cleanName })
      });
      if (res.ok) {
        // Auto log in newly registered doctor
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername, password })
        });
        if (loginRes.ok) {
          const data = await loginRes.json();
          localStorage.setItem("doctor_token", data.token);
          localStorage.setItem("doctor_name", data.name);
          setToken(data.token);
          setDoctorName(data.name);
          setIsRegistering(false);
          setRegName("");
          showToast(`Welcome, ${data.name}. Account created and authenticated.`);
        } else {
          showToast("Registration successful. Please sign in.");
          setIsRegistering(false);
          setRegName("");
        }
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
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setAuthError("Please enter both username and password.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password })
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
        headers: getAuthHeaders(),
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

    if (publicMode === "xray" || publicMode === "report" || publicMode === "cavity" || publicMode === "ct_scan") {
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
                      : "Diagnostic Medical Lab Report Analyzer"}
              </h1>

              <p className="studio-main-sub">
                {publicMode === "cavity"
                  ? "Upload bitewing, periapical, panoramic radiographs, or intraoral photos for automated enamel breakdown, demineralization, and early caries screening."
                  : publicMode === "xray"
                    ? "Upload posteroanterior (PA) or anteroposterior (AP) chest radiographs for multi-label pneumonia, effusion, and cardiomegaly screening."
                    : publicMode === "ct_scan"
                      ? "Upload unenhanced helical CT cross-section slices for automated renal calculi sizing and urolithiasis classification."
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
                                : "Analyze Lab Report"}
                        </span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              )}


            </form>



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
              <span>© 2026 MediScan.AI Neural Engine</span>
            </div>
          </footer>
        </div>
      );
    }

    // Show login form page at /login
    if (publicMode === "login") {
      return (
        <div className="portal-landing-bg">
          <header className="portal-navbar">
            <div
              className="portal-nav-brand"
              style={{ cursor: "pointer" }}
              onClick={() => { setPublicMode("home"); }}
              title="Back to Homepage"
            >
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
              <button
                className="portal-support-link"
                onClick={() => alert("MediScan Clinical Support Portal\n24/7 Hotline: +1 (800) 555-MEDI\nEmail: clinical.support@mediscan.ai\nStatus: All neural inference engines operating nominal.")}
              >
                <HelpCircle size={14} /> Clinical Support
              </button>
            </div>
          </header>

          <main style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: "40px 20px" }}>
            <div className="portal-auth-card" style={{ position: "relative", zIndex: 1 }}>
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

              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button
                  onClick={() => setPublicMode("home")}
                  style={{ background: "none", border: "none", color: "#2DD4BF", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                >
                  ← Back to Homepage
                </button>
              </div>
            </div>
          </main>

                  <footer className="portal-footer">
          <div className="portal-footer-left">
            <span style={{width:6,height:6,borderRadius:"50%",background:"#2DD4BF",display:"inline-block"}}></span>
            <span>MediScan.AI Clinical Portal Authentication</span>
          </div>
          <div className="portal-footer-right"></div>
        </footer>

        </div>
      );
    }

    // Homepage (publicMode === "home" or default)
    return (
      <div className="portal-landing-bg">
        {/* Top Navbar */}
        <header className="portal-navbar portal-home-navbar">
          <div className="portal-nav-left">
            <button
              type="button"
              className="portal-hamburger"
              onClick={() => setNavDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={navDrawerOpen}
              title="Open menu"
            >
              <Menu size={20} />
            </button>

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
          </div>

          <div className="portal-nav-right">
            <button
              className="portal-support-link"
              onClick={() => alert("MediScan Clinical Support Portal\n24/7 Hotline: +1 (800) 555-MEDI\nEmail: clinical.support@mediscan.ai\nStatus: All neural inference engines operating nominal.")}
            >
              <HelpCircle size={14} /> Clinical Support
            </button>
          </div>
        </header>

        {/* ===== SLIDE-OUT NAVIGATION DRAWER ===== */}
        <div
          className={`portal-drawer-overlay ${navDrawerOpen ? "open" : ""}`}
          onClick={() => setNavDrawerOpen(false)}
          aria-hidden={!navDrawerOpen}
        >
          <aside
            className="portal-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="MediScan AI navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-drawer-head">
              <div className="portal-drawer-brand">
                <div className="portal-logo-orb">
                  <Sparkles size={18} color="#2DD4BF" />
                </div>
                <div>
                  <div className="portal-brand-title">
                    MediScan <span className="brand-ai">AI</span>
                  </div>
                  <div className="portal-brand-sub">Platform Navigation</div>
                </div>
              </div>
              <button
                type="button"
                className="portal-drawer-close"
                onClick={() => setNavDrawerOpen(false)}
                aria-label="Close navigation menu"
                title="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="portal-drawer-label">NAVIGATION</div>

            <nav className="portal-drawer-nav">
              <button
                type="button"
                className="portal-drawer-item"
                onClick={() => {
                  setNavDrawerOpen(false);
                  setAuthError("");
                  setPublicMode("login");
                }}
              >
                <span className="portal-drawer-item-icon"><Zap size={17} /></span>
                <span className="portal-drawer-item-text">
                  <span className="portal-drawer-item-title">Portal Logic</span>
                  <span className="portal-drawer-item-sub">Doctor portal · secure sign in</span>
                </span>
                <ChevronRight size={16} className="portal-drawer-chevron" />
              </button>

              <button
                type="button"
                className="portal-drawer-item"
                onClick={() => {
                  setNavDrawerOpen(false);
                  setShowAbout(true);
                }}
              >
                <span className="portal-drawer-item-icon"><Brain size={17} /></span>
                <span className="portal-drawer-item-text">
                  <span className="portal-drawer-item-title">About MediScan AI</span>
                  <span className="portal-drawer-item-sub">Purpose, modules &amp; capabilities</span>
                </span>
                <ChevronRight size={16} className="portal-drawer-chevron" />
              </button>
            </nav>

            <div className="portal-drawer-footer">
              <span className="portal-drawer-status">
                <span className="portal-drawer-status-dot" /> Neural engines online
              </span>
              <span className="portal-drawer-version">v2.8</span>
            </div>
          </aside>
        </div>

        {/* ===== ABOUT MEDISCAN AI PANEL ===== */}
        {showAbout && (
          <div
            className="about-overlay"
            onClick={() => setShowAbout(false)}
            role="dialog"
            aria-modal="true"
            aria-label="About MediScan AI"
          >
            <div className="about-panel" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="about-close"
                onClick={() => setShowAbout(false)}
                aria-label="Close about panel"
                title="Close"
              >
                <X size={18} />
              </button>

              <div className="about-hero">
                <div className="about-orb">
                  <Sparkles size={24} color="#2DD4BF" />
                </div>
                <span className="about-eyebrow">ABOUT THE PLATFORM</span>
                <h2>About MediScan AI</h2>
                <p>
                  An AI-powered clinical decision-support platform that brings explainable,
                  multi-modal diagnostic intelligence to everyday medical imaging workflows.
                </p>
              </div>

              <div className="about-section">
                <h3><Activity size={17} color="#2DD4BF" /> Our Purpose</h3>
                <p>
                  MediScan AI was built to assist clinicians and individuals by turning raw medical
                  images and laboratory documents into structured, explainable insights. It acts as a
                  second set of eyes — highlighting likely findings, severity and recommended next
                  steps — while leaving final clinical judgement to licensed professionals.
                </p>
              </div>

              <div className="about-section">
                <h3><Brain size={17} color="#2DD4BF" /> AI-Powered Diagnostic Modules</h3>
                <div className="about-modules-grid">
                  {[
                    {
                      icon: <Stethoscope size={19} color="#3B82F6" />,
                      title: "Chest X-Ray Analysis",
                      tag: "DenseNet-121",
                      desc: "Multi-class thoracic screening for pneumonia, tuberculosis, effusion and cardiomegaly, with Grad-CAM heatmaps."
                    },
                    {
                      icon: <Microscope size={19} color="#10B981" />,
                      title: "Dental Cavity Detection",
                      tag: "EfficientNet-B0",
                      desc: "Detects interproximal caries, enamel demineralization and structural dental defects from radiographs."
                    },
                    {
                      icon: <ScanLine size={19} color="#F59E0B" />,
                      title: "Kidney Stone CT",
                      tag: "MobileNetV2",
                      desc: "Evaluates abdominal CT slices for hyperdense renal calculi and urolithiasis patterns."
                    },
                    {
                      icon: <FileText size={19} color="#8B5CF6" />,
                      title: "Lab Report Analyzer",
                      tag: "OCR + NLP",
                      desc: "Parses CBC, lipid and metabolic panels, normalizes biomarkers and flags out-of-range values."
                    }
                  ].map(({ icon, title, tag, desc }) => (
                    <div key={title} className="about-module-card">
                      <div className="about-module-top">
                        <span className="about-module-icon">{icon}</span>
                        <span className="about-module-tag">{tag}</span>
                      </div>
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="about-section">
                <h3><ScanLine size={17} color="#2DD4BF" /> Supported Medical Imaging Types</h3>
                <ul className="about-imaging-list">
                  <li><Check size={14} color="#2DD4BF" /> Posteroanterior (PA) and anteroposterior (AP) chest radiographs — PNG, JPG, JPEG</li>
                  <li><Check size={14} color="#2DD4BF" /> Panoramic, bitewing and periapical dental radiographs and intraoral photos</li>
                  <li><Check size={14} color="#2DD4BF" /> Unenhanced helical abdominal CT axial slices for renal calculi evaluation</li>
                  <li><Check size={14} color="#2DD4BF" /> Laboratory reports, hematology panels and metabolic profiles — PDF or image</li>
                </ul>
              </div>

              <div className="about-section">
                <h3><Zap size={17} color="#2DD4BF" /> Key Platform Capabilities</h3>
                <div className="about-cap-grid">
                  {[
                    "Instant AI inference with confidence scoring",
                    "Explainable AI via Grad-CAM attention maps",
                    "Patient registry and longitudinal health timeline",
                    "Secure authenticated practitioner sessions",
                    "Encrypted medical vault and report history",
                    "Exportable clinical summaries and reports"
                  ].map((capability) => (
                    <div key={capability} className="about-cap-item">
                      <CheckCircle2 size={15} color="#2DD4BF" />
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="about-disclaimer">
                <ShieldCheck size={18} color="#F59E0B" />
                <p>
                  MediScan AI is an algorithmic decision-support tool. It does not replace
                  professional medical judgement, diagnosis or clinical evaluation by a licensed
                  physician.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Full Width */}
        <main className="portal-home-main">
          {/* === HERO ROW === */}
          <div className="portal-hero-row">
            <div className="portal-hero-text">
              <div className="portal-top-pill">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2DD4BF", display: "inline-block", boxShadow: "0 0 6px #2DD4BF" }}></span>
                NEXT-GEN NEURAL DIAGNOSTIC SUITE
              </div>

              <h1 className="portal-hero-title">
                Intelligent Medical<br />Imaging.<br />
                <span className="highlight-cyan">Smarter Clinical<br />Decisions.</span>
              </h1>
              <p className="portal-hero-desc">
                MediScan AI ingests multi-modal radiological scans, synthesizes contextual
                patient records, and delivers instant, explainable deep learning decision
                support directly to your clinical workflow.
              </p>
              <div className="portal-feature-pills">
                <div className="portal-feature-pill cyan-border">
                  <Check size={13} color="#2DD4BF" /><span>AI-Powered Clinical Analysis</span>
                </div>
                <div className="portal-feature-pill">
                  <Layers size={13} color="#38BDF8" /><span>Multimodal Medical Imaging</span>
                </div>
                <div className="portal-feature-pill">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                  <span>99.4% Model Confidence</span>
                </div>
              </div>
            </div>

            {/* Right: Medical imaging illustration - Floating Multi-Screen Hologram matching reference */}
            <div className="portal-hero-illus">
              <div className="illus-hologram-wrap">
                {/* Glowing neon teal circular halo */}
                <div className="illus-hologram-ring"></div>

                {/* Main Floating Chest Radiograph Panel */}
                <div className="illus-screen illus-screen-main">
                  <div className="screen-header">
                    <span className="dot-teal"></span>
                    <span className="screen-title">THORACIC DIGITAL RADIOGRAPHY</span>
                    <span className="screen-tag">PA HIGH-RES</span>
                  </div>
                  <div className="screen-img-wrap">
                    <img src="/assets/modules/chest_xray.jpg" alt="Chest Radiograph" className="screen-img" />
                    {/* Scanning laser beam overlay */}
                    <div className="screen-scan-line"></div>
                    {/* Diagnostic HUD crosshair target */}
                    <div className="screen-hud-reticle">
                      <div className="reticle-ring"></div>
                      <div className="reticle-dot"></div>
                      <span className="reticle-text">TARGET: RLL 99.4%</span>
                    </div>
                  </div>
                  <div className="screen-footer-metrics">
                    <span>120 kVp · 4.2 mAs</span>
                    <span className="metric-cyan">AI SEGMENTATION ACTIVE</span>
                  </div>
                </div>

                {/* Floating Mid-Right Dental Panoramic Panel */}
                <div className="illus-screen illus-screen-dental">
                  <div className="screen-header mini">
                    <span className="screen-title">PANORAMIC DENTAL</span>
                  </div>
                  <div className="screen-img-wrap mini">
                    <img src="/assets/modules/dental_panoramic.jpg" alt="Dental OPG" className="screen-img" />
                  </div>
                </div>

                {/* Floating Bottom-Right Kidney CT Panel */}
                <div className="illus-screen illus-screen-kidney">
                  <div className="screen-header mini">
                    <span className="screen-title">ABDOMINAL CT SCAN</span>
                  </div>
                  <div className="screen-img-wrap mini">
                    <img src="/assets/modules/kidney_ct.jpg" alt="Kidney CT" className="screen-img" />
                  </div>
                </div>

                {/* Anatomical Holographic Body Silhouette (SVG wireframe on right) */}
                <div className="illus-body-wireframe">
                  <svg viewBox="0 0 160 320" className="wireframe-svg" fill="none" stroke="#2DD4BF" strokeWidth="1.2">
                    {/* Head & Neck */}
                    <ellipse cx="80" cy="32" rx="18" ry="22" stroke="#2DD4BF" strokeWidth="1.4" opacity="0.8" />
                    <line x1="74" y1="54" x2="74" y2="68" stroke="#2DD4BF" opacity="0.6" />
                    <line x1="86" y1="54" x2="86" y2="68" stroke="#2DD4BF" opacity="0.6" />
                    {/* Shoulders & Torso Outline */}
                    <path d="M40 76 Q80 66 120 76 L130 140 Q118 190 108 240 L114 310 M40 76 L30 140 Q42 190 52 240 L46 310" stroke="#2DD4BF" strokeWidth="1.2" opacity="0.75" />
                    {/* Chest / Lungs Hologram Glow */}
                    <path d="M56 88 Q46 112 48 142 Q52 162 66 166 Q74 150 72 120 Z" fill="rgba(45,212,191,0.18)" stroke="#2DD4BF" strokeWidth="1.2" opacity="0.85" />
                    <path d="M104 88 Q114 112 112 142 Q108 162 94 166 Q86 150 88 120 Z" fill="rgba(45,212,191,0.18)" stroke="#2DD4BF" strokeWidth="1.2" opacity="0.85" />
                    {/* Spine / Vertebrae */}
                    <line x1="80" y1="68" x2="80" y2="235" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                    {/* Circulatory / Target Rings */}
                    <circle cx="80" cy="180" r="14" stroke="#2DD4BF" strokeWidth="1" strokeDasharray="2 3" opacity="0.6">
                      <animateTransform attributeName="transform" type="rotate" from="0 80 180" to="360 80 180" dur="10s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="80" cy="180" r="6" stroke="#38BDF8" strokeWidth="1.2" opacity="0.8" />
                    <circle cx="80" cy="180" r="2" fill="#2DD4BF" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* === MODULES + PIPELINE === */}
          <div className="portal-modules-section">
            <div className="portal-modules-header">
              <div className="portal-modules-title">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2DD4BF", display: "inline-block", boxShadow: "0 0 6px #2DD4BF" }}></span>
                AI Diagnostic Modules <span className="sub">| Multimodal medical imaging analysis</span>
              </div>
              <div className="portal-types-badge">4 ANALYSIS TYPES</div>
            </div>

            <div className="portal-modules-row5">
              <div className="pmod5" onClick={() => { setPublicMode("xray"); setAuthError(""); setPublicResult(null); }}>
                <div className="pmod5-bg pmod5-bg-xray"></div><div className="pmod5-overlay"></div>
                <div className="pmod5-content">
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16"/><path d="M7 6a5 5 0 0 0-4 4.5c0 3.5 2.5 6.5 5 7.5"/><path d="M17 6a5 5 0 0 1 4 4.5c0 3.5-2.5 6.5-5 7.5"/><path d="M8 10h8"/><path d="M8 14h8"/></svg></div>
                    <span className="portal-mod-ready-badge"><span style={{width:4,height:4,borderRadius:"50%",background:"#34D399",display:"inline-block"}}></span> Ready to Analyze</span>
                  </div>
                  <div className="portal-mod-name">Chest X-Ray</div>
                  <div className="portal-mod-sub">AI-powered chest abnormality analysis</div>
                </div>
              </div>

              <div className="pmod5" onClick={() => { setPublicMode("cavity"); setAuthError(""); setPublicResult(null); }}>
                <div className="pmod5-bg pmod5-bg-dental"></div><div className="pmod5-overlay"></div>
                <div className="pmod5-content">
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3C4.2 3 2 8 2 10.5c0 3.8 2 7 4 10.5 1 1.8 2 1.8 3 0 .8-1.5 1.5-3.5 2.5-3.5s1.7 2 2.5 3.5c1 1.8 2 1.8 3 0 2-3.5 4-6.7 4-10.5C20.5 8 18.3 3 15.5 3c-2 0-3 1-4.2 2-1.2-1-2.2-2-4.3-2z"/></svg></div>
                    <span className="portal-mod-ready-badge"><span style={{width:4,height:4,borderRadius:"50%",background:"#34D399",display:"inline-block"}}></span> Ready to Analyze</span>
                  </div>
                  <div className="portal-mod-name">Dental Analysis</div>
                  <div className="portal-mod-sub">AI cavity and dental condition analysis</div>
                </div>
              </div>

              <div className="pmod5" onClick={() => { setPublicMode("ct_scan"); setAuthError(""); setPublicResult(null); }}>
                <div className="pmod5-bg pmod5-bg-kidney"></div><div className="pmod5-overlay"></div>
                <div className="pmod5-content">
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="2" r="1.5"/></svg></div>
                    <span className="portal-mod-ready-badge"><span style={{width:4,height:4,borderRadius:"50%",background:"#34D399",display:"inline-block"}}></span> Ready to Analyze</span>
                  </div>
                  <div className="portal-mod-name">Kidney Stone CT</div>
                  <div className="portal-mod-sub">Kidney stone detection and analysis</div>
                </div>
              </div>

              <div className="pmod5" onClick={() => { setPublicMode("report"); setAuthError(""); setPublicResult(null); }}>
                <div className="pmod5-bg pmod5-bg-blood"></div><div className="pmod5-overlay"></div>
                <div className="pmod5-content">
                  <div className="portal-mod-top">
                    <div className="portal-mod-icon-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
                    <span className="portal-mod-ready-badge"><span style={{width:4,height:4,borderRadius:"50%",background:"#34D399",display:"inline-block"}}></span> Ready to Analyze</span>
                  </div>
                  <div className="portal-mod-name">Blood Report Analysis</div>
                  <div className="portal-mod-sub">AI hematology &amp; biomarker lab report analysis</div>
                </div>
              </div>
            </div>

            <div className="portal-pipeline-bar">
              <div className="portal-pipeline-steps">
                <span style={{color:"#64748B",fontSize:"10px",letterSpacing:"0.5px",fontWeight:700}}>PIPELINE:</span>
                <span className="portal-pipe-chip active">Prediction</span>
                <span className="portal-pipe-arrow">—</span>
                <span className="portal-pipe-chip">Explanation</span>
                <span className="portal-pipe-arrow">—</span>
                <span className="portal-pipe-chip">Severity</span>
                <span className="portal-pipe-arrow">—</span>
                <span className="portal-pipe-chip">Recommendation</span>
                <span className="portal-pipe-arrow">—</span>
                <span className="portal-pipe-chip">Report</span>
              </div>
              <button className="portal-history-btn" onClick={() => { setPublicMode("history"); setAuthError(""); }}>
                <History size={13}/><span>Analysis History</span>
              </button>
            </div>
          </div>
        </main>

        {/* ============================================================ */}
{/* SECTION 1: PLATFORM REAL-TIME SYSTEM ARCHITECTURE & STATS     */}
{/* ============================================================ */}
<section className="portal-landing-section" id="platform-stats">
  <div className="section-header-tag">
    <span className="dot-teal"></span>
    <span>PLATFORM ARCHITECTURE & CAPABILITIES</span>
  </div>
  <h2 className="section-main-title">
    Engineered for High-Precision <span className="highlight-cyan">Clinical Intelligence</span>
  </h2>
  <p className="section-main-desc">
    State-of-the-art vision models and automated OCR hematology processors, calibrated for radiographical transparency and instant diagnostic assistance.
  </p>

  <div className="stats-metric-grid">
    <div className="stat-metric-card">
      <div className="stat-card-glow"></div>
      <div className="stat-card-icon"><Activity size={24} color="#2DD4BF" /></div>
      <div className="stat-card-val"><span className="stat-number">4</span><span className="stat-suffix">/4</span></div>
      <div className="stat-card-label">Diagnostic Modalities</div>
      <p className="stat-card-sub">Chest X-Ray, Dental Panoramic, Kidney CT, and Hematology Reports</p>
      <div className="stat-card-footer">
        <span className="status-pill-online"><span className="tiny-dot"></span> Active & Online</span>
      </div>
    </div>

    <div className="stat-metric-card">
      <div className="stat-card-glow"></div>
      <div className="stat-card-icon"><Cpu size={24} color="#38BDF8" /></div>
      <div className="stat-card-val"><span className="stat-number">3</span><span className="stat-plus">+</span></div>
      <div className="stat-card-label">Neural Architectures</div>
      <p className="stat-card-sub">DenseNet-121, EfficientNet-B0, MobileNetV2 & Tesseract OCR</p>
      <div className="stat-card-footer">
        <span className="status-pill-info">PyTorch & TorchVision</span>
      </div>
    </div>

    <div className="stat-metric-card">
      <div className="stat-card-glow"></div>
      <div className="stat-card-icon"><Zap size={24} color="#F59E0B" /></div>
      <div className="stat-card-val"><span className="stat-number">&lt;2.4</span><span className="stat-suffix">s</span></div>
      <div className="stat-card-label">Median Inference Speed</div>
      <p className="stat-card-sub">Direct tensor transformation, Grad-CAM generation and clinical scoring</p>
      <div className="stat-card-footer">
        <span className="status-pill-online"><span className="tiny-dot"></span> Low-Latency Engine</span>
      </div>
    </div>

    <div className="stat-metric-card">
      <div className="stat-card-glow"></div>
      <div className="stat-card-icon"><History size={24} color="#A78BFA" /></div>
      <div className="stat-card-val"><span className="stat-number">{publicHistory.length}</span></div>
      <div className="stat-card-label">Saved Audit Records</div>
      <p className="stat-card-sub">Verified local diagnostic runs ready for interactive review</p>
      <div className="stat-card-footer">
        <span className="status-pill-info">Local Audit Trail</span>
      </div>
    </div>
  </div>
</section>

{/* ============================================================ */}
{/* SECTION 3: AI TECHNOLOGY SHOWCASE (GENUINE MODELS)           */}
{/* ============================================================ */}
<section className="portal-landing-section" id="technology-showcase">
  <div className="section-header-tag">
    <span className="dot-teal"></span>
    <span>SPECIALIZED NEURAL ENGINES</span>
  </div>
  <h2 className="section-main-title">
    Deep Learning <span className="highlight-cyan">Architectures & OCR</span>
  </h2>
  <p className="section-main-desc">
    Trained deep networks tailored for specific diagnostic visual patterns rather than generic black-box heuristics.
  </p>

  <div className="tech-models-grid">
    {/* DenseNet-121 */}
    <div className="tech-model-card">
      <div className="tech-card-header">
        <div className="tech-header-icon"><Brain size={24} color="#2DD4BF" /></div>
        <div className="tech-header-meta">
          <span className="tech-modality">Thoracic Imaging</span>
          <h3 className="tech-title">DenseNet-121</h3>
        </div>
        <span className="tech-badge-primary">Dense Connectivity</span>
      </div>
      <p className="tech-description">
        Connects each layer to every other layer in a feed-forward fashion to preserve maximum feature propagation for thoracic pathologies (Pneumonia, Tuberculosis, Normal).
      </p>
      <div className="tech-specs-table">
        <div className="tech-spec-row">
          <span className="spec-label">Input Shape</span>
          <span className="spec-val">3 × 224 × 224 RGB</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Key Pathologies</span>
          <span className="spec-val">Normal vs. Abnormality</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Explainability</span>
          <span className="spec-val">Grad-CAM (Layer norm5)</span>
        </div>
      </div>
      <div className="tech-card-action">
        <button className="tech-btn" onClick={() => { setPublicMode("xray"); setAuthError(""); setPublicResult(null); }}>
          <span>Launch Chest X-Ray Module</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>

    {/* EfficientNet-B0 / Cavity */}
    <div className="tech-model-card">
      <div className="tech-card-header">
        <div className="tech-header-icon"><Activity size={24} color="#F59E0B" /></div>
        <div className="tech-header-meta">
          <span className="tech-modality">Dental Radiography</span>
          <h3 className="tech-title">EfficientNet-B0</h3>
        </div>
        <span className="tech-badge-warning">Compound Scaling</span>
      </div>
      <p className="tech-description">
        Balanced depth, width, and resolution scaling specifically optimized to spot subtle interproximal demineralization, enamel degradation, and deep dental caries.
      </p>
      <div className="tech-specs-table">
        <div className="tech-spec-row">
          <span className="spec-label">Input Shape</span>
          <span className="spec-val">3 × 224 × 224 Bitewing/OPG</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Target Finding</span>
          <span className="spec-val">Active Caries vs. Healthy</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Visual Focus</span>
          <span className="spec-val">Enamel / Dentin Boundaries</span>
        </div>
      </div>
      <div className="tech-card-action">
        <button className="tech-btn" onClick={() => { setPublicMode("cavity"); setAuthError(""); setPublicResult(null); }}>
          <span>Launch Dental Module</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>

    {/* MobileNetV2 / CT Scan */}
    <div className="tech-model-card">
      <div className="tech-card-header">
        <div className="tech-header-icon"><Cpu size={24} color="#38BDF8" /></div>
        <div className="tech-header-meta">
          <span className="tech-modality">Abdominal Helical CT</span>
          <h3 className="tech-title">MobileNetV2</h3>
        </div>
        <span className="tech-badge-cyan">Inverted Residuals</span>
      </div>
      <p className="tech-description">
        Lightweight depthwise separable convolutions capable of rapid axial CT cross-section evaluation for hyperdense renal calculi and stone manifestations.
      </p>
      <div className="tech-specs-table">
        <div className="tech-spec-row">
          <span className="spec-label">Input Shape</span>
          <span className="spec-val">Axial CT Contrast / Non-Contrast</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Target Finding</span>
          <span className="spec-val">Kidney Calculi Detection</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Heatmap Overlay</span>
          <span className="spec-val">Renal Parenchyma Attention</span>
        </div>
      </div>
      <div className="tech-card-action">
        <button className="tech-btn" onClick={() => { setPublicMode("ct_scan"); setAuthError(""); setPublicResult(null); }}>
          <span>Launch Kidney CT Module</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>

    {/* OCR Hematology Engine */}
    <div className="tech-model-card">
      <div className="tech-card-header">
        <div className="tech-header-icon"><FileText size={24} color="#EC4899" /></div>
        <div className="tech-header-meta">
          <span className="tech-modality">Lab Pathology</span>
          <h3 className="tech-title">OCR-NLP Engine</h3>
        </div>
        <span className="tech-badge-pink">Biomarker Extraction</span>
      </div>
      <p className="tech-description">
        Automated textual parser running OCR extraction coupled with clinical range normalization to detect abnormal hemoglobin, platelets, leukocyte counts, and lipids.
      </p>
      <div className="tech-specs-table">
        <div className="tech-spec-row">
          <span className="spec-label">Document Types</span>
          <span className="spec-val">CBC, Lipid, Metabolic Panels</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Range Parsing</span>
          <span className="spec-val">Reference Range Comparison</span>
        </div>
        <div className="tech-spec-row">
          <span className="spec-label">Clinical Output</span>
          <span className="spec-val">Highlighting Critical Biomarkers</span>
        </div>
      </div>
      <div className="tech-card-action">
        <button className="tech-btn" onClick={() => { setPublicMode("report"); setAuthError(""); setPublicResult(null); }}>
          <span>Launch Report Analyzer</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  </div>
</section>

{/* ============================================================ */}
{/* SECTION 5: RECENT ANALYSIS & SCAN AUDIT TRAIL                */}
{/* ============================================================ */}
<section className="portal-landing-section" id="recent-analyses">
  <div className="section-header-tag">
    <span className="dot-teal"></span>
    <span>VERIFIED DIAGNOSTIC RUNS</span>
  </div>
  <div className="section-title-between">
    <div>
      <h2 className="section-main-title">
        Recent <span className="highlight-cyan">Scan Audit History</span>
      </h2>
      <p className="section-main-desc">
        Inspect your locally performed AI evaluations. Click any record to inspect the complete diagnostic report and recommendation suite.
      </p>
    </div>
    <button className="portal-history-btn" onClick={() => { setPublicMode("history"); setAuthError(""); }}>
      <History size={14}/><span>View Full History ({publicHistory.length})</span>
    </button>
  </div>

  {publicHistory && publicHistory.length > 0 ? (
    <div className="recent-analyses-table-wrap">
      <table className="recent-analyses-table">
        <thead>
          <tr>
            <th>Modality</th>
            <th>Primary Finding</th>
            <th>Confidence</th>
            <th>Severity</th>
            <th>Timestamp</th>
            <th style={{ textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {publicHistory.slice(0, 5).map((item, idx) => {
            const modName = item.modality || item.fileType || "Medical Scan";
            const sev = item.post_analysis?.severity || "Analyzed";
            const sevColor = sev === "High" ? "#EF4444" : sev === "Moderate" ? "#F59E0B" : "#10B981";
            return (
              <tr key={item.report_id || idx} className="recent-row-hover">
                <td>
                  <div className="table-modality-cell">
                    <span className="modality-indicator-dot"></span>
                    <strong>{modName}</strong>
                  </div>
                </td>
                <td>
                  <span className="table-prediction-text">{item.prediction || "Evaluation Complete"}</span>
                </td>
                <td>
                  <span className="table-confidence-val">
                    {item.confidence ? `${item.confidence}%` : "Processed"}
                  </span>
                </td>
                <td>
                  <span className="table-sev-badge" style={{ backgroundColor: `${sevColor}20`, color: sevColor, borderColor: `${sevColor}40` }}>
                    {sev}
                  </span>
                </td>
                <td className="table-timestamp-cell">
                  <Clock size={12} color="#64748B" style={{ display: "inline-block", marginRight: 4 }} />
                  {item.date ? new Date(item.date).toLocaleDateString() : "Recent"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="view-report-pill-btn"
                    onClick={() => {
                      setPublicResult(item);
                      const modLower = modName.toLowerCase();
                      if (modLower.includes("cavity") || modLower.includes("dental")) setPublicMode("cavity");
                      else if (modLower.includes("ct") || modLower.includes("kidney") || modLower.includes("stone")) setPublicMode("ct_scan");
                      else if (modLower.includes("report") || modLower.includes("lab")) setPublicMode("report");
                      else setPublicMode("xray");
                    }}
                  >
                    <span>Inspect Report</span>
                    <ChevronRight size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="recent-empty-state">
      <div className="empty-state-icon"><Activity size={32} color="#2DD4BF" /></div>
      <h4>No Scans Evaluated Yet</h4>
      <p>Run your first Chest X-Ray, Dental Panoramic, or Kidney CT analysis using the diagnostic modules above to populate the clinical audit trail.</p>
      <button
        className="empty-cta-btn"
        onClick={() => { setPublicMode("xray"); setAuthError(""); setPublicResult(null); }}
      >
        <Upload size={14} /> Start Chest X-Ray Analysis
      </button>
    </div>
  )}
</section>

{/* ============================================================ */}
{/* SECTION 6: CLINICAL WORKFLOW ARCHITECTURE                    */}
{/* ============================================================ */}
<section className="portal-landing-section" id="clinical-workflow">
  <div className="section-header-tag">
    <span className="dot-teal"></span>
    <span>END-TO-END PIPELINE</span>
  </div>
  <h2 className="section-main-title">
    Diagnostic Data <span className="highlight-cyan">Lifecycle & Architecture</span>
  </h2>
  <p className="section-main-desc">
    How patient radiological scans move seamlessly through validation, inference, and clinical synthesis.
  </p>

  <div className="pipeline-flow-diagram">
    <div className="pipe-node-box">
      <div className="pipe-node-icon"><Upload size={20} color="#2DD4BF" /></div>
      <h4>1. Clinical Ingestion</h4>
      <p>Input radiograph or report uploaded via HTTPS interface.</p>
      <div className="pipe-node-meta">Raw Pixels / Scans</div>
    </div>

    <div className="pipe-connector-line">
      <div className="pipe-flow-pulse"></div>
    </div>

    <div className="pipe-node-box">
      <div className="pipe-node-icon"><ShieldAlert size={20} color="#38BDF8" /></div>
      <h4>2. Scan Validator</h4>
      <p>ResNet validator screens for authentic radiograph modality.</p>
      <div className="pipe-node-meta">Anomaly Rejection</div>
    </div>

    <div className="pipe-connector-line">
      <div className="pipe-flow-pulse"></div>
    </div>

    <div className="pipe-node-box highlighted-node">
      <div className="pipe-node-icon"><Cpu size={20} color="#A78BFA" /></div>
      <h4>3. PyTorch Neural Engine</h4>
      <p>DenseNet / EfficientNet / MobileNet generates class probability.</p>
      <div className="pipe-node-meta">Grad-CAM Extraction</div>
    </div>

    <div className="pipe-connector-line">
      <div className="pipe-flow-pulse"></div>
    </div>

    <div className="pipe-node-box">
      <div className="pipe-node-icon"><FileCheck size={20} color="#34D399" /></div>
      <h4>4. Clinical Decision Support</h4>
      <p>Synthesizes severity, clinical explanation &amp; physician notes.</p>
      <div className="pipe-node-meta">Actionable Guidance</div>
    </div>
  </div>
</section>

{/* ============================================================ */}
{/* SECTION 8: COMPREHENSIVE PLATFORM FOOTER                    */}
{/* ============================================================ */}
<footer className="portal-landing-footer">
  <div className="footer-top-grid">
    <div className="footer-brand-col">
      <div className="portal-nav-brand">
        <div className="portal-logo-orb">
          <Sparkles size={18} color="#2DD4BF" />
        </div>
        <div>
          <div className="portal-brand-title">
            MediScan <span className="brand-ai">AI</span>
          </div>
          <div className="portal-brand-sub" style={{ fontSize: "11px" }}>Clinical Decision Support System</div>
        </div>
      </div>
      <p className="footer-brand-bio">
        Next-generation multimodal radiological analysis platform combining deep neural classification, automated laboratory OCR, and explainable Grad-CAM visualization for clinical workflows.
      </p>
      <div className="footer-social-meta">
        <span className="footer-status-indicator">
          <span className="dot-green-pulse"></span> PyTorch Inference Engine Online
        </span>
      </div>
    </div>

    <div className="footer-links-col">
      <h4 className="footer-heading">Diagnostic Modules</h4>
      <ul className="footer-nav-list">
        <li><button onClick={() => { setPublicMode("xray"); setAuthError(""); setPublicResult(null); }}>Chest Radiograph (X-Ray)</button></li>
        <li><button onClick={() => { setPublicMode("cavity"); setAuthError(""); setPublicResult(null); }}>Dental Cavity Detection</button></li>
        <li><button onClick={() => { setPublicMode("ct_scan"); setAuthError(""); setPublicResult(null); }}>Abdominal CT (Kidney Stone)</button></li>
        <li><button onClick={() => { setPublicMode("report"); setAuthError(""); setPublicResult(null); }}>Blood &amp; Lab Report OCR</button></li>
      </ul>
    </div>

    <div className="footer-links-col">
      <h4 className="footer-heading">Technology &amp; Models</h4>
      <ul className="footer-nav-list">
        <li><a href="#technology-showcase">DenseNet-121 Architecture</a></li>
        <li><a href="#technology-showcase">EfficientNet-B0 Caries</a></li>
        <li><a href="#technology-showcase">MobileNetV2 CT Engine</a></li>
        <li><a href="#clinical-workflow">Clinical Pipeline</a></li>
      </ul>
    </div>

    <div className="footer-links-col">
      <h4 className="footer-heading">Practitioner Portal</h4>
      <ul className="footer-nav-list">
        <li><button onClick={() => { setPublicMode("login"); setAuthError(""); }}>Doctor Sign In</button></li>
        <li><button onClick={() => { setPublicMode("history"); setAuthError(""); }}>Audit History Log</button></li>
        <li>
          <button onClick={() => alert("MediScan Clinical Support Portal\n24/7 Hotline: +1 (800) 555-MEDI\nEmail: clinical.support@mediscan.ai")}>
            Clinical Support
          </button>
        </li>
      </ul>
    </div>
  </div>

  <div className="footer-bottom-bar">
    <div className="footer-copyright">
      © {new Date().getFullYear()} MediScan AI Platform. All rights reserved. Designed for professional clinical decision support.
    </div>
    <div className="footer-disclaimer">
      Notice: MediScan AI is an algorithmic decision-support tool. It does not substitute professional medical judgment, diagnosis, or clinical evaluation by a board-certified physician.
    </div>
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
      (timelineFilter === "Reports" && item.fileType === "Medical Report");

    return matchSearch && matchFilter;
  });

  return (
    <div className={`prem-layout ${sidebarCollapsed ? "collapsed" : ""}`}>
      {/* ===== SIDEBAR NAVIGATION ===== */}
      <aside className="prem-sidebar">
        <div className="prem-sidebar-brand">
          <div className="prem-brand-icon">
            <Activity size={22} color="#0ff" />
          </div>
          {!sidebarCollapsed && (
            <div className="prem-brand-text">
              <span className="prem-brand-name">MediScan</span>
              <span className="prem-brand-sub">AI Platform</span>
            </div>
          )}
          <button className="prem-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle sidebar">
            {sidebarCollapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* Personalized Welcome Widget */}
        {!sidebarCollapsed && (
          <div className="prem-user-widget">
            <div className="prem-avatar">
              <span>{(doctorName || "U").charAt(0).toUpperCase()}</span>
            </div>
            <div className="prem-user-info">
              <span className="prem-user-name" title={doctorName}>{doctorName || "User"}</span>
              <span className="prem-user-role">Healthcare User</span>
            </div>
            <button className="prem-notif-btn" onClick={() => setNotifOpen(!notifOpen)} title="Notifications">
              <Bell size={16} />
              {myAnalysisHistory.length > 0 && <span className="prem-notif-dot" />}
            </button>
          </div>
        )}

        {/* Sidebar Navigation Items */}
        <nav className="prem-nav">
          <button className={`prem-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveTab("dashboard"); fetchDashboardData(period); fetchMyAnalyses(); }}>
            <LayoutDashboard size={18} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "new-analysis" ? "active" : ""}`}
            onClick={() => { setActiveTab("new-analysis"); setDashboardResult(null); setDashboardUploadError(""); setDashboardUploadFile(null); }}>
            <ScanLine size={18} />
            {!sidebarCollapsed && <span>New Analysis</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "my-reports" ? "active" : ""}`}
            onClick={() => { setActiveTab("my-reports"); fetchMyAnalyses(); }}>
            <FileText size={18} />
            {!sidebarCollapsed && <span>My Medical Reports</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "analysis-history" ? "active" : ""}`}
            onClick={() => { setActiveTab("analysis-history"); fetchMyAnalyses(); }}>
            <History size={18} />
            {!sidebarCollapsed && <span>Analysis History</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "health-insights" ? "active" : ""}`}
            onClick={() => setActiveTab("health-insights")}>
            <BarChart2 size={18} />
            {!sidebarCollapsed && <span>Health Insights</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "health-timeline" ? "active" : ""}`}
            onClick={() => { setActiveTab("health-timeline"); fetchMyAnalyses(); }}>
            <GitBranch size={18} />
            {!sidebarCollapsed && <span>Health Timeline</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "vault" ? "active" : ""}`}
            onClick={() => { setActiveTab("vault"); fetchMyAnalyses(); }}>
            <HardDrive size={18} />
            {!sidebarCollapsed && <span>My Medical Vault</span>}
          </button>

          {!sidebarCollapsed && <div className="prem-nav-divider" />}

          <button className={`prem-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}>
            <UserCircle size={18} />
            {!sidebarCollapsed && <span>My Profile</span>}
          </button>

          <button className={`prem-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}>
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
        </nav>

        <button className="prem-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="prem-main">

        {/* 1. DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">
                  Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, <span className="prem-highlight">{doctorName || "User"}</span> 👋
                </p>
                <h1 className="prem-welcome-title">Your Health Dashboard</h1>
                <p className="prem-welcome-sub">AI-powered medical analysis at your fingertips. Track your personal health journey below.</p>
              </div>
              <div className="prem-welcome-right">
                <div className="prem-date-chip">
                  <Calendar size={14} />
                  <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <button className="prem-refresh-btn" onClick={() => { fetchDashboardData(period); fetchMyAnalyses(); }}>
                  <RefreshCw size={15} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {dashboardLoading && !dashboardData ? (
              <div className="prem-loading">
                <div className="prem-spinner" />
                <p>Loading your health data...</p>
              </div>
            ) : dashboardError ? (
              <div className="prem-error-card">
                <ShieldAlert size={40} color="#f87171" />
                <p>{dashboardError}</p>
                <button className="prem-btn-primary" onClick={() => fetchDashboardData(period)}>Retry</button>
              </div>
            ) : (
              <>
                {/* 3. Statistics Cards (User-Specific from DB) */}
                <div className="prem-stats-grid">
                  <div className="prem-stat-card prem-stat-blue">
                    <div className="prem-stat-icon"><ScanLine size={22} /></div>
                    <div className="prem-stat-body">
                      <span className="prem-stat-label">Total Analyses</span>
                      <span className="prem-stat-value">{myAnalysisHistory.length}</span>
                      <span className="prem-stat-trend">Your records</span>
                    </div>
                  </div>
                  <div className="prem-stat-card prem-stat-teal">
                    <div className="prem-stat-icon"><FileText size={22} /></div>
                    <div className="prem-stat-body">
                      <span className="prem-stat-label">Saved Medical Reports</span>
                      <span className="prem-stat-value">{myAnalysisHistory.filter(h => (h.fileType || h.analysisType) === "Medical Report").length}</span>
                      <span className="prem-stat-trend">In your vault</span>
                    </div>
                  </div>
                  <div className="prem-stat-card prem-stat-purple">
                    <div className="prem-stat-icon"><Layers size={22} /></div>
                    <div className="prem-stat-body">
                      <span className="prem-stat-label">Scan Categories</span>
                      <span className="prem-stat-value">4</span>
                      <span className="prem-stat-trend">Chest, Dental, Kidney, Lab</span>
                    </div>
                  </div>
                  <div className="prem-stat-card prem-stat-orange">
                    <div className="prem-stat-icon"><Activity size={22} /></div>
                    <div className="prem-stat-body">
                      <span className="prem-stat-label">Recent Activities</span>
                      <span className="prem-stat-value">{myAnalysisHistory.slice(0, 30).length}</span>
                      <span className="prem-stat-trend">Completed analyses</span>
                    </div>
                  </div>
                </div>

                {/* 4. Quick Analysis Cards */}
                <div className="prem-section-header">
                  <h2>Quick Analysis</h2>
                  <p>Select a scan category to immediately begin analysis without patient creation</p>
                </div>
                <div className="prem-analysis-grid">
                  {[
                    { mode: "xray", label: "Chest X-Ray", desc: "Pneumonia, TB, effusion detection via DenseNet-121", icon: <Stethoscope size={28} />, color: "#3b82f6", tag: "DenseNet-121" },
                    { mode: "cavity", label: "Dental X-Ray", desc: "Cavity and periodontal disease detection", icon: <Microscope size={28} />, color: "#10b981", tag: "MobileNetV2" },
                    { mode: "ct_scan", label: "Kidney CT", desc: "Kidney stone and renal pathology analysis", icon: <ScanLine size={28} />, color: "#f59e0b", tag: "ResNet-18" },
                    { mode: "report", label: "Lab Report", desc: "OCR-powered medical report analysis & insights", icon: <FileText size={28} />, color: "#8b5cf6", tag: "OCR + NLP" },
                  ].map(({ mode, label, desc, icon, color, tag }) => (
                    <div key={mode} className="prem-analysis-card" style={{ "--card-color": color }}>
                      <div className="prem-analysis-icon" style={{ color }}>{icon}</div>
                      <div className="prem-analysis-tag">{tag}</div>
                      <h3>{label}</h3>
                      <p>{desc}</p>
                      <button className="prem-analyze-btn" onClick={() => {
                        setDashboardAnalysisMode(mode);
                        setDashboardResult(null);
                        setDashboardUploadFile(null);
                        setDashboardUploadError("");
                        setActiveTab("new-analysis");
                      }}>
                        Analyze Now <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 5. Recent Analyses Table & 6. Recent Activities */}
                <div className="prem-bottom-grid">
                  <div className="prem-recent-card">
                    <div className="prem-card-header">
                      <h2>Recent Analyses</h2>
                      <button className="prem-text-btn" onClick={() => { setActiveTab("analysis-history"); fetchMyAnalyses(); }}>View All</button>
                    </div>
                    {loadingMyHistory ? (
                      <div className="prem-mini-loading"><div className="prem-spinner-sm" /><span>Loading your records...</span></div>
                    ) : myAnalysisHistory.length === 0 ? (
                      <div className="prem-empty-state">
                        <ScanLine size={36} color="var(--text-muted)" />
                        <p>No analyses yet. Click Analyze Now on any card above to get started.</p>
                        <button className="prem-btn-primary" onClick={() => setActiveTab("new-analysis")}>Start Analysis</button>
                      </div>
                    ) : (
                      <table className="prem-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Result</th>
                            <th>Confidence</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myAnalysisHistory.slice(0, 6).map((row, i) => (
                            <tr key={row.analysisId || i}>
                              <td>
                                <span className={`prem-type-badge prem-type-${(row.fileType || row.analysisType || "").toLowerCase().replace(/\s/g, "")}`}>
                                  {row.fileType || row.analysisType || "Scan"}
                                </span>
                              </td>
                              <td><span className="prem-result-text">{row.prediction || row.result || "Analyzed"}</span></td>
                              <td><span className="prem-conf">{row.confidence ? `${row.confidence}%` : "—"}</span></td>
                              <td className="prem-date-cell">{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                              <td>
                                <button className="prem-view-btn" onClick={() => {
                                  const enriched = { ...row, modality: row.fileType || row.analysisType || "Chest X-Ray" };
                                  setDashboardResult(enriched);
                                  setActiveTab("new-analysis");
                                }}>View</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="prem-activity-card">
                    <div className="prem-card-header"><h2>Recent Activities</h2></div>
                    <div className="prem-activity-list">
                      {myAnalysisHistory.length === 0 ? (
                        <p className="prem-no-data">No recent activity logged yet.</p>
                      ) : (
                        myAnalysisHistory.slice(0, 8).map((item, i) => (
                          <div key={item.analysisId || i} className="prem-activity-item">
                            <div className="prem-activity-dot prem-dot-analysis">
                              <Brain size={12} />
                            </div>
                            <div>
                              <p className="prem-act-text">
                                Completed {item.fileType || item.analysisType || "Analysis"}: {item.prediction || item.result || "Result saved"}
                              </p>
                              <span className="prem-act-time">{formatRelativeTime(item.date)}</span>
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

        {/* 2. NEW ANALYSIS TAB */}
        {activeTab === "new-analysis" && (
          <div className={`prem-view ${dashboardResult ? "prem-view-results" : ""}`}>
            {dashboardResult ? (
              <div className="prem-results-wrapper">
                <PostAnalysisWorkflow
                  result={dashboardResult}
                  modality={dashboardResult.modality || dashboardResult.fileType || "Chest X-Ray"}
                  apiBase={API_BASE}
                  onBack={() => { setDashboardResult(null); }}
                />
              </div>
            ) : (
              <>
                <div className="prem-welcome-header">
                  <div className="prem-welcome-left">
                    <p className="prem-welcome-greeting">Instant Diagnostic AI</p>
                    <h1 className="prem-welcome-title">New Analysis</h1>
                    <p className="prem-welcome-sub">Upload your medical scan or laboratory report. Results are immediately associated with your private profile.</p>
                  </div>
                </div>

                {/* Modality Selector */}
                <div className="prem-modality-selector">
                  {[
                    { mode: "xray", label: "Chest X-Ray", icon: <Stethoscope size={18} /> },
                    { mode: "cavity", label: "Dental X-Ray", icon: <Microscope size={18} /> },
                    { mode: "ct_scan", label: "Kidney CT", icon: <ScanLine size={18} /> },
                    { mode: "report", label: "Lab Report", icon: <FileText size={18} /> },
                  ].map(({ mode, label, icon }) => (
                    <button
                      key={mode}
                      className={`prem-modality-btn ${dashboardAnalysisMode === mode ? "active" : ""}`}
                      onClick={() => { setDashboardAnalysisMode(mode); setDashboardUploadError(""); setDashboardResult(null); }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {/* Upload Area */}
                <form onSubmit={handleDashboardUpload} className="prem-upload-form">
                  <div
                    className={`prem-drop-zone ${dashboardUploadFile ? "has-file" : ""}`}
                    onClick={() => dashboardFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setDashboardUploadFile(f); }}
                  >
                    {dashboardUploadFile ? (
                      <div className="prem-drop-selected">
                        <FileImage size={40} color="#0ff" />
                        <p className="prem-drop-filename">{dashboardUploadFile.name}</p>
                        <p className="prem-drop-size">{(dashboardUploadFile.size / 1024).toFixed(1)} KB</p>
                        <button type="button" className="prem-remove-file" onClick={e => { e.stopPropagation(); setDashboardUploadFile(null); }}>
                          <X size={14} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="prem-drop-prompt">
                        <Upload size={48} color="#0ff" strokeWidth={1.5} />
                        <p className="prem-drop-title">Drop your {dashboardAnalysisMode === "report" ? "lab report" : "medical scan"} here</p>
                        <p className="prem-drop-hint">or <span>click to browse</span> · Supports PNG, JPG, JPEG, PDF</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={dashboardFileRef}
                    type="file"
                    accept={dashboardAnalysisMode === "report" ? ".pdf,.png,.jpg,.jpeg" : ".png,.jpg,.jpeg"}
                    style={{ display: "none" }}
                    onChange={e => setDashboardUploadFile(e.target.files[0] || null)}
                  />

                  {dashboardUploadError && (
                    <div className="prem-upload-error">
                      <AlertTriangle size={16} /> {dashboardUploadError}
                    </div>
                  )}

                  <button type="submit" className="prem-btn-primary prem-upload-submit" disabled={!dashboardUploadFile || dashboardUploading}>
                    {dashboardUploading ? (
                      <><div className="prem-spinner-sm" /> Running AI Inference...</>
                    ) : (
                      <><Zap size={18} /> Run AI Analysis</>
                    )}
                  </button>
                </form>

                {/* Architecture Info Chips */}
                <div className="prem-info-cards">
                  {[
                    { label: "Chest X-Ray", info: "DenseNet-121 model trained on CheXpert. Includes Grad-CAM heatmaps.", color: "#3b82f6" },
                    { label: "Dental X-Ray", info: "Cavity detection using MobileNetV2 with attention mapping.", color: "#10b981" },
                    { label: "Kidney CT", info: "ResNet-18 model for kidney stone detection and classification.", color: "#f59e0b" },
                    { label: "Lab Report", info: "OCR + NLP pipeline extracts biomarkers and flags abnormal clinical values.", color: "#8b5cf6" },
                  ].map(({ label, info, color }) => (
                    <div key={label} className="prem-info-chip" style={{ borderLeftColor: color }}>
                      <strong style={{ color }}>{label}</strong>
                      <span>{info}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3. MY MEDICAL REPORTS TAB */}
        {activeTab === "my-reports" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">Laboratory & Clinical Documents</p>
                <h1 className="prem-welcome-title">My Medical Reports</h1>
                <p className="prem-welcome-sub">All your processed lab reports and blood work records securely stored.</p>
              </div>
              <button className="prem-btn-primary" onClick={() => { setDashboardAnalysisMode("report"); setActiveTab("new-analysis"); setDashboardResult(null); }}>
                <Plus size={16} /> Analyze New Report
              </button>
            </div>

            {loadingMyHistory ? (
              <div className="prem-loading"><div className="prem-spinner" /><p>Loading reports...</p></div>
            ) : myAnalysisHistory.filter(h => (h.fileType || h.analysisType) === "Medical Report").length === 0 ? (
              <div className="prem-empty-state prem-empty-large">
                <FileText size={56} color="var(--text-muted)" />
                <h3>No medical lab reports yet</h3>
                <p>Upload a lab report or blood test document to receive comprehensive OCR analysis.</p>
                <button className="prem-btn-primary" onClick={() => { setDashboardAnalysisMode("report"); setActiveTab("new-analysis"); }}>
                  Analyze Report Now
                </button>
              </div>
            ) : (
              <div className="prem-table-card">
                <table className="prem-table prem-table-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Report Name</th>
                      <th>Summary / Key Finding</th>
                      <th>Status</th>
                      <th>Upload Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAnalysisHistory.filter(h => (h.fileType || h.analysisType) === "Medical Report").map((row, i) => (
                      <tr key={row.analysisId || i}>
                        <td className="prem-row-num">{i + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <FileText size={16} color="var(--cyan)" />
                            <span style={{ fontWeight: "600", color: "#fff" }}>{row.fileName || "Lab_Report.pdf"}</span>
                          </div>
                        </td>
                        <td className="prem-result-col">{row.reportSummary || row.prediction || "Report analysis verified"}</td>
                        <td><span className="prem-status-badge prem-status-done"><CheckCircle2 size={12} /> Verified</span></td>
                        <td className="prem-date-cell">{row.date ? new Date(row.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                        <td>
                          <button className="prem-view-btn" onClick={() => {
                            setDashboardResult({ ...row, modality: "Medical Report" });
                            setActiveTab("new-analysis");
                          }}>
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. ANALYSIS HISTORY TAB */}
        {activeTab === "analysis-history" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">Diagnostic Archive</p>
                <h1 className="prem-welcome-title">Analysis History</h1>
                <p className="prem-welcome-sub">Complete history of all medical scans and diagnoses performed under your account.</p>
              </div>
              <button className="prem-btn-primary" onClick={() => { setActiveTab("new-analysis"); setDashboardResult(null); }}>
                <Plus size={16} /> New Analysis
              </button>
            </div>

            {loadingMyHistory ? (
              <div className="prem-loading"><div className="prem-spinner" /><p>Loading history...</p></div>
            ) : myAnalysisHistory.length === 0 ? (
              <div className="prem-empty-state prem-empty-large">
                <History size={56} color="var(--text-muted)" />
                <h3>No analysis history found</h3>
                <p>Run your first scan analysis to populate your medical history.</p>
                <button className="prem-btn-primary" onClick={() => setActiveTab("new-analysis")}>Start Analysis</button>
              </div>
            ) : (
              <div className="prem-table-card">
                <table className="prem-table prem-table-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Scan Category</th>
                      <th>Prediction / Result</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAnalysisHistory.map((row, i) => (
                      <tr key={row.analysisId || i}>
                        <td className="prem-row-num">{i + 1}</td>
                        <td>
                          <span className={`prem-type-badge prem-type-${(row.fileType || row.analysisType || "").toLowerCase().replace(/\s/g, "")}`}>
                            {row.fileType || row.analysisType || "Scan"}
                          </span>
                        </td>
                        <td className="prem-result-col" style={{ fontWeight: "600", color: "#fff" }}>
                          {row.prediction || row.result || "Analysis Completed"}
                        </td>
                        <td><span className="prem-conf">{row.confidence ? `${row.confidence}%` : "—"}</span></td>
                        <td><span className="prem-status-badge prem-status-done"><CheckCircle2 size={12} /> Stored</span></td>
                        <td className="prem-date-cell">{row.date ? new Date(row.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                        <td>
                          <button className="prem-view-btn" onClick={() => {
                            const enriched = { ...row, modality: row.fileType || row.analysisType || "Chest X-Ray" };
                            setDashboardResult(enriched);
                            setActiveTab("new-analysis");
                          }}>
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. HEALTH INSIGHTS TAB */}
        {activeTab === "health-insights" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">Analytics & Diagnostics</p>
                <h1 className="prem-welcome-title">Health Insights</h1>
                <p className="prem-welcome-sub">Visual analysis patterns, distribution of findings, and system health status.</p>
              </div>
            </div>

            {dashboardData ? (
              <>
                <div className="prem-insights-grid">
                  <div className="prem-chart-card">
                    <div className="prem-card-header">
                      <h2>Analysis Frequency</h2>
                      <div className="prem-period-btns">
                        {["7d", "30d", "3m"].map(p => (
                          <button key={p} className={`prem-period-btn ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>{p.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                    <div className="prem-chart-body">
                      {dashboardData.trends && dashboardData.trends.length > 0
                        ? renderLineChart(dashboardData.trends)
                        : <span className="prem-no-data">Not enough data points yet. Complete more analyses to observe trends.</span>}
                    </div>
                  </div>

                  <div className="prem-chart-card">
                    <div className="prem-card-header"><h2>Modality Distribution</h2></div>
                    <div className="prem-chart-body prem-donut-body">
                      {renderDonutChart(
                        myAnalysisHistory.filter(h => (h.fileType || h.analysisType) !== "Medical Report").length,
                        myAnalysisHistory.filter(h => (h.fileType || h.analysisType) === "Medical Report").length
                      )}
                    </div>
                    <div className="prem-donut-legend">
                      <span><span className="prem-dot-xray" />Scans & X-Rays ({myAnalysisHistory.length > 0 ? Math.round((myAnalysisHistory.filter(h => (h.fileType || h.analysisType) !== "Medical Report").length / myAnalysisHistory.length) * 100) : 0}%)</span>
                      <span><span className="prem-dot-report" />Lab Reports ({myAnalysisHistory.length > 0 ? Math.round((myAnalysisHistory.filter(h => (h.fileType || h.analysisType) === "Medical Report").length / myAnalysisHistory.length) * 100) : 0}%)</span>
                    </div>
                  </div>
                </div>

                {/* User-specific findings distribution calculated directly from myAnalysisHistory */}
                {(() => {
                  const myFindings = {};
                  myAnalysisHistory.forEach(item => {
                    const finding = item.prediction || item.result || ((item.fileType || item.analysisType) === "Medical Report" ? "Lab Report Verified" : "Normal");
                    if (finding && finding !== "—" && finding !== "-") {
                      myFindings[finding] = (myFindings[finding] || 0) + 1;
                    }
                  });
                  const findingsList = Object.entries(myFindings);
                  const totalFindings = Object.values(myFindings).reduce((a, b) => a + b, 0);

                  return (
                    <div className="prem-dist-card">
                      <div className="prem-card-header">
                        <h2>Disease & Findings Distribution</h2>
                        <p>Calculated directly across your {myAnalysisHistory.length} personal scan and report records</p>
                      </div>
                      {findingsList.length === 0 ? (
                        <p className="prem-no-data">No diagnostic records logged yet. Complete an analysis to see your findings breakdown.</p>
                      ) : (
                        <div className="prem-dist-list">
                          {findingsList.map(([findingName, count]) => {
                            const pct = totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0;
                            return (
                              <div key={findingName} className="prem-dist-item">
                                <div className="prem-dist-meta">
                                  <span className="prem-dist-name">{findingName}</span>
                                  <span className="prem-dist-val">{pct}% ({count})</span>
                                </div>
                                <div className="prem-progress-bg">
                                  <div className="prem-progress-fill" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="prem-system-card">
                  <div className="prem-card-header"><h2>AI System Status</h2></div>
                  <div className="prem-health-grid">
                    {[
                      { label: "AI X-Ray Model (DenseNet-121)", status: dashboardData.system_health?.xray_model || "Online" },
                      { label: "Radiograph Pre-Validation", status: dashboardData.system_health?.validation || "Online" },
                      { label: "Report OCR & NLP Parser", status: dashboardData.system_health?.report_analysis || "Online" },
                      { label: "Encrypted SQLite Vault", status: dashboardData.system_health?.database || "Online" },
                    ].map(({ label, status }) => (
                      <div key={label} className="prem-health-item">
                        <span className="prem-health-label">{label}</span>
                        <span className={`prem-health-status ${(status || "").toLowerCase()}`}>{status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="prem-ai-engine-info">
                    <Brain size={16} color="#0ff" />
                    <span>Inference active via PyTorch (DenseNet-121, ResNet-18, MobileNetV2) · Grad-CAM visual attention enabled · Device: {dashboardData.system_health?.device || "CPU"}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="prem-loading"><div className="prem-spinner" /><p>Loading insights...</p></div>
            )}
          </div>
        )}

        {/* 6. HEALTH TIMELINE TAB */}
        {activeTab === "health-timeline" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">Longitudinal Patient History</p>
                <h1 className="prem-welcome-title">Health Timeline</h1>
                <p className="prem-welcome-sub">Chronological journey of your health milestones, clinical scans, and laboratory tests.</p>
              </div>
            </div>

            {loadingMyHistory ? (
              <div className="prem-loading"><div className="prem-spinner" /><p>Building your timeline...</p></div>
            ) : myAnalysisHistory.length === 0 ? (
              <div className="prem-empty-state prem-empty-large">
                <GitBranch size={56} color="var(--text-muted)" />
                <h3>No health timeline events</h3>
                <p>As you run analyses and save scans, your longitudinal medical timeline will assemble here automatically.</p>
                <button className="prem-btn-primary" onClick={() => setActiveTab("new-analysis")}>Start Analysis</button>
              </div>
            ) : (
              <div className="prem-timeline">
                {myAnalysisHistory.map((item, i) => {
                  const date = item.date ? new Date(item.date) : null;
                  const showDateLabel = i === 0 || (date && new Date(myAnalysisHistory[i-1]?.date).toDateString() !== date.toDateString());
                  return (
                    <div key={item.analysisId || i}>
                      {showDateLabel && date && (
                        <div className="prem-timeline-date-label">
                          <span>{date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                        </div>
                      )}
                      <div className="prem-timeline-item">
                        <div className="prem-timeline-dot" />
                        <div className="prem-timeline-card">
                          <div className="prem-timeline-card-header">
                            <span className={`prem-type-badge prem-type-${(item.fileType || item.analysisType || "").toLowerCase().replace(/\s/g, "")}`}>
                              {item.fileType || item.analysisType || "Scan"}
                            </span>
                            <span className="prem-timeline-time">{date ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          </div>
                          <p className="prem-timeline-result">{item.prediction || item.result || "Scan processed and verified"}</p>
                          {item.confidence && <p className="prem-timeline-conf">AI Confidence: {item.confidence}%</p>}
                          <button className="prem-text-btn prem-timeline-view" onClick={() => {
                            setDashboardResult({ ...item, modality: item.fileType || item.analysisType || "Chest X-Ray" });
                            setActiveTab("new-analysis");
                          }}>
                            View Report <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 7. MY MEDICAL VAULT TAB */}
        {activeTab === "vault" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">Encrypted File Storage</p>
                <h1 className="prem-welcome-title">My Medical Vault</h1>
                <p className="prem-welcome-sub">All your original medical DICOMs, X-ray scans, and PDF documents safely stored.</p>
              </div>
              <button className="prem-btn-primary" onClick={() => { setActiveTab("new-analysis"); setDashboardResult(null); }}>
                <Plus size={16} /> Upload to Vault
              </button>
            </div>

            {loadingMyHistory ? (
              <div className="prem-loading"><div className="prem-spinner" /><p>Accessing vault...</p></div>
            ) : myAnalysisHistory.length === 0 ? (
              <div className="prem-empty-state prem-empty-large">
                <HardDrive size={56} color="var(--text-muted)" />
                <h3>Your medical vault is empty</h3>
                <p>Files uploaded during your analyses will be organized here with download and inspection actions.</p>
                <button className="prem-btn-primary" onClick={() => setActiveTab("new-analysis")}>Start Analysis</button>
              </div>
            ) : (
              <div className="prem-vault-grid">
                {myAnalysisHistory.map((item, i) => (
                  <div key={item.analysisId || i} className="prem-vault-card">
                    <div className="prem-vault-icon">
                      {(item.fileType || item.analysisType || "").includes("Chest") ? <Stethoscope size={32} color="#3b82f6" /> :
                       (item.fileType || item.analysisType || "").includes("Dental") ? <Microscope size={32} color="#10b981" /> :
                       (item.fileType || item.analysisType || "").includes("CT") || (item.fileType || item.analysisType || "").includes("Kidney") ? <ScanLine size={32} color="#f59e0b" /> :
                       <FileText size={32} color="#8b5cf6" />}
                    </div>
                    <div className="prem-vault-info">
                      <span className={`prem-type-badge prem-type-${(item.fileType || item.analysisType || "").toLowerCase().replace(/\s/g, "")}`}>
                        {item.fileType || item.analysisType || "Scan"}
                      </span>
                      <p className="prem-vault-result">{item.prediction || item.result || "Verified File"}</p>
                      <span className="prem-vault-date">{item.date ? new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
                    </div>
                    <button className="prem-vault-btn" onClick={() => {
                      setDashboardResult({ ...item, modality: item.fileType || item.analysisType || "Chest X-Ray" });
                      setActiveTab("new-analysis");
                    }}>
                      <Eye size={14} /> View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. MY PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">Personal Account</p>
                <h1 className="prem-welcome-title">My Profile</h1>
                <p className="prem-welcome-sub">Manage your healthcare identification and view your usage metrics.</p>
              </div>
            </div>
            <div className="prem-profile-card">
              <div className="prem-profile-avatar-large">
                <span>{(doctorName || "U").charAt(0).toUpperCase()}</span>
              </div>
              <div className="prem-profile-info">
                <h2>{doctorName}</h2>
                <p className="prem-profile-username">@{token.replace("mock-jwt-token-", "")}</p>
                <p className="prem-profile-role">Individual Healthcare User · MediScan AI</p>
              </div>
              <div className="prem-profile-stats">
                <div className="prem-profile-stat">
                  <span className="prem-ps-val">{myAnalysisHistory.length}</span>
                  <span className="prem-ps-label">Total Analyses</span>
                </div>
                <div className="prem-profile-stat">
                  <span className="prem-ps-val">{myAnalysisHistory.filter(h => (h.fileType || h.analysisType || "").includes("Chest") || h.type === "X-Ray").length}</span>
                  <span className="prem-ps-label">X-Ray Scans</span>
                </div>
                <div className="prem-profile-stat">
                  <span className="prem-ps-val">{myAnalysisHistory.filter(h => (h.fileType || h.analysisType || "") === "Medical Report" || h.type === "Report").length}</span>
                  <span className="prem-ps-label">Lab Reports</span>
                </div>
                <div className="prem-profile-stat">
                  <span className="prem-ps-val">4</span>
                  <span className="prem-ps-label">Supported Modalities</span>
                </div>
              </div>
              <div className="prem-profile-details">
                <div className="prem-profile-detail-item">
                  <User size={16} color="var(--text-muted)" />
                  <span className="prem-pd-label">Full Name</span>
                  <span className="prem-pd-val">{doctorName}</span>
                </div>
                <div className="prem-profile-detail-item">
                  <Key size={16} color="var(--text-muted)" />
                  <span className="prem-pd-label">Username</span>
                  <span className="prem-pd-val">{token.replace("mock-jwt-token-", "")}</span>
                </div>
                <div className="prem-profile-detail-item">
                  <Shield size={16} color="var(--text-muted)" />
                  <span className="prem-pd-label">Account Tier</span>
                  <span className="prem-pd-val">Personal Healthcare User (Active)</span>
                </div>
                <div className="prem-profile-detail-item">
                  <Activity size={16} color="var(--text-muted)" />
                  <span className="prem-pd-label">AI Inference Engine</span>
                  <span className="prem-pd-val">DenseNet-121, ResNet-18, MobileNetV2</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="prem-view">
            <div className="prem-welcome-header">
              <div className="prem-welcome-left">
                <p className="prem-welcome-greeting">System Configuration</p>
                <h1 className="prem-welcome-title">Settings</h1>
                <p className="prem-welcome-sub">Customize your application preferences, analysis options, and security.</p>
              </div>
            </div>
            <div className="prem-settings-card">
              <div className="prem-settings-section">
                <h3><UserCircle size={18} /> User Account</h3>
                <div className="prem-settings-item">
                  <div>
                    <p className="prem-si-label">Display Name</p>
                    <p className="prem-si-val">{doctorName}</p>
                  </div>
                </div>
                <div className="prem-settings-item">
                  <div>
                    <p className="prem-si-label">User Identifier</p>
                    <p className="prem-si-val">{token.replace("mock-jwt-token-", "")}</p>
                  </div>
                </div>
              </div>
              <div className="prem-settings-section">
                <h3><Brain size={18} /> Diagnostics & AI</h3>
                <div className="prem-settings-item">
                  <div>
                    <p className="prem-si-label">Default Analysis Modality</p>
                    <p className="prem-si-val">Chest Radiograph (DenseNet-121)</p>
                  </div>
                </div>
                <div className="prem-settings-item">
                  <div>
                    <p className="prem-si-label">Explainable AI (Grad-CAM)</p>
                    <p className="prem-si-val">Enabled — Generates regional activation heatmaps</p>
                  </div>
                </div>
              </div>
              <div className="prem-settings-section">
                <h3><Shield size={18} /> Security & Privacy</h3>
                <div className="prem-settings-item">
                  <div>
                    <p className="prem-si-label">Session Authentication</p>
                    <p className="prem-si-val">Active · Token-verified user session</p>
                  </div>
                </div>
                <div className="prem-settings-item">
                  <div>
                    <p className="prem-si-label">History Isolation</p>
                    <p className="prem-si-val">Analyses are automatically linked to your authenticated user account</p>
                  </div>
                </div>
              </div>
              <button className="prem-logout-full-btn" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out of MediScan
              </button>
            </div>
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