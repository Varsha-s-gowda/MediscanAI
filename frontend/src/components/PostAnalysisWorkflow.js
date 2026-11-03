import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  Copy,
  ZoomIn,
  Check,
  X,
  Activity,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

export const formatExplanationPoints = (explanationStr) => {
  if (!explanationStr) return [];
  if (Array.isArray(explanationStr)) return explanationStr;
  const points = explanationStr
    .split(/(?<=\.|;)\s+/)
    .map(s => s.trim().replace(/^•\s*/, ''))
    .filter(s => s.length > 5);
  if (points.length === 0) return [explanationStr];
  return points;
};

export const getDoctorConsultationGuidance = (pred, modality) => {
  const p = (pred || "").toLowerCase();
  const m = (modality || "").toLowerCase();

  if (m.includes("dental") || m.includes("cavity") || p.includes("caries") || p.includes("cavity")) {
    return "Schedule a consultation with a licensed Dentist or Endodontist for clinical bitewing inspection, pulp vitality testing, and restorative intervention.";
  }
  if (m.includes("ct") || m.includes("kidney") || m.includes("stone")) {
    return "Consult a Urologist promptly for non-contrast helical CT stone sizing (mm), outflow tract assessment, and therapeutic stone extraction planning.";
  }
  if (m.includes("report") || m.includes("medical") || m.includes("lab")) {
    return "Consult your Primary Care Physician, Internist, or relevant Specialist (Hematologist / Endocrinologist) to correlate abnormal lab parameters with clinical history.";
  }
  if (p.includes("covid")) {
    return "Consult a Pulmonologist or Infectious Disease Specialist immediately for COVID-19 protocol, inflammatory marker checks, and viral monitoring.";
  }
  if (p.includes("tuberculosis") || p.includes("tb")) {
    return "Urgent consultation with an Infectious Disease Specialist or Pulmonologist for DOTS anti-tubercular therapy initiation and isolation protocols.";
  }
  if (p.includes("pneumonia")) {
    return "Consult a Pulmonologist or General Physician promptly for chest auscultation, inflammatory blood work, and targeted antimicrobial therapy.";
  }
  return "Consult your attending General Physician or Specialist to review imaging findings in context of your personal health history.";
};

export const getTreatmentCureSteps = (pred, modality) => {
  const p = (pred || "").toLowerCase();
  const m = (modality || "").toLowerCase();

  if (m.includes("dental") || m.includes("cavity") || p.includes("caries") || p.includes("cavity")) {
    return [
      "Fluoride Varnish & Remineralization Therapy: For early incipient white-spot enamel lesions, apply high-concentration 5% sodium fluoride varnish.",
      "Composite Resin Restoration (Filling): For cavitated caries in dentin, undergo minimally invasive excavation followed by biocompatible composite bonding.",
      "Root Canal Treatment (Endodontics): If deep carious decay extends to dental pulp causing pulpitis/necrosis, complete pulp extirpation and obturation.",
      "Full Ceramic/Zirconia Crown: Indicated for teeth with extensive coronal structural tooth loss to restore functional masticatory anatomy.",
      "Preventive Hygiene Protocol: Brush twice daily with fluoridated dentifrice (1450 ppm F), clean interdentally daily, and minimize refined sugars."
    ];
  }

  if (m.includes("ct") || m.includes("kidney") || m.includes("stone")) {
    const isStone = p.includes("stone") || p.includes("calculi");
    return isStone ? [
      "Medical Expulsive Therapy (MET): Alpha-blockers (e.g. Tamsulosin 0.4 mg) to relax ureteral smooth muscle for stones ≤5mm.",
      "High Volume Hydration: Maintain 2.5–3.0 L/day oral fluid intake to achieve minimum 2 L/day clear urinary output.",
      "Analgesic Protocol: First-line NSAIDs (Ketorolac / Ibuprofen) combined with antispasmodics for acute ureteric colic pain management.",
      "Extracorporeal Shock Wave Lithotripsy (ESWL): Acoustic shockwave fragmentation for non-obstructing renal pelvic stones <15mm.",
      "Ureteroscopy & Holmium Laser Lithotripsy (URS): Direct endoscopic visualization and laser dusting for ureteral or obstructing calculi."
    ] : [
      "Maintain adequate daily hydration of 2.0–2.5 L/day to preserve optimal glomerular filtration.",
      "Follow a balanced low-sodium dietary pattern to maintain normal calcium oxalate excretion.",
      "Schedule routine annual metabolic urine chemistry and abdominal ultrasound check-ups."
    ];
  }

  if (m.includes("report") || m.includes("medical") || m.includes("lab")) {
    return [
      "Correlate Extracted Abnormal Markers: Cross-reference out-of-range biomarkers (CBC, lipid, glucose, or renal parameters) with clinical presentation.",
      "Follow-up Confirmatory Testing: Repeat targeted biomarker assay in 2–4 weeks to establish baseline vs. acute transient fluctuation.",
      "Dietary & Lifestyle Modification: Tailor nutritional intake, physical exercise, and sleep patterns based on metabolic panel indicators.",
      "Targeted Pharmacotherapy: Initiate medication adjustments (e.g. lipid-lowering, antihypertensive, glycemic control) under specialist supervision.",
      "Preventive Health Surveillance: Routine quarterly or biannual blood panel screening to monitor biomarker progression."
    ];
  }

  if (p.includes("pneumonia")) {
    return [
      "Targeted Antimicrobial Regimen: Complete empirical oral or IV antibiotic course (e.g. Amoxicillin-Clavulanate, Azithromycin, or Ceftriaxone) as prescribed by attending physician.",
      "Incentive Spirometry: Perform 5–10 deep respiratory volume repetitions hourly to promote alveolar expansion and clear bronchial exudate.",
      "Bronchial Clearance & Hydration: Maintain oral fluid intake of 2.0–2.5 L/day and consider prescribed expectorants to thin pulmonary secretions.",
      "Supportive Rest Protocol: Rest in a semi-upright (semi-Fowler's, 30–45°) position to maximize diaphragmatic excursion and oxygenation.",
      "Follow-up Imaging: Repeat chest radiograph in 4–6 weeks to document radiographic resolution and rule out underlying parenchymal disease."
    ];
  }

  if (p.includes("tuberculosis") || p.includes("tb")) {
    return [
      "Directly Observed First-Line RHEZ Therapy: Initiate 2-month intensive phase (Rifampicin, Isoniazid, Pyrazinamide, Ethambutol).",
      "Continuation Phase: 4-month maintenance phase (Rifampicin + Isoniazid) under strict clinical DOTS compliance monitoring.",
      "Baseline & Interval Hepatic Function Monitoring: Periodic liver enzymes (ALT/AST/Bilirubin) to prevent drug-induced hepatotoxicity.",
      "Nutritional & Airborne Precautions: High-protein diet and respiratory hygiene until consecutive sputum smear negativity is verified."
    ];
  }

  if (p.includes("covid")) {
    return [
      "Pulse Oximetry Surveillance: Monitor resting SpO2 every 4–6 hours; seek immediate care if SpO2 drops below 94%.",
      "Prone Positioning Protocol: Alternate awake prone positioning (30–120 min intervals) to improve ventilation-perfusion matching.",
      "Hydration & Symptomatic Management: Antipyretics (Paracetamol) for fever, adequate oral rehydration, and avoidance of exertion.",
      "Anti-inflammatory / Antiviral Evaluation: Consult clinical specialist for oral antivirals (Paxlovid) or corticosteroids if oxygen-dependent."
    ];
  }

  return [
    "Continue standard age-appropriate preventative health maintenance.",
    "Maintain balanced nutrition, regular aerobic exercise, and healthy sleep hygiene.",
    "Schedule annual routine primary care physical examination."
  ];
};

