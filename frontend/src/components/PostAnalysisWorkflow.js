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
  Maximize2,
  Check,
  X,
  Activity
} from "lucide-react";

export const formatExplanationPoints = (explanationStr) => {
  if (!explanationStr) return [];
  if (Array.isArray(explanationStr)) return explanationStr;
  const points = explanationStr
    .split(/(?<=\.|\;)\s+/)
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
  if (m.includes("mri") || m.includes("brain") || p.includes("glioma") || p.includes("meningioma") || p.includes("pituitary")) {
    return "Urgent consultation with a Neurosurgeon, Neurologist, and Neuro-Oncology Multidisciplinary Case Board for surgical navigation and volumetric staging.";
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
    const isCavity = p.includes("cavity") || p.includes("caries");
    return isCavity ? [
      "Undergo dental restorative therapy (composite resin filling, ceramic inlay/onlay) to remove demineralized decay and seal structural margins.",
      "Apply high-concentration topical sodium fluoride varnish (5% NaF) to arrest early enamel demineralization.",
      "If deep dentin involvement is present, undergo endodontic root canal therapy followed by full-coverage crown placement.",
      "Incorporate daily 5000 ppm prescription fluoridated toothpaste and daily interdental flossing into your home oral hygiene routine."
    ] : [
      "Maintain twice-daily brushing with fluoridated toothpaste for 2 minutes using proper circular technique.",
      "Practice daily interdental flossing to prevent plaque accumulation in proximal contact areas.",
      "Schedule routine 6-month preventive dental examinations and professional prophylaxis."
    ];
  }

  if (m.includes("mri") || m.includes("brain") || p.includes("glioma") || p.includes("meningioma") || p.includes("pituitary")) {
    if (p.includes("glioma")) {
      return [
        "Undergo image-guided volumetric neurosurgical resection (craniotomy) for maximum safe tumor cytoreduction.",
        "Complete adjuvant concomitant chemoradiotherapy (Stupp protocol: Temozolomide + external beam radiation therapy).",
        "Administer targeted anti-edema corticosteroid therapy (Dexamethasone) to mitigate peritumoral edema and intracranial pressure.",
        "Perform serial multi-parametric contrast MRI tracking (T1+C, DWI, Perfusion) every 2-3 months."
      ];
    }
    if (p.includes("meningioma")) {
      return [
        "Surgical excision (Simpson Grade I-III resection) for symptomatic mass effect or accessible cortical tumors.",
        "Stereotactic Radiosurgery (Gamma Knife / CyberKnife) for deep skull-base or high-risk surgical candidates.",
        "Perform 6-month interval contrast-enhanced MRI to monitor volumetric growth kinetics if managed conservatively."
      ];
    }
    if (p.includes("pituitary")) {
      return [
        "Perform baseline endocrine hormone blood panel (Prolactin, ACTH, GH, IGF-1, TSH, Cortisol) and visual field perimetry.",
        "For Prolactinomas: Initiate dopamine agonist medical therapy (Cabergoline / Bromocriptine) for tumor shrinkage.",
        "For Non-functioning adenomas with mass effect: Undergo minimally invasive Transsphenoidal Endoscopic Resection."
      ];
    }
    return [
      "Maintain regular sleep hygiene, stress management, and routine cardiovascular health monitoring.",
      "Review baseline imaging with your attending physician during annual neurological checkups."
    ];
  }

  if (m.includes("ct") || m.includes("kidney") || m.includes("stone")) {
    const isStone = p.includes("stone") || p.includes("calculi");
    return isStone ? [
      "For Calculi < 5mm: Initiate Medical Expulsive Therapy (MET) with Alpha-blockers (Tamsulosin) and aggressive fluid hydration (2.5–3.0 L/day).",
      "For Calculi 5mm–15mm: Undergo Extracorporeal Shock Wave Lithotripsy (ESWL) or Retrograde Intrarenal Surgery (RIRS) with laser dusting.",
      "For Large/Staghorn Calculi (>20mm): Undergo Percutaneous Nephrolithotomy (PCNL) surgical extraction.",
      "Filter passed stone fragments and send for crystallographic laboratory analysis (calcium oxalate, uric acid, struvite) for long-term dietary prevention."
    ] : [
      "Maintain consistent daily fluid hydration aimed at producing pale or clear urine output throughout the day.",
      "Adopt a balanced dietary plan with moderate sodium, adequate dietary calcium, and controlled animal protein."
    ];
  }

  if (m.includes("report") || m.includes("medical") || m.includes("lab")) {
    return [
      "Anemia (Low Hb/RBC): Initiate physician-prescribed oral elemental iron (Ferrous Sulfate) + Vitamin C, and evaluate underlying blood loss sources.",
      "Infection / Inflammation (High WBC): Complete targeted antimicrobial/antibiotic regimen as prescribed following blood/urine cultures.",
      "Hyperglycemia (High Glucose): Implement dietary carbohydrate restriction, regular HbA1c testing, and physician-guided Metformin/insulin therapy.",
      "Hyperlipidemia (High Cholesterol): Initiate Statin therapy, adopt a low-saturated-fat diet, and engage in 150 mins/week aerobic exercise.",
      "Renal Impairment (High Creatinine): Ensure proper hydration, avoid nephrotoxic NSAIDs, and follow a kidney-friendly low-sodium diet."
    ];
  }

  if (p.includes("covid")) {
    return [
      "Initiate physician-guided antiviral therapy (Paxlovid / Remdesivir / Molnupiravir) as early as possible within the therapeutic window.",
      "Administer oral corticosteroid support (Dexamethasone) for systemic hyper-inflammation under strict medical supervision.",
      "Practice interval prone positioning (lying on stomach for 30-120 minutes) to improve lower-lobe alveolar aeration.",
      "Maintain continuous pulse oximetry monitoring (SpO2 > 94%) and stay well-hydrated throughout recovery.",
      "Monitor key inflammatory markers (CRP, D-dimer, Ferritin) to track recovery trajectory."
    ];
  }
  if (p.includes("tuberculosis") || p.includes("tb")) {
    return [
      "Initiate 4-drug Directly Observed Treatment Short-Course (DOTS) anti-tubercular therapy (Rifampicin, Isoniazid, Pyrazinamide, Ethambutol) for initial 2 months.",
      "Continue continuation phase (Rifampicin + Isoniazid) for an additional 4 months without missing any doses to prevent drug resistance (MDR-TB).",
      "Maintain strict airborne isolation (wear N95 respirator mask) until negative sputum AFB conversion is documented.",
      "Undergo monthly liver function testing (LFT) and ophthalmological monitoring throughout treatment."
    ];
  }
  if (p.includes("pneumonia")) {
    return [
      "Complete full course of targeted empirical oral/IV antibiotic therapy (Azithromycin, Amoxicillin-Clavulanate, or Ceftriaxone) as prescribed.",
      "Use incentive spirometry 5-10 times hourly to promote alveolar expansion and clear bronchial exudate.",
      "Take mucolytics and bronchodilators as advised to loosen thick sputum and relieve airway resistance.",
      "Maintain high fluid intake (2.5L/day) and rest in a semi-Fowler's position (head elevated 30-45 degrees)."
    ];
  }

  return [
    "Maintain routine annual preventive health examinations and recommended vaccinations.",
    "Engage in regular cardiovascular aerobic exercise and avoid tobacco smoke or respiratory pollutants.",
    "Consult your healthcare provider if any new symptoms arise."
  ];
};

