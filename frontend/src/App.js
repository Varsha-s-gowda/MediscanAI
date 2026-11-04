import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  Activity,
  ArrowRight,
  Search,
  Plus,
  User,
  LogOut,
  Brain,
  History,
  Sparkles,
  Eye,
  Mail,
  Zap,
  Check,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  ChevronRight,
  Clock,
  Key,
  Bell,
  Settings,
  Calendar,
  Download,
  CheckCircle2,
  LayoutDashboard,
  Stethoscope,
  FolderOpen,
  GitBranch,
  HardDrive,
  UserCircle,
  Menu,
  X,
  RefreshCw,
  FileImage,
  Microscope,
  ScanLine,
  Shield,
  ChevronDown,
  Phone
} from "lucide-react";
import "./App.css";
import PostAnalysisWorkflow from "./components/PostAnalysisWorkflow";
import {
  PublicHome,
  PublicFeatures,
  PublicHowItWorks,
  PublicAbout,
  PublicSupport,
  AuthPage,
  AboutContent,
  SupportContent
} from "./components/PublicSite";

const API_BASE = process.env.REACT_APP_API_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5000" : "https://mediscan-ai-backend.onrender.com");

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("doctor_token") || sessionStorage.getItem("doctor_token") || "");
  const [doctorName, setDoctorName] = useState(localStorage.getItem("doctor_name") || sessionStorage.getItem("doctor_name") || "");
  const [activeTab, setActiveTab] = useState("dashboard");

  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [publicMode, setPublicMode] = useState("home"); // home, features, how-it-works, about, support, login, register, forgot-password, xray, cavity, ct_scan, report, history
  const [publicResult, setPublicResult] = useState(null);
  const [publicHistory, setPublicHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("mediscan_public_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Authenticated analysis state (declared early so route helpers can read it)
  const [dashboardAnalysisMode, setDashboardAnalysisMode] = useState("xray");
  const [dashboardResult, setDashboardResult] = useState(null);

  // Authenticated application shell + personal workspace UI state
  const [appDrawerOpen, setAppDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("All");
  const [historyDateFilter, setHistoryDateFilter] = useState("All");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("All");
  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsTypeFilter, setRecordsTypeFilter] = useState("All");
  const [recordsSort, setRecordsSort] = useState("Newest");
  const [profileForm, setProfileForm] = useState({ name: "", age: "", gender: "Other", contact: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState("");
  const [recordPreview, setRecordPreview] = useState(null);

  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);

  // Helper: Get target URL path for current state
  const getPathForState = useCallback((mode, tab, patient) => {
    if (token) {
      if (tab === "dashboard") return "/dashboard";
      if (tab === "portal-logic") return "/portal-logic";
      if (tab === "health-history") return "/health-history";
      if (tab === "medical-records") return "/medical-records";
      if (tab === "profile") return "/profile";
      if (tab === "about") return "/about";
      if (tab === "settings") return "/settings";
      if (tab === "support") return "/support";
      if (tab === "new-analysis") {
        if (dashboardResult) return "/analysis/results";
        if (dashboardAnalysisMode === "cavity") return "/analysis/dental";
        if (dashboardAnalysisMode === "ct_scan") return "/analysis/kidney-ct";
        if (dashboardAnalysisMode === "report") return "/analysis/blood-report";
        return "/analysis/chest-xray";
      }
      if (tab === "patients") return "/patients";
      if (tab === "patient-profile") return `/patients/${patient?.patientId || patient?.id || "profile"}`;
      if (tab === "my-reports") return "/my-reports";
      if (tab === "analysis-history") return "/analysis-history";
      if (tab === "health-insights") return "/health-insights";
      if (tab === "health-timeline") return "/health-timeline";
      if (tab === "vault") return "/vault";
    }
    if (mode === "xray") return "/analysis/chest-xray";
    if (mode === "cavity") return "/analysis/dental";
    if (mode === "ct_scan") return "/analysis/kidney-ct";
    if (mode === "report") return "/analysis/blood-report";
    if (mode === "history") return "/history";
    if (mode === "features") return "/features";
    if (mode === "how-it-works") return "/how-it-works";
    if (mode === "about") return "/about";
    if (mode === "support") return "/support";
    if (mode === "register") return "/register";
    if (mode === "forgot-password") return "/forgot-password";
    if (mode === "login") return "/login";
    if (mode === "home") return "/";
    return "/";
  }, [token, dashboardResult, dashboardAnalysisMode]);

  // Sync state from URL location on direct page loads and browser Back/Forward
  useEffect(() => {
    const path = location.pathname;
    // When navigating to a new URL, clear the transient public result so the page view updates
    setPublicResult(null);
    setUploadFile(null);
    setProfileMenuOpen(false);

    const enterAnalysis = (analysisMode) => {
      if (token) {
        setDashboardResult(null);
        setActiveTab("new-analysis");
        setDashboardAnalysisMode(analysisMode);
      } else {
        setPublicMode(analysisMode);
      }
    };

    if (path === "/dashboard") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("login");
    } else if (path === "/portal-logic") {
      if (token) setActiveTab("portal-logic");
      else setPublicMode("login");
    } else if (path === "/health-history") {
      if (token) setActiveTab("health-history");
      else setPublicMode("login");
    } else if (path === "/medical-records") {
      if (token) setActiveTab("medical-records");
      else setPublicMode("login");
    } else if (path === "/profile") {
      if (token) setActiveTab("profile");
      else setPublicMode("login");
    } else if (path === "/settings") {
      if (token) setActiveTab("settings");
      else setPublicMode("login");
    } else if (path === "/about") {
      if (token) setActiveTab("about");
      else setPublicMode("about");
    } else if (path === "/support") {
      if (token) setActiveTab("support");
      else setPublicMode("support");
    } else if (path === "/features") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("features");
    } else if (path === "/how-it-works") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("how-it-works");
    } else if (path === "/register") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("register");
    } else if (path === "/forgot-password") {
      if (token) setActiveTab("dashboard");
      else setPublicMode("forgot-password");
    } else if (path === "/patients") {
      if (token) setActiveTab("patients");
      else setPublicMode("login");
    } else if (path.startsWith("/patients/")) {
      if (token) setActiveTab("patient-profile");
      else setPublicMode("login");
    } else if (path === "/analysis/chest-xray") {
      enterAnalysis("xray");
    } else if (path === "/analysis/dental" || path === "/analysis/dental-cavity") {
      enterAnalysis("cavity");
    } else if (path === "/analysis/kidney-ct" || path === "/analysis/kidney-stone") {
      enterAnalysis("ct_scan");
    } else if (path === "/analysis/blood-report") {
      enterAnalysis("report");
    } else if (path === "/analysis/results") {
      if (token) setActiveTab("new-analysis");
      else setPublicMode("xray");
    } else if (path === "/new-analysis") {
      if (token) setActiveTab("new-analysis");
      else setPublicMode("login");
    } else if (path === "/my-reports") {
      if (token) setActiveTab("my-reports");
      else setPublicMode("login");
    } else if (path === "/analysis-history" || path === "/history") {
      if (token) setActiveTab("health-history");
      else setPublicMode("history");
    } else if (path === "/health-insights") {
      if (token) setActiveTab("health-insights");
      else setPublicMode("login");
    } else if (path === "/health-timeline") {
      if (token) setActiveTab("health-timeline");
      else setPublicMode("login");
    } else if (path === "/vault") {
      if (token) setActiveTab("medical-records");
      else setPublicMode("login");
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
  }, [publicMode, activeTab, selectedPatient, dashboardResult, dashboardAnalysisMode, getPathForState]);

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
  const [myPatientId, setMyPatientId] = useState(null);
  const [myAnalysisHistory, setMyAnalysisHistory] = useState([]);
  const [loadingMyHistory, setLoadingMyHistory] = useState(false);
  const [dashboardUploadFile, setDashboardUploadFile] = useState(null);
  const [dashboardUploading, setDashboardUploading] = useState(false);
  const [dashboardUploadError, setDashboardUploadError] = useState("");
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
    if (!navDrawerOpen && !showAbout && !appDrawerOpen && !profileMenuOpen && !notifOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNavDrawerOpen(false);
        setShowAbout(false);
        setAppDrawerOpen(false);
        setProfileMenuOpen(false);
        setNotifOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navDrawerOpen, showAbout, appDrawerOpen, profileMenuOpen, notifOpen]);

  // Keep the editable profile form in sync with the authenticated user's patient record.
  useEffect(() => {
    if (!token) return;
    const uname = token.replace("mock-jwt-token-", "").toLowerCase();
    const mine = patients.find((p) => p.patientId === myPatientId)
      || patients.find((p) => (p.doctorUsername || "").toLowerCase() === uname)
      || patients[0];
    if (mine) {
      setProfileForm({
        name: mine.name || doctorName || "",
        age: mine.age !== undefined && mine.age !== null ? String(mine.age) : "",
        gender: mine.gender || "Other",
        contact: mine.contact || ""
      });
    } else if (doctorName) {
      setProfileForm((prev) => ({ ...prev, name: prev.name || doctorName }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, patients, myPatientId, doctorName]);

  const persistSession = (data, remember = true) => {
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;
    secondary.removeItem("doctor_token");
    secondary.removeItem("doctor_name");
    primary.setItem("doctor_token", data.token);
    primary.setItem("doctor_name", data.name);
    setToken(data.token);
    setDoctorName(data.name);
    setActiveTab("dashboard");
    setPublicMode("home");
    setAuthError("");
    setAuthNotice("");
  };

  const attachPhoneToProfile = async (phone, authToken, accountName) => {
    if (!phone) return;
    try {
      const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` };
      const res = await fetch(`${API_BASE}/api/patients`, { headers });
      if (!res.ok) return;
      const list = await res.json();
      const patient = Array.isArray(list) ? list[0] : null;
      if (!patient?.patientId) {
        await fetch(`${API_BASE}/api/patients`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: accountName || "MediScan AI User",
            age: 0,
            gender: "Other",
            contact: phone
          })
        });
        return;
      }
      await fetch(`${API_BASE}/api/patients/${patient.patientId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: patient.name,
          age: patient.age,
          gender: patient.gender || "Other",
          contact: phone
        })
      });
    } catch (err) {
      console.warn("Could not attach phone number to profile.", err);
    }
  };

  const handleRegister = async ({ name, username: rawUsername, password: rawPassword, phone }) => {
    setAuthError("");
    setAuthNotice("");
    const cleanUsername = (rawUsername || "").trim();
    const cleanName = (name || "").trim();
    if (!cleanUsername || !rawPassword || !cleanName) {
      return { ok: false, error: "Please fill in all required registration fields." };
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: rawPassword, name: cleanName })
      });
      if (!res.ok) {
        let detail = "Registration failed.";
        try { const err = await res.json(); detail = err.detail || err.error || detail; } catch (_) {}
        return { ok: false, error: detail };
      }

      // Auto sign in with the existing login endpoint after successful registration.
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: rawPassword })
      });
      if (!loginRes.ok) {
        setPublicMode("login");
        return {
          ok: false,
          error: "Account created, but automatic sign-in failed. Please sign in with your new credentials."
        };
      }
      const data = await loginRes.json();
      persistSession(data, true);
      attachPhoneToProfile(phone, data.token, cleanName);
      showToast(`Welcome, ${data.name}. Your personal healthcare workspace is ready.`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: "Failed to connect to the authentication server." };
    }
  };

  const handleLogin = async ({ username: rawUsername, password: rawPassword, remember = true }) => {
    setAuthError("");
    setAuthNotice("");
    const cleanUsername = (rawUsername || "").trim();
    if (!cleanUsername || !rawPassword) {
      return { ok: false, error: "Please enter both your email and password." };
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: rawPassword })
      });
      if (res.ok) {
        const data = await res.json();
        persistSession(data, remember);
        showToast(`Welcome back, ${data.name || "there"}.`);
        return { ok: true };
      }
      let detail = "Authentication failed. Check your credentials and try again.";
      try { const err = await res.json(); detail = err.detail || err.error || detail; } catch (_) {}
      return { ok: false, error: detail };
    } catch (err) {
      return { ok: false, error: "Failed to connect to the authentication server." };
    }
  };

  const handleForgotPassword = async ({ email }) => {
    setAuthError("");
    setAuthNotice(
      `Password recovery is not available through the current backend. No reset email was sent to ${email}. ` +
      "Please contact the MediScan AI administrator or support to reset access for your registered account."
    );
    return { ok: true };
  };

  const handleLogout = () => {
    localStorage.removeItem("doctor_token");
    localStorage.removeItem("doctor_name");
    sessionStorage.removeItem("doctor_token");
    sessionStorage.removeItem("doctor_name");
    setToken("");
    setDoctorName("");
    setSelectedPatient(null);
    setActiveTab("dashboard");
    setPublicMode("home");
    setAppDrawerOpen(false);
    setProfileMenuOpen(false);
    setNotifOpen(false);
    setDashboardResult(null);
    setDashboardUploadFile(null);
    setDashboardUploadError("");
    setMyAnalysisHistory([]);
    setMyPatientId(null);
    setPatients([]);
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
    if (publicMode === "login" || publicMode === "register" || publicMode === "forgot-password") {
      return (
        <AuthPage
          mode={publicMode}
          onNavigate={(mode) => { setAuthError(""); setAuthNotice(""); setPublicMode(mode); }}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgotPassword={handleForgotPassword}
          authError={authError}
          authNotice={authNotice}
          onClearAuthMessages={() => { setAuthError(""); setAuthNotice(""); }}
        />
      );
    }

    const goPublic = (mode) => {
      setAuthError("");
      setAuthNotice("");
      setPublicResult(null);
      setPublicMode(mode);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (publicMode === "features") {
      return <PublicFeatures onNavigate={goPublic} />;
    }

    if (publicMode === "how-it-works") {
      return <PublicHowItWorks onNavigate={goPublic} />;
    }

    if (publicMode === "about") {
      return <PublicAbout onNavigate={goPublic} />;
    }

    if (publicMode === "support") {
      return <PublicSupport onNavigate={goPublic} />;
    }

    // Homepage (publicMode === "home" or default)
    return (
      <PublicHome
        onNavigate={goPublic}
        onLogin={() => goPublic("login")}
        onRegister={() => goPublic("register")}
      />
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
    if (!analysisId) return;
    if (!window.confirm("Delete this analysis?\n\nThis will permanently remove this analysis from your medical history.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/analyses/${analysisId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast("Analysis deleted successfully.");
        if (dashboardResult && (dashboardResult.analysisId === analysisId)) setDashboardResult(null);
        if (recordPreview && recordPreview.analysisId === analysisId) setRecordPreview(null);
        await fetchMyAnalyses();
        fetchDashboardData(period);
        fetchRegistryData();
        if (selectedPatient) selectPatient(selectedPatient);
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

  /* ============================================================
     PERSONAL WORKSPACE DERIVED DATA & ACTIONS
     ============================================================ */

  const myUsername = token.replace("mock-jwt-token-", "");
  const ownPatient = patients.find((p) => (p.doctorUsername || "").toLowerCase() === myUsername.toLowerCase());
  const myPatient = patients.find((p) => p.patientId === myPatientId) || ownPatient || patients[0] || null;
  const isReportRecord = (row) => {
    const type = (row.fileType || row.analysisType || "").toLowerCase();
    return type.includes("report") || type.includes("lab") || type.includes("blood");
  };
  const recordStatus = (row) => (row.prediction || row.reportSummary || row.reportFindings ? "Completed" : "Pending result");
  const recordDateValue = (row) => (row.date ? new Date(row.date).getTime() : 0);
  const savedMedicalReports = myAnalysisHistory.filter(isReportRecord);
  const recentActivityCount = myAnalysisHistory.filter((row) => {
    if (!row.date) return false;
    return Date.now() - new Date(row.date).getTime() <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const lastAnalysis = myAnalysisHistory[0] || null;

  const inDateRange = (row, range) => {
    if (range === "All") return true;
    if (!row.date) return false;
    const time = new Date(row.date).getTime();
    if (Number.isNaN(time)) return false;
    const now = Date.now();
    if (range === "7d") return now - time <= 7 * 24 * 60 * 60 * 1000;
    if (range === "30d") return now - time <= 30 * 24 * 60 * 60 * 1000;
    if (range === "year") return new Date(row.date).getFullYear() === new Date().getFullYear();
    return true;
  };

  const filteredHistory = myAnalysisHistory.filter((row) => {
    const query = historySearch.trim().toLowerCase();
    const type = (row.fileType || row.analysisType || "").toLowerCase();
    const typeMatch =
      historyTypeFilter === "All" ||
      (historyTypeFilter === "xray" && type.includes("chest")) ||
      (historyTypeFilter === "dental" && (type.includes("dental") || type.includes("cavity"))) ||
      (historyTypeFilter === "ct" && (type.includes("ct") || type.includes("kidney") || type.includes("stone"))) ||
      (historyTypeFilter === "report" && isReportRecord(row));
    const textMatch =
      !query ||
      (row.fileName || "").toLowerCase().includes(query) ||
      (row.prediction || "").toLowerCase().includes(query) ||
      (row.reportSummary || "").toLowerCase().includes(query);
    const statusMatch = historyStatusFilter === "All" || recordStatus(row) === historyStatusFilter;
    return typeMatch && textMatch && statusMatch && inDateRange(row, historyDateFilter);
  });

  const recordItems = [];
  myAnalysisHistory.forEach((row, index) => {
    const key = row.analysisId || `${row.fileName || "record"}-${index}`;
    recordItems.push({ ...row, recordKey: `${key}-original`, recordKind: "original", recordTitle: row.fileName || "Original medical document" });
    if (row.prediction || row.reportSummary || row.reportFindings) {
      recordItems.push({ ...row, recordKey: `${key}-report`, recordKind: "report", recordTitle: row.fileName || "AI analysis report" });
    }
  });

  const filteredRecords = recordItems
    .filter((item) => {
      const query = recordsSearch.trim().toLowerCase();
      const type = (item.fileType || item.analysisType || "").toLowerCase();
      const typeMatch =
        recordsTypeFilter === "All" ||
        (recordsTypeFilter === "originals" && item.recordKind === "original") ||
        (recordsTypeFilter === "reports" && item.recordKind === "report") ||
        (recordsTypeFilter === "lab" && isReportRecord(item));
      const textMatch =
        !query ||
        (item.recordTitle || "").toLowerCase().includes(query) ||
        (item.prediction || "").toLowerCase().includes(query) ||
        (item.reportSummary || "").toLowerCase().includes(query) ||
        type.includes(query);
      return typeMatch && textMatch;
    })
    .sort((a, b) => (recordsSort === "Oldest" ? recordDateValue(a) - recordDateValue(b) : recordDateValue(b) - recordDateValue(a)));

  const goToTab = (tab) => {
    setAppDrawerOpen(false);
    setProfileMenuOpen(false);
    setNotifOpen(false);
    if (tab === "health-history" || tab === "medical-records") fetchMyAnalyses();
    if (tab === "dashboard") { fetchDashboardData(period); fetchMyAnalyses(); }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAnalysis = (mode) => {
    setDashboardAnalysisMode(mode);
    setDashboardResult(null);
    setDashboardUploadFile(null);
    setDashboardUploadError("");
    setActiveTab("new-analysis");
    setAppDrawerOpen(false);
    setProfileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAnalysisResult = (row) => {
    const fallbackModality = isReportRecord(row)
      ? "Medical Report"
      : (row.fileType || row.analysisType || "Chest X-Ray");
    const type = (row.fileType || row.analysisType || "").toLowerCase();
    const mode = type.includes("dental") || type.includes("cavity")
      ? "cavity"
      : type.includes("ct") || type.includes("kidney") || type.includes("stone")
        ? "ct_scan"
        : isReportRecord(row)
          ? "report"
          : "xray";
    setDashboardAnalysisMode(mode);
    setDashboardResult({ ...row, modality: row.fileType || row.analysisType || fallbackModality });
    setActiveTab("new-analysis");
    setProfileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const storedFileUrl = (row) => {
    if (!row?.filePath) return "";
    if (/^https?:\/\//i.test(row.filePath)) return row.filePath;
    return `${API_BASE}${row.filePath.startsWith("/") ? "" : "/"}${row.filePath}`;
  };

  const downloadStoredFile = async (row) => {
    const url = storedFileUrl(row);
    if (!url) {
      showToast("The original file path is not available for this record.");
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = row.fileName || "medical-record";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (err) {
      // Cross-origin or server restrictions: fall back to opening the stored file.
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    const cleanName = profileForm.name.trim();
    if (!cleanName) {
      showToast("Please enter your full name.");
      return;
    }
    setProfileSaving(true);
    setProfileSaved("");
    try {
      let patientId = myPatient?.patientId || myPatientId;
      if (!patientId) patientId = await ensureUserPatient();
      if (!patientId) {
        showToast("Your profile record could not be prepared. Please try again in a moment.");
        return;
      }
      const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: cleanName,
          age: parseInt(profileForm.age, 10) || 0,
          gender: profileForm.gender || "Other",
          contact: profileForm.contact || ""
        })
      });
      if (res.ok) {
        setDoctorName(cleanName);
        if (localStorage.getItem("doctor_token")) localStorage.setItem("doctor_name", cleanName);
        else sessionStorage.setItem("doctor_name", cleanName);
        showToast("Profile details updated.");
        setProfileSaved("Your profile details were saved.");
        fetchPatients();
        fetchDashboardData(period);
      } else {
        showToast("Could not update your profile details.");
      }
    } catch (err) {
      showToast("Could not connect to update your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="ms-app-shell">
      {/* ===== AUTHENTICATED HEADER ===== */}
      <header className="ms-app-header">
        <button type="button" className="ms-app-brand" onClick={() => goToTab("dashboard")} aria-label="Go to dashboard">
          <span className="ms-app-brand-orb"><Sparkles size={20} color="#2DD4BF" /></span>
          <span className="ms-app-brand-copy">
            <span className="ms-app-brand-name">MediScan <span>AI</span></span>
            <span className="ms-app-brand-sub">Personal Healthcare</span>
          </span>
        </button>

        <div className="ms-app-header-actions">
          <button
            type="button"
            className="ms-app-icon-btn"
            onClick={() => { setNotifOpen((open) => !open); setProfileMenuOpen(false); }}
            aria-label="Recent activity notifications"
            title="Recent activity"
          >
            <Bell size={19} />
            {myAnalysisHistory.length > 0 && <span className="ms-app-notify-dot" />}
          </button>

          <div className="ms-app-profile-wrap">
            <button
              type="button"
              className="ms-app-profile-btn"
              onClick={() => { setProfileMenuOpen((open) => !open); setNotifOpen(false); }}
              aria-expanded={profileMenuOpen}
            >
              <span className="ms-app-avatar">{(doctorName || "U").charAt(0).toUpperCase()}</span>
              <span className="ms-app-profile-copy">
                <strong>{doctorName || "User"}</strong>
                <small>{myUsername || "Signed in"}</small>
              </span>
              <ChevronDown size={15} className={profileMenuOpen ? "ms-chevron-open" : ""} />
            </button>

            {profileMenuOpen && (
              <div className="ms-app-profile-menu">
                <div className="ms-app-profile-menu-head">
                  <span className="ms-app-avatar">{(doctorName || "U").charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{doctorName || "User"}</strong>
                    <span>{myUsername}</span>
                  </div>
                </div>
                <button type="button" onClick={() => goToTab("profile")}><UserCircle size={16} /> My Profile</button>
                <button type="button" onClick={() => goToTab("settings")}><Settings size={16} /> Settings</button>
                <button type="button" onClick={() => goToTab("support")}><HelpCircle size={16} /> Help &amp; Support</button>
                <button type="button" className="ms-menu-logout" onClick={handleLogout}><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="ms-app-menu-btn"
            onClick={() => { setAppDrawerOpen(true); setProfileMenuOpen(false); }}
            aria-label="Open navigation menu"
            title="Open menu"
          >
            <Menu size={21} />
          </button>
        </div>
      </header>

      {(profileMenuOpen || notifOpen) && (
        <div
          className="ms-menu-catcher"
          onClick={() => { setProfileMenuOpen(false); setNotifOpen(false); }}
          aria-hidden="true"
        />
      )}

      {notifOpen && (
        <div className="ms-notif-popover">
          <div className="ms-notif-head">
            <strong>Recent activity</strong>
            <button type="button" onClick={() => setNotifOpen(false)} aria-label="Close notifications"><X size={15} /></button>
          </div>
          {myAnalysisHistory.length === 0 ? (
            <p className="ms-notif-empty">No analysis activity yet.</p>
          ) : (
            myAnalysisHistory.slice(0, 5).map((row, index) => (
              <button
                type="button"
                key={row.analysisId || index}
                className="ms-notif-item"
                onClick={() => { setNotifOpen(false); openAnalysisResult(row); }}
              >
                <span className="ms-notif-icon"><Activity size={14} /></span>
                <span>
                  <strong>{row.fileType || row.analysisType || "Analysis"}</strong>
                  <small>{row.prediction || "Result saved"} · {row.date ? formatRelativeTime(row.date) : "Recently"}</small>
                </span>
              </button>
            ))
          )}
          <button type="button" className="ms-notif-all" onClick={() => goToTab("health-history")}>
            View health history <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ===== SLIDE-OUT APPLICATION DRAWER ===== */}
      {appDrawerOpen && (
        <div className="ms-app-drawer-overlay" onClick={() => setAppDrawerOpen(false)}>
          <aside className="ms-app-drawer" onClick={(event) => event.stopPropagation()} aria-label="Application navigation">
            <div className="ms-app-drawer-head">
              <div className="ms-app-brand">
                <span className="ms-app-brand-orb"><Sparkles size={18} color="#2DD4BF" /></span>
                <span className="ms-app-brand-copy">
                  <span className="ms-app-brand-name">MediScan <span>AI</span></span>
                  <span className="ms-app-brand-sub">Personal Healthcare</span>
                </span>
              </div>
              <button type="button" className="ms-app-drawer-close" onClick={() => setAppDrawerOpen(false)} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>

            <div className="ms-app-drawer-user">
              <span className="ms-app-avatar">{(doctorName || "U").charAt(0).toUpperCase()}</span>
              <div>
                <strong>{doctorName || "User"}</strong>
                <span>{myUsername}</span>
              </div>
            </div>

            <div className="ms-app-drawer-label">WORKSPACE</div>
            <nav className="ms-app-drawer-nav">
              {[
                { id: "dashboard", label: "Dashboard", sub: "Your health overview", icon: <LayoutDashboard size={19} /> },
                { id: "portal-logic", label: "Portal Logic", sub: "Access & session gateway", icon: <Zap size={19} /> },
                { id: "health-history", label: "Health History", sub: "All previous analyses", icon: <History size={19} /> },
                { id: "medical-records", label: "My Medical Records", sub: "Documents & AI reports", icon: <FolderOpen size={19} /> },
                { id: "profile", label: "My Profile", sub: "Personal account details", icon: <UserCircle size={19} /> },
                { id: "about", label: "About MediScan AI", sub: "Platform & technology", icon: <Brain size={19} /> },
                { id: "settings", label: "Settings", sub: "Account & privacy", icon: <Settings size={19} /> },
                { id: "support", label: "Help & Support", sub: "FAQs and guidance", icon: <HelpCircle size={19} /> }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`ms-app-drawer-item ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => goToTab(item.id)}
                >
                  <span className="ms-app-drawer-icon">{item.icon}</span>
                  <span className="ms-app-drawer-text">
                    <strong>{item.label}</strong>
                    <small>{item.sub}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </nav>

            <button type="button" className="ms-app-drawer-logout" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>

            <div className="ms-app-drawer-foot">
              <span><span className="ms-status-dot" /> Signed in</span>
              <span>v2.8</span>
            </div>
          </aside>
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="ms-app-main">

        {/* 1. DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="ms-dash">
            {/* A. PERSONALIZED WELCOME */}
            <section className="ms-dash-hero">
              <div className="ms-dash-hero-copy">
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> PERSONAL HEALTH WORKSPACE</span>
                <h1>Welcome Back, {doctorName || "there"}!</h1>
                <p>Your health records, medical scans and AI-powered insights, all in one place.</p>
                <div className="ms-dash-hero-actions">
                  <button type="button" className="ms-btn-primary" onClick={() => openAnalysis("xray")}>
                    <Upload size={17} /> Upload New Scan
                  </button>
                  <button type="button" className="ms-btn-secondary" onClick={() => goToTab("health-history")}>
                    <History size={16} /> View Health History
                  </button>
                </div>
              </div>
              <div className="ms-dash-hero-side">
                <div className="ms-dash-date-card">
                  <Calendar size={16} />
                  <div>
                    <span>Today</span>
                    <strong>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</strong>
                  </div>
                </div>
                <div className="ms-dash-date-card">
                  <Activity size={16} />
                  <div>
                    <span>Last analysis</span>
                    <strong>{lastAnalysis?.date ? new Date(lastAnalysis.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No analyses yet"}</strong>
                  </div>
                </div>
                <button type="button" className="ms-dash-refresh" onClick={() => { fetchMyAnalyses(); fetchDashboardData(period); }}>
                  <RefreshCw size={14} /> Refresh data
                </button>
              </div>
            </section>

            {/* B. QUICK ACTIONS */}
            <section className="ms-dash-section">
              <div className="ms-dash-section-head">
                <div>
                  <h2>Quick actions</h2>
                  <p>Start the task you need without navigating through menus.</p>
                </div>
              </div>
              <div className="ms-quick-grid">
                {[
                  { title: "Upload Medical Scan", desc: "Chest X-ray, dental or kidney CT", icon: <Upload size={21} />, action: () => openAnalysis("xray") },
                  { title: "Upload Medical Report", desc: "Blood work and laboratory documents", icon: <FileText size={21} />, action: () => openAnalysis("report") },
                  { title: "View Health History", desc: "Search and reopen previous results", icon: <History size={21} />, action: () => goToTab("health-history") },
                  { title: "My Medical Records", desc: "Original files and AI reports", icon: <FolderOpen size={21} />, action: () => goToTab("medical-records") }
                ].map((action) => (
                  <button type="button" key={action.title} className="ms-quick-card" onClick={action.action}>
                    <span className="ms-quick-icon">{action.icon}</span>
                    <span>
                      <strong>{action.title}</strong>
                      <small>{action.desc}</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            </section>

            {/* C. PERSONAL HEALTH OVERVIEW */}
            <section className="ms-dash-section">
              <div className="ms-dash-section-head">
                <div>
                  <h2>Personal health overview</h2>
                  <p>All numbers below are calculated from your own account records.</p>
                </div>
                {loadingMyHistory && <span className="ms-inline-loading"><span className="ms-spinner" /> Loading records…</span>}
              </div>
              <div className="ms-overview-grid">
                <div className="ms-overview-card">
                  <span className="ms-overview-icon ms-blue"><ScanLine size={20} /></span>
                  <div><span>Total Scans Analyzed</span><strong>{myAnalysisHistory.length}</strong><small>Your stored analyses</small></div>
                </div>
                <div className="ms-overview-card">
                  <span className="ms-overview-icon ms-teal"><FileText size={20} /></span>
                  <div><span>Saved Medical Reports</span><strong>{savedMedicalReports.length}</strong><small>Laboratory documents</small></div>
                </div>
                <div className="ms-overview-card">
                  <span className="ms-overview-icon ms-purple"><Activity size={20} /></span>
                  <div><span>Recent Analysis Activity</span><strong>{recentActivityCount}</strong><small>In the last 30 days</small></div>
                </div>
                <div className="ms-overview-card">
                  <span className="ms-overview-icon ms-orange"><Clock size={20} /></span>
                  <div>
                    <span>Last Analysis Date</span>
                    <strong className="ms-overview-date">{lastAnalysis?.date ? new Date(lastAnalysis.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</strong>
                    <small>{lastAnalysis ? (lastAnalysis.fileType || lastAnalysis.analysisType || "Most recent record") : "No records yet"}</small>
                  </div>
                </div>
              </div>
            </section>

            {/* D. DIAGNOSTIC MODULES */}
            <section className="ms-dash-section">
              <div className="ms-dash-section-head">
                <div>
                  <h2>Diagnostic modules</h2>
                  <p>Open an existing analysis workflow for the document you have.</p>
                </div>
              </div>
              <div className="ms-module-grid">
                {[
                  { mode: "xray", title: "Chest X-Ray", desc: "Chest abnormality analysis with explainable visual evidence.", tag: "DenseNet-121", image: "/assets/modules/chest_xray.jpg", icon: <Stethoscope size={20} /> },
                  { mode: "cavity", title: "Dental Analysis", desc: "Caries and dental condition screening from radiographs.", tag: "EfficientNet-B0", image: "/assets/modules/dental_panoramic.jpg", icon: <Microscope size={20} /> },
                  { mode: "ct_scan", title: "Kidney Stone CT", desc: "Renal calculi detection from supported CT slices.", tag: "MobileNetV2", image: "/assets/modules/kidney_ct.jpg", icon: <ScanLine size={20} /> },
                  { mode: "report", title: "Blood Report Analysis", desc: "OCR biomarker extraction and reference range review.", tag: "OCR + NLP", image: "/assets/modules/blood_smear.jpg", icon: <FileText size={20} /> }
                ].map((module) => (
                  <article className="ms-module-card" key={module.mode}>
                    <div className="ms-module-media">
                      <img src={module.image} alt={module.title} />
                      <span>{module.tag}</span>
                    </div>
                    <div className="ms-module-body">
                      <span className="ms-module-icon">{module.icon}</span>
                      <h3>{module.title}</h3>
                      <p>{module.desc}</p>
                      <button type="button" className="ms-module-btn" onClick={() => openAnalysis(module.mode)}>
                        Analyze Now <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* E + F + G. ACTIVITY, HISTORY, RECORDS PREVIEWS */}
            <div className="ms-dash-preview-grid">
              <section className="ms-dash-panel">
                <div className="ms-dash-panel-head">
                  <div><h2>Recent medical activity</h2><p>Your latest AI analyses.</p></div>
                  <button type="button" className="ms-text-btn" onClick={() => goToTab("health-history")}>View all</button>
                </div>
                {loadingMyHistory ? (
                  <div className="ms-panel-loading"><span className="ms-spinner" /> Loading your medical records…</div>
                ) : myAnalysisHistory.length === 0 ? (
                  <div className="ms-panel-empty">
                    <ScanLine size={30} />
                    <strong>You haven't uploaded any medical scans yet.</strong>
                    <p>Start with a chest X-ray, dental image, kidney CT or blood report.</p>
                    <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => openAnalysis("xray")}>Start an analysis</button>
                  </div>
                ) : (
                  <div className="ms-activity-list">
                    {myAnalysisHistory.slice(0, 5).map((row, index) => (
                      <div className="ms-activity-row" key={row.analysisId || index}>
                        <span className="ms-activity-icon"><Activity size={15} /></span>
                        <div className="ms-activity-copy">
                          <strong>{row.fileName || row.fileType || "Medical analysis"}</strong>
                          <small>{row.fileType || row.analysisType || "Scan"} · {row.date ? formatRelativeTime(row.date) : "Recently"}</small>
                        </div>
                        <span className={`ms-status-pill ${recordStatus(row) === "Completed" ? "done" : "pending"}`}>{recordStatus(row)}</span>
                        <button type="button" className="ms-text-btn" onClick={() => openAnalysisResult(row)}>View</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="ms-dash-panel">
                <div className="ms-dash-panel-head">
                  <div><h2>Health history preview</h2><p>A compact chronological view.</p></div>
                  <button type="button" className="ms-text-btn" onClick={() => goToTab("health-history")}>Open history</button>
                </div>
                {myAnalysisHistory.length === 0 ? (
                  <div className="ms-panel-empty">
                    <History size={30} />
                    <strong>No history yet</strong>
                    <p>Your completed analyses will appear here.</p>
                  </div>
                ) : (
                  <div className="ms-history-mini-list">
                    {myAnalysisHistory.slice(0, 4).map((row, index) => (
                      <button type="button" className="ms-history-mini" key={row.analysisId || index} onClick={() => openAnalysisResult(row)}>
                        <span className="ms-history-mini-dot" />
                        <span>
                          <strong>{row.prediction || row.result || "Analysis completed"}</strong>
                          <small>{(row.fileType || row.analysisType || "Scan")} · {row.date ? new Date(row.date).toLocaleDateString() : "—"}</small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="ms-dash-panel">
                <div className="ms-dash-panel-head">
                  <div><h2>My medical records</h2><p>Recently stored documents.</p></div>
                  <button type="button" className="ms-text-btn" onClick={() => goToTab("medical-records")}>View all</button>
                </div>
                {myAnalysisHistory.length === 0 ? (
                  <div className="ms-panel-empty">
                    <FolderOpen size={30} />
                    <strong>No medical reports have been saved yet.</strong>
                    <p>Upload a scan or report to build your records folder.</p>
                  </div>
                ) : (
                  <div className="ms-record-mini-list">
                    {myAnalysisHistory.slice(0, 3).map((row, index) => (
                      <div className="ms-record-mini" key={row.analysisId || index}>
                        <span className="ms-record-mini-icon">{isReportRecord(row) ? <FileText size={17} /> : <FileImage size={17} />}</span>
                        <div>
                          <strong>{row.fileName || "Medical document"}</strong>
                          <small>{row.fileType || row.analysisType || "Record"} · {row.date ? new Date(row.date).toLocaleDateString() : "—"}</small>
                        </div>
                        <button type="button" className="ms-icon-link" onClick={() => downloadStoredFile(row)} title="Download original document">
                          <Download size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* 2. NEW ANALYSIS TAB */}
        {activeTab === "new-analysis" && (
          <div className="ms-analysis-page">
            {dashboardResult ? (
              <div className="ms-results-page">
                <div className="ms-result-actionbar">
                  <div>
                    <span className="ms-result-saved"><CheckCircle2 size={15} /> Saved to your medical records</span>
                    <strong>{dashboardResult.fileName || "Analysis result"}</strong>
                  </div>
                  <div className="ms-result-actions">
                    <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => goToTab("health-history")}>
                      <History size={15} /> Analysis History
                    </button>
                    <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => openAnalysis(dashboardAnalysisMode)}>
                      <RefreshCw size={15} /> Analyze Another
                    </button>
                    <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => goToTab("dashboard")}>
                      <LayoutDashboard size={15} /> Dashboard
                    </button>
                  </div>
                </div>
                <div className="prem-results-wrapper">
                  <PostAnalysisWorkflow
                    result={dashboardResult}
                    modality={dashboardResult.modality || dashboardResult.fileType || "Chest X-Ray"}
                    apiBase={API_BASE}
                    historyList={myAnalysisHistory}
                    onSelectHistory={(item) => openAnalysisResult(item)}
                    setPublicMode={(mode) => {
                      if (mode === "history") {
                        goToTab("health-history");
                        return;
                      }
                      openAnalysis(mode);
                    }}
                    onBackToUpload={() => { setDashboardResult(null); setDashboardUploadFile(null); setDashboardUploadError(""); }}
                  />
                </div>
              </div>
            ) : (
              <>
                <header className="ms-page-header">
                  <div>
                    <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> NEW MEDICAL ANALYSIS</span>
                    <h1>Upload a scan or laboratory report</h1>
                    <p>Select the correct module, add your document and run the existing AI analysis. Results are automatically linked to your account.</p>
                  </div>
                  <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => goToTab("dashboard")}>
                    <LayoutDashboard size={15} /> Back to Dashboard
                  </button>
                </header>

                <div className="ms-analysis-steps">
                  {[
                    { n: "1", label: "Select analysis type", active: true },
                    { n: "2", label: "Add your document", active: true },
                    { n: "3", label: "Run AI analysis", active: !!dashboardUploadFile },
                    { n: "4", label: "Review results", active: false }
                  ].map((step) => (
                    <div className={`ms-analysis-step ${step.active ? "active" : ""}`} key={step.n}>
                      <span>{step.n}</span>{step.label}
                    </div>
                  ))}
                </div>

                {/* Modality Selector */}
                <div className="ms-modality-grid">
                  {[
                    { mode: "xray", label: "Chest X-Ray", desc: "Thoracic radiograph", icon: <Stethoscope size={19} /> },
                    { mode: "cavity", label: "Dental Analysis", desc: "Dental radiograph", icon: <Microscope size={19} /> },
                    { mode: "ct_scan", label: "Kidney Stone CT", desc: "Abdominal CT slice", icon: <ScanLine size={19} /> },
                    { mode: "report", label: "Blood Report", desc: "Laboratory document", icon: <FileText size={19} /> }
                  ].map(({ mode, label, desc, icon }) => (
                    <button
                      type="button"
                      key={mode}
                      className={`ms-modality-card ${dashboardAnalysisMode === mode ? "active" : ""}`}
                      onClick={() => { setDashboardAnalysisMode(mode); setDashboardUploadError(""); setDashboardResult(null); }}
                    >
                      <span>{icon}</span>
                      <strong>{label}</strong>
                      <small>{desc}</small>
                    </button>
                  ))}
                </div>

                {/* Upload Area */}
                <form onSubmit={handleDashboardUpload} className="ms-upload-card">
                  <div
                    className={`ms-upload-zone ${dashboardUploadFile ? "has-file" : ""}`}
                    onClick={() => dashboardFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files && e.dataTransfer.files[0];
                      if (file) { setDashboardUploadFile(file); setDashboardUploadError(""); }
                    }}
                  >
                    {dashboardUploadFile ? (
                      <div className="ms-upload-selected">
                        <span className="ms-upload-file-icon"><FileImage size={30} /></span>
                        <div>
                          <strong>{dashboardUploadFile.name}</strong>
                          <small>{(dashboardUploadFile.size / 1024).toFixed(1)} KB · ready to analyze</small>
                        </div>
                        <div className="ms-upload-file-actions">
                          <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={(e) => { e.stopPropagation(); dashboardFileRef.current?.click(); }}>
                            Replace
                          </button>
                          <button type="button" className="ms-btn-danger-ghost ms-btn-sm" onClick={(e) => { e.stopPropagation(); setDashboardUploadFile(null); setDashboardUploadError(""); }}>
                            <X size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ms-upload-prompt">
                        <span className="ms-upload-orb"><Upload size={28} /></span>
                        <strong>Drop your {dashboardAnalysisMode === "report" ? "laboratory report" : "medical image"} here</strong>
                        <p>or click to browse your files</p>
                        <small>
                          {dashboardAnalysisMode === "report"
                            ? "PDF, PNG, JPG or JPEG · the existing backend validates the document"
                            : "PNG, JPG or JPEG · use a clear image of the correct modality"}
                        </small>
                      </div>
                    )}
                  </div>
                  <input
                    ref={dashboardFileRef}
                    type="file"
                    accept={dashboardAnalysisMode === "report" ? ".pdf,.png,.jpg,.jpeg" : ".png,.jpg,.jpeg"}
                    style={{ display: "none" }}
                    onChange={e => { setDashboardUploadFile(e.target.files[0] || null); setDashboardUploadError(""); }}
                  />

                  {dashboardUploadError && (
                    <div className="ms-upload-error">
                      <AlertTriangle size={16} /> {dashboardUploadError}
                    </div>
                  )}

                  <div className="ms-upload-footer">
                    <span className="ms-upload-hint">
                      <ShieldCheck size={14} /> Files are processed by the existing analysis API and linked to your account.
                    </span>
                    <button type="submit" className="ms-btn-primary" disabled={!dashboardUploadFile || dashboardUploading}>
                      {dashboardUploading ? (
                        <><span className="ms-spinner ms-spinner-light" /> Running AI analysis…</>
                      ) : (
                        <><Zap size={17} /> Analyze Document</>
                      )}
                    </button>
                  </div>
                </form>

                {/* What this module uses */}
                <div className="ms-analysis-info-grid">
                  {[
                    { label: "Chest X-Ray", info: "DenseNet-121 chest classifier with Grad-CAM heatmap generation where available.", color: "#3b82f6" },
                    { label: "Dental Analysis", info: "EfficientNet-B0 dental cavity engine with visual attention output where available.", color: "#10b981" },
                    { label: "Kidney Stone CT", info: "MobileNetV2 CT engine for supported axial kidney stone evaluation.", color: "#f59e0b" },
                    { label: "Blood Report", info: "EasyOCR extraction with biomarker reference-range comparison and abnormal highlighting.", color: "#8b5cf6" }
                  ].map(({ label, info, color }) => (
                    <div key={label} className="ms-analysis-info" style={{ borderLeftColor: color }}>
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

        {/* HEALTH HISTORY */}
        {activeTab === "health-history" && (
          <div className="ms-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> PERSONAL DIAGNOSTIC ARCHIVE</span>
                <h1>Health History</h1>
                <p>All analyses stored under your account, with search, filters and result actions.</p>
              </div>
              <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => openAnalysis("xray")}>
                <Plus size={16} /> Start New Analysis
              </button>
            </header>

            <div className="ms-filter-bar">
              <label className="ms-search-field">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search by file name or result…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </label>
              <select value={historyTypeFilter} onChange={(e) => setHistoryTypeFilter(e.target.value)} aria-label="Filter by analysis type">
                <option value="All">All types</option>
                <option value="xray">Chest X-Ray</option>
                <option value="dental">Dental</option>
                <option value="ct">Kidney CT</option>
                <option value="report">Blood Reports</option>
              </select>
              <select value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)} aria-label="Filter by date">
                <option value="All">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="year">This year</option>
              </select>
              <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)} aria-label="Filter by status">
                <option value="All">All statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending result">Pending result</option>
              </select>
              {(historySearch || historyTypeFilter !== "All" || historyDateFilter !== "All" || historyStatusFilter !== "All") && (
                <button type="button" className="ms-text-btn" onClick={() => { setHistorySearch(""); setHistoryTypeFilter("All"); setHistoryDateFilter("All"); setHistoryStatusFilter("All"); }}>
                  Clear filters
                </button>
              )}
            </div>

            {loadingMyHistory ? (
              <div className="ms-page-loading"><span className="ms-spinner" /><span>Loading your medical records…</span></div>
            ) : myAnalysisHistory.length === 0 ? (
              <div className="ms-empty-state">
                <span className="ms-empty-icon"><History size={32} /></span>
                <h2>You haven't performed any medical analyses yet.</h2>
                <p>Upload your first medical scan to get started.</p>
                <button type="button" className="ms-btn-primary" onClick={() => openAnalysis("xray")}>
                  <Upload size={16} /> Start New Analysis
                </button>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="ms-empty-state ms-empty-small">
                <Search size={28} />
                <h2>No records match your filters</h2>
                <p>Try a different search term, analysis type or date range.</p>
              </div>
            ) : (
              <div className="ms-history-timeline">
                {filteredHistory.map((row, index) => (
                  <article className="ms-history-card" key={row.analysisId || index}>
                    <div className="ms-history-card-top">
                      <span className={`ms-type-badge ${isReportRecord(row) ? "report" : "scan"}`}>
                        {row.fileType || row.analysisType || "Medical Scan"}
                      </span>
                      <span className={`ms-status-pill ${recordStatus(row) === "Completed" ? "done" : "pending"}`}>{recordStatus(row)}</span>
                      <span className="ms-history-date"><Clock size={13} /> {row.date ? new Date(row.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Date unavailable"}</span>
                    </div>
                    <div className="ms-history-card-main">
                      <div>
                        <h3>{row.fileName || "Medical document"}</h3>
                        <p><strong>{row.prediction || row.result || "Analysis completed"}</strong>{row.confidence ? ` · ${row.confidence}% confidence` : ""}</p>
                        {row.reportSummary && <p className="ms-history-summary">{row.reportSummary}</p>}
                      </div>
                      <div className="ms-history-actions">
                        <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => openAnalysisResult(row)}>
                          <Eye size={15} /> View Result
                        </button>
                        <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => downloadStoredFile(row)}>
                          <Download size={15} /> Download
                        </button>
                        {row.analysisId && (
                          <button type="button" className="ms-btn-danger-ghost ms-btn-sm" onClick={() => handleDeleteAnalysis(row.analysisId)}>
                            <X size={14} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEDICAL RECORDS */}
        {activeTab === "medical-records" && (
          <div className="ms-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> PERSONAL DOCUMENT FOLDER</span>
                <h1>My Medical Records</h1>
                <p>Original uploads and AI-generated analysis reports, organized in one document workspace.</p>
              </div>
              <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => openAnalysis("report")}>
                <Plus size={16} /> Add a document
              </button>
            </header>

            <div className="ms-records-summary">
              <div><span>Original documents</span><strong>{myAnalysisHistory.filter((row) => row.filePath).length}</strong></div>
              <div><span>AI analysis reports</span><strong>{myAnalysisHistory.filter((row) => row.prediction || row.reportSummary || row.reportFindings).length}</strong></div>
              <div><span>Laboratory records</span><strong>{savedMedicalReports.length}</strong></div>
            </div>

            <div className="ms-filter-bar">
              <label className="ms-search-field">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search documents and reports…"
                  value={recordsSearch}
                  onChange={(e) => setRecordsSearch(e.target.value)}
                />
              </label>
              <select value={recordsTypeFilter} onChange={(e) => setRecordsTypeFilter(e.target.value)} aria-label="Filter by document type">
                <option value="All">All document types</option>
                <option value="originals">Original uploads</option>
                <option value="reports">AI analysis reports</option>
                <option value="lab">Laboratory records</option>
              </select>
              <select value={recordsSort} onChange={(e) => setRecordsSort(e.target.value)} aria-label="Sort records">
                <option value="Newest">Newest first</option>
                <option value="Oldest">Oldest first</option>
              </select>
            </div>

            {loadingMyHistory ? (
              <div className="ms-page-loading"><span className="ms-spinner" /><span>Loading your medical records…</span></div>
            ) : myAnalysisHistory.length === 0 ? (
              <div className="ms-empty-state">
                <span className="ms-empty-icon"><FolderOpen size={32} /></span>
                <h2>No medical reports have been saved yet.</h2>
                <p>Upload a scan or laboratory document to create your first record.</p>
                <button type="button" className="ms-btn-primary" onClick={() => openAnalysis("xray")}>
                  <Upload size={16} /> Upload a document
                </button>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="ms-empty-state ms-empty-small">
                <Search size={28} />
                <h2>No documents match your search</h2>
                <p>Try another keyword or document type.</p>
              </div>
            ) : (
              <div className="ms-records-grid">
                {filteredRecords.map((item) => (
                  <article className="ms-record-card" key={item.recordKey}>
                    <div className={`ms-record-kind ${item.recordKind === "report" ? "report" : "original"}`}>
                      {item.recordKind === "report" ? <FileText size={14} /> : <FileImage size={14} />}
                      {item.recordKind === "report" ? "AI analysis report" : "Original upload"}
                    </div>
                    <span className="ms-record-card-icon">
                      {isReportRecord(item) ? <FileText size={24} /> : item.recordKind === "report" ? <Activity size={24} /> : <FileImage size={24} />}
                    </span>
                    <h3>{item.recordTitle}</h3>
                    <p className="ms-record-meta">
                      {item.fileType || item.analysisType || "Medical document"} · {item.date ? new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Date unavailable"}
                    </p>
                    <p className="ms-record-finding">
                      {item.recordKind === "report"
                        ? (item.prediction || item.reportSummary || "AI analysis completed")
                        : (item.filePath ? "Stored original document" : "Original file path unavailable")}
                    </p>
                    <div className="ms-record-actions">
                      <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => setRecordPreview(item)}>
                        <Eye size={14} /> Preview
                      </button>
                      {item.recordKind === "report" ? (
                        <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => openAnalysisResult(item)}>
                          View analysis <ArrowRight size={14} />
                        </button>
                      ) : (
                        <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => downloadStoredFile(item)}>
                          <Download size={14} /> Download
                        </button>
                      )}
                      {item.analysisId && (
                        <button
                          type="button"
                          className="ms-btn-danger-ghost ms-btn-sm"
                          onClick={() => handleDeleteAnalysis(item.analysisId)}
                          title="Delete this record and its linked analysis"
                        >
                          <X size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {recordPreview && (
              <div className="ms-modal-backdrop" onClick={() => setRecordPreview(null)}>
                <div className="ms-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                  <div className="ms-modal-head">
                    <div>
                      <span className={`ms-record-kind ${recordPreview.recordKind === "report" ? "report" : "original"}`}>
                        {recordPreview.recordKind === "report" ? "AI analysis report" : "Original upload"}
                      </span>
                      <h3>{recordPreview.recordTitle}</h3>
                    </div>
                    <button type="button" className="ms-modal-close" onClick={() => setRecordPreview(null)} aria-label="Close preview"><X size={17} /></button>
                  </div>

                  {recordPreview.recordKind === "original" && recordPreview.filePath && /\.(png|jpe?g|gif|webp)$/i.test(recordPreview.filePath) ? (
                    <div className="ms-preview-image">
                      <img src={storedFileUrl(recordPreview)} alt={recordPreview.recordTitle} />
                    </div>
                  ) : null}

                  <div className="ms-preview-meta">
                    <div><span>Document type</span><strong>{recordPreview.fileType || recordPreview.analysisType || "Medical document"}</strong></div>
                    <div><span>Date</span><strong>{recordPreview.date ? new Date(recordPreview.date).toLocaleString() : "Unavailable"}</strong></div>
                    {recordPreview.confidence ? <div><span>AI confidence</span><strong>{recordPreview.confidence}%</strong></div> : null}
                  </div>

                  {recordPreview.prediction && (
                    <div className="ms-preview-block"><span>AI result</span><p>{recordPreview.prediction}</p></div>
                  )}
                  {recordPreview.reportSummary && (
                    <div className="ms-preview-block"><span>Report summary</span><p>{recordPreview.reportSummary}</p></div>
                  )}

                  {Array.isArray(recordPreview.reportFindings) && recordPreview.reportFindings.length > 0 && (
                    <div className="ms-preview-findings">
                      <span>Extracted biomarkers</span>
                      <div className="ms-table-scroll">
                        <table>
                          <thead><tr><th>Test</th><th>Value</th><th>Reference</th><th>Status</th></tr></thead>
                          <tbody>
                            {recordPreview.reportFindings.map((finding, index) => (
                              <tr key={index}>
                                <td>{finding.test_name || finding.name || "—"}</td>
                                <td>{finding.value || "—"}</td>
                                <td>{finding.reference_text || finding.reference || "—"}</td>
                                <td>{finding.status || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="ms-modal-actions">
                    {recordPreview.recordKind === "report" ? (
                      <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => { setRecordPreview(null); openAnalysisResult(recordPreview); }}>
                        Open full analysis <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => downloadStoredFile(recordPreview)}>
                        <Download size={14} /> Download original
                      </button>
                    )}
                    <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => setRecordPreview(null)}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PORTAL LOGIC */}
        {activeTab === "portal-logic" && (
          <div className="ms-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> SECURE ACCESS GATEWAY</span>
                <h1>Portal Logic</h1>
                <p>The authenticated portal gateway, session state and protected workspace access.</p>
              </div>
              <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => goToTab("dashboard")}>
                <LayoutDashboard size={15} /> Dashboard
              </button>
            </header>

            <div className="ms-portal-grid">
              <section className="ms-portal-card ms-portal-session">
                <div className="ms-portal-card-head">
                  <span className="ms-portal-icon"><ShieldCheck size={24} /></span>
                  <div>
                    <h2>Session active</h2>
                    <p>You are viewing this workspace through an authenticated account session.</p>
                  </div>
                </div>
                <div className="ms-portal-detail-list">
                  <div><span>Account name</span><strong>{doctorName || "User"}</strong></div>
                  <div><span>Sign-in identifier</span><strong>{myUsername || "—"}</strong></div>
                  <div><span>Session storage</span><strong>{localStorage.getItem("doctor_token") ? "Remembered on this device" : "This browser session only"}</strong></div>
                  <div><span>Associated patient record</span><strong>{myPatient?.patientId || myPatientId || "Provisioned with your account"}</strong></div>
                </div>
                <div className="ms-portal-actions">
                  <button type="button" className="ms-btn-primary ms-btn-sm" onClick={() => goToTab("profile")}>
                    <UserCircle size={15} /> Review profile
                  </button>
                  <button type="button" className="ms-btn-danger-ghost ms-btn-sm" onClick={handleLogout}>
                    <LogOut size={15} /> Sign out to portal gateway
                  </button>
                </div>
              </section>

              <section className="ms-portal-card">
                <h2>What the portal controls</h2>
                <ul className="ms-check-list">
                  <li><Check size={14} /> The public marketing site is available without an account.</li>
                  <li><Check size={14} /> Dashboard, health history, medical records and profile require a session.</li>
                  <li><Check size={14} /> Uploads performed while signed in are associated with your account record.</li>
                  <li><Check size={14} /> Logging out returns you to the public landing page and clears the local session.</li>
                </ul>
              </section>

              <section className="ms-portal-card">
                <h2>Access flow</h2>
                <div className="ms-portal-flow">
                  <span>Public website</span>
                  <ChevronRight size={16} />
                  <span>Login / Register</span>
                  <ChevronRight size={16} />
                  <span className="active">Personal workspace</span>
                </div>
                <p className="ms-portal-note">
                  This page does not re-implement authentication. It reports the state of the
                  existing sign-in flow and provides the same Logout handler used elsewhere in
                  the application.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ABOUT MEDISCAN AI (AUTHENTICATED) */}
        {activeTab === "about" && (
          <div className="ms-app-page ms-about-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> PLATFORM &amp; TECHNOLOGY</span>
                <h1>About MediScan AI</h1>
                <p>The platform mission, diagnostic modules, architecture and responsible AI boundaries.</p>
              </div>
              <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => goToTab("support")}>
                <HelpCircle size={15} /> Help &amp; Support
              </button>
            </header>
            <AboutContent compact />
          </div>
        )}

        {/* HELP & SUPPORT (AUTHENTICATED) */}
        {activeTab === "support" && (
          <div className="ms-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> HELP CENTRE</span>
                <h1>Help &amp; Support</h1>
                <p>Account, upload, result, download and medical disclaimer guidance.</p>
              </div>
            </header>
            <SupportContent embedded />
          </div>
        )}

        {/* 8. MY PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="ms-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> PERSONAL ACCOUNT</span>
                <h1>My Profile</h1>
                <p>Review and update the real details associated with your healthcare workspace.</p>
              </div>
            </header>

            <div className="ms-profile-layout">
              <aside className="ms-profile-summary">
                <span className="ms-profile-avatar">{(doctorName || "U").charAt(0).toUpperCase()}</span>
                <h2>{doctorName || "User"}</h2>
                <p>{myUsername || "Signed-in account"}</p>
                <span className="ms-profile-badge"><ShieldCheck size={13} /> Personal healthcare user</span>
                <div className="ms-profile-stats">
                  <div><strong>{myAnalysisHistory.length}</strong><span>Total analyses</span></div>
                  <div><strong>{savedMedicalReports.length}</strong><span>Lab reports</span></div>
                  <div><strong>{myAnalysisHistory.filter((row) => !isReportRecord(row)).length}</strong><span>Imaging scans</span></div>
                </div>
                <div className="ms-profile-meta">
                  <span><User size={14} /> Patient record: {myPatient?.patientId || myPatientId || "Not loaded"}</span>
                  <span><Mail size={14} /> {myUsername}</span>
                </div>
              </aside>

              <section className="ms-profile-form-card">
                <div className="ms-card-heading">
                  <div><h2>Account details</h2><p>Name, contact, age and gender are saved through the existing patient record endpoint.</p></div>
                  {profileSaved && <span className="ms-save-note"><CheckCircle2 size={14} /> {profileSaved}</span>}
                </div>
                <form onSubmit={handleProfileSave} className="ms-profile-form">
                  <label className="ms-field">
                    <span>Full name</span>
                    <div className="ms-field-control">
                      <User size={16} />
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => { setProfileForm({ ...profileForm, name: e.target.value }); setProfileSaved(""); }}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </label>

                  <label className="ms-field">
                    <span>Email address (sign-in identifier)</span>
                    <div className="ms-field-control ms-field-readonly">
                      <Mail size={16} />
                      <input type="email" value={myUsername} readOnly />
                    </div>
                    <small className="ms-field-note">Email changes are handled by the existing authentication system and are not editable here.</small>
                  </label>

                  <div className="ms-form-row">
                    <label className="ms-field">
                      <span>Phone / contact</span>
                      <div className="ms-field-control">
                        <Phone size={16} />
                        <input
                          type="tel"
                          value={profileForm.contact}
                          onChange={(e) => { setProfileForm({ ...profileForm, contact: e.target.value }); setProfileSaved(""); }}
                          placeholder="Optional contact number"
                        />
                      </div>
                    </label>
                    <label className="ms-field">
                      <span>Age</span>
                      <div className="ms-field-control">
                        <Calendar size={16} />
                        <input
                          type="number"
                          min="0"
                          value={profileForm.age}
                          onChange={(e) => { setProfileForm({ ...profileForm, age: e.target.value }); setProfileSaved(""); }}
                          placeholder="Age"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="ms-field">
                    <span>Gender</span>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => { setProfileForm({ ...profileForm, gender: e.target.value }); setProfileSaved(""); }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <div className="ms-form-actions">
                    <button type="submit" className="ms-btn-primary" disabled={profileSaving}>
                      {profileSaving ? <><span className="ms-spinner ms-spinner-light" /> Saving…</> : <><Check size={16} /> Save changes</>}
                    </button>
                    <button
                      type="button"
                      className="ms-btn-secondary"
                      onClick={() => {
                        const mine = myPatient || {};
                        setProfileForm({
                          name: mine.name || doctorName || "",
                          age: mine.age !== undefined && mine.age !== null ? String(mine.age) : "",
                          gender: mine.gender || "Other",
                          contact: mine.contact || ""
                        });
                        setProfileSaved("");
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

        {/* 9. SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="ms-app-page">
            <header className="ms-page-header">
              <div>
                <span className="ms-dash-eyebrow"><span className="ms-status-dot" /> ACCOUNT &amp; PRIVACY</span>
                <h1>Settings</h1>
                <p>Only options supported by the current application are shown here.</p>
              </div>
            </header>

            <div className="ms-settings-grid">
              <section className="ms-settings-card">
                <div className="ms-card-heading">
                  <div><h2><UserCircle size={18} /> Account</h2><p>Your sign-in and profile details.</p></div>
                </div>
                <div className="ms-settings-list">
                  <div><span>Display name</span><strong>{doctorName || "User"}</strong></div>
                  <div><span>Email / sign-in identifier</span><strong>{myUsername || "—"}</strong></div>
                  <div><span>Associated patient record</span><strong>{myPatient?.patientId || myPatientId || "Provisioned"}</strong></div>
                </div>
                <div className="ms-settings-actions">
                  <button type="button" className="ms-btn-secondary ms-btn-sm" onClick={() => goToTab("profile")}>
                    <User size={15} /> Update account details
                  </button>
                  <button type="button" className="ms-btn-danger-ghost ms-btn-sm" onClick={handleLogout}>
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              </section>

              <section className="ms-settings-card">
                <div className="ms-card-heading">
                  <div><h2><Shield size={18} /> Privacy &amp; medical data</h2><p>How records are separated and accessed.</p></div>
                </div>
                <ul className="ms-check-list">
                  <li><Check size={14} /> Dashboard, history and records only load data returned for your account.</li>
                  <li><Check size={14} /> Uploaded files and analyses are stored in the existing patient and analysis records.</li>
                  <li><Check size={14} /> Logging out clears the local session token from this browser.</li>
                  <li><Check size={14} /> This interface does not claim encryption or compliance certifications that are not implemented.</li>
                </ul>
                <p className="ms-settings-note">
                  Account deletion and password reset endpoints are not available in the current
                  backend. Contact the project administrator for those requests.
                </p>
              </section>

              <section className="ms-settings-card">
                <div className="ms-card-heading">
                  <div><h2><Key size={18} /> Session security</h2><p>Current session information.</p></div>
                </div>
                <div className="ms-settings-list">
                  <div><span>Session state</span><strong className="ms-status-text"><span className="ms-status-dot" /> Authenticated</strong></div>
                  <div><span>Storage</span><strong>{localStorage.getItem("doctor_token") ? "Remembered on this device" : "Browser session only"}</strong></div>
                  <div><span>Authentication method</span><strong>Existing account login</strong></div>
                </div>
                <p className="ms-settings-note">
                  Password changes are not exposed by the current backend. Use the portal
                  administrator if you need credentials reset.
                </p>
              </section>

              <section className="ms-settings-card">
                <div className="ms-card-heading">
                  <div><h2><Bell size={18} /> Preferences</h2><p>Available preferences in this build.</p></div>
                </div>
                <p className="ms-settings-note">
                  Notification and theme preferences are not stored by the current backend, so no
                  non-functional toggles are shown here. The interface uses the existing dark
                  navy and teal design throughout.
                </p>
              </section>
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