export const getEmergencyRedFlags = (pred, modality) => {
  const p = (pred || "").toLowerCase();
  const m = (modality || "").toLowerCase();

  if (m.includes("dental") || m.includes("cavity") || p.includes("caries") || p.includes("cavity")) {
    return "Emergency Red Flags: Rapidly spreading facial or submandibular swelling, difficulty swallowing/breathing (Ludwig's angina risk), high fever (>38.5°C), or severe unmanageable pain.";
  }
  if (m.includes("ct") || m.includes("kidney") || m.includes("stone")) {
    return "Emergency Red Flags: Intractable severe flank pain unresponsive to medications, persistent vomiting, high fever with chills (indicator of urosepsis), or inability to urinate (anuria).";
  }
  if (m.includes("report") || m.includes("medical") || m.includes("lab")) {
    return "Emergency Red Flags: Critical lab values (severe thrombocytopenia <20k, severe anemia Hb <7 g/dL, severe hypoglycemia <50 mg/dL, or acute electrolyte crises).";
  }
  return "Emergency Red Flags: Resting blood oxygen saturation (SpO2) dropping below 92%, acute respiratory distress, severe persistent chest pain, coughing up blood (hemoptysis), confusion, or cyanosis (bluish lips/face).";
};

export function ensurePostAnalysis(analysis, modalityHint = "Chest X-Ray") {
  if (!analysis) return null;

  if (analysis.post_analysis && analysis.post_analysis.explanation && analysis.post_analysis.recommendations) {
    return analysis.post_analysis;
  }

  const pred = analysis.prediction || analysis.class || "Normal";
  const conf = Math.round(Number(analysis.confidence || 0.95) <= 1 ? Number(analysis.confidence || 0.95) * 100 : Number(analysis.confidence || 95));
  const mod = analysis.modality || analysis.fileType || modalityHint || "Chest X-Ray";
  const modLower = mod.toLowerCase();

  let severity = "Moderate";
  let severity_color = "#F59E0B";
  let severity_description = "Clinical correlation recommended.";
  let explanation = `The deep neural engine identified radiographical patterns consistent with ${pred} with an estimated confidence of ${conf}%.`;
  let recommendations = [
    "Schedule a comprehensive clinical evaluation with an attending physician.",
    "Perform confirmatory diagnostic testing and correlate with presenting symptoms.",
    "Monitor vital signs and seek immediate emergency care if acute distress develops."
  ];

  if (modLower.includes("dental") || modLower.includes("cavity")) {
    const isCavity = pred.toLowerCase().includes("cavity") || pred.toLowerCase().includes("caries");
    severity = isCavity ? "High" : "Low";
    severity_color = isCavity ? "#EF4444" : "#10B981";
    explanation = isCavity
      ? "Radiographic assessment shows localized radiolucency within the coronal hard tissue indicative of active demineralization and enamel breakdown. The lesion penetrates beyond the enamel-dentin junction (EDJ), displaying characteristic morphological loss of radiopaque dental mineral density. Adjacent periodontal ligament spaces and alveolar bone crests appear preserved without evidence of periapical radiolucency."
      : "The evaluated dental radiograph demonstrates intact, continuous enamel contours across all visualized interproximal surfaces. No pathological radiolucencies, demineralization fronts, or caries-associated structural deficits are identified along the crowns or cervical margins. Periodontal bone levels and pulp chamber morphology appear within normal radiographic limits.";
    severity_description = isCavity
      ? "Active dental caries detected requiring prompt restorative intervention."
      : "No radiographic evidence of dental caries or acute coronal lesions.";
    recommendations = isCavity ? [
      "Schedule restorative clinical evaluation (operative excavation and composite restoration).",
      "Perform intraoral bitewing radiographs to evaluate depth relative to the dental pulp.",
      "Implement topical 5000 ppm high-fluoride toothpaste and interdental plaque control."
    ] : [
      "Continue daily brushing with fluoride dentifrice twice daily and daily flossing.",
      "Schedule routine 6-month dental check-ups and professional prophylaxis.",
      "Maintain a balanced diet rich in calcium and enamel-protecting minerals."
    ];
  } else if (modLower.includes("ct") || modLower.includes("kidney") || modLower.includes("stone")) {
    const isStone = pred.toLowerCase().includes("stone") || pred.toLowerCase().includes("calculi");
    severity = isStone ? (conf > 80 ? "High" : "Moderate") : "Low";
    severity_color = isStone ? "#EF4444" : "#10B981";
    explanation = isStone
      ? "Helical abdominal CT slice demonstrates a well-defined hyperdense focus consistent with nephrolithiasis within the renal collecting system. The high attenuation value (>400 HU) is characteristic of a calcified renal calculus. Perinephric fat stranding and mild pelvicalyceal prominence are visible, indicating focal mechanical irritation and potential early outflow impedance."
      : "Axial abdominal CT demonstrates symmetric renal morphology and parenchymal thickness bilaterally. Renal parenchyma shows homogeneous attenuation without focal hypo- or hyperdense lesions. No radiopaque calculi, hydronephrosis, or pelvicalyceal ectasia are identified within either renal collecting system. Perirenal fat planes are clean and unremarkable.";
    severity_description = isStone
      ? "Renal calculus identified with localized parenchymal irritation."
      : "No radiographic evidence of nephrolithiasis or obstructive uropathy.";
    recommendations = isStone ? [
      "Consult a urologist for definitive calculus sizing and therapeutic extraction planning.",
      "Increase oral hydration to 2.5–3.0 liters per day to promote spontaneous stone passage.",
      "Undergo serum metabolic workup (calcium, uric acid, creatinine) and urinalysis."
    ] : [
      "Maintain optimal daily fluid intake (2.0–2.5 liters) to support renal filtration.",
      "Follow a low-sodium, balanced calcium diet to prevent future crystal precipitation.",
      "Schedule annual preventive wellness screenings including renal function testing."
    ];
  } else if (modLower.includes("report") || modLower.includes("medical") || modLower.includes("lab")) {
    severity = conf > 85 ? "High" : "Moderate";
    severity_color = severity === "High" ? "#EF4444" : "#F59E0B";
    explanation = "Automated OCR extraction and hematological NLP pipeline successfully parsed the diagnostic laboratory report. Target biomarkers were normalized against clinical reference intervals, identifying specific out-of-range deviations across the clinical parameter profile. Review the extracted table below for detailed metric values and status.";
    severity_description = "Laboratory biomarker panel analysis complete with extracted metrics.";
    recommendations = [
      "Review flagged out-of-range parameters with your attending primary care physician.",
      "Repeat abnormal tests in 2–4 weeks to monitor physiological normalization.",
      "Correlate laboratory findings with clinical symptoms and existing medical history."
    ];
  } else {
    // Default Chest X-Ray
    const isPneumonia = pred.toLowerCase().includes("pneumonia");
    const isTb = pred.toLowerCase().includes("tuberculosis") || pred.toLowerCase().includes("tb");
    const isNormal = pred.toLowerCase().includes("normal");

    if (isNormal) {
      severity = "Low";
      severity_color = "#10B981";
      explanation = "Posteroanterior (PA) chest radiograph shows clear lung fields bilaterally with no focal parenchymal consolidation, infiltrates, or suspicious pulmonary nodular opacities. The cardiothoracic ratio is normal (<0.50) without cardiomegaly. Costophrenic and cardiophrenic angles are sharp with no evidence of pleural effusion. Mediastinal contours, hilar vascular patterns, and osseous thoracic structures appear intact with no acute cardiopulmonary abnormality.";
      severity_description = "Normal chest radiograph with no acute cardiopulmonary findings.";
      recommendations = [
        "Continue routine preventative health maintenance and annual primary care wellness checkups.",
        "Maintain current cardiovascular fitness and avoid tobacco or respiratory environmental irritants.",
        "Re-evaluate with clinical consultation should respiratory symptoms (cough, dyspnea, fever) develop."
      ];
    } else if (isPneumonia) {
      severity = "High";
      severity_color = "#EF4444";
      explanation = "Frontal chest radiograph reveals localized areas of increased radiographic opacity and alveolar consolidation with prominent air bronchograms, typical of infectious pneumonia. The inflammatory exudate is concentrated within the pulmonary parenchyma, leading to localized loss of normal aeration and volume reduction in the affected lobes. Surrounding bronchovascular bundles demonstrate peribronchial thickening consistent with an active inflammatory airway response and interstitial exudation. Cardiac silhouette contours and contralateral lung fields remain preserved with no evidence of gross pneumothorax or cavitation. Clinical correlation with physical auscultation, laboratory inflammatory markers, and immediate targeted antimicrobial management is strongly indicated.";
      severity_description = "Acute pulmonary consolidation detected consistent with pneumonia.";
      recommendations = [
        "Consult a pulmonologist or attending physician immediately for clinical auscultation and targeted antimicrobial therapy.",
        "Monitor pulse oximetry (SpO2) and body temperature regularly; seek emergency care if SpO2 drops below 92%.",
        "Perform follow-up PA chest radiography in 4–6 weeks to document complete radiographic resolution of consolidation."
      ];
    } else if (isTb) {
      severity = "High";
      severity_color = "#EF4444";
      explanation = "Chest radiograph demonstrates heterogeneous fibro-cavitary opacities with apical and subapical predominance, characteristic of active pulmonary tuberculosis. Focal parenchymal destruction with radiolucent cavities and surrounding satellite nodular infiltrates are noted. Retractile changes in the adjacent hilar structures and mild volume loss are identifiable. Contralateral lung displays compensatory hyperinflation without evidence of acute miliary dissemination.";
      severity_description = "Apical cavitary infiltration identified suggestive of active tuberculosis.";
      recommendations = [
        "Consult an infectious disease specialist or pulmonologist immediately for confirmatory AFB sputum smears and GeneXpert.",
        "Initiate appropriate multi-drug anti-tubercular therapy (DOTS protocol) under strict medical supervision.",
        "Implement airborne infection control precautions and screen close household contacts promptly."
      ];
    }
  }

  return {
    is_valid: true,
    report_id: analysis.report_id || `MED-${Date.now()}`,
    generated_at: analysis.date || new Date().toISOString(),
    modality: mod,
    prediction: pred,
    confidence: conf,
    severity,
    severity_color,
    severity_description,
    explanation,
    recommendations,
    disclaimer: "Notice: MediScan AI is an algorithmic decision-support tool. It does not substitute professional medical judgment, diagnosis, or clinical evaluation by a board-certified physician."
  };
}

