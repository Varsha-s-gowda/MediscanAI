import datetime
import uuid
from typing import Dict, Any, List, Optional

DISCLAIMER_TEXT = (
    "⚠️ MEDICAL DISCLAIMER: This is an AI-assisted diagnostic evaluation generated for informational "
    "and clinical decision-support purposes only. It is NOT a final medical diagnosis or substitute for "
    "professional clinical judgment. Please consult a licensed physician or specialist for formal examination, "
    "differential diagnosis, and treatment planning."
)

# Thoracic Chest X-Ray Clinical Knowledge Base
CHEST_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "Normal": {
        "explanation": (
            "The chest radiograph displays clear bilateral lung fields with normal bronchovascular markings, "
            "sharp costophrenic angles, and a normal cardiothoracic ratio with no radiographic signs of active thoracic pathology."
        ),
        "severity": "Low",
        "severity_description": "No acute radiographic abnormalities detected in the pulmonary fields or cardiac silhouette.",
        "recommendations": [
            "Maintain routine annual wellness and preventive health examinations.",
            "Practice healthy pulmonary lifestyle habits including regular cardiovascular exercise.",
            "Avoid active and second-hand tobacco smoke or industrial airborne pollutants.",
            "Consult a physician if new respiratory symptoms (persistent cough, dyspnea, chest discomfort) develop."
        ]
    },
    "Pneumonia": {
        "explanation": (
            "The chest X-ray reveals localized areas of increased opacity and alveolar consolidation, indicating "
            "inflammatory exudate and fluid accumulation typical of bacterial, viral, or fungal pneumonia."
        ),
        "severity": "High",
        "severity_description": "Active lung infection requiring prompt medical evaluation to prevent respiratory compromise.",
        "recommendations": [
            "Consult a physician or pulmonologist promptly for clinical auscultation and targeted antimicrobial therapy.",
            "Monitor body temperature and resting oxygen saturation (SpO2) with a pulse oximeter.",
            "Ensure adequate hydration and rest in a semi-upright posture to facilitate alveolar expansion.",
            "Seek immediate emergency care if experiencing high fever (>38.5°C), severe breathlessness, or chest pain."
        ]
    },
    "Tuberculosis": {
        "explanation": (
            "Radiographic findings demonstrate apical/upper-lobe infiltration, nodular opacities, or cavitary lesions "
            "strongly characteristic of active pulmonary tuberculosis (Mycobacterium tuberculosis infection)."
        ),
        "severity": "High",
        "severity_description": "Contagious granulomatous bacterial infection requiring immediate isolation protocols and specialized pharmacotherapy.",
        "recommendations": [
            "Urgent consultation with an infectious disease specialist or pulmonologist.",
            "Undergo sputum acid-fast bacilli (AFB) smear, GeneXpert MTB/RIF assay, and mycobacterial culture.",
            "Initiate Directly Observed Treatment Short-Course (DOTS) anti-tubercular therapy if confirmed.",
            "Ensure well-ventilated living quarters and wear an N95 respirator mask during the infectious stage."
        ]
    },
    "Tuberculosis (TB)": {
        "explanation": (
            "Radiographic findings demonstrate apical/upper-lobe infiltration, nodular opacities, or cavitary lesions "
            "strongly characteristic of active pulmonary tuberculosis (Mycobacterium tuberculosis infection)."
        ),
        "severity": "High",
        "severity_description": "Contagious granulomatous bacterial infection requiring immediate isolation protocols and specialized pharmacotherapy.",
        "recommendations": [
            "Urgent consultation with an infectious disease specialist or pulmonologist.",
            "Undergo sputum acid-fast bacilli (AFB) smear, GeneXpert MTB/RIF assay, and mycobacterial culture.",
            "Initiate Directly Observed Treatment Short-Course (DOTS) anti-tubercular therapy if confirmed.",
            "Ensure well-ventilated living quarters and wear an N95 respirator mask during the infectious stage."
        ]
    },
    "COVID-19": {
        "explanation": (
            "The radiograph reveals bilateral peripheral and basal ground-glass opacities, typical of viral interstitial "
            "pneumonitis associated with SARS-CoV-2 infection."
        ),
        "severity": "High",
        "severity_description": "Viral respiratory illness with potential for rapid inflammatory progression and hypoxia.",
        "recommendations": [
            "Isolate in accordance with public health guidelines to prevent household and community transmission.",
            "Monitor blood oxygen saturation (SpO2) frequently; seek emergency care if SpO2 drops below 94%.",
            "Consult a physician for antiviral medication, supportive care, and inflammatory marker checks (CRP, D-dimer).",
            "Maintain prone positioning intervals and stay well-hydrated throughout recovery."
        ]
    },
    "COVID-19 Pneumonia": {
        "explanation": (
            "The radiograph reveals bilateral peripheral and basal ground-glass opacities with consolidation, typical of "
            "advanced viral pneumonia associated with SARS-CoV-2 infection."
        ),
        "severity": "High",
        "severity_description": "Severe viral pneumonitis with high risk of hypoxemic respiratory insufficiency.",
        "recommendations": [
            "Immediate medical evaluation by a respiratory physician or emergency clinical team.",
            "Continuous pulse oximetry monitoring (seek emergency care if SpO2 < 94%).",
            "Follow physician-guided anti-inflammatory and antiviral supportive protocols.",
            "Strict isolation and respiratory precautions."
        ]
    },
    "Cardiomegaly": {
        "explanation": (
            "The cardiac silhouette is visibly enlarged, with the cardiothoracic ratio exceeding 50% on frontal projection, "
            "suggesting ventricular hypertrophy, chamber dilatation, or pericardial effusion."
        ),
        "severity": "High",
        "severity_description": "Cardiac enlargement indicative of underlying hypertensive, ischemic, or valvular cardiovascular disorder.",
        "recommendations": [
            "Urgent evaluation by a cardiologist for comprehensive hemodynamic assessment.",
            "Obtain a 2D Transthoracic Echocardiogram (Echo) and 12-lead ECG.",
            "Monitor daily blood pressure, resting heart rate, and check for peripheral edema in lower extremities.",
            "Restrict dietary sodium intake and avoid unmonitored strenuous physical exertion."
        ]
    },
    "Pneumothorax": {
        "explanation": (
            "A visceral pleural line is visible with absence of peripheral lung markings, indicating presence of free air "
            "within the pleural space causing partial or complete lung collapse."
        ),
        "severity": "High",
        "severity_description": "Acute pleural compromise requiring urgent decompression to prevent tension pneumothorax.",
        "recommendations": [
            "Seek immediate emergency medical attention for clinical assessment and possible needle decompression or chest tube thoracostomy.",
            "Strictly avoid air travel, scuba diving, and heavy physical straining.",
            "Monitor for sudden worsening sharp chest pain, rapid heart rate, or severe shortness of breath."
        ]
    },
    "Effusion": {
        "explanation": (
            "Blunting of the costophrenic sulcus with meniscus sign indicates abnormal fluid transudation or exudation "
            "accumulating within the pleural cavity."
        ),
        "severity": "Moderate",
        "severity_description": "Pleural fluid collection that restricts lung expansion and requires diagnostic fluid characterization.",
        "recommendations": [
            "Consult a pulmonologist for physical examination and diagnostic pleural ultrasound / thoracentesis.",
            "Perform follow-up imaging to monitor effusion volume and assess response to therapy.",
            "Monitor for pleuritic chest pain exacerbated by deep breathing or progressive cough."
        ]
    },
    "Pleural Effusion": {
        "explanation": (
            "Blunting of the costophrenic sulcus with meniscus sign indicates abnormal fluid accumulation within the pleural cavity."
        ),
        "severity": "Moderate",
        "severity_description": "Pleural fluid collection that restricts lung expansion and requires diagnostic fluid characterization.",
        "recommendations": [
            "Consult a pulmonologist for physical examination and diagnostic pleural ultrasound / thoracentesis.",
            "Perform follow-up imaging to monitor effusion volume and assess response to therapy.",
            "Monitor for pleuritic chest pain exacerbated by deep breathing or progressive cough."
        ]
    },
    "Edema": {
        "explanation": (
            "Perihilar bat-wing haze, vascular engorgement, and Kerley B lines indicate elevated capillary hydrostatic pressure "
            "and fluid extravasation into pulmonary interstitial and alveolar spaces."
        ),
        "severity": "High",
        "severity_description": "Pulmonary vascular congestion with acute risk of respiratory failure.",
        "recommendations": [
            "Urgent medical assessment for cardiovascular, renal, or fluid overload management.",
            "Adhere strictly to prescribed diuretic regimens under physician supervision.",
            "Monitor daily weight and fluid balance; sleep with the head elevated on multiple pillows."
        ]
    },
    "Pulmonary Edema": {
        "explanation": (
            "Diffuse perihilar haze and vascular engorgement indicate excess fluid transudation into pulmonary interstitium and alveoli."
        ),
        "severity": "High",
        "severity_description": "Pulmonary vascular congestion with acute risk of respiratory failure.",
        "recommendations": [
            "Urgent medical assessment for cardiovascular, renal, or fluid overload management.",
            "Adhere strictly to prescribed diuretic regimens under physician supervision.",
            "Monitor daily weight and fluid balance; sleep with the head elevated on multiple pillows."
        ]
    },
    "Atelectasis": {
        "explanation": (
            "Linear or wedge-shaped opacities with associated fissure displacement indicate partial collapse or incomplete "
            "expansion of pulmonary parenchyma."
        ),
        "severity": "Moderate",
        "severity_description": "Localized lung collapse reducing functional residual capacity.",
        "recommendations": [
            "Perform regular incentive spirometry and deep-breathing exercises.",
            "Maintain upright positioning following meals and ambulate as tolerated.",
            "Consult a physician for chest physiotherapy if mucus plugging is suspected."
        ]
    },
    "Mass": {
        "explanation": (
            "A discrete, localized radio-opacity measuring greater than 3 cm is visualized in the lung parenchyma, "
            "requiring systematic oncological and histological investigation."
        ),
        "severity": "High",
        "severity_description": "Focal pulmonary mass lesion requiring urgent diagnostic staging and tissue biopsy.",
        "recommendations": [
            "Urgent referral to a thoracic oncologist or pulmonologist.",
            "Schedule a high-resolution contrast-enhanced chest CT and PET-CT scan.",
            "Coordinate tissue biopsy / bronchoscopy for definitive histopathological diagnosis."
        ]
    },
    "Lung Mass/Nodule": {
        "explanation": (
            "A discrete, localized radio-opacity is visualized in the lung parenchyma, requiring diagnostic cross-sectional staging."
        ),
        "severity": "High",
        "severity_description": "Focal pulmonary lesion requiring cross-sectional staging and clinical follow-up.",
        "recommendations": [
            "Urgent referral to a thoracic oncologist or pulmonologist.",
            "Schedule a high-resolution contrast-enhanced chest CT scan.",
            "Coordinate follow-up or tissue sampling as recommended by the specialist."
        ]
    },
    "Nodule": {
        "explanation": (
            "A small rounded opacity measuring under 3 cm is identified in the lung parenchyma, which warrants follow-up "
            "according to standardized pulmonary nodule surveillance protocols."
        ),
        "severity": "Moderate",
        "severity_description": "Solitary or multiple pulmonary nodule(s) requiring Fleischner Society surveillance.",
        "recommendations": [
            "Schedule a low-dose thin-slice chest CT for precise margin, attenuation, and calcification analysis.",
            "Compare with prior chest radiographs to determine temporal stability and doubling time.",
            "Avoid all forms of smoking and occupational dust exposure."
        ]
    },
    "Emphysema": {
        "explanation": (
            "Hyperlucent lung fields, flattened diaphragms, and attenuated peripheral vascularity signify chronic alveolar wall "
            "destruction characteristic of pulmonary emphysema / COPD."
        ),
        "severity": "Moderate",
        "severity_description": "Irreversible structural alveolar damage with air trapping.",
        "recommendations": [
            "Consult a pulmonologist for comprehensive pulmonary function testing (PFTs / spirometry).",
            "Strictly avoid smoking, vaping, and toxic environmental inhalants.",
            "Discuss prescribed bronchodilator therapy, vaccination against flu/pneumococcus, and pulmonary rehab."
        ]
    },
    "Fibrosis": {
        "explanation": (
            "Coarse reticular markings, volume reduction, and architectural distortion suggest progressive interstitial fibrosis "
            "and collagen deposition in the lung parenchyma."
        ),
        "severity": "High",
        "severity_description": "Chronic interstitial fibrotic remodeling that impairs gas diffusion.",
        "recommendations": [
            "Consult an Interstitial Lung Disease (ILD) specialist or pulmonologist.",
            "Undergo High-Resolution Computed Tomography (HRCT) and DLCO gas transfer measurement.",
            "Evaluate eligibility for antifibrotic medical management and supplemental oxygen if hypoxemic."
        ]
    },
    "Consolidation": {
        "explanation": (
            "Dense opacification with air bronchograms indicates alveolar air spaces filled with dense inflammatory exudate or cellular debris."
        ),
        "severity": "High",
        "severity_description": "Alveolar consolidation indicating significant localized parenchymal inflammation or infection.",
        "recommendations": [
            "Primary care or pulmonology consultation for clinical correlation and blood work.",
            "Initiate targeted antimicrobial therapy under medical supervision.",
            "Repeat chest radiograph in 4–6 weeks to document complete radiographic clearance."
        ]
    },
    "Infiltration": {
        "explanation": (
            "Ill-defined patchy opacities in the lung parenchyma indicate inflammatory or fluid infiltration within alveolar/interstitial spaces."
        ),
        "severity": "Moderate",
        "severity_description": "Parenchymal inflammatory infiltration requiring clinical tracking.",
        "recommendations": [
            "Consult a physician for clinical assessment, temperature check, and sputum evaluation.",
            "Rest adequately, hydrate, and complete any prescribed course of therapy.",
            "Schedule follow-up chest imaging to verify resolution."
        ]
    },
    "Pleural Thickening": {
        "explanation": (
            "Localized or diffuse thickening of the pleural margin is visible, indicative of past inflammation, hemothorax, or asbestos exposure."
        ),
        "severity": "Moderate",
        "severity_description": "Pleural fibrotic thickening requiring etiology assessment.",
        "recommendations": [
            "Pulmonology consultation to assess respiratory mechanics and occupational exposure history.",
            "Periodic spirometry to monitor for restrictive ventilatory impairment."
        ]
    },
    "Hernia": {
        "explanation": (
            "Herniation of abdominal viscera into the thoracic cavity through a diaphragmatic hiatus/defect is visible."
        ),
        "severity": "Moderate",
        "severity_description": "Diaphragmatic herniation with possible gastrointestinal and respiratory mass effect.",
        "recommendations": [
            "Gastroenterology or surgical consultation for anatomical evaluation.",
            "Eat smaller frequent meals and avoid lying down immediately after eating.",
            "Seek urgent evaluation if experiencing acute abdominal/chest pain or dysphagia."
        ]
    },
    "Lung Opacity": {
        "explanation": (
            "Non-specific attenuation and decreased radiolucency in the lung fields requiring clinical and cross-sectional correlation."
        ),
        "severity": "Moderate",
        "severity_description": "Radiographic density alteration requiring clinical correlation.",
        "recommendations": [
            "Correlate with patient clinical history and symptom duration.",
            "Consider low-dose CT chest if opacification persists or symptoms worsen."
        ]
    }
}


