import React, { useState } from "react";
import {
  Activity,
  Brain,
  ShieldAlert,
  FileText,
  History,
  AlertTriangle,
  CheckCircle,
  Info,
  Printer,
  Copy,
  Download,
  ChevronRight,
  ChevronLeft,
  Eye,
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";

/**
 * Standard medical fallback post-analysis generator for frontend
 * to ensure robust rendering even for previously cached/legacy analyses.
 */
export function ensurePostAnalysis(analysis, modalityHint = "Chest X-Ray") {
  if (!analysis) return null;
  if (analysis.post_analysis) return analysis.post_analysis;

  const pred = analysis.prediction || "Normal";
  const conf = typeof analysis.confidence === "number" ? analysis.confidence : parseFloat(analysis.confidence || "0") || 0;
  const modality = analysis.modality || analysis.analysisType || analysis.fileType || modalityHint;
  const modLower = modality.toLowerCase();

  let explanation = "";
  let severity = "Moderate";
  let severity_color = "#F59E0B";
  let severity_description = "Clinical finding requiring correlation with patient history.";
  let recommendations = [];

  const disclaimer = (
    "⚠️ MEDICAL DISCLAIMER: This is an AI-assisted diagnostic evaluation generated for informational " +
    "and clinical decision-support purposes only. It is NOT a final medical diagnosis. Please consult a licensed " +
    "physician or specialist for clinical examination and formal treatment planning."
  );

  if (modLower.includes("dental") || modLower.includes("cavity")) {
    const isCavity = pred.toLowerCase().includes("cavity") || pred.toLowerCase().includes("caries");
    severity = isCavity ? (conf > 75 ? "High" : "Moderate") : "Low";
    severity_color = severity === "High" ? "#EF4444" : (severity === "Moderate" ? "#F59E0B" : "#10B981");
    explanation = isCavity
      ? "Dental radiographic assessment reveals focal radiolucency and mineral loss within enamel/dentin, indicating active dental caries (tooth decay)."
      : "Dental radiographic inspection shows intact enamel margins, uniform dentin density, and sound periodontal bone support with no active cavitation.";
    severity_description = isCavity
      ? "Active dental caries detected. Timely restoration recommended to prevent pulp involvement."
      : "Healthy dentition with no active caries detected.";
    recommendations = isCavity ? [
      "Schedule a dental appointment for bitewing confirmation and clinical evaluation.",
      "Undergo restorative composite filling, ceramic inlay, or fluoride sealing as appropriate.",
      "Brush twice daily with fluoridated toothpaste and floss daily between teeth.",
      "Reduce frequent consumption of sugary and acidic foods or beverages."
    ] : [
      "Continue brushing twice daily with fluoride toothpaste for 2 minutes.",
      "Practice daily interdental flossing to maintain plaque-free proximal surfaces.",
      "Schedule routine 6-month dental check-ups and professional prophylaxis.",
      "Maintain a balanced diet rich in calcium and enamel-protecting minerals."
    ];
  } else if (modLower.includes("mri") || modLower.includes("brain")) {
    const isTumor = !pred.toLowerCase().includes("normal") && !pred.toLowerCase().includes("no tumor");
    if (pred.toLowerCase().includes("glioma")) {
      severity = "High";
      severity_color = "#EF4444";
      explanation = "Brain MRI demonstrates hyperintense/hypointense tissue alteration within brain parenchyma consistent with an intra-axial glial neoplasm (glioma).";
      severity_description = "Intra-axial brain tumor finding requiring urgent neurosurgical evaluation.";
      recommendations = [
        "Urgent neurosurgical and neuro-oncology multidisciplinary case review.",
        "Obtain multi-parametric contrast-enhanced MRI (T1+C, T2/FLAIR, DWI, Perfusion) for surgical planning.",
        "Evaluate need for medical management of peritumoral edema or seizure prophylaxis.",
        "Seek emergency care if acute headache, focal deficit, or altered consciousness occurs."
      ];
    } else if (pred.toLowerCase().includes("meningioma")) {
      severity = conf > 80 ? "High" : "Moderate";
      severity_color = severity === "High" ? "#EF4444" : "#F59E0B";
      explanation = "Brain MRI reveals a well-circumscribed, extra-axial dural-based mass lesion characteristic of meningioma causing localized cortical compression.";
      severity_description = "Extra-axial dural mass lesion requiring specialist consultation to determine surveillance or surgical resection.";
      recommendations = [
        "Consult a neurosurgeon for precise tumor volumetric analysis and mass effect staging.",
        "Schedule serial contrast MRI imaging to assess growth kinetics and vascular relations.",
        "Report any emerging neurological symptoms such as headaches, visual changes, or motor weakness."
      ];
    } else if (pred.toLowerCase().includes("pituitary")) {
      severity = "Moderate";
      severity_color = "#F59E0B";
      explanation = "Brain MRI exhibits tissue expansion within the sella turcica / pituitary fossa region, consistent with a pituitary adenoma.";
      severity_description = "Sellar neoplasm requiring comprehensive endocrine profiling and visual pathway evaluation.";
      recommendations = [
        "Consult an endocrinologist and neurosurgeon for dedicated pituitary protocol MRI.",
        "Perform baseline pituitary hormone blood tests (Prolactin, ACTH, GH, IGF-1, TSH, Cortisol).",
        "Undergo formal automated visual field testing with an ophthalmologist."
      ];
    } else {
      severity = "Low";
      severity_color = "#10B981";
      explanation = "Brain MRI demonstrates symmetric cerebral hemispheres, normal ventricular dimensions, and no focal intracranial mass lesions.";
      severity_description = "Normal brain MRI scan with no radiographic evidence of tumor.";
      recommendations = [
        "Continue routine neurological health maintenance.",
        "Review findings with your attending physician in context of any presenting symptoms.",
        "Maintain regular sleep patterns, cardiovascular fitness, and stress management."
      ];
    }
  } else if (modLower.includes("ct") || modLower.includes("kidney") || modLower.includes("stone")) {
    const isStone = pred.toLowerCase().includes("stone") || pred.toLowerCase().includes("calculi");
    severity = isStone ? (conf > 80 ? "High" : "Moderate") : "Low";
    severity_color = severity === "High" ? "#EF4444" : (severity === "Moderate" ? "#F59E0B" : "#10B981");
    explanation = isStone
      ? "CT scan cross-section demonstrates high-attenuation radiopaque calcifications within renal parenchyma or collecting system, confirming kidney stone (nephrolithiasis)."
      : "CT scan exhibits clear renal parenchyma and non-dilated collecting system with no radiographic evidence of obstructive kidney stones.";
    severity_description = isStone
      ? "Renal calculi detected. Requires urological sizing to assess passage potential and obstruction risk."
      : "Normal renal CT appearance without evidence of calculi or hydronephrosis.";
    recommendations = isStone ? [
      "Consult a urologist for non-contrast helical CT stone sizing (mm) and intervention planning (medical expulsive therapy, ESWL, or ureteroscopy).",
      "Increase daily fluid intake to 2.5–3.0 liters of water daily to promote urine dilution unless medically contraindicated.",
      "Collect any passed stone fragments for laboratory chemical composition analysis.",
      "Seek emergency medical attention if severe intractable flank pain, persistent vomiting, high fever, or blood in urine occurs."
    ] : [
      "Maintain consistent daily hydration (aim for pale/clear urine output).",
      "Adopt a balanced diet with moderate sodium, adequate calcium, and controlled animal protein.",
      "Consult a physician if urinary discomfort or recurrent flank symptoms develop."
    ];
  } else {
    // Chest X-Ray
    const isNormal = pred.toLowerCase().includes("normal");
    const isHighRisk = ["pneumonia", "tuberculosis", "covid", "cardiomegaly", "pneumothorax", "mass", "edema"].some(k => pred.toLowerCase().includes(k));
    severity = isNormal ? "Low" : (isHighRisk ? (conf > 40 ? "High" : "Moderate") : "Moderate");
    severity_color = severity === "High" ? "#EF4444" : (severity === "Moderate" ? "#F59E0B" : "#10B981");
    explanation = isNormal
      ? "The chest radiograph displays clear bilateral lung fields, sharp costophrenic angles, and a normal cardiothoracic ratio with no acute thoracic pathology."
      : `Chest radiograph displays radiographic patterns consistent with ${pred}, requiring clinical correlation and auscultation.`;
    severity_description = isNormal
      ? "Normal chest radiograph with clear pulmonary fields."
      : `Active radiological finding of ${pred} identified.`;
    recommendations = isNormal ? [
      "Maintain routine preventive health checkups and vaccinations.",
      "Engage in regular cardiovascular and pulmonary aerobic exercise.",
      "Avoid tobacco smoke and respiratory pollutants.",
      "Consult a doctor if respiratory symptoms such as cough or chest pain occur."
    ] : [
      "Consult a physician or pulmonologist for clinical correlation and auscultation.",
      "Monitor resting oxygen saturation (SpO2) and body temperature regularly.",
      "Follow prescribed medical and antimicrobial regimens diligently.",
      "Seek immediate emergency medical attention if severe shortness of breath or high fever develops."
    ];
  }

  const reportId = analysis.report_id || `MED-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const timestamp = analysis.date || analysis.createdAt || new Date().toLocaleString();

  return {
    modality,
    prediction: pred,
    confidence: Math.round(conf * 10) / 10,
    explanation,
    severity,
    severity_color,
    severity_description,
    recommendations,
    disclaimer,
    report: {
      report_id: reportId,
      generated_at: timestamp,
      modality,
      primary_prediction: pred,
      confidence_percentage: Math.round(conf * 10) / 10,
      severity_level: severity,
      severity_description,
      medical_explanation: explanation,
      clinical_recommendations: recommendations,
      disclaimer,
      scan_quality: analysis.scan_quality || "Diagnostic Grade",
      original_image_url: analysis.filePath || analysis.original_image,
      gradcam_image_url: analysis.gradcamPath || analysis.gradcam_image || analysis.heatmap,
      patient_name: analysis.patientName || "Public / Anonymous",
      patient_id: analysis.patientId || "N/A"
    },
    report_id: reportId,
    generated_at: timestamp
  };
}

export default function PostAnalysisWorkflow({
  result,
  modality = "Chest X-Ray",
  apiBase = "http://localhost:5000",
  historyList = [],
  onSelectHistory = null,
  onClearHistory = null,
  onDeleteHistoryItem = null,
  isPatientMode = false,
  patientData = null,
  onBackToUpload = null
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [viewMode, setViewMode] = useState("stepped"); // 'stepped' or 'all'
  const [copied, setCopied] = useState(false);
  const [selectedScanView, setSelectedScanView] = useState("split"); // 'split', 'original', 'heatmap'

  const postData = ensurePostAnalysis(result, modality);
  if (!postData) {
    return (
      <div className="post-analysis-empty">
        <Activity size={36} color="var(--primary)" />
        <p>No analysis result available. Upload a diagnostic scan to start.</p>
      </div>
    );
  }

  const steps = [
    { id: 1, name: "Prediction", icon: Activity, desc: "AI Finding & Confidence" },
    { id: 2, name: "Explanation", icon: Brain, desc: "Simple Medical Breakdown" },
    { id: 3, name: "Severity / Risk", icon: ShieldAlert, desc: "Risk Level & Urgency" },
    { id: 4, name: "Recommendations", icon: CheckCircle, desc: "Clinical Next Steps" },
    { id: 5, name: "Medical Report", icon: FileText, desc: "Structured Clinical Report" },
    { id: 6, name: "History", icon: History, desc: "Audit Trail & Timeline" }
  ];

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${apiBase}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const originalImg = getFullImageUrl(result.filePath || result.original_image || result.report?.original_image_url);
  const gradcamImg = getFullImageUrl(result.gradcamPath || result.gradcam_image || result.heatmap || result.report?.gradcam_image_url);

  const handleCopyReport = () => {
    const reportText = `
MEDISCAN AI — STRUCTURED MEDICAL ANALYSIS REPORT
==================================================
Report ID: ${postData.report_id}
Date/Time: ${postData.generated_at}
Modality: ${postData.modality}
Patient: ${patientData ? `${patientData.name} (${patientData.patientId})` : "Public Anonymous Patient"}

1. PREDICTION & DIAGNOSIS
--------------------------------------------------
Primary Finding: ${postData.prediction}
Confidence: ${postData.confidence}%
Severity / Risk Level: ${postData.severity}

2. CLINICAL EXPLANATION
--------------------------------------------------
${postData.explanation}

3. SEVERITY & RISK ASSESSMENT
--------------------------------------------------
Severity: ${postData.severity}
Rationale: ${postData.severity_description}

4. CLINICAL RECOMMENDATIONS & NEXT STEPS
--------------------------------------------------
${postData.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

DISCLAIMER:
${postData.disclaimer}
==================================================
`;
    navigator.clipboard.writeText(reportText.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediscan_report_${postData.report_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const severityBadgeBg = postData.severity === "High"
    ? "rgba(239, 68, 68, 0.15)"
    : postData.severity === "Moderate"
    ? "rgba(245, 158, 11, 0.15)"
    : "rgba(16, 185, 129, 0.15)";

  const severityBorder = postData.severity === "High"
    ? "rgba(239, 68, 68, 0.35)"
    : postData.severity === "Moderate"
    ? "rgba(245, 158, 11, 0.35)"
    : "rgba(16, 185, 129, 0.35)";

  return (
    <div className="post-analysis-container">
      {/* 1. Header with Modality and Step Progress */}
      <div className="post-analysis-header">
        <div className="header-left">
          <div className="modality-pill">
            <Sparkles size={14} />
            <span>{postData.modality} Post-Analysis</span>
          </div>
          <h2 className="header-title">Diagnostic Assessment Flow</h2>
        </div>

        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "stepped" ? "active" : ""}`}
              onClick={() => setViewMode("stepped")}
            >
              Step View
            </button>
            <button
              className={`toggle-btn ${viewMode === "all" ? "active" : ""}`}
              onClick={() => setViewMode("all")}
            >
              Full Report View
            </button>
          </div>
          {onBackToUpload && (
            <button className="back-btn" onClick={onBackToUpload}>
              New Scan
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Step-by-Step Flow Bar */}
      <div className="flow-stepper-bar">
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              className={`flow-step-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              onClick={() => {
                setCurrentStep(step.id);
                if (viewMode === "all") setViewMode("stepped");
              }}
            >
              <div className="step-circle">
                {isCompleted ? <CheckCircle size={14} /> : <StepIcon size={14} />}
              </div>
              <div className="step-text">
                <span className="step-num">Step {step.id}</span>
                <span className="step-label">{step.name}</span>
              </div>
              {step.id < steps.length && <div className="step-connector" />}
            </button>
          );
        })}
      </div>

      {/* 3. Main Post-Analysis Content Workspace */}
      <div className="post-analysis-content">
        {/* STEP 1: PREDICTION */}
        {(viewMode === "all" || currentStep === 1) && (
          <div className="analysis-step-card step-prediction">
            <div className="card-top-bar">
              <div className="step-badge">
                <Activity size={16} />
                <span>Step 1: Prediction & AI Detection</span>
              </div>
              <span className="timestamp-badge">{postData.generated_at}</span>
            </div>

            <div className="prediction-grid">
              <div className="prediction-metric-box">
                <span className="metric-label">Primary AI Classification</span>
                <div
                  className="metric-value-large"
                  style={{ color: postData.severity_color }}
                >
                  {postData.prediction}
                </div>
                <div className="confidence-meter-container">
                  <div className="meter-label">
                    <span>AI Model Confidence</span>
                    <strong>{postData.confidence}%</strong>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, postData.confidence))}%`,
                        background: `linear-gradient(90deg, #3B82F6, ${postData.severity_color})`
                      }}
                    />
                  </div>
                </div>

                {/* Additional probabilities if available */}
                {result.class_probabilities && (
                  <div className="class-prob-box">
                    <span className="sub-label">Distribution Breakdown:</span>
                    <div className="prob-list">
                      {Object.entries(result.class_probabilities).map(([cName, pVal]) => (
                        <div key={cName} className="prob-row">
                          <span className="c-name">{cName === "notumor" ? "No Tumor" : cName}</span>
                          <span className="c-val">{pVal}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Visuals: Original Scan + Grad-CAM Heatmap */}
              <div className="scan-visuals-panel">
                <div className="visuals-control-bar">
                  <span className="visuals-title">
                    <Eye size={14} /> Radiographic Scan & AI Activation
                  </span>
                  <div className="scan-tabs">
                    <button
                      className={`scan-tab-btn ${selectedScanView === "split" ? "active" : ""}`}
                      onClick={() => setSelectedScanView("split")}
                    >
                      Side by Side
                    </button>
                    <button
                      className={`scan-tab-btn ${selectedScanView === "original" ? "active" : ""}`}
                      onClick={() => setSelectedScanView("original")}
                    >
                      Original
                    </button>
                    <button
                      className={`scan-tab-btn ${selectedScanView === "heatmap" ? "active" : ""}`}
                      onClick={() => setSelectedScanView("heatmap")}
                    >
                      Grad-CAM
                    </button>
                  </div>
                </div>

                <div className={`scan-image-display ${selectedScanView}`}>
                  {(selectedScanView === "split" || selectedScanView === "original") && originalImg && (
                    <div className="image-frame">
                      <span className="img-tag">Original Scan</span>
                      <img src={originalImg} alt="Original Scan Film" />
                    </div>
                  )}
                  {(selectedScanView === "split" || selectedScanView === "heatmap") && (
                    <div className="image-frame">
                      <span className="img-tag gradcam">Grad-CAM Heatmap</span>
                      {gradcamImg ? (
                        <img src={gradcamImg} alt="Grad-CAM AI Attention" />
                      ) : (
                        <div className="no-heatmap-placeholder">
                          <Brain size={24} color="var(--text-muted)" />
                          <span>Heatmap overlay rendered on diagnosis</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="gradcam-caption">
                  Highlighted warm regions indicate anatomical coordinates that most strongly influenced the neural network prediction.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EXPLANATION */}
        {(viewMode === "all" || currentStep === 2) && (
          <div className="analysis-step-card step-explanation">
            <div className="card-top-bar">
              <div className="step-badge">
                <Brain size={16} />
                <span>Step 2: Medical Explanation</span>
              </div>
            </div>

            <div className="explanation-body">
              <div className="explanation-highlight-card">
                <h3 className="section-subtitle">What this finding means:</h3>
                <p className="explanation-paragraph">{postData.explanation}</p>
              </div>

              <div className="medical-context-grid">
                <div className="context-item">
                  <div className="context-icon blue">
                    <Layers size={18} />
                  </div>
                  <div className="context-info">
                    <h4>Anatomical Region</h4>
                    <p>{postData.modality} target anatomical zone</p>
                  </div>
                </div>

                <div className="context-item">
                  <div className="context-icon purple">
                    <Brain size={18} />
                  </div>
                  <div className="context-info">
                    <h4>Model Finding</h4>
                    <p>{postData.prediction} (Confidence: {postData.confidence}%)</p>
                  </div>
                </div>

                <div className="context-item">
                  <div className="context-icon green">
                    <CheckCircle size={18} />
                  </div>
                  <div className="context-info">
                    <h4>Clinical Significance</h4>
                    <p>{postData.severity_description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SEVERITY / RISK */}
        {(viewMode === "all" || currentStep === 3) && (
          <div className="analysis-step-card step-severity">
            <div className="card-top-bar">
              <div className="step-badge">
                <ShieldAlert size={16} />
                <span>Step 3: Severity & Clinical Risk Stratification</span>
              </div>
            </div>

            <div className="severity-body">
              <div
                className="severity-hero-card"
                style={{
                  background: severityBadgeBg,
                  borderColor: severityBorder
                }}
              >
                <div className="severity-status-left">
                  <div
                    className="severity-pill"
                    style={{
                      backgroundColor: postData.severity_color,
                      color: "#fff"
                    }}
                  >
                    {postData.severity.toUpperCase()} RISK
                  </div>
                  <h3 className="severity-title" style={{ color: postData.severity_color }}>
                    {postData.severity === "High"
                      ? "High Priority Clinical Attention Advised"
                      : postData.severity === "Moderate"
                      ? "Moderate Risk — Further Investigation Recommended"
                      : "Low Risk — Routine Preventive Monitoring"}
                  </h3>
                  <p className="severity-desc">{postData.severity_description}</p>
                </div>

                <div className="severity-gauge-visual">
                  <div className="gauge-track">
                    <div
                      className={`gauge-segment low ${postData.severity === "Low" ? "active" : ""}`}
                    >
                      Low
                    </div>
                    <div
                      className={`gauge-segment moderate ${postData.severity === "Moderate" ? "active" : ""}`}
                    >
                      Moderate
                    </div>
                    <div
                      className={`gauge-segment high ${postData.severity === "High" ? "active" : ""}`}
                    >
                      High
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RECOMMENDATIONS */}
        {(viewMode === "all" || currentStep === 4) && (
          <div className="analysis-step-card step-recommendations">
            <div className="card-top-bar">
              <div className="step-badge">
                <CheckCircle size={16} />
                <span>Step 4: Clinical Recommendations & Next Steps</span>
              </div>
            </div>

            <div className="recommendations-body">
              <h3 className="section-subtitle">Recommended Action Plan:</h3>
              <div className="recommendation-list">
                {postData.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <div className="rec-number">{index + 1}</div>
                    <div className="rec-content">
                      <p>{rec}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Standard AI Medical Disclaimer */}
              <div className="disclaimer-callout">
                <Info size={22} className="disclaimer-icon" />
                <div className="disclaimer-text">
                  <h4>AI Decision Support Notice</h4>
                  <p>{postData.disclaimer}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: MEDICAL REPORT */}
        {(viewMode === "all" || currentStep === 5) && (
          <div className="analysis-step-card step-report">
            <div className="card-top-bar">
              <div className="step-badge">
                <FileText size={16} />
                <span>Step 5: Structured Medical Analysis Report</span>
              </div>
              <div className="report-action-buttons no-print">
                <button className="report-btn" onClick={handleCopyReport}>
                  <Copy size={14} />
                  <span>{copied ? "Copied!" : "Copy Summary"}</span>
                </button>
                <button className="report-btn" onClick={handleDownloadJSON}>
                  <Download size={14} />
                  <span>Export JSON</span>
                </button>
                <button className="report-btn primary" onClick={handlePrintReport}>
                  <Printer size={14} />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Structured Printable Medical Report Card */}
            <div className="printable-medical-report" id="printable-report">
              <div className="report-header-banner">
                <div className="report-brand">
                  <div className="pulse-logo">
                    <Activity size={24} color="#10B981" />
                  </div>
                  <div>
                    <h1 className="report-hospital-name">MEDISCAN AI CLINICAL DIAGNOSTICS</h1>
                    <span className="report-subheading">AI-Assisted Radiographic Diagnostic Examination</span>
                  </div>
                </div>
                <div className="report-meta-tag">
                  <span className="rep-id">REPORT ID: {postData.report_id}</span>
                  <span className="rep-date">DATE: {postData.generated_at}</span>
                </div>
              </div>

              <div className="report-patient-strip">
                <div className="strip-item">
                  <span className="strip-label">Patient Name:</span>
                  <strong className="strip-val">{patientData ? patientData.name : "Public Anonymous Patient"}</strong>
                </div>
                <div className="strip-item">
                  <span className="strip-label">Patient ID:</span>
                  <strong className="strip-val">{patientData ? patientData.patientId : "N/A"}</strong>
                </div>
                <div className="strip-item">
                  <span className="strip-label">Diagnostic Modality:</span>
                  <strong className="strip-val">{postData.modality}</strong>
                </div>
                <div className="strip-item">
                  <span className="strip-label">Scan Quality:</span>
                  <strong className="strip-val">{postData.report.scan_quality || "Diagnostic Grade"}</strong>
                </div>
              </div>

              <div className="report-section-block">
                <h3 className="report-section-title">1. RADIOLOGICAL FINDINGS & CLASSIFICATION</h3>
                <div className="findings-summary-table">
                  <div className="table-row">
                    <span className="row-key">Primary Finding / Condition:</span>
                    <span className="row-value bold" style={{ color: postData.severity_color }}>
                      {postData.prediction}
                    </span>
                  </div>
                  <div className="table-row">
                    <span className="row-key">Model Confidence Score:</span>
                    <span className="row-value">{postData.confidence}%</span>
                  </div>
                  <div className="table-row">
                    <span className="row-key">Severity / Risk Category:</span>
                    <span className="row-value" style={{ color: postData.severity_color, fontWeight: "700" }}>
                      {postData.severity} Risk
                    </span>
                  </div>
                </div>
              </div>

              <div className="report-section-block">
                <h3 className="report-section-title">2. MEDICAL EXPLANATION & INTERPRETATION</h3>
                <p className="report-text-body">{postData.explanation}</p>
              </div>

              <div className="report-section-block">
                <h3 className="report-section-title">3. CLINICAL RECOMMENDATIONS & NEXT STEPS</h3>
                <ul className="report-bullet-list">
                  {postData.recommendations.map((rec, rIdx) => (
                    <li key={rIdx}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="report-section-block">
                <h3 className="report-section-title">4. AI DECISION-SUPPORT DISCLAIMER</h3>
                <p className="report-disclaimer-body">{postData.disclaimer}</p>
              </div>

              <div className="report-footer-signatures">
                <div className="sig-block">
                  <div className="sig-line" />
                  <span>AI Diagnostic Engine Verification</span>
                  <small>MediScan AI Multi-Modal Engine v2.0</small>
                </div>
                <div className="sig-block">
                  <div className="sig-line" />
                  <span>Attending Physician / Radiologist Review</span>
                  <small>Signature & Stamp</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: HISTORY */}
        {(viewMode === "all" || currentStep === 6) && (
          <div className="analysis-step-card step-history">
            <div className="card-top-bar">
              <div className="step-badge">
                <History size={16} />
                <span>Step 6: Analysis History & Audit Trail</span>
              </div>
              {historyList && historyList.length > 0 && onClearHistory && (
                <button className="clear-history-btn" onClick={onClearHistory}>
                  Clear History
                </button>
              )}
            </div>

            <div className="history-section-body">
              {historyList && historyList.length > 0 ? (
                <div className="history-grid-flow">
                  {historyList.map((item, hIdx) => {
                    const hData = ensurePostAnalysis(item, item.modality || item.fileType || modality);
                    const itemDate = item.date || item.createdAt || item.generated_at || "Recent";

                    return (
                      <div
                        key={item.analysisId || item.report_id || hIdx}
                        className="history-card-item"
                        onClick={() => onSelectHistory && onSelectHistory(item)}
                      >
                        <div className="h-card-top">
                          <span className="h-modality-badge">{hData.modality}</span>
                          <span
                            className="h-severity-pill"
                            style={{
                              backgroundColor: hData.severity_color,
                              color: "#fff"
                            }}
                          >
                            {hData.severity}
                          </span>
                        </div>

                        <h4 className="h-pred-title" style={{ color: hData.severity_color }}>
                          {hData.prediction}
                        </h4>

                        <div className="h-meta-row">
                          <span>Confidence: <strong>{hData.confidence}%</strong></span>
                          <span>{new Date(itemDate).toLocaleDateString()}</span>
                        </div>

                        <p className="h-snippet">{hData.explanation.slice(0, 110)}...</p>

                        <div className="h-card-actions">
                          <button
                            className="h-view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectHistory) onSelectHistory(item);
                            }}
                          >
                            <Eye size={12} /> View Details & Report
                          </button>
                          {onDeleteHistoryItem && (
                            <button
                              className="h-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHistoryItem(item.analysisId || item.report_id || hIdx);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-history-state">
                  <History size={32} color="var(--text-muted)" />
                  <p>No previous diagnostic analyses saved in history yet.</p>
                  <span>Every analysis you run is automatically recorded here for chronological review.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Stepper Navigation Controls */}
      {viewMode === "stepped" && (
        <div className="post-analysis-footer">
          <button
            className="step-nav-btn prev"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          >
            <ChevronLeft size={16} />
            <span>Previous Step</span>
          </button>

          <div className="step-indicator-dots">
            {steps.map(s => (
              <span
                key={s.id}
                className={`dot ${currentStep === s.id ? "active" : ""} ${currentStep > s.id ? "completed" : ""}`}
                onClick={() => setCurrentStep(s.id)}
              />
            ))}
          </div>

          <button
            className="step-nav-btn next"
            disabled={currentStep === steps.length}
            onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
          >
            <span>Next: {currentStep < steps.length ? steps[currentStep].name : "Complete"}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