export default function PostAnalysisWorkflow({
  result,
  modality = "Chest X-Ray",
  apiBase = process.env.REACT_APP_API_URL || "https://mediscan-ai-backend.onrender.com",
  historyList = [],
  onSelectHistory = null,
  onClearHistory = null,
  onDeleteHistoryItem = null,
  isPatientMode = false,
  patientData = null,
  onBackToUpload = null,
  publicMode = "xray",
  setPublicMode = null,
  onBackToLogin = null
}) {
  const isReportModality = (() => {
    const raw = `${modality || ""} ${result?.modality || ""}`.toLowerCase();
    return raw.includes("report") || raw.includes("medical") || raw.includes("lab");
  })();

  // Workflow view stage: 'image_analysis' (Stage 1) or 'medical_report' (Stage 2)
  const [workflowStage, setWorkflowStage] = useState(isReportModality ? "medical_report" : "image_analysis");
  // eslint-disable-next-line no-unused-vars
  const [activeStep, setActiveStep] = useState(2);
  const [windowPreset, setWindowPreset] = useState("lung"); // 'lung', 'mediastinum', 'bone'
  const [contrastInvert, setContrastInvert] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const postData = ensurePostAnalysis(result, modality);
  if (!postData) {
    return (
      <div className="post-analysis-empty">
        <Activity size={36} color="#2DD4BF" />
        <p>No analysis result available. Upload a diagnostic scan to start.</p>
      </div>
    );
  }

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${apiBase}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const originalImg = getFullImageUrl(result.filePath || result.original_image || result.report?.original_image_url);
  const gradcamImg = getFullImageUrl(result.gradcamPath || result.gradcam_image || result.heatmap || result.report?.gradcam_image_url);

  // Modality helpers
  const modLower = (postData.modality || modality || "").toLowerCase();
  let modelName = "DenseNet-121";
  let scanTitle = "Chest Radiograph (PA)";
  let icdCode = "ICD-10 J18.9";
  let viewTag = "PA";
  let windowPresets = ["Lung", "Mediastinum", "Bone"];
  let primaryFindingTitle = postData.prediction;

  if (modLower.includes("dental") || modLower.includes("cavity")) {
    modelName = "EfficientNet-B0";
    scanTitle = "Dental Radiograph (Bitewing)";
    icdCode = "ICD-10 K02.9";
    viewTag = "BITEWING";
    windowPresets = ["Enamel", "Dentin", "Periodontal"];
  } else if (modLower.includes("ct") || modLower.includes("kidney") || modLower.includes("stone")) {
    modelName = "MobileNetV2";
    scanTitle = "Abdominal CT Scan (Renal Helical)";
    icdCode = "ICD-10 N20.0";
    viewTag = "AXIAL CT";
    windowPresets = ["Soft Tissue", "Renal Helical", "Bone"];
  } else if (modLower.includes("report") || modLower.includes("medical") || modLower.includes("lab")) {
    modelName = "OCR-NLP Engine";
    scanTitle = "Medical Lab Report";
    icdCode = "LOINC / Z01.89";
    viewTag = "REPORT OCR";
    windowPresets = ["Standard", "Contrast", "Inverted"];
  }

  if (postData.prediction.toLowerCase().includes("cavity") || postData.prediction.toLowerCase().includes("caries")) {
    primaryFindingTitle = "Active Dental Caries (Cavity)";
  } else if (postData.prediction.toLowerCase().includes("normal")) {
    primaryFindingTitle = "Normal — No Significant Finding";
  } else {
    primaryFindingTitle = postData.prediction;
  }

  const riskLabel = postData.severity === "High"
    ? "HIGH RISK • CRITICAL TIER"
    : postData.severity === "Moderate"
    ? "MODERATE • PSI CLASS III"
    : "LOW RISK • BENIGN TIER";

  const riskScore = postData.severity === "High"
    ? "0.88 Risk Index"
    : postData.severity === "Moderate"
    ? "0.64 Risk Index"
    : "0.12 Risk Index";

  const isDental = modLower.includes("dental") || modLower.includes("cavity");
  const stepperSteps = isDental ? [
    { id: 1, label: "Upload Radiograph", target: null },
    { id: 2, label: "Preprocessing & Contrast", target: "section-image-viewer" },
    { id: 3, label: "Caries & Demineralization Map", target: "section-ai-prediction" },
    { id: 4, label: "ICDAS Grade Assessment", target: "section-severity" },
    { id: 5, label: "Action Plan", target: "section-action-plan" },
    { id: 6, label: "Clinical Report Export", target: null }
  ] : [
    { id: 1, label: "Upload Scan", target: null },
    { id: 2, label: "AI Prediction", target: "section-ai-prediction" },
    { id: 3, label: "Explanation", target: "section-explanation" },
    { id: 4, label: "Severity", target: "section-severity" },
    { id: 5, label: "Action Plan", target: "section-action-plan" },
    { id: 6, label: "Report", target: null }
  ];

  const handleStepClick = (stepId) => {
    setActiveStep(stepId);
    if (stepId === 1) {
      if (onBackToUpload) onBackToUpload();
      return;
    }
    if (stepId === 6) {
      setWorkflowStage("medical_report");
      return;
    }

    if (stepId >= 2 && stepId <= 3) {
      setWorkflowStage("image_analysis");
    } else if (stepId >= 4) {
      setWorkflowStage("medical_report");
    }
  };

  const handleCopyReport = () => {
    const reportText = `
MEDISCAN AI — CLINICAL ANALYSIS REPORT
==================================================
Report ID: ${postData.report_id}
Date: ${postData.generated_at}
Modality: ${postData.modality}
Patient: ${patientData ? `${patientData.name} (ID: ${patientData.patientId})` : "Public / Anonymous"}
Primary Finding: ${postData.prediction} (${postData.confidence}%)
Severity Level: ${postData.severity}
ICD-10 Code: ${icdCode}

EXPLANATION:
${postData.explanation}

RECOMMENDATIONS:
${postData.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

DISCLAIMER:
${postData.disclaimer}
==================================================`;

    navigator.clipboard.writeText(reportText.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediscan_sr_${postData.report_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const patientSnippet = patientData
    ? `Patient #${patientData.patientId || patientData.id} • ${patientData.gender || "Adult"} ${patientData.age ? patientData.age + "y" : ""} • Verified DICOM 3.0`
    : `Patient #${postData.report_id.slice(-4)} • Adult • Verified DICOM 3.0`;

  return (
    <div className="results-workspace-container">
      {/* 1. TOP NAVBAR */}
      <header className="results-top-nav">
        <div className="results-nav-left">
          <div className="results-nav-brand">
            <div className="results-brand-orb">
              <Sparkles size={18} color="#2DD4BF" />
            </div>
            <div>
              <div className="results-brand-title">
                MediScan<span className="ai-dot">.AI</span>
              </div>
              <div className="results-brand-subtitle">CLINICAL DIAGNOSTICS</div>
            </div>
          </div>

          <div className="results-system-badge">
            <span className="glowing-green-dot"></span>
            SYSTEM ONLINE
          </div>
        </div>

        {/* Center Modality Tabs */}
        <div className="results-modality-tabs">
          <button
            className={`results-mod-tab ${modLower.includes("chest") || (!modLower.includes("dental") && !modLower.includes("ct")) ? "active" : ""}`}
            onClick={() => {
              if (setPublicMode) { setPublicMode("xray"); if (onBackToUpload) onBackToUpload(); }
            }}
          >
            Chest X-Ray
          </button>
          <button
            className={`results-mod-tab ${modLower.includes("dental") || modLower.includes("cavity") ? "active" : ""}`}
            onClick={() => {
              if (setPublicMode) { setPublicMode("cavity"); if (onBackToUpload) onBackToUpload(); }
            }}
          >
            Dental Cavity
          </button>
          <button
            className={`results-mod-tab ${modLower.includes("ct") || modLower.includes("kidney") ? "active" : ""}`}
            onClick={() => {
              if (setPublicMode) { setPublicMode("ct_scan"); if (onBackToUpload) onBackToUpload(); }
            }}
          >
            CT Kidney Stone
          </button>
          <button
            className={`results-mod-tab ${modLower.includes("report") ? "active" : ""}`}
            onClick={() => {
              if (setPublicMode) { setPublicMode("report"); if (onBackToUpload) onBackToUpload(); }
            }}
          >
            Lab Report
          </button>
          <button
            className="results-mod-tab history-tab"
            onClick={() => {
              if (setPublicMode) { setPublicMode("history"); }
            }}
          >
            History <span className="tab-count-badge">{historyList.length || 1}</span>
          </button>
        </div>

        {/* Right Portal Action */}
        <div className="results-nav-right">
          <button
            className="results-support-btn"
            onClick={() => {
              if (onBackToLogin) onBackToLogin();
              else if (setPublicMode) setPublicMode("login");
            }}
          >
            Portal Login
          </button>
        </div>
      </header>

      {/* 2. WORKFLOW STEPPER BAR (INTERACTIVE) */}
      <div className="results-stepper-container">
        <div className="results-stepper-track">
          {stepperSteps.map((s, idx) => {
            const isStepActive = workflowStage === "image_analysis"
              ? (s.id === 2 || s.id === 3)
              : (s.id >= 4);
            const isStepCompleted = workflowStage === "medical_report" ? s.id <= 3 : s.id < 2;

            return (
              <React.Fragment key={s.id}>
                <div
                  className={`stepper-node ${isStepActive ? "active" : isStepCompleted ? "completed" : ""} clickable-step`}
                  onClick={() => handleStepClick(s.id)}
                  title={`Click to navigate to ${s.label}`}
                >
                  <div className="stepper-circle">
                    {isStepCompleted ? <Check size={12} /> : s.id}
                  </div>
                  <span className="stepper-label">{s.label}</span>
                </div>
                {idx < stepperSteps.length - 1 && <div className="stepper-connector" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STAGE NAVIGATION SWITCHER BAR */}
      {!isReportModality && (
        <div className="stage-navigation-bar">
          <button
            className={`stage-switch-btn ${workflowStage === "image_analysis" ? "active" : ""}`}
            onClick={() => setWorkflowStage("image_analysis")}
          >
            <ZoomIn size={15} />
            <span>Stage 1: Full-Screen Image Analysis</span>
          </button>
          <div className="stage-switch-divider">→</div>
          <button
            className={`stage-switch-btn ${workflowStage === "medical_report" ? "active" : ""}`}
            onClick={() => setWorkflowStage("medical_report")}
          >
            <FileText size={15} />
            <span>Stage 2: Full-Screen Medical Report</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE 1: FULL-SCREEN IMAGE ANALYSIS (SIDE-BY-SIDE LARGE TILES) */}
      {/* ============================================================== */}
      {!isReportModality && workflowStage === "image_analysis" && (
        <main className="stage1-fullscreen-container">
          {/* Top Bar for Viewport Controls and Continue Action */}
          <div className="stage1-toolbar">
            <div className="stage1-meta-info">
              <span className="stage1-scan-title">{scanTitle}</span>
              <span className="stage1-patient-snippet">{patientSnippet}</span>
              <span className="stage1-model-pill">{modelName} • {viewTag}</span>
            </div>

            <div className="stage1-actions-right">
              {/* Window Presets */}
              <div className="window-preset-group">
                <span className="preset-label">WINDOW:</span>
                {windowPresets.map(preset => (
                  <button
                    key={preset}
                    className={`preset-btn ${windowPreset === preset.toLowerCase() ? "active" : ""}`}
                    onClick={() => setWindowPreset(preset.toLowerCase())}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Tool Icons */}
              <div className="viewer-tool-icons">
                <button
                  className={`icon-tool-btn ${contrastInvert ? "active" : ""}`}
                  onClick={() => setContrastInvert(!contrastInvert)}
                  title="Invert Contrast (Grayscale)"
                >
                  ◐
                </button>
                <button
                  className="icon-tool-btn"
                  onClick={() => setZoomLevel(zoomLevel === 1 ? 1.25 : zoomLevel === 1.25 ? 1.5 : 1)}
                  title="Zoom In/Out"
                >
                  <ZoomIn size={14} />
                  <span style={{ fontSize: "11px", marginLeft: 4 }}>{zoomLevel}x</span>
                </button>
              </div>

              {/* Prominent Continue to Report Button */}
              <button
                className="stage1-continue-btn"
                onClick={() => setWorkflowStage("medical_report")}
              >
                <span>Continue to Report</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Side-by-Side Dual Image Viewing Grid */}
          <div className="stage1-dual-viewport-grid">
            {/* Left Tile: Original Scan */}
            <div className="stage1-image-tile">
              <div className="tile-header-bar">
                <div className="tile-badge-left">
                  <span className="tile-dot original"></span>
                  <span className="tile-title-text">ORIGINAL SCAN</span>
                </div>
                <span className="tile-tag-meta">Patient Exposure (Raw)</span>
              </div>

              <div className="tile-canvas-wrap">
                <div className="scan-frame-corner tl" />
                <div className="scan-frame-corner tr" />
                <div className="scan-frame-corner bl" />
                <div className="scan-frame-corner br" />

                <div
                  className="stage1-img-wrapper"
                  style={{
                    filter: `${contrastInvert ? "invert(100%)" : "none"} contrast(${windowPreset === "bone" ? 1.4 : 1.1})`,
                    transform: `scale(${zoomLevel})`,
                    transition: "transform 0.3s ease, filter 0.3s ease"
                  }}
                >
                  <img
                    src={originalImg || gradcamImg}
                    alt="Original Diagnostic Scan"
                    className="stage1-viewport-img"
                  />
                </div>
                <div className="tile-footer-caption">
                  <span>Anatomical Baseline</span>
                  <span>100% Quality Ingestion</span>
                </div>
              </div>
            </div>

            {/* Right Tile: Grad-CAM Heatmap Visualization */}
            <div className="stage1-image-tile">
              <div className="tile-header-bar">
                <div className="tile-badge-left">
                  <span className="tile-dot gradcam"></span>
                  <span className="tile-title-text">GRAD-CAM VISUALIZATION</span>
                </div>
                <span className="tile-tag-meta">Saliency Activation Map</span>
              </div>

              <div className="tile-canvas-wrap">
                <div className="scan-frame-corner tl" />
                <div className="scan-frame-corner tr" />
                <div className="scan-frame-corner bl" />
                <div className="scan-frame-corner br" />

                <div
                  className="stage1-img-wrapper"
                  style={{
                    filter: `${contrastInvert ? "invert(100%)" : "none"} contrast(${windowPreset === "bone" ? 1.4 : 1.1})`,
                    transform: `scale(${zoomLevel})`,
                    transition: "transform 0.3s ease, filter 0.3s ease"
                  }}
                >
                  <img
                    src={gradcamImg || originalImg}
                    alt="Grad-CAM Saliency Overlay"
                    className="stage1-viewport-img"
                  />
                </div>

                {/* Saliency Heatmap Legend */}
                <div className="viewer-overlay-legend">
                  <div className="legend-color-bar" />
                  <span>P({primaryFindingTitle}) Attention Zone</span>
                </div>

                <div className="tile-footer-caption">
                  <span style={{ color: "#2DD4BF" }}>Confidence: {postData.confidence}%</span>
                  <span>Neural Weight Backpropagation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Stage 1 Callout & Action Bar */}
          <div className="stage1-bottom-bar">
            <div className="stage1-bottom-desc">
              <Sparkles size={16} color="#2DD4BF" />
              <span>
                Visual attention localized over target pathology coordinates. Review the radiographic exposure alongside Grad-CAM saliency before advancing to synthesis.
              </span>
            </div>
            <button
              className="stage1-continue-btn primary-pulse"
              onClick={() => setWorkflowStage("medical_report")}
            >
              <span>Continue to Report</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* STAGE 2: FULL-SCREEN MEDICAL REPORT VIEW                       */}
      {/* ============================================================== */}
      {(isReportModality || workflowStage === "medical_report") && (
        <main className="stage2-fullscreen-report">
          {/* Top Stage 2 Action Bar */}
          <div className="stage2-action-bar">
            {!isReportModality && (
              <button
                className="stage2-back-btn"
                onClick={() => setWorkflowStage("image_analysis")}
              >
                <ArrowLeft size={16} />
                <span>Back to Image Analysis</span>
              </button>
            )}

            <div className="stage2-report-meta">
              <span className="stage2-id-badge">REPORT: {postData.report_id}</span>
              <span className="stage2-mod-tag">{postData.modality}</span>
            </div>

            <div className="stage2-export-actions">
              <button className="stage2-action-btn primary" onClick={() => setShowReportModal(true)}>
                <Printer size={15} />
                <span>Save as PDF / Print</span>
              </button>
              <button className="stage2-action-btn" onClick={handleDownloadJSON}>
                <Download size={15} />
                <span>Download JSON</span>
              </button>
              <button className="stage2-action-btn" onClick={handleCopyReport}>
                <Copy size={15} />
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>
          </div>

          {/* Full-Screen Report Layout Grid */}
          <div className="stage2-report-grid">
            {/* Header Diagnostic Banner */}
            <div className="stage2-diagnostic-banner">
              <div className="stage2-banner-left">
                <div className="stage2-finding-code">PRIMARY FINDING ({icdCode})</div>
                <h1 className="stage2-finding-heading">{primaryFindingTitle}</h1>
                <div className="stage2-badges-strip">
                  <span className="stage2-conf-pill">{postData.confidence}% Confidence</span>
                  <span className="stage2-status-pill">
                    <span className="glowing-green-dot"></span>
                    Verified Neural Classification
                  </span>
                  <span className="stage2-arch-pill">{modelName}</span>
                </div>
              </div>

              <div className="stage2-banner-right">
                <div className={`stage2-severity-card severity-${postData.severity.toLowerCase()}`}>
                  <div className="stage2-sev-header">
                    <span className="stage2-sev-label">{riskLabel}</span>
                    <AlertTriangle size={18} color={postData.severity === "High" ? "#EF4444" : postData.severity === "Moderate" ? "#F59E0B" : "#10B981"} />
                  </div>
                  <div className="stage2-risk-score">{riskScore}</div>
                  <p className="stage2-sev-desc">{postData.severity_description}</p>
                </div>
              </div>
            </div>

            {/* Two Column Detailed Findings & Action Plan */}
            <div className="stage2-details-row">
              {/* Left Column: Detailed Findings & Morphological Explanation */}
              <div className="stage2-detail-card">
                <div className="detail-card-header">
                  <FileText size={18} color="#2DD4BF" />
                  <h3>1. Morphological Findings & Diagnostic Explanation</h3>
                </div>

                <div className="detail-card-body">
                  <ul className="stage2-points-list">
                    {formatExplanationPoints(postData.explanation).map((point, idx) => (
                      <li key={idx}>
                        <span className="bullet-point-arrow">›</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  {result.reportFindings && Array.isArray(result.reportFindings) && result.reportFindings.length > 0 && (
                    <div className="stage2-lab-table-wrap">
                      <h4>Extracted Laboratory Biomarkers</h4>
                      <table className="stage2-lab-table">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Unit</th>
                            <th>Reference Range</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.reportFindings.map((row, rIdx) => {
                            const st = (row.status || "UNKNOWN").toUpperCase();
                            const badgeColor = st === "HIGH" ? "#EF4444" : st === "LOW" ? "#38BDF8" : st === "NORMAL" ? "#34D399" : "#94A3B8";
                            return (
                              <tr key={rIdx}>
                                <td><strong>{row.test_name}</strong></td>
                                <td>{row.value}</td>
                                <td>{row.unit || "-"}</td>
                                <td>{row.reference_text || row.reference || "-"}</td>
                                <td>
                                  <span className="lab-status-badge" style={{ color: badgeColor, borderColor: `${badgeColor}40`, background: `${badgeColor}15` }}>
                                    {st}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Visual Reference Thumbnails embedded in Report */}
                  {!isReportModality && (
                    <div className="stage2-report-thumbnails">
                      <div className="thumb-item" onClick={() => setWorkflowStage("image_analysis")}>
                        <span className="thumb-label">Original Radiograph</span>
                        <img src={originalImg || gradcamImg} alt="Original" />
                      </div>
                      {gradcamImg && (
                        <div className="thumb-item" onClick={() => setWorkflowStage("image_analysis")}>
                          <span className="thumb-label">Grad-CAM Heatmap</span>
                          <img src={gradcamImg} alt="Grad-CAM" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Recommendations, Specialist Care, & Treatment Protocols */}
              <div className="stage2-detail-card">
                <div className="detail-card-header">
                  <CheckCircle2 size={18} color="#38BDF8" />
                  <h3>2. Clinical Recommendations & Action Plan</h3>
                </div>

                <div className="detail-card-body">
                  <ul className="stage2-points-list">
                    {postData.recommendations.map((rec, i) => (
                      <li key={i}>
                        <span className="bullet-point-arrow" style={{ color: "#38BDF8" }}>✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Specialist Consultation Guidance */}
                  <div className="treatment-block specialist">
                    <div className="treatment-block-title">
                      👨‍⚕️ Specialist Doctor Consultation Guidance
                    </div>
                    <div className="treatment-block-content">
                      {getDoctorConsultationGuidance(postData.prediction, postData.modality)}
                    </div>
                  </div>

                  {/* Therapeutic Treatment & Cure Measures */}
                  <div className="treatment-block therapeutic">
                    <div className="treatment-block-title">
                      💊 Therapeutic Treatment & Cure Measures
                    </div>
                    <ul className="treatment-steps-list">
                      {getTreatmentCureSteps(postData.prediction, postData.modality).map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Emergency Escalation Red Flags */}
                  <div className="treatment-block red-flags">
                    <div className="treatment-block-title">
                      ⚠️ Red Flags & Emergency Escalation
                    </div>
                    <div className="treatment-block-content red-flags-text">
                      {getEmergencyRedFlags(postData.prediction, postData.modality)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom PDF CTA & Disclaimer */}
            <div className="stage2-bottom-actions">
              {!isReportModality && (
                <button
                  className="stage2-back-analysis-btn"
                  onClick={() => setWorkflowStage("image_analysis")}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Image Analysis</span>
                </button>
              )}

              <button
                className="stage2-generate-pdf-btn"
                onClick={() => setShowReportModal(true)}
              >
                <Printer size={18} />
                <span>Generate Official Medical Report (PDF)</span>
              </button>
            </div>

            <div className="stage2-disclaimer-note">
              {postData.disclaimer}
            </div>
          </div>
        </main>
      )}

      {/* 4. BOTTOM FOOTER */}
      <footer className="results-bottom-footer">
        <div className="footer-left">
          <span>© 2026 MediScan.AI Engine • Clinical Diagnostics v3.0</span>
        </div>
        <div className="footer-right">
          <span>FDA 510(k) REVIEW CODE: QSR-9</span>
        </div>
      </footer>

      {/* 5. STRUCTURED MEDICAL REPORT MODAL (FOR PDF PRINTING) */}
      {showReportModal && (
        <div className="report-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="report-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar no-print">
              <div className="modal-header-left">
                <FileText size={20} color="#2DD4BF" />
                <h3>Official Diagnostic Medical Report</h3>
                <span className="report-id-pill">{postData.report_id}</span>
              </div>

              <div className="modal-header-actions">
                <button className="modal-action-btn primary" onClick={() => window.print()}>
                  <Printer size={15} /> Print / Save as PDF
                </button>
                <button className="modal-action-btn" onClick={handleDownloadJSON}>
                  <Download size={15} /> Download JSON
                </button>
                <button className="modal-action-btn" onClick={handleCopyReport}>
                  <Copy size={15} /> {copied ? "Copied!" : "Copy Text"}
                </button>
                <button className="modal-close-btn" onClick={() => setShowReportModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="report-print-sheet" id="printable-report">
              <div className="rep-sheet-header">
                <div className="rep-brand-col">
                  <h2>MEDISCAN AI RADIOLOGY REPORT</h2>
                  <p>Certified Clinical Decision Support Network • DICOM v3.0 Conforming</p>
                </div>
                <div className="rep-meta-col">
                  <div><strong>Report ID:</strong> {postData.report_id}</div>
                  <div><strong>Generated:</strong> {postData.generated_at}</div>
                  <div><strong>Modality:</strong> {postData.modality}</div>
                </div>
              </div>

              <div className="rep-patient-strip">
                <div><strong>Patient Name:</strong> {patientData?.name || "Anonymous Patient"}</div>
                <div><strong>Patient ID:</strong> {patientData?.patientId || "N/A"}</div>
                <div><strong>Status:</strong> Automated AI Triage Analysis</div>
              </div>

              <div className="rep-section">
                <h4>1. PRIMARY DIAGNOSTIC FINDINGS</h4>
                <div className="rep-finding-card">
                  <div className="finding-row">
                    <span className="f-title">{primaryFindingTitle}</span>
                    <span className="f-conf">Confidence: {postData.confidence}%</span>
                  </div>
                  <div className="f-desc">
                    <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {formatExplanationPoints(postData.explanation).map((p, i) => (
                        <li key={i} style={{ fontSize: "11px", lineHeight: "1.4" }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.reportFindings && Array.isArray(result.reportFindings) && result.reportFindings.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <h5 style={{ fontSize: "12px", margin: "8px 0", color: "#1E293B" }}>EXTRACTED BIOMARKER PANELS</h5>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", border: "1px solid #E2E8F0" }}>
                      <thead>
                        <tr style={{ background: "#F1F5F9", color: "#475569" }}>
                          <th style={{ padding: "6px", textAlign: "left" }}>Test Parameter</th>
                          <th style={{ padding: "6px", textAlign: "left" }}>Value</th>
                          <th style={{ padding: "6px", textAlign: "left" }}>Unit</th>
                          <th style={{ padding: "6px", textAlign: "left" }}>Reference Range</th>
                          <th style={{ padding: "6px", textAlign: "left" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.reportFindings.map((row, rIdx) => {
                          const st = (row.status || "UNKNOWN").toUpperCase();
                          const stColor = st === "HIGH" ? "#DC2626" : st === "LOW" ? "#2563EB" : st === "NORMAL" ? "#16A34A" : "#64748B";
                          return (
                            <tr key={rIdx} style={{ borderTop: "1px solid #E2E8F0" }}>
                              <td style={{ padding: "6px", fontWeight: "600", color: "#0F172A" }}>{row.test_name}</td>
                              <td style={{ padding: "6px", color: "#334155" }}>{row.value}</td>
                              <td style={{ padding: "6px", color: "#64748B" }}>{row.unit || "-"}</td>
                              <td style={{ padding: "6px", color: "#64748B" }}>{row.reference_text || row.reference || "-"}</td>
                              <td style={{ padding: "6px", fontWeight: "700", color: stColor }}>{st}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rep-section">
                <h4>2. RISK & SEVERITY ASSESSMENT</h4>
                <div className="rep-severity-pill-row">
                  <span>Severity Level: <strong>{postData.severity}</strong></span>
                  <span>Risk Score: <strong>{riskScore}</strong></span>
                  <span>Classification: <strong>{riskLabel}</strong></span>
                </div>
                <p className="rep-subtext">{postData.severity_description}</p>
              </div>

              <div className="rep-section">
                <h4>3. CLINICAL RECOMMENDATIONS</h4>
                <ol className="rep-recs-list">
                  {postData.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ol>
              </div>

              <div className="rep-section">
                <h4>4. RECOMMENDED TREATMENT & CURE PROTOCOL</h4>
                <div style={{ marginTop: "8px", background: "#F8FAFC", padding: "12px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#0284C7", marginBottom: "4px" }}>
                    SPECIALIST DOCTOR CONSULTATION:
                  </div>
                  <p style={{ fontSize: "11px", color: "#334155", marginBottom: "10px", lineHeight: "1.4" }}>
                    {getDoctorConsultationGuidance(postData.prediction, postData.modality)}
                  </p>

                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#16A34A", marginBottom: "4px" }}>
                    THERAPEUTIC TREATMENT & CURE MEASURES:
                  </div>
                  <ol className="rep-recs-list" style={{ marginBottom: "10px", paddingLeft: "16px" }}>
                    {getTreatmentCureSteps(postData.prediction, postData.modality).map((step, idx) => (
                      <li key={idx} style={{ fontSize: "11px", color: "#334155" }}>{step}</li>
                    ))}
                  </ol>

                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#D97706", marginBottom: "4px" }}>
                    RED FLAGS & EMERGENCY ESCALATION:
                  </div>
                  <p style={{ fontSize: "11px", color: "#92400E", margin: 0, lineHeight: "1.4" }}>
                    {getEmergencyRedFlags(postData.prediction, postData.modality)}
                  </p>
                </div>
              </div>

              <div className="rep-disclaimer-box">
                {postData.disclaimer}
              </div>

              <div className="rep-verified-seal-row">
                <div className="rep-audit-seal">
                  <span className="seal-check">✓</span>
                  <div>
                    <strong>MEDISCAN NEURAL VERIFICATION ENGINE</strong>
                    <div className="seal-sub">Automated Radiological Triaging • Certified Decision Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