def _get_chest_analysis(prediction: str, confidence: float) -> Dict[str, Any]:
    # Match against known chest conditions
    matched_key = None
    for key in CHEST_KNOWLEDGE.keys():
        if key.lower() == prediction.lower() or key.lower() in prediction.lower():
            matched_key = key
            break

    if matched_key:
        info = CHEST_KNOWLEDGE[matched_key]
        severity = info["severity"]
        # Moderate override if confidence is low on severe condition, or high on moderate condition
        if severity == "High" and confidence < 40.0:
            severity = "Moderate"
        elif severity == "Moderate" and confidence > 85.0:
            severity = "High"

        return {
            "explanation": info["explanation"],
            "severity": severity,
            "severity_description": info["severity_description"],
            "recommendations": info["recommendations"]
        }

    # Default fallback for unknown chest prediction
    is_normal = "normal" in prediction.lower()
    return {
        "explanation": (
            f"Radiographic assessment shows findings consistent with {prediction}. "
            "Detailed clinical correlation with patient symptoms, physical examination, and past medical history is recommended."
        ),
        "severity": "Low" if is_normal else ("High" if confidence > 70.0 else "Moderate"),
        "severity_description": "Radiological finding requiring professional clinical correlation.",
        "recommendations": [
            "Consult a licensed physician for clinical correlation and review of imaging findings.",
            "Monitor for associated respiratory symptoms such as cough, dyspnea, or chest tightness.",
            "Follow standard preventive pulmonary health guidelines."
        ]
    }


