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
            "Frontal chest radiograph displays clear bilateral lung fields with crisp, physiological bronchovascular markings extending symmetrically to the periphery. "
            "The cardiothoracic ratio is well within normal limits (<50%) with sharp, well-defined left and right costophrenic and cardiophrenic angles. "
            "The mediastinal contour, hila, and trachea are midline and structurally unremarkable with no evidence of lymphadenopathy or vascular engorgement. "
            "Osseous thoracic cage structures and soft tissues exhibit normal radiological density with no acute bony lesions or focal pleural thickening. "
            "Overall imaging confirms normal thoracic architecture with no active infectious, congestive, or neoplastic pulmonary processes."
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
            "Frontal chest radiograph reveals localized areas of increased radiographic opacity and alveolar consolidation with prominent air bronchograms, typical of infectious pneumonia. "
            "The inflammatory exudate is concentrated within the pulmonary parenchyma, leading to localized loss of normal aeration and volume reduction in the affected lobes. "
            "Surrounding bronchovascular bundles demonstrate peribronchial thickening consistent with an active inflammatory airway response and interstitial exudation. "
            "Cardiac silhouette contours and contralateral lung fields remain preserved with no evidence of gross pneumothorax or cavitation. "
            "Clinical correlation with physical auscultation, laboratory inflammatory markers, and immediate targeted antimicrobial management is strongly indicated."
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
            "Frontal chest radiograph demonstrates conspicuous apical and upper-lobe fibro-cavitary infiltrates accompanied by ill-defined nodular opacities characteristic of pulmonary tuberculosis. "
            "Radiographic features indicate granulomatous parenchymal destruction with focal bronchial distortion and localized apical pleural thickening. "
            "Surrounding lung parenchyma displays tree-in-bud nodularity and patchy consolidation reflecting endobronchial dissemination of mycobacterial infection. "
            "The mediastinal and hilar contours exhibit localized reactive lymphadenopathy with structural widening. "
            "Immediate infectious disease evaluation, sputum acid-fast bacilli (AFB) testing, and initiation of directly observed anti-tubercular therapy are strongly warranted."
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
            "Frontal chest radiograph demonstrates conspicuous apical and upper-lobe fibro-cavitary infiltrates accompanied by ill-defined nodular opacities characteristic of pulmonary tuberculosis. "
            "Radiographic features indicate granulomatous parenchymal destruction with focal bronchial distortion and localized apical pleural thickening. "
            "Surrounding lung parenchyma displays tree-in-bud nodularity and patchy consolidation reflecting endobronchial dissemination of mycobacterial infection. "
            "The mediastinal and hilar contours exhibit localized reactive lymphadenopathy with structural widening. "
            "Immediate infectious disease evaluation, sputum acid-fast bacilli (AFB) testing, and initiation of directly observed anti-tubercular therapy are strongly warranted."
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
            "Chest radiograph reveals extensive bilateral, predominantly peripheral and subpleural ground-glass opacities and patchy consolidative infiltrates characteristic of viral interstitial pneumonitis. "
            "The distribution prominently involves the middle and lower pulmonary zones with thickened interlobular septa and perivascular cuffing. "
            "Respiratory volume appears mildly compromised with early signs of diffuse alveolar involvement without gross pleural effusion. "
            "Contralateral pulmonary parenchyma demonstrates reactive interstitial markings and altered aeration. "
            "Prompt respiratory monitoring with continuous pulse oximetry and physician-guided antiviral/anti-inflammatory support is recommended."
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
            "Chest radiograph reveals extensive bilateral peripheral and basal ground-glass opacities with dense consolidative infiltrates typical of advanced viral pneumonia associated with SARS-CoV-2. "
            "Multi-focal alveolar filling patterns are observed across both lower lobes with prominent air bronchograms and interstitial reticular markings. "
            "The inflammatory process involves substantial functional lung volume, creating a significant risk for impaired gas diffusion and hypoxemia. "
            "The cardiac silhouette and pleural spaces demonstrate no gross effusion, pointing towards acute primary viral pneumonitis. "
            "Immediate medical evaluation by a respiratory specialist and continuous oxygenation monitoring are critical."
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
            "The cardiac silhouette is visibly enlarged on frontal projection, with the cardiothoracic ratio significantly exceeding the standard physiological threshold of 50%. "
            "The left ventricular contour exhibits lateral and downward displacement, indicating ventricular hypertrophy and underlying chamber dilatation. "
            "Pulmonary vascular redistribution to the upper lung zones (cephalization) is evident, reflecting elevated pulmonary venous pressures. "
            "Bilateral costophrenic angles show mild blunting without dense parenchymal alveolar consolidation or acute pneumothorax. "
            "Urgent comprehensive echocardiographic evaluation and cardiovascular consultation are advised to evaluate ejection fraction and ventricular function."
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
            "A distinct visceral pleural white line is identified with total absence of peripheral broncho-vascular lung markings beyond its boundary, confirming free air in the pleural space. "
            "The underlying pulmonary parenchyma shows partial compressive atelectasis with localized volume loss in the ipsilateral hemithorax. "
            "The ipsilateral intercostal spaces appear mildly widened, and tracheal positioning requires close monitoring to rule out tension mechanics. "
            "The contralateral lung field exhibits compensatory hyperinflation with clear pulmonary parenchyma. "
            "Immediate emergency medical evaluation is necessary for clinical assessment, oxygenation, and potential decompression thoracostomy."
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
            "Blunting and obliteration of the lateral and posterior costophrenic sulci with classic meniscus sign indicates abnormal fluid collection within the pleural space. "
            "The fluid accumulation produces localized compressive atelectasis of the adjacent basal lung segments. "
            "The underlying pulmonary vascular markings are partially obscured by the homogenous dependent fluid density. "
            "Mediastinal structures remain central without evidence of significant contralateral mass effect or tension displacement. "
            "Pulmonology consultation is recommended for physical examination, diagnostic ultrasound staging, and potential thoracentesis."
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
            "Blunting and obliteration of the lateral and posterior costophrenic sulci with classic meniscus sign indicates abnormal fluid collection within the pleural space. "
            "The fluid accumulation produces localized compressive atelectasis of the adjacent basal lung segments. "
            "The underlying pulmonary vascular markings are partially obscured by the homogenous dependent fluid density. "
            "Mediastinal structures remain central without evidence of significant contralateral mass effect or tension displacement. "
            "Pulmonology consultation is recommended for physical examination, diagnostic ultrasound staging, and potential thoracentesis."
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
            "Perihilar bat-wing haze, prominent pulmonary vascular engorgement, and Kerley B lines indicate elevated capillary hydrostatic pressure and fluid extravasation. "
            "Fluid has transudated into the pulmonary interstitial spaces and alveolar compartments, reducing compliance and gas diffusion efficiency. "
            "The cardiac silhouette displays cardiomegaly and vascular pedicle widening consistent with circulatory fluid overload. "
            "Bilateral costophrenic angles exhibit reactive fluid blunting without localized lobar consolidation. "
            "Urgent medical assessment for cardiovascular and renal fluid overload management with diuretic protocols is required."
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
            "Diffuse perihilar bat-wing haze, vascular engorgement, and septal lines indicate acute fluid transudation into the pulmonary interstitium and alveoli. "
            "Alveolar-capillary gas exchange is significantly impaired due to increased alveolar fluid density and interstitial thickening. "
            "Vascular pedicle width is increased and bilateral hilar shadows are hazy with indistinct vessel margins. "
            "Cardiac enlargement is visualized alongside bilateral dependent fluid layering in the costophrenic recesses. "
            "Immediate emergency stabilization, supplemental oxygenation, and physician-supervised intravenous diuretic therapy are indicated."
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
            "Linear and wedge-shaped opacities with associated fissure displacement indicate localized collapse and incomplete expansion of pulmonary parenchyma. "
            "The volume loss is accompanied by compensatory hyperinflation of adjacent lung segments and crowding of local bronchovascular structures. "
            "The ipsilateral diaphragm may appear mildly elevated without evidence of extensive dense consolidative pneumonia. "
            "Contralateral pulmonary fields remain clear with stable mediastinal alignment. "
            "Incentive spirometry, deep-breathing exercises, and clinical evaluation for bronchial secretions or mucus plugging are recommended."
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
            "A discrete, localized radio-opacity measuring greater than 3 cm is identified within the pulmonary parenchyma, requiring systematic oncological investigation. "
            "The lesion demonstrates soft-tissue attenuation with irregular or spicular margins projecting into surrounding aerated lung tissue. "
            "Adjacent bronchovascular structures show localized displacement with potential regional lymphadenopathy. "
            "Contralateral lung parenchyma appears preserved with no active effusion or pneumothorax on the baseline projection. "
            "Urgent high-resolution contrast CT imaging and thoracic oncology consultation for tissue biopsy and staging are strongly recommended."
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
            "A discrete, localized radio-opacity is visualized within the lung parenchyma, requiring comprehensive cross-sectional radiological staging. "
            "The lesion exhibits well-defined to slightly lobulated margins with preserved surrounding parenchymal architecture. "
            "No gross cavitation, calcification, or associated acute pleural effusion is detected on the current single projection. "
            "Tracheobronchial tree alignment remains intact with stable mediastinal geometry. "
            "Urgent referral for high-resolution thin-slice contrast CT scan and pulmonary nodule protocol evaluation is indicated."
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
            "A small rounded opacity measuring under 3 cm is identified within the lung parenchyma, warranting structured Fleischner Society surveillance. "
            "The nodule demonstrates soft-tissue density with smooth to slightly micro-lobulated contours without surrounding consolidation. "
            "Surrounding lung fields exhibit preserved aeration and normal vascular arborization without pleural fluid collection. "
            "The mediastinal silhouette and hilar contours are symmetrical with no overt lymphadenopathy. "
            "Low-dose thin-slice chest CT and comparison with previous radiographic studies are recommended to evaluate doubling time."
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
            "Hyperlucent lung fields with marked flattening of both diaphragmatic domes and attenuated peripheral vascularity signify chronic alveolar wall destruction. "
            "The retrosternal clear space is increased on lateral projection, reflecting severe air trapping and loss of elastic pulmonary recoil. "
            "The cardiac silhouette appears elongated and narrow (vertical heart) due to low diaphragmatic positioning. "
            "No focal consolidative opacities or active pleural effusions are identified on this study. "
            "Comprehensive pulmonary function testing (spirometry/DLCO) and pulmonology consultation for bronchodilator management are advised."
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
            "Coarse reticular and honeycombing opacities with associated volume reduction and architectural distortion signify progressive interstitial fibrosis. "
            "The fibrotic changes are predominantly concentrated in the peripheral, subpleural, and basilar zones with traction bronchiectasis. "
            "Diaphragmatic elevation and loss of lung compliance are evident with blunted interstitial margins. "
            "The cardiac silhouette displays clear margins with no acute pulmonary edema or pleural fluid collections. "
            "Consultation with an interstitial lung disease specialist for high-resolution CT (HRCT) and antifibrotic evaluation is recommended."
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
            "Dense homogenous opacification with internal air bronchograms indicates that alveolar air spaces are filled with inflammatory exudate or cellular debris. "
            "The dense alveolar consolidation obscures the adjacent pulmonary vessel margins and borders of the corresponding hemithorax. "
            "Adjacent lung segments demonstrate reactive inflammatory haze without evidence of complete lobar volume collapse. "
            "Contralateral pulmonary parenchyma is clear with stable mediastinal positioning. "
            "Physician review and targeted antibiotic/antimicrobial therapy with follow-up interval radiography in 4–6 weeks are indicated."
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
            "Ill-defined patchy opacities in the lung parenchyma indicate inflammatory or fluid infiltration within alveolar and interstitial spaces. "
            "The bronchovascular bundles within the affected region appear indistinct and thickened due to surrounding peribronchial cuffing. "
            "Normal pulmonary aeration is partially compromised without forming a dense lobar consolidation or cavity. "
            "Cardiac and diaphragmatic contours remain visible with no significant pleural fluid layering. "
            "Clinical evaluation, temperature tracking, and correlation with respiratory symptomatology are recommended."
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
            "Localized fibrous thickening of the pleural margin is visible along the thoracic wall and costophrenic recesses. "
            "The pleural shadow exhibits smooth, dense attenuation indicative of past pleuritis, hemothorax, or chronic occupational exposure. "
            "The underlying lung parenchyma demonstrates preserved aeration and normal vascular arborization without acute infiltrate. "
            "The mediastinal silhouette and hilar architecture appear normal with no signs of active intrathoracic fluid. "
            "Pulmonology consultation to assess respiratory mechanics and occupational exposure history is recommended."
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
            "Herniation of abdominal viscera into the posterior or anterior mediastinum through a diaphragmatic hiatus or structural defect is visualized. "
            "A retrocardiac air-fluid level or soft-tissue mass is identified, projecting above the physiological level of the hemidiaphragm. "
            "Surrounding pulmonary parenchyma displays mild compressive atelectasis without intrinsic parenchymal infection. "
            "Cardiac and mediastinal contours are displaced slightly by the herniated abdominal contents. "
            "Gastroenterology or surgical evaluation is advised to determine anatomical defect dimensions and reduce complication risks."
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
            "Non-specific attenuation and decreased radiolucency are identified across the pulmonary fields, requiring clinical and cross-sectional correlation. "
            "The opacity partially obscures underlying vascular branching patterns without demonstrating overt air bronchograms or cavitation. "
            "Adjacent thoracic structures and diaphragmatic contours maintain stable positioning without mediastinal shift. "
            "Pleural spaces appear clear of significant blunting or pneumothorax on the current view. "
            "Correlation with patient symptoms, physical exam, and low-dose chest CT if symptoms persist is recommended."
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
    matched_key = None
    for key in CHEST_KNOWLEDGE.keys():
        if key.lower() == prediction.lower() or key.lower() in prediction.lower():
            matched_key = key
            break

    if matched_key:
        info = CHEST_KNOWLEDGE[matched_key]
        severity = info["severity"]
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

    is_normal = "normal" in prediction.lower()
    return {
        "explanation": (
            f"Radiographic assessment shows radiological findings consistent with {prediction} within the lung parenchyma. "
            "The visualized lung fields display localized alteration in density and vascular branching characteristics. "
            "Cardiothoracic ratio and surrounding anatomical structures remain stable on the initial view. "
            "Detailed clinical correlation with patient symptoms, physical examination, and serial comparative imaging is strongly recommended."
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
                "Dental radiographic assessment reveals focal radiolucency and mineral loss within the enamel margin and coronal dentin structure, confirming active dental caries. "
                "Subsurface enamel demineralization has progressed across the dentinoenamel junction, indicating bacterial acid dissolution of crystalline hydroxyapatite. "
                "The lesion exhibits characteristic radiolucent shadow progression approaching the outer third of the dentinal tubules without evident pulpal exposure. "
                "Periapical bone architecture and periodontal ligament spaces appear preserved with no signs of periapical granuloma or osteolytic rarefaction. "
                "Prompt restorative intervention via composite resin or ceramic inlay is advised to prevent pulpitis and irreversible structural breakdown."
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
                "Dental radiographic inspection demonstrates intact, well-mineralized enamel crowns with smooth, continuous proximal surface contours across all visual teeth. "
                "The dentinoenamel junction exhibits uniform radiographic density with no focal radiolucency, fissure caries, or interproximal demineralization shadows. "
                "Alveolar bone crests maintain normal physiological height and density with sharp cortical margins and intact periodontal ligament spaces. "
                "There is no evidence of periapical pathosis, root resorption, or defective margin leakage in adjacent dentition. "
                "Overall imaging reflects healthy, robust oral dentition with intact protective enamel architecture."
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
                "Brain MRI demonstrates an expansive intra-axial mass lesion within the cerebral parenchyma characterized by heterogeneous T1 hypointensity and prominent T2/FLAIR hyperintensity. "
                "The lesion exhibits irregular margins with extensive surrounding vasogenic edema extending along adjacent white matter tracts. "
                "Local mass effect is identified with partial effacement of adjacent sulci, regional cortical displacement, and ipsilateral ventricular compression. "
                "Diffusion-weighted imaging reveals restricted water diffusion within the hypercellular neoplastic core, characteristic of high-grade glial proliferation. "
                "Urgent multidisciplinary neurosurgical and neuro-oncological evaluation is indicated for volumetric navigation and surgical resection planning."
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
                "Brain MRI demonstrates a well-circumscribed, extra-axial dural-based mass lesion exhibiting homogeneous signal enhancement and prominent adjacent dural tail thickening. "
                "The lesion exerts localized mechanical compression upon the adjacent cerebral cortex with a thin rim of cerebrospinal fluid cleft and surrounding vasogenic white matter edema. "
                "Underlying bony structures show localized hyperostosis without evidence of frank osseous invasion or parenchymal destruction. "
                "Ventricular geometry and midline positioning are preserved with no acute obstructive hydrocephalus. "
                "Specialist neurosurgical evaluation is advised to determine surgical resection margins versus serial stereotactic radiosurgical surveillance."
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
                "Brain MRI exhibits focal tissue enlargement and lesion expansion within the sella turcica and pituitary fossa region, consistent with a pituitary micro/macroadenoma. "
                "The lesion causes mild upward convexity of the sellar diaphragm and remodeling of the sellar floor without frank suprasellar extension into the optic chiasm. "
                "Bilateral cavernous sinuses and internal carotid arteries maintain normal flow voids with no evidence of cavernous invasion. "
                "Surrounding brain parenchyma and the third ventricle demonstrate normal morphology without obstructive signs. "
                "Comprehensive endocrinological hormone profiling and formal visual field perimetry are recommended for staging."
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
                "Brain MRI scan demonstrates symmetric cerebral and cerebellar hemispheres with normal, well-defined grey-white matter differentiation throughout all cortical regions. "
                "The lateral, third, and fourth ventricles exhibit normal symmetric caliber and configuration without hydrocephalus or midline shift. "
                "No abnormal focal parenchymal signal alterations, pathological mass lesions, restricted diffusion, or abnormal contrast enhancement are identified. "
                "Basal cisterns, sulcal patterns, and major intracranial vascular flow voids appear entirely physiological. "
                "The radiographic examination reveals no intracranial mass effect, acute infarction, or neoplastic pathology."
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
                "CT scan cross-section demonstrates high-attenuation radiopaque calcifications within the renal parenchyma and collecting system, confirming kidney stone (nephrolithiasis). "
                "The dense mineral nidus is situated within the renal pelvicalyceal junction, causing focal parenchymal compression and early upstream urinary stasis. "
                "Perirenal soft tissues demonstrate mild localized inflammatory hyperdensity with preserved perinephric fat planes. "
                "Associated ureteral caliber assessment indicates intermittent outflow resistance with potential risk for acute hydronephrosis. "
                "Urgent clinical correlation with non-contrast helical CT volumetry and specialist urological consultation is recommended to guide therapeutic extraction."
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
                "CT scan cross-section exhibits homogenous renal parenchyma, bilateral symmetric parenchymal thickness, and a completely unobstructed renal collecting system. "
                "No radiopaque calculi, calcified crystalline deposits, or hyperdense mineral foci are identified within the renal calyces, pelvis, or proximal ureters. "
                "The corticomedullary differentiation remains well-demarcated with clear perinephric and paranephric spaces. "
                "Renal vascular architecture and retroperitoneal structures appear unremarkable with no signs of hydronephrosis or inflammatory perinephric stranding. "
                "Findings are indicative of healthy, non-obstructive renal anatomy with baseline physiological filtration."
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