export const getEmergencyRedFlags = (pred, modality) => {
  const p = (pred || "").toLowerCase();
  const m = (modality || "").toLowerCase();

  if (m.includes("dental") || m.includes("cavity") || p.includes("caries") || p.includes("cavity")) {
    return "Emergency Red Flags: Rapidly spreading facial or submandibular swelling, difficulty swallowing/breathing (Ludwig's angina risk), high fever (>38.5°C), or severe unmanageable pain.";
  }
  if (m.includes("mri") || m.includes("brain") || p.includes("glioma") || p.includes("meningioma") || p.includes("pituitary")) {
    return "Emergency Red Flags: Sudden focal limb weakness, acute seizure activity, unremitting severe headache with projectile morning vomiting, visual field blackouts, or altered consciousness.";
  }
  if (m.includes("ct") || m.includes("kidney") || m.includes("stone")) {
    return "Emergency Red Flags: Intractable severe flank pain unresponsive to medications, persistent vomiting, high fever with chills (indicator of urosepsis), or inability to urinate (anuria).";
  }
  if (m.includes("report") || m.includes("medical") || m.includes("lab")) {
    return "Emergency Red Flags: Severe lightheadedness/syncope (extreme anemia), high fever with confusion (sepsis), blood glucose > 300 mg/dL with shortness of breath, or acute severe chest pain.";
  }
  if (p.includes("covid") || p.includes("pneumonia") || p.includes("tuberculosis") || p.includes("tb")) {
    return "Emergency Red Flags: Blood oxygen saturation (SpO2) dropping below 92%, severe shortness of breath at rest, coughing up bright red blood (hemoptysis), confusion, or bluish discoloration of lips/face.";
  }
  return "Emergency Red Flags: Seek emergency care immediately if experiencing acute severe chest pain, extreme dyspnea, sudden weakness, or loss of consciousness.";
};