def _get_dental_analysis(prediction: str, confidence: float, is_cavity: bool) -> Dict[str, Any]:
    if is_cavity or "cavity" in prediction.lower() or "caries" in prediction.lower():
        severity = "High" if confidence > 75.0 else "Moderate"
        return {
            "explanation": (
                "Dental radiographic assessment reveals focal radiolucency and mineral loss within the enamel "
                "and/or dentin layers, indicating active dental caries (tooth decay/cavitation)."
            ),
            "severity": severity,
            "severity_description": (
                "Active dental caries lesion detected. Requires timely restorative intervention to prevent pulpitis or apical infection."
                if severity == "High"
                else "Early/moderate carious lesion. Timely evaluation can prevent structural progression into the pulp chamber."
            ),
            "recommendations": [
                "Schedule a clinical dental consultation for physical probing and bitewing radiograph confirmation.",
                "Undergo appropriate restorative treatment (composite resin filling, ceramic inlay, or fluoride remineralization seal).",
                "Brush teeth twice daily with fluoridated toothpaste and floss interdentally every day.",
                "Limit dietary intake of refined sugars, acidic beverages, and fermentable carbohydrates."
            ]
        }
    else:
        return {
            "explanation": (
                "Dental radiographic analysis demonstrates intact enamel borders, uniform dentin density, and sound periodontal "
                "alveolar bone margins with no evidence of active carious cavitation."
            ),
            "severity": "Low",
            "severity_description": "Sound dentition with no active carious lesion or structural tooth breakdown detected.",
            "recommendations": [
                "Maintain standard oral hygiene: brush twice daily for 2 minutes with fluoride toothpaste.",
                "Practice daily interdental flossing to remove interproximal plaque and prevent future caries.",
                "Schedule routine 6-month dental prophylaxis and comprehensive oral check-ups.",
                "Maintain a balanced diet rich in calcium and phosphorus to support tooth enamel remineralization."
            ]
        }


