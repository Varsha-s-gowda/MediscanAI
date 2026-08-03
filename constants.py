# Target Thoracic Disease Classes (18 labels)
DISEASE_CLASSES = [
    "Atelectasis",
    "Cardiomegaly",
    "Consolidation",
    "Edema",
    "Effusion",
    "Emphysema",
    "Fibrosis",
    "Hernia",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pleural Thickening",
    "Pneumonia",
    "Pneumothorax",
    "COVID-19",
    "Tuberculosis",
    "Lung Opacity",
    "Normal"
]

# Severity scale threshold mappings (Confidence percentage to label)
SEVERITY_MAPPING = {
    "Low": (0.0, 30.0),
    "Moderate": (30.0, 70.0),
    "High": (70.0, 100.0)
}

# Detailed clinical descriptions, symptoms, precautions, and follow-ups
DISEASE_INFO = {
    "Atelectasis": {
        "description": "Partial or complete collapse of a lung or lobe, limiting oxygen intake.",
        "symptoms": ["Shortness of breath", "Rapid, shallow breathing", "Coughing", "Chest pain"],
        "precautions": ["Practice deep breathing exercises", "Stay upright after eating", "Use incentive spirometer"],
        "follow_up": "Consult a pulmonologist; chest physiotherapy may be recommended."
    },
    "Cardiomegaly": {
        "description": "Enlargement of the heart, often indicative of underlying cardiovascular conditions.",
        "symptoms": ["Shortness of breath", "Dizziness", "Arrhythmia (irregular heartbeat)", "Fluid retention"],
        "precautions": ["Limit sodium intake", "Monitor daily blood pressure", "Avoid strenuous exertion"],
        "follow_up": "Urgent consultation with a cardiologist; echocardiogram suggested."
    },
    "Consolidation": {
        "description": "Alveolar spaces filled with fluid, pus, or cellular debris, typical in infection.",
        "symptoms": ["Productive cough", "Fever", "Difficulty breathing", "Fatigue"],
        "precautions": ["Stay hydrated", "Avoid cold drafts", "Rest in a semi-upright position"],
        "follow_up": "Evaluation by primary physician; sputum culture and antibiotic therapy review."
    },
    "Edema": {
        "description": "Excess fluid accumulation in lung tissues, commonly linked to heart failure.",
        "symptoms": ["Severe dyspnea (difficulty breathing)", "Wheezing", "Coughing up pink, frothy sputum", "Cold, clammy skin"],
        "precautions": ["Take diuretics as prescribed", "Elevate legs when resting", "Limit fluid intake strictly"],
        "follow_up": "Immediate medical assessment required; monitor BNP levels and heart function."
    },
    "Effusion": {
        "description": "Abnormal build-up of fluid in the pleural space surrounding the lungs.",
        "symptoms": ["Dry cough", "Chest pain worsening with deep breaths", "Shortness of breath", "Orthopnea"],
        "precautions": ["Avoid sleeping flat on back", "Limit heavy lifting", "Monitor oxygen levels"],
        "follow_up": "Thoracentesis may be indicated; follow-up with pulmonology is essential."
    },
    "Emphysema": {
        "description": "Chronic lung condition characterized by damaged air sacs (alveoli), reducing oxygen exchange.",
        "symptoms": ["Chronic cough", "Long-term shortness of breath", "Wheezing", "Ongoing fatigue"],
        "precautions": ["Avoid cigarette smoke and air pollutants", "Perform breathing control techniques", "Get annual flu vaccine"],
        "follow_up": "Pulmonary function testing (PFT); check-up with chest specialist."
    },
    "Fibrosis": {
        "description": "Scarring and thickening of lung tissues, making breathing progressively difficult.",
        "symptoms": ["Dry, hacking cough", "Gradual shortness of breath", "Unexplained weight loss", "Muscle aches"],
        "precautions": ["Avoid occupational dust/fiber exposures", "Participate in pulmonary rehab", "Use oxygen therapy if prescribed"],
        "follow_up": "Regular lung volume tests (PFTs) and high-resolution chest CT scans."
    },
    "Hernia": {
        "description": "Protrusion of abdominal structures through the diaphragm into the thoracic cavity.",
        "symptoms": ["Acid reflux/heartburn", "Difficulty swallowing", "Chest discomfort", "Shortness of breath after eating"],
        "precautions": ["Eat smaller, frequent meals", "Do not lie down for 2 hours after meals", "Avoid tight clothing around abdomen"],
        "follow_up": "Consult a general surgeon or gastroenterologist; upper endoscopy may be needed."
    },
    "Infiltration": {
        "description": "Abnormal accumulation of substance (pus, blood, protein) in lung parenchyma.",
        "symptoms": ["Fever", "Cough with sputum", "Mild chest soreness", "Increased fatigue"],
        "precautions": ["Get plenty of bed rest", "Increase daily intake of fluids", "Wash hands regularly"],
        "follow_up": "Repeat chest X-ray in 4-6 weeks to check resolution; review with physician."
    },
    "Mass": {
        "description": "A localized abnormal lesion in the lung larger than 3 cm, requiring diagnostic investigation.",
        "symptoms": ["Persistent cough", "Coughing up blood", "Unexplained weight loss", "Localized chest pain"],
        "precautions": ["Avoid smoking completely", "Limit exposure to carcinogens", "Monitor weight regularly"],
        "follow_up": "Requires immediate follow-up with CT scan and biopsy consultation."
    },
    "Nodule": {
        "description": "Small round or oval-shaped growth in the lung, typically under 3 cm.",
        "symptoms": ["Usually asymptomatic", "Occasionally mild dry cough"],
        "precautions": ["Schedule yearly screening scans", "Keep copies of previous chest X-rays for comparison"],
        "follow_up": "Serial chest CT monitoring as per Fleischner Society guidelines."
    },
    "Pleural Thickening": {
        "description": "Scarring or thickening of the pleural membrane, sometimes related to asbestos exposure.",
        "symptoms": ["Chest tightness", "Dull, aching chest pain", "Mild breathing difficulties"],
        "precautions": ["Avoid all forms of asbestos/smoke exposure", "Incorporate breathing exercises"],
        "follow_up": "Pulmonology evaluation; monitor for changes in spirometry."
    },
    "Pneumonia": {
        "description": "Infectious inflammation of the lung air sacs, filled with pus and fluids.",
        "symptoms": ["Fever with chills", "Cough producing yellow/green mucus", "Shortness of breath", "Chest pain when breathing"],
        "precautions": ["Take prescribed antibiotics/antivirals fully", "Rest extensively", "Avoid strenuous physical tasks"],
        "follow_up": "Follow-up X-ray in 6 weeks to confirm clear lungs."
    },
    "Pneumothorax": {
        "description": "A collapsed lung occurring when air leaks into the pleural space between lung and chest wall.",
        "symptoms": ["Sudden, sharp chest pain on one side", "Severe shortness of breath", "Rapid heart rate", "Tightness in chest"],
        "precautions": ["Avoid changes in atmospheric pressure (flying/diving)", "Limit physical straining"],
        "follow_up": "Emergency medical attention; serial X-rays to ensure complete re-expansion."
    },
    "COVID-19": {
        "description": "Viral respiratory illness caused by SARS-CoV-2, showing characteristic bilateral ground-glass opacities.",
        "symptoms": ["Loss of taste/smell", "Dry cough", "Fever", "Muscle aches", "Shortness of breath"],
        "precautions": ["Isolate from others", "Monitor oxygen levels with a pulse oximeter", "Wear a highly protective mask"],
        "follow_up": "Consult primary care physician; monitor for long-term respiratory effects (Long COVID)."
    },
    "Tuberculosis": {
        "description": "Contagious bacterial infection primarily attacking lung tissues, often showing cavitary lesions.",
        "symptoms": ["Cough lasting over 3 weeks", "Coughing up blood", "Night sweats", "Fever", "Severe fatigue"],
        "precautions": ["Adhere strictly to anti-TB drug regimen", "Ventilate living spaces well", "Isolate during infectious stage"],
        "follow_up": "Directly Observed Therapy (DOT) monitoring; sputum smear testing periodically."
    },
    "Lung Opacity": {
        "description": "Nonspecific decrease in lung density visibility on X-ray, requiring clinical correlation.",
        "symptoms": ["Mild cough", "Shortness of breath during exertion", "Vague chest discomfort"],
        "precautions": ["Avoid dusty environments", "Stay updated on pulmonary immunizations"],
        "follow_up": "Correlate with clinical history and proceed with CT scan if symptom persists."
    },
    "Normal": {
        "description": "No apparent radiographic abnormalities detected in the chest cavity.",
        "symptoms": ["None"],
        "precautions": ["Maintain healthy lifestyle", "Exercise regularly", "Avoid smoking"],
        "follow_up": "Routine preventive screenings."
    }
}