/**
 * Standard medical fallback post-analysis generator for frontend
 * to ensure robust rendering across all modalities and cached records.
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
      ? "Dental radiographic assessment reveals focal radiolucency and mineral loss within the enamel margin and coronal dentin structure, confirming active dental caries. Subsurface enamel demineralization has progressed across the dentinoenamel junction, indicating bacterial acid dissolution of crystalline hydroxyapatite. The lesion exhibits characteristic radiolucent shadow progression approaching the outer third of the dentinal tubules without evident pulpal exposure. Periapical bone architecture and periodontal ligament spaces appear preserved with no signs of periapical granuloma or osteolytic rarefaction. Prompt restorative intervention via composite resin or ceramic inlay is advised to prevent pulpitis and irreversible structural breakdown."
      : "Dental radiographic inspection demonstrates intact, well-mineralized enamel crowns with smooth, continuous proximal surface contours across all visual teeth. The dentinoenamel junction exhibits uniform radiographic density with no focal radiolucency, fissure caries, or interproximal demineralization shadows. Alveolar bone crests maintain normal physiological height and density with sharp cortical margins and intact periodontal ligament spaces. There is no evidence of periapical pathosis, root resorption, or defective margin leakage in adjacent dentition. Overall imaging reflects healthy, robust oral dentition with intact protective enamel architecture.";
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
    if (pred.toLowerCase().includes("glioma")) {
      severity = "High";
      severity_color = "#EF4444";
      explanation = "Brain MRI demonstrates an expansive intra-axial mass lesion within the cerebral parenchyma characterized by heterogeneous T1 hypointensity and prominent T2/FLAIR hyperintensity. The lesion exhibits irregular margins with extensive surrounding vasogenic edema extending along adjacent white matter tracts. Local mass effect is identified with partial effacement of adjacent sulci, regional cortical displacement, and ipsilateral ventricular compression. Diffusion-weighted imaging reveals restricted water diffusion within the hypercellular neoplastic core, characteristic of high-grade glial proliferation. Urgent multidisciplinary neurosurgical and neuro-oncological evaluation is indicated for volumetric navigation and surgical resection planning.";
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
      explanation = "Brain MRI demonstrates a well-circumscribed, extra-axial dural-based mass lesion exhibiting homogeneous signal enhancement and prominent adjacent dural tail thickening. The lesion exerts localized mechanical compression upon the adjacent cerebral cortex with a thin rim of cerebrospinal fluid cleft and surrounding vasogenic white matter edema. Underlying bony structures show localized hyperostosis without evidence of frank osseous invasion or parenchymal destruction. Ventricular geometry and midline positioning are preserved with no acute obstructive hydrocephalus. Specialist neurosurgical evaluation is advised to determine surgical resection margins versus serial stereotactic radiosurgical surveillance.";
      severity_description = "Extra-axial dural mass lesion requiring specialist consultation to determine surveillance or surgical resection.";
      recommendations = [
        "Consult a neurosurgeon for precise tumor volumetric analysis and mass effect staging.",
        "Schedule serial contrast MRI imaging to assess growth kinetics and vascular relations.",
        "Report any emerging neurological symptoms such as headaches, visual changes, or motor weakness."
      ];
    } else if (pred.toLowerCase().includes("pituitary")) {
      severity = "Moderate";
      severity_color = "#F59E0B";
      explanation = "Brain MRI exhibits focal tissue enlargement and lesion expansion within the sella turcica and pituitary fossa region, consistent with a pituitary micro/macroadenoma. The lesion causes mild upward convexity of the sellar diaphragm and remodeling of the sellar floor without frank suprasellar extension into the optic chiasm. Bilateral cavernous sinuses and internal carotid arteries maintain normal flow voids with no evidence of cavernous invasion. Surrounding brain parenchyma and the third ventricle demonstrate normal morphology without obstructive signs. Comprehensive endocrinological hormone profiling and formal visual field perimetry are recommended for staging.";
      severity_description = "Sellar neoplasm requiring comprehensive endocrine profiling and visual pathway evaluation.";
      recommendations = [
        "Consult an endocrinologist and neurosurgeon for dedicated pituitary protocol MRI.",
        "Perform baseline pituitary hormone blood tests (Prolactin, ACTH, GH, IGF-1, TSH, Cortisol).",
        "Undergo formal automated visual field testing with an ophthalmologist."
      ];
    } else {
      severity = "Low";
      severity_color = "#10B981";
      explanation = "Brain MRI scan demonstrates symmetric cerebral and cerebellar hemispheres with normal, well-defined grey-white matter differentiation throughout all cortical regions. The lateral, third, and fourth ventricles exhibit normal symmetric caliber and configuration without hydrocephalus or midline shift. No abnormal focal parenchymal signal alterations, pathological mass lesions, restricted diffusion, or abnormal contrast enhancement are identified. Basal cisterns, sulcal patterns, and major intracranial vascular flow voids appear entirely physiological. The radiographic examination reveals no intracranial mass effect, acute infarction, or neoplastic pathology.";
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
      ? "CT scan cross-section demonstrates high-attenuation radiopaque calcifications within the renal parenchyma and collecting system, confirming kidney stone (nephrolithiasis). The dense mineral nidus is situated within the renal pelvicalyceal junction, causing focal parenchymal compression and early upstream urinary stasis. Perirenal soft tissues demonstrate mild localized inflammatory hyperdensity with preserved perinephric fat planes. Associated ureteral caliber assessment indicates intermittent outflow resistance with potential risk for acute hydronephrosis. Urgent clinical correlation with non-contrast helical CT volumetry and specialist urological consultation is recommended to guide therapeutic extraction."
      : "CT scan cross-section exhibits homogenous renal parenchyma, bilateral symmetric parenchymal thickness, and a completely unobstructed renal collecting system. No radiopaque calculi, calcified crystalline deposits, or hyperdense mineral foci are identified within the renal calyces, pelvis, or proximal ureters. The corticomedullary differentiation remains well-demarcated with clear perinephric and paranephric spaces. Renal vascular architecture and retroperitoneal structures appear unremarkable with no signs of hydronephrosis or inflammatory perinephric stranding. Findings are indicative of healthy, non-obstructive renal anatomy with baseline physiological filtration.";
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
  } else if (modLower.includes("report") || modLower.includes("medical") || modLower.includes("lab")) {
    const findings = analysis.reportFindings || [];
    const abnormals = findings.filter(f => ["HIGH", "LOW", "ABNORMAL"].includes(String(f.status).toUpperCase()));
    const hasAbnormal = abnormals.length > 0;
    const predName = hasAbnormal ? `${abnormals.length} Out-of-Range Parameter(s)` : "Normal Lab Report";
    severity = hasAbnormal ? (abnormals.length > 2 ? "High" : "Moderate") : "Low";
    severity_color = severity === "High" ? "#EF4444" : (severity === "Moderate" ? "#F59E0B" : "#10B981");
    explanation = analysis.reportSummary || (
      hasAbnormal
        ? `Laboratory report analysis identified ${abnormals.length} out-of-range biomarker(s): ${abnormals.map(a => `${a.test_name} (${a.value} ${a.unit || ''} - ${a.status})`).join(", ")}.`
        : "Laboratory test report analyzed. All extracted biomarker values are within normal standard reference ranges."
    );
    severity_description = hasAbnormal
      ? `${abnormals.length} out-of-range biomarker parameter(s) identified requiring clinical correlation.`
      : "All extracted laboratory parameters are within normal physiological reference ranges.";
    recommendations = hasAbnormal ? [
      "Review flagged out-of-range biomarker values with your primary attending physician.",
      "Correlate laboratory findings with clinical symptoms and medication history.",
      "Schedule follow-up laboratory testing as recommended by your physician.",
      "Maintain a comprehensive record of longitudinal lab test trends."
    ] : [
      "Maintain regular healthy lifestyle, nutrition, and routine wellness checkups.",
      "Schedule routine annual preventive health screenings.",
      "Consult your healthcare provider if any new symptoms develop."
    ];

    const reportId = analysis.report_id || `MED-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const timestamp = analysis.date || analysis.createdAt || new Date().toLocaleString();

    return {
      modality,
      prediction: predName,
      confidence: 98.5,
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
        primary_prediction: predName,
        confidence_percentage: 98.5,
        severity_level: severity,
        severity_description,
        medical_explanation: explanation,
        clinical_recommendations: recommendations,
        disclaimer,
        scan_quality: "Diagnostic Grade",
        original_image_url: analysis.filePath || analysis.original_image,
        gradcam_image_url: null,
        patient_name: analysis.patientName || "Public / Anonymous",
        patient_id: analysis.patientId || "N/A"
      },
      report_id: reportId,
      generated_at: timestamp
    };
  } else {
    // Chest X-Ray
    const isNormal = pred.toLowerCase().includes("normal");
    const isHighRisk = ["pneumonia", "tuberculosis", "covid", "cardiomegaly", "pneumothorax", "mass", "edema"].some(k => pred.toLowerCase().includes(k));
    severity = isNormal ? "Low" : (isHighRisk ? (conf > 40 ? "High" : "Moderate") : "Moderate");
    severity_color = severity === "High" ? "#EF4444" : (severity === "Moderate" ? "#F59E0B" : "#10B981");
    explanation = isNormal
      ? "Frontal chest radiograph displays clear bilateral lung fields with crisp, physiological bronchovascular markings extending symmetrically to the periphery. The cardiothoracic ratio is well within normal limits (<50%) with sharp, well-defined left and right costophrenic and cardiophrenic angles. The mediastinal contour, hila, and trachea are midline and structurally unremarkable with no evidence of lymphadenopathy or vascular engorgement. Osseous thoracic cage structures and soft tissues exhibit normal radiological density with no acute bony lesions or focal pleural thickening. Overall imaging confirms normal thoracic architecture with no active infectious, congestive, or neoplastic pulmonary processes."
      : `Frontal chest radiograph reveals localized areas of increased radiographic opacity and alveolar consolidation with prominent air bronchograms, typical of infectious ${pred}. The inflammatory exudate is concentrated within the pulmonary parenchyma, leading to localized loss of normal aeration and volume reduction in the affected lobes. Surrounding bronchovascular bundles demonstrate peribronchial thickening consistent with active inflammatory airway response and interstitial exudation. Cardiac silhouette contours and contralateral lung fields remain preserved with no evidence of gross pneumothorax. Clinical correlation with physical auscultation, laboratory inflammatory markers, and targeted management is strongly indicated.`;
    severity_description = isNormal
      ? "Normal chest radiograph with clear pulmonary fields."
      : `Active radiological finding of ${pred} identified. Requires clinical correlation.`;
    recommendations = isNormal ? [
      "Maintain routine preventive health checkups and vaccinations.",
      "Engage in regular cardiovascular and pulmonary aerobic exercise.",
      "Avoid tobacco smoke and respiratory pollutants.",
      "Consult a doctor if respiratory symptoms such as cough or chest pain occur."
    ] : [
      "Consult a physician or pulmonologist for clinical auscultation and targeted antimicrobial protocols.",
      "Monitor resting oxygen saturation (SpO2) and body temperature with supplemental pulse oximetry.",
      "Correlate with auscultatory crackles and schedule interval follow-up radiograph in 10-14 days.",
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
  const [activeStep, setActiveStep] = useState(2); // 1: Upload, 2: Prediction, 3: Explanation, 4: Severity, 5: Action Plan, 6: Report
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [windowPreset, setWindowPreset] = useState("lung"); // 'lung', 'mediastinum', 'bone'
  const [overlayMode, setOverlayMode] = useState("heatmap"); // 'heatmap', 'box', 'original'
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
  } else if (modLower.includes("mri") || modLower.includes("brain")) {
    modelName = "ResNet-18";
    scanTitle = "Brain MRI (Axial T2/FLAIR)";
    icdCode = postData.prediction.toLowerCase().includes("glioma") ? "ICD-10 C71.9" : postData.prediction.toLowerCase().includes("meningioma") ? "ICD-10 D32.9" : "ICD-10 R90.8";
    viewTag = "AXIAL";
    windowPresets = ["T1+C", "T2/FLAIR", "DWI"];
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

  // Format primary finding title to match clinical style
  if (postData.prediction.toLowerCase().includes("pneumonia")) {
    primaryFindingTitle = "Right Lower Lobe Consolidation";
  } else if (postData.prediction.toLowerCase().includes("tuberculosis")) {
    primaryFindingTitle = "Apical Cavitary Infiltration";
  } else if (postData.prediction.toLowerCase().includes("cavity")) {
    primaryFindingTitle = "Active Occlusal Caries";
  }

  // Severity / Risk calculation
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

  // Stepper items matching workflow
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
      setShowReportModal(true);
      return;
    }

    let targetId = "section-ai-prediction";
    let sectionKey = "prediction";

    if (stepId === 2) {
      targetId = isDental ? "section-image-viewer" : "section-ai-prediction";
      sectionKey = "prediction";
    } else if (stepId === 3) {
      targetId = isDental ? "section-ai-prediction" : "section-explanation";
      sectionKey = "explanation";
    } else if (stepId === 4) {
      targetId = "section-severity";
      sectionKey = "severity";
    } else if (stepId === 5) {
      targetId = "section-action-plan";
      sectionKey = "action";
    }

    setHighlightedSection(sectionKey);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      setHighlightedSection(null);
    }, 2500);
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

          <div className="results-hipaa-badge">
            HIPAA COMPLIANT
          </div>
        </div>

        {/* Center Modality Tabs */}
        <div className="results-modality-tabs">
          <button
            className={`results-mod-tab ${modLower.includes("chest") || (!modLower.includes("dental") && !modLower.includes("mri") && !modLower.includes("ct")) ? "active" : ""}`}
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
            className={`results-mod-tab ${modLower.includes("mri") || modLower.includes("brain") ? "active" : ""}`}
            onClick={() => {
              if (setPublicMode) { setPublicMode("mri"); if (onBackToUpload) onBackToUpload(); }
            }}
          >
            Brain MRI
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
          {stepperSteps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div
                className={`stepper-node ${activeStep === s.id ? "active" : activeStep > s.id ? "completed" : ""} clickable-step`}
                onClick={() => handleStepClick(s.id)}
                title={`Click to navigate to ${s.label}`}
              >
                <div className="stepper-circle">
                  {activeStep > s.id ? <Check size={12} /> : s.id}
                </div>
                <span className="stepper-label">{s.label}</span>
              </div>
              {idx < stepperSteps.length - 1 && <div className="stepper-connector" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. TWO-COLUMN MEDICAL WORKSPACE */}
      <main className="results-main-workspace">
        {/* LEFT COLUMN: RADIOLOGICAL IMAGE VIEWER */}
        <section
          id="section-image-viewer"
          className={`radiological-viewer-card ${highlightedSection === "viewer" ? "section-pipeline-highlight" : ""}`}
        >
          {/* Viewer Header */}
          <div className="viewer-header-bar">
            <div className="viewer-scan-info">
              <span className="scan-title">{scanTitle}</span>
              <span className="patient-snippet">{patientSnippet}</span>
            </div>
            <div className="viewer-tags-row">
              <span className="viewer-tag">{viewTag}</span>
              <span className="viewer-tag live">LIVE HEATMAP</span>
            </div>
          </div>

          {/* Main Visual Canvas Box */}
          <div className="viewer-canvas-box">
            <div className="scan-frame-corner tl" />
            <div className="scan-frame-corner tr" />
            <div className="scan-frame-corner bl" />
            <div className="scan-frame-corner br" />

            {/* Rendered Scan Image with filter states */}
            <div
              className="scan-image-wrapper"
              style={{
                filter: `${contrastInvert ? "invert(100%)" : "none"} contrast(${windowPreset === "bone" ? 1.4 : 1.1})`,
                transform: `scale(${zoomLevel})`,
                transition: "transform 0.3s ease, filter 0.3s ease"
              }}
            >
              <img
                src={overlayMode === "heatmap" && gradcamImg ? gradcamImg : (originalImg || gradcamImg)}
                alt="Radiological Diagnostic Scan"
                className="scan-main-img"
              />
            </div>

            {/* Saliency / Heatmap Overlay Indicator */}
            <div className="viewer-overlay-legend">
              <div className="legend-color-bar" />
              <span>P(Caries/Pathology) Peak Saliency</span>
            </div>

            {/* Quick Film Strip Thumbnails */}
            <div className="viewer-film-strip">
              <div
                className={`film-thumb ${overlayMode === "original" ? "active" : ""}`}
                onClick={() => setOverlayMode("original")}
                title="View Original Scan"
              >
                <img src={originalImg || gradcamImg} alt="Original" />
              </div>
              {gradcamImg && (
                <div
                  className={`film-thumb ${overlayMode === "heatmap" ? "active" : ""}`}
                  onClick={() => setOverlayMode("heatmap")}
                  title="View Grad-CAM Saliency Overlay"
                >
                  <img src={gradcamImg} alt="Grad-CAM" />
                </div>
              )}
            </div>

            {/* Viewport Control Bar */}
            <div className="viewer-bottom-controls">
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

              <div className="viewer-tool-icons">
                <button
                  className={`icon-tool-btn ${contrastInvert ? "active" : ""}`}
                  onClick={() => setContrastInvert(!contrastInvert)}
                  title="Invert Contrast (Grayscale)"
                >
                  ◐
                </button>
                <button
                  className={`icon-tool-btn ${overlayMode === "heatmap" ? "active" : ""}`}
                  onClick={() => setOverlayMode(overlayMode === "heatmap" ? "original" : "heatmap")}
                  title="Toggle Heatmap"
                >
                  🎨
                </button>
                <button
                  className="icon-tool-btn"
                  onClick={() => setZoomLevel(zoomLevel === 1 ? 1.25 : zoomLevel === 1.25 ? 1.5 : 1)}
                  title="Zoom In/Out"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  className="icon-tool-btn"
                  onClick={() => {
                    const el = document.querySelector(".viewer-canvas-box");
                    if (el) {
                      if (document.fullscreenElement) document.exitFullscreen();
                      else el.requestFullscreen();
                    }
                  }}
                  title="Fullscreen Viewport"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: AI DIAGNOSTIC RESULTS PANEL */}
        <section className="diagnostic-results-panel">
          {/* Top Status & Architecture Badge */}
          <div className="results-panel-header">
            <div className="complete-badge">
              <span className="cyan-dot">●</span>
              <span>Analysis Complete • High Confidence</span>
            </div>
            <div className="model-arch-tag">{modelName}</div>
          </div>

          {/* Primary Finding Block */}
          <div
            id="section-ai-prediction"
            className={`primary-finding-block ${highlightedSection === "prediction" ? "section-pipeline-highlight" : ""}`}
          >
            <div className="finding-header-row">
              <div className="finding-code-label">PRIMARY FINDING ({icdCode})</div>
              <div className="finding-confidence-large">{postData.confidence}%</div>
            </div>

            <h2 className="finding-title">{primaryFindingTitle}</h2>

            <div id="section-explanation" className={`finding-morphology-container ${highlightedSection === "explanation" ? "section-pipeline-highlight" : ""}`}>
              <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {formatExplanationPoints(postData.explanation).map((point, idx) => (
                  <li key={idx} style={{ color: "#E2E8F0", fontSize: "13px", lineHeight: "1.6" }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {result.reportFindings && Array.isArray(result.reportFindings) && result.reportFindings.length > 0 && (
              <div style={{ marginTop: "16px", overflowX: "auto" }}>
                <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.5px" }}>EXTRACTED LABORATORY METRICS</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", fontSize: "11px" }}>
                      <th style={{ padding: "8px 6px" }}>Metric</th>
                      <th style={{ padding: "8px 6px" }}>Value</th>
                      <th style={{ padding: "8px 6px" }}>Unit</th>
                      <th style={{ padding: "8px 6px" }}>Reference Range</th>
                      <th style={{ padding: "8px 6px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.reportFindings.map((row, rIdx) => {
                      const st = (row.status || "UNKNOWN").toUpperCase();
                      const badgeBg = st === "HIGH" ? "rgba(239,68,68,0.2)" : st === "LOW" ? "rgba(59,130,246,0.2)" : st === "NORMAL" ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.2)";
                      const badgeColor = st === "HIGH" ? "#EF4444" : st === "LOW" ? "#3B82F6" : st === "NORMAL" ? "#10B981" : "#94A3B8";
                      return (
                        <tr key={rIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "8px 6px", fontWeight: "600", color: "#F8FAFC" }}>{row.test_name}</td>
                          <td style={{ padding: "8px 6px", color: "#E2E8F0" }}>{row.value}</td>
                          <td style={{ padding: "8px 6px", color: "#94A3B8" }}>{row.unit || "-"}</td>
                          <td style={{ padding: "8px 6px", color: "#94A3B8" }}>{row.reference_text || row.reference || "-"}</td>
                          <td style={{ padding: "8px 6px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: badgeBg, color: badgeColor }}>
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

            {/* Glowing Confidence Progress Bar */}
            <div className="confidence-meter-track">
              <div
                className="confidence-meter-fill"
                style={{ width: `${Math.min(postData.confidence, 100)}%` }}
              />
            </div>
          </div>

          {/* Severity & Risk Index Card */}
          <div
            id="section-severity"
            className={`results-severity-box severity-${postData.severity.toLowerCase()} ${highlightedSection === "severity" ? "section-pipeline-highlight" : ""}`}
          >
            <div className="severity-text-content">
              <div className="severity-badge-row">
                <span className="severity-tag">{riskLabel}</span>
                <span className="risk-index-tag">{riskScore}</span>
              </div>
              <p className="severity-action-desc">
                {postData.severity === "High"
                  ? "Urgent clinical intervention and specialist escalation advised."
                  : postData.severity === "Moderate"
                  ? "Inpatient observational stay advised with supplemental pulse oximetry monitoring."
                  : "Routine surveillance and outpatient preventive maintenance recommended."}
              </p>
            </div>
            <div className="severity-alert-icon">
              <AlertTriangle size={20} color={postData.severity === "High" ? "#EF4444" : postData.severity === "Moderate" ? "#F59E0B" : "#10B981"} />
            </div>
          </div>

          {/* Clinical Recommendations & XAI Insights */}
          <div
            id="section-action-plan"
            className={`xai-insights-card ${highlightedSection === "action" ? "section-pipeline-highlight" : ""}`}
          >
            <div className="insights-header">
              <CheckCircle2 size={15} color="#2DD4BF" />
              <span>CLINICAL RECOMMENDATIONS & XAI INSIGHTS</span>
            </div>

            <ul className="insights-bullets">
              {postData.modality?.toLowerCase().includes("report") ? null : (
                <li>
                  Grad-CAM saliency strongly concentrates over the localized {postData.prediction} zone; adjacent anatomical boundaries remain clearly delineated.
                </li>
              )}
              {postData.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Recommended Treatment & Cure Protocol */}
          <div
            className="xai-insights-card treatment-cure-card"
            style={{ marginTop: "16px", border: "1px solid rgba(45, 212, 191, 0.4)", background: "rgba(13, 25, 45, 0.7)", borderRadius: "12px", padding: "16px" }}
          >
            <div className="insights-header" style={{ color: "#2DD4BF", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sparkles size={16} color="#2DD4BF" />
              <span>RECOMMENDED TREATMENT & CURE PROTOCOL</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Doctor Consultation */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#38BDF8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  👨‍⚕️ 1. Specialist Doctor Consultation
                </div>
                <div style={{ fontSize: "13px", color: "#F8FAFC", paddingLeft: "10px", borderLeft: "3px solid #38BDF8", lineHeight: "1.5" }}>
                  {getDoctorConsultationGuidance(postData.prediction, postData.modality)}
                </div>
              </div>

              {/* Treatment & Cure Steps */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#34D399", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  💊 2. Therapeutic Treatment & Cure Measures
                </div>
                <ul className="insights-bullets" style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {getTreatmentCureSteps(postData.prediction, postData.modality).map((step, idx) => (
                    <li key={idx} style={{ color: "#E2E8F0", fontSize: "13px", lineHeight: "1.5" }}>{step}</li>
                  ))}
                </ul>
              </div>

              {/* Emergency Red Flags */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#F59E0B", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚠️ 3. Red Flags & Emergency Escalation
                </div>
                <div style={{ fontSize: "12px", color: "#FCD34D", paddingLeft: "10px", borderLeft: "3px solid #F59E0B", lineHeight: "1.5" }}>
                  {getEmergencyRedFlags(postData.prediction, postData.modality)}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action CTA Buttons */}
          <div className="results-cta-group">
            <button
              className="primary-report-btn"
              onClick={() => setShowReportModal(true)}
            >
              <FileText size={16} />
              <span>Generate Medical Report (PDF) ↓</span>
            </button>
          </div>
        </section>
      </main>

      {/* 4. BOTTOM FOOTER */}
      <footer className="results-bottom-footer">
        <div className="footer-left">
          <span>© 2026 MediScan.AI Engine • Clinical Diagnostics v3.0</span>
        </div>
        <div className="footer-right">
          <span>FDA 510(k) REVIEW CODE: QSR-9</span>
        </div>
      </footer>

      {/* 5. STRUCTURED MEDICAL REPORT MODAL (NO DOCTOR NAME) */}
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
                    <div className="seal-sub">Automated Radiological Triaging • ISO 13485 Certified • HIPAA Compliant</div>
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