def _get_mri_analysis(prediction: str, confidence: float, raw_class: Optional[str] = None) -> Dict[str, Any]:
    pred_lower = (raw_class or prediction).lower()

    if "glioma" in pred_lower:
        return {
            "explanation": (
                "Brain MRI features demonstrate an intra-axial lesion in the cerebral/cerebellar parenchyma with altered "
                "signal intensity and surrounding edema, characteristic of a glial cell neoplasm (glioma)."
            ),
            "severity": "High",
            "severity_description": "Intracranial intra-axial mass lesion with high clinical urgency requiring neurosurgical evaluation.",
            "recommendations": [
                "Urgent consultation with a neurosurgeon and neuro-oncology multidisciplinary team.",
                "Schedule multi-parametric contrast-enhanced MRI (T1+C, T2/FLAIR, DWI, Perfusion/Spectroscopy) for surgical planning.",
                "Evaluate for mass effect, midline shift, and the need for anti-edema (corticosteroid) or anti-seizure prophylaxis.",
                "Seek immediate emergency care if acute severe headaches, focal neurological deficits, altered consciousness, or seizures occur."
            ]
        }
    elif "meningioma" in pred_lower:
        severity = "High" if confidence > 80.0 else "Moderate"
        return {
            "explanation": (
                "Brain MRI demonstrates a well-circumscribed, extra-axial dural-based mass lesion with classic dural tail characteristics, "
                "consistent with a meningioma exerting localized cortical compression."
            ),
            "severity": severity,
            "severity_description": "Extra-axial dural mass lesion requiring neurosurgical review to evaluate mass effect and intervention options.",
            "recommendations": [
                "Consult a neurosurgeon for precise tumor volumetric measurement and intervention/surveillance planning.",
                "Schedule serial contrast-enhanced MRI imaging to monitor growth rate and anatomical margins.",
                "Report any emerging neurological symptoms such as localized headaches, vision changes, or motor weakness immediately."
            ]
        }
    elif "pituitary" in pred_lower:
        return {
            "explanation": (
                "Brain MRI imaging exhibits tissue enlargement and focal lesion within the sella turcica / pituitary fossa region, "
                "consistent with a pituitary micro/macroadenoma."
            ),
            "severity": "Moderate",
            "severity_description": "Sellar mass lesion requiring comprehensive endocrine workup and visual pathway evaluation.",
            "recommendations": [
                "Consult an endocrinologist and neurosurgeon for dedicated thin-slice sellar protocol MRI.",
                "Perform comprehensive serum pituitary hormone profiling (Prolactin, ACTH, GH, IGF-1, TSH, Free T4, Morning Cortisol).",
                "Schedule formal automated perimetry (visual field testing) with an ophthalmologist to verify optic chiasm clearance."
            ]
        }
    else:  # notumor / normal
        return {
            "explanation": (
                "Brain MRI scan demonstrates symmetric cerebral hemispheres, normal grey-white matter differentiation, "
                "unobstructed ventricular system, and no focal intracranial mass lesions or abnormal enhancement."
            ),
            "severity": "Low",
            "severity_description": "Normal brain MRI scan with no radiographic signs of intracranial neoplasm.",
            "recommendations": [
                "Continue standard wellness and neurological health monitoring.",
                "If the scan was prompted by chronic headaches or neurological symptoms, discuss findings with your primary physician.",
                "Maintain good cardiovascular health, adequate sleep hygiene, and stress management."
            ]
        }


def _get_ct_kidney_analysis(prediction: str, confidence: float, is_stone: bool) -> Dict[str, Any]:
    if is_stone or "stone" in prediction.lower() or "calculi" in prediction.lower():
        severity = "High" if confidence > 80.0 else "Moderate"
        return {
            "explanation": (
                "Abdominal/pelvic CT imaging demonstrates discrete high-attenuation (radiopaque) calcifications within the "
                "renal parenchyma, calyces, or ureteric pathway, confirming nephrolithiasis / urolithiasis (kidney stone)."
            ),
            "severity": severity,
            "severity_description": (
                "Active renal calculi detected with high confidence. Requires urological sizing to prevent obstruction or hydronephrosis."
                if severity == "High"
                else "Renal calculi density noted. Clinical urological evaluation recommended."
            ),
            "recommendations": [
                "Consult a urologist for non-contrast helical CT confirmation, stone dimension measurement (mm), and treatment planning (medical therapy, ESWL, or ureteroscopy).",
                "Increase daily fluid intake to 2.5–3.0 liters of water daily to promote urinary clearance, unless fluid-restricted.",
                "Filter and collect any naturally passed stone fragments for chemical composition analysis (calcium oxalate, uric acid, struvite).",
                "Seek immediate emergency medical care if experiencing severe intractable flank pain, persistent vomiting, high fever, or hematuria (blood in urine)."
            ]
        }
    else:
        return {
            "explanation": (
                "CT scan cross-section exhibits homogenous renal parenchyma, non-dilated collecting system, and absence "
                "of obstructive renal calculi or radiopaque stone formations."
            ),
            "severity": "Low",
            "severity_description": "No radiographic evidence of kidney stones or urinary tract obstruction on the scanned slice.",
            "recommendations": [
                "Maintain healthy daily hydration habits (aim for pale, clear urine output throughout the day).",
                "Adopt a balanced dietary intake with moderate sodium, adequate dietary calcium, and controlled animal protein.",
                "Consult a physician for further diagnostic investigation if flank discomfort or urinary symptoms persist."
            ]
        }


def generate_post_analysis(
    modality: str,
    prediction: str,
    confidence: float,
    additional_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generates a unified post-analysis object across all 4 diagnostic modules:
    Prediction → Explanation → Severity/Risk → Recommendations → Medical Report → History
    """
    additional_info = additional_info or {}
    modality_lower = modality.lower()

    if "dental" in modality_lower or "cavity" in modality_lower:
        is_cavity = bool(additional_info.get("is_cavity", "cavity" in prediction.lower()))
        analysis = _get_dental_analysis(prediction, confidence, is_cavity)
        standard_modality = "Dental X-Ray"
    elif "mri" in modality_lower or "brain" in modality_lower:
        raw_class = additional_info.get("raw_class")
        analysis = _get_mri_analysis(prediction, confidence, raw_class)
        standard_modality = "Brain MRI"
    elif "ct" in modality_lower or "kidney" in modality_lower or "stone" in modality_lower:
        is_stone = bool(additional_info.get("is_stone", "stone" in prediction.lower()))
        analysis = _get_ct_kidney_analysis(prediction, confidence, is_stone)
        standard_modality = "Kidney Stone CT"
    else:
        # Default to Chest X-ray
        analysis = _get_chest_analysis(prediction, confidence)
        standard_modality = "Chest X-Ray"

    severity = analysis["severity"]
    severity_colors = {
        "Low": "#10B981",       # Emerald Green
        "Moderate": "#F59E0B",  # Amber Gold
        "High": "#EF4444"       # Crimson Red
    }
    severity_color = severity_colors.get(severity, "#3B82F6")

    report_id = f"MED-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    structured_report = {
        "report_id": report_id,
        "generated_at": timestamp,
        "modality": standard_modality,
        "primary_prediction": prediction,
        "confidence_percentage": round(confidence, 1),
        "severity_level": severity,
        "severity_description": analysis["severity_description"],
        "medical_explanation": analysis["explanation"],
        "clinical_recommendations": analysis["recommendations"],
        "disclaimer": DISCLAIMER_TEXT,
        "scan_quality": additional_info.get("scan_quality", "Diagnostic Grade"),
        "original_image_url": additional_info.get("original_image"),
        "gradcam_image_url": additional_info.get("gradcam_image") or additional_info.get("heatmap"),
        "patient_name": additional_info.get("patient_name", "Public / Anonymous"),
        "patient_id": additional_info.get("patient_id", "N/A"),
    }

    return {
        "modality": standard_modality,
        "prediction": prediction,
        "confidence": round(confidence, 1),
        "explanation": analysis["explanation"],
        "severity": severity,
        "severity_color": severity_color,
        "severity_description": analysis["severity_description"],
        "recommendations": analysis["recommendations"],
        "disclaimer": DISCLAIMER_TEXT,
        "report": structured_report,
        "report_id": report_id,
        "generated_at": timestamp
    }
