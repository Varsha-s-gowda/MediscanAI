import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  HeartPulse,
  Layers,
  Lock,
  Mail,
  Menu,
  Microscope,
  Phone,
  ScanLine,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  X,
  Zap
} from "lucide-react";

/* ============================================================
   SHARED BRANDING
   ============================================================ */

export function BrandMark({ subtitle = "Personal Healthcare Platform" }) {
  return (
    <div className="ms-brand">
      <div className="ms-brand-orb">
        <Sparkles size={19} color="#2DD4BF" />
      </div>
      <div className="ms-brand-copy">
        <span className="ms-brand-name">
          MediScan <span>AI</span>
        </span>
        <span className="ms-brand-sub">{subtitle}</span>
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About" }
];

export function PublicNav({ active, onNavigate, onLogin, onRegister }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [active]);

  const go = (mode) => {
    setMobileOpen(false);
    onNavigate(mode);
  };

  return (
    <header className="ms-public-nav">
      <button type="button" className="ms-nav-brand-btn" onClick={() => go("home")} aria-label="MediScan AI home">
        <BrandMark />
      </button>

      <nav className="ms-nav-links" aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <button
            key={link.id}
            type="button"
            className={`ms-nav-link ${active === link.id ? "active" : ""}`}
            onClick={() => go(link.id)}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="ms-nav-actions">
        <button type="button" className="ms-btn-ghost" onClick={onLogin}>Login</button>
        <button type="button" className="ms-btn-primary ms-btn-sm" onClick={onRegister}>
          Get Started <ArrowRight size={15} />
        </button>
      </div>

      <button
        type="button"
        className="ms-nav-toggle"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="ms-mobile-nav">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className={`ms-mobile-link ${active === link.id ? "active" : ""}`}
              onClick={() => go(link.id)}
            >
              {link.label}
            </button>
          ))}
          <div className="ms-mobile-actions">
            <button type="button" className="ms-btn-ghost" onClick={() => go("login")}>Login</button>
            <button type="button" className="ms-btn-primary" onClick={() => go("register")}>Get Started</button>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter({ onNavigate }) {
  return (
    <footer className="ms-footer">
      <div className="ms-footer-grid">
        <div className="ms-footer-brand">
          <BrandMark subtitle="AI-powered medical imaging & records" />
          <p>
            A personal healthcare workspace for medical image analysis, laboratory report
            insights, health history and secure document management.
          </p>
          <span className="ms-footer-note">
            <ShieldCheck size={14} /> Account-scoped medical records
          </span>
        </div>

        <div className="ms-footer-col">
          <h4>Platform</h4>
          <button type="button" onClick={() => onNavigate("home")}>Home</button>
          <button type="button" onClick={() => onNavigate("features")}>Features</button>
          <button type="button" onClick={() => onNavigate("how-it-works")}>How It Works</button>
          <button type="button" onClick={() => onNavigate("about")}>About</button>
        </div>

        <div className="ms-footer-col">
          <h4>Get Started</h4>
          <button type="button" onClick={() => onNavigate("register")}>Create an account</button>
          <button type="button" onClick={() => onNavigate("login")}>Login</button>
          <button type="button" onClick={() => onNavigate("support")}>Help &amp; Support</button>
        </div>

        <div className="ms-footer-col">
          <h4>Trust &amp; Safety</h4>
          <button type="button" onClick={() => onNavigate("about")}>Privacy &amp; Responsible AI</button>
          <button type="button" onClick={() => onNavigate("about")}>Medical disclaimer</button>
          <button type="button" onClick={() => onNavigate("support")}>Contact support</button>
        </div>
      </div>

      <div className="ms-footer-bottom">
        <span>© {new Date().getFullYear()} MediScan AI. All rights reserved.</span>
        <span>
          MediScan AI provides decision-support information only and does not replace
          professional medical diagnosis.
        </span>
      </div>
    </footer>
  );
}

function PublicLayout({ active, children, onNavigate, onLogin, onRegister }) {
  return (
    <div className="ms-public-shell">
      <PublicNav active={active} onNavigate={onNavigate} onLogin={onLogin} onRegister={onRegister} />
      <main className="ms-public-main">{children}</main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

/* ============================================================
   PUBLIC HOME
   ============================================================ */

const CAPABILITIES = [
  {
    mode: "xray",
    title: "Chest X-Ray Analysis",
    tag: "DenseNet-121",
    image: "/assets/modules/chest_xray.jpg",
    icon: <Stethoscope size={20} />,
    desc: "Review chest radiographs for pneumonia, tuberculosis and normal findings, supported by Grad-CAM attention maps.",
    points: ["Pneumonia / TB / normal classes", "Grad-CAM visual evidence", "Confidence & severity context"]
  },
  {
    mode: "cavity",
    title: "Dental Analysis",
    tag: "EfficientNet-B0",
    image: "/assets/modules/dental_panoramic.jpg",
    icon: <Microscope size={20} />,
    desc: "Screen panoramic, bitewing and periapical dental radiographs for caries and structural dental conditions.",
    points: ["Caries & demineralization", "Dental radiograph support", "Visual heatmap overlay"]
  },
  {
    mode: "ct_scan",
    title: "Kidney Stone CT Analysis",
    tag: "MobileNetV2",
    image: "/assets/modules/kidney_ct.jpg",
    icon: <ScanLine size={20} />,
    desc: "Evaluate supported abdominal CT slices for hyperdense renal calculi and urolithiasis patterns.",
    points: ["Renal calculi detection", "Axial CT slice support", "Confidence scoring"]
  },
  {
    mode: "report",
    title: "Blood Report Analysis",
    tag: "OCR + NLP",
    image: "/assets/modules/blood_smear.jpg",
    icon: <FileText size={20} />,
    desc: "Extract laboratory biomarkers from reports, compare reference ranges and highlight out-of-range values.",
    points: ["OCR report extraction", "Biomarker identification", "Abnormal value highlighting"]
  }
];

const WORKFLOW = [
  {
    icon: <User size={22} />,
    title: "Create Your Account",
    desc: "Register once and your personal healthcare workspace is created automatically."
  },
  {
    icon: <Upload size={22} />,
    title: "Upload Your Medical Scan or Report",
    desc: "Add a chest X-ray, dental radiograph, kidney CT slice or laboratory document."
  },
  {
    icon: <Cpu size={22} />,
    title: "AI-Powered Analysis",
    desc: "The existing diagnostic engines process your file and return explainable findings."
  },
  {
    icon: <FileCheck size={22} />,
    title: "View and Save Your Results",
    desc: "Review the result, download available files and keep everything in your history."
  }
];

const WHY_ITEMS = [
  { icon: <Layers size={19} />, title: "Multiple diagnostic modalities", desc: "Chest, dental, kidney CT and blood report workflows in one account." },
  { icon: <Eye size={19} />, title: "Explainable AI where supported", desc: "Grad-CAM visualisations make model attention easier to review." },
  { icon: <Clock size={19} />, title: "Personal medical history", desc: "Every analysis is linked to your authenticated account automatically." },
  { icon: <FileText size={19} />, title: "Centralized medical records", desc: "Original uploads and AI reports live together in your workspace." },
  { icon: <Zap size={19} />, title: "Easy report access", desc: "Reopen previous results and review documented findings at any time." },
  { icon: <HeartPulse size={19} />, title: "AI-assisted insights", desc: "Structured summaries support conversations with your clinician." }
];

export function PublicHome({ onNavigate, onLogin, onRegister }) {
  return (
    <PublicLayout active="home" onNavigate={onNavigate} onLogin={onLogin} onRegister={onRegister}>
      {/* A. HERO */}
      <section className="ms-hero">
        <div className="ms-hero-copy">
          <span className="ms-eyebrow"><span className="ms-dot" /> AI-POWERED PERSONAL HEALTHCARE</span>
          <h1>
            Smarter Healthcare Starts With{" "}
            <span>Intelligent Medical Imaging.</span>
          </h1>
          <p>
            MediScan AI uses artificial intelligence to analyze medical images and reports,
            delivering explainable insights and helping individuals manage their medical
            information in one convenient platform.
          </p>
          <div className="ms-hero-actions">
            <button type="button" className="ms-btn-primary" onClick={onRegister}>
              Get Started <ArrowRight size={17} />
            </button>
            <button type="button" className="ms-btn-secondary" onClick={() => onNavigate("features")}>
              Explore Platform
            </button>
          </div>
          <div className="ms-hero-trust">
            <span><Check size={14} /> 4 diagnostic modules</span>
            <span><Check size={14} /> Explainable results</span>
            <span><Check size={14} /> Private health records</span>
          </div>
        </div>

        <div className="ms-hero-visual" aria-hidden="true">
          <div className="ms-hero-halo" />
          <div className="ms-scan-panel ms-scan-main">
            <div className="ms-scan-head">
              <span className="ms-dot" /> CHEST RADIOGRAPH
              <span className="ms-scan-badge">AI REVIEW</span>
            </div>
            <div className="ms-scan-image">
              <img src="/assets/modules/chest_xray.jpg" alt="" />
              <span className="ms-scan-line" />
              <span className="ms-scan-target">ATTENTION MAP</span>
            </div>
            <div className="ms-scan-foot">
              <span>Chest X-Ray</span>
              <span className="ms-cyan">Explainable AI</span>
            </div>
          </div>
          <div className="ms-scan-panel ms-scan-dental">
            <div className="ms-scan-head">DENTAL OPG</div>
            <img src="/assets/modules/dental_panoramic.jpg" alt="" />
          </div>
          <div className="ms-scan-panel ms-scan-kidney">
            <div className="ms-scan-head">KIDNEY CT</div>
            <img src="/assets/modules/kidney_ct.jpg" alt="" />
          </div>
          <div className="ms-hero-float-card">
            <Activity size={16} />
            <div>
              <strong>Health overview</strong>
              <span>Scans, reports &amp; history</span>
            </div>
          </div>
        </div>
      </section>

      {/* B. DIAGNOSTIC CAPABILITIES */}
      <section className="ms-section" id="capabilities">
        <div className="ms-section-head">
          <span className="ms-eyebrow"><span className="ms-dot" /> DIAGNOSTIC CAPABILITIES</span>
          <h2>Four focused ways to understand your medical data</h2>
          <p>Each module uses an existing, specialized analysis pipeline — no generic one-size-fits-all model.</p>
        </div>

        <div className="ms-capability-grid">
          {CAPABILITIES.map((item) => (
            <article className="ms-capability-card" key={item.mode}>
              <div className="ms-capability-media">
                <img src={item.image} alt={item.title} />
                <span className="ms-capability-tag">{item.tag}</span>
              </div>
              <div className="ms-capability-body">
                <div className="ms-capability-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}><Check size={13} /> {point}</li>
                  ))}
                </ul>
                <button type="button" className="ms-card-link" onClick={() => onNavigate("register")}>
                  Get started with this module <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* C. HOW IT WORKS */}
      <section className="ms-section ms-section-tinted" id="how-it-works">
        <div className="ms-section-head">
          <span className="ms-eyebrow"><span className="ms-dot" /> HOW IT WORKS</span>
          <h2>From account to insight in four steps</h2>
          <p>A straightforward workflow built around your personal healthcare workspace.</p>
        </div>
        <div className="ms-workflow">
          {WORKFLOW.map((step, index) => (
            <div className="ms-workflow-step" key={step.title}>
              <div className="ms-step-number">0{index + 1}</div>
              <div className="ms-step-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="ms-inline-cta">
          <button type="button" className="ms-btn-primary" onClick={onRegister}>
            Create your account <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* D. WHY CHOOSE */}
      <section className="ms-section" id="why-mediscan">
        <div className="ms-section-head">
          <span className="ms-eyebrow"><span className="ms-dot" /> WHY CHOOSE MEDISCAN AI</span>
          <h2>One organized place for your medical information</h2>
        </div>
        <div className="ms-why-grid">
          {WHY_ITEMS.map((item) => (
            <div className="ms-why-card" key={item.title}>
              <span className="ms-why-icon">{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* E. ABOUT THE TECHNOLOGY */}
      <section className="ms-section ms-tech-strip">
        <div className="ms-tech-copy">
          <span className="ms-eyebrow"><span className="ms-dot" /> ABOUT THE TECHNOLOGY</span>
          <h2>Deep learning, computer vision and OCR working together</h2>
          <p>
            MediScan AI combines deep learning image classifiers, computer vision preprocessing,
            OCR and NLP for laboratory documents, explainable AI heatmaps and medical image
            processing. The platform presents the result of these existing pipelines — it does
            not replace clinical judgement.
          </p>
          <button type="button" className="ms-btn-secondary" onClick={() => onNavigate("about")}>
            Learn more about the platform <ArrowRight size={16} />
          </button>
        </div>
        <div className="ms-tech-chips">
          {["Deep Learning", "Computer Vision", "OCR & NLP", "Explainable AI", "Medical Image Processing"].map((chip) => (
            <span key={chip} className="ms-tech-chip"><Cpu size={14} /> {chip}</span>
          ))}
        </div>
      </section>

      {/* F. PRIVACY & RESPONSIBLE AI */}
      <section className="ms-section ms-privacy-section" id="privacy">
        <div className="ms-privacy-card">
          <div className="ms-privacy-icon"><ShieldCheck size={26} /></div>
          <div>
            <span className="ms-eyebrow"><span className="ms-dot" /> PRIVACY &amp; RESPONSIBLE AI</span>
            <h2>Your records belong to your account</h2>
            <ul className="ms-check-list">
              <li><Check size={14} /> Personal account access to your dashboard and medical records.</li>
              <li><Check size={14} /> Medical documents and analyses are associated with your authenticated user.</li>
              <li><Check size={14} /> Session-based access keeps private pages behind the login flow.</li>
              <li><Check size={14} /> AI-generated results are decision-support information, not a diagnosis.</li>
              <li><Check size={14} /> Consult a qualified healthcare professional for medical decisions.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* G. FINAL CTA */}
      <section className="ms-final-cta">
        <span className="ms-eyebrow"><span className="ms-dot" /> READY WHEN YOU ARE</span>
        <h2>Your Medical Information, Organized and Accessible.</h2>
        <p>Create a personal workspace and keep your scans, reports and results in one place.</p>
        <button type="button" className="ms-btn-primary" onClick={onRegister}>
          Get Started with MediScan AI <ArrowRight size={17} />
        </button>
      </section>
    </PublicLayout>
  );
}

/* ============================================================
   FEATURES PAGE
   ============================================================ */

export function PublicFeatures({ onNavigate }) {
  return (
    <PublicLayout
      active="features"
      onNavigate={onNavigate}
      onLogin={() => onNavigate("login")}
      onRegister={() => onNavigate("register")}
    >
      <section className="ms-page-hero">
        <span className="ms-eyebrow"><span className="ms-dot" /> PLATFORM FEATURES</span>
        <h1>Purpose-built analysis for the documents you actually have</h1>
        <p>
          MediScan AI brings four diagnostic workflows, a personal health history and a
          medical records workspace together behind one secure account.
        </p>
      </section>

      <section className="ms-section ms-section-tight">
        <div className="ms-capability-grid">
          {CAPABILITIES.map((item) => (
            <article className="ms-capability-card" key={item.mode}>
              <div className="ms-capability-media">
                <img src={item.image} alt={item.title} />
                <span className="ms-capability-tag">{item.tag}</span>
              </div>
              <div className="ms-capability-body">
                <div className="ms-capability-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}><Check size={13} /> {point}</li>
                  ))}
                </ul>
                <button type="button" className="ms-card-link" onClick={() => onNavigate("register")}>
                  Start analysis <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ms-section">
        <div className="ms-section-head">
          <span className="ms-eyebrow"><span className="ms-dot" /> BUILT AROUND YOUR WORKSPACE</span>
          <h2>Features that keep your health information usable</h2>
        </div>
        <div className="ms-feature-detail-grid">
          {[
            { icon: <Clock size={20} />, title: "Personal health history", desc: "Search, filter and reopen previous analyses from one timeline." },
            { icon: <FileText size={20} />, title: "Medical records", desc: "Keep original uploads and AI-generated analysis reports organized together." },
            { icon: <User size={20} />, title: "Profile details", desc: "Review the account details associated with your healthcare workspace." },
            { icon: <Eye size={20} />, title: "Explainable output", desc: "Review confidence scores and Grad-CAM visualizations where the model provides them." },
            { icon: <Shield size={20} />, title: "Account-scoped access", desc: "Private pages require an authenticated session." },
            { icon: <FileCheck size={20} />, title: "Downloadable files", desc: "Download original documents where the stored file path is available." }
          ].map((feature) => (
            <div className="ms-feature-detail" key={feature.title}>
              <span>{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ms-final-cta">
        <h2>See it with your own medical documents</h2>
        <p>Create an account to unlock the personal dashboard, history and records workspace.</p>
        <button type="button" className="ms-btn-primary" onClick={() => onNavigate("register")}>
          Get Started <ArrowRight size={16} />
        </button>
      </section>
    </PublicLayout>
  );
}

/* ============================================================
   HOW IT WORKS PAGE
   ============================================================ */

export function PublicHowItWorks({ onNavigate }) {
  return (
    <PublicLayout
      active="how-it-works"
      onNavigate={onNavigate}
      onLogin={() => onNavigate("login")}
      onRegister={() => onNavigate("register")}
    >
      <section className="ms-page-hero">
        <span className="ms-eyebrow"><span className="ms-dot" /> HOW IT WORKS</span>
        <h1>A clear path from upload to organized result</h1>
        <p>
          Every step below maps to functionality that already exists in the platform.
          No fabricated progress percentages and no hidden processing claims.
        </p>
      </section>

      <section className="ms-section ms-section-tight">
        <div className="ms-workflow ms-workflow-vertical">
          {WORKFLOW.map((step, index) => (
            <div className="ms-workflow-step" key={step.title}>
              <div className="ms-step-number">0{index + 1}</div>
              <div className="ms-step-icon">{step.icon}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ms-section">
        <div className="ms-section-head">
          <span className="ms-eyebrow"><span className="ms-dot" /> WHAT YOU RECEIVE</span>
          <h2>Results presented for review, not for self-diagnosis</h2>
        </div>
        <div className="ms-two-col">
          <div className="ms-info-panel">
            <h3><ScanLine size={19} /> For medical images</h3>
            <ul className="ms-check-list">
              <li><Check size={14} /> Uploaded image preview</li>
              <li><Check size={14} /> Predicted classification and confidence</li>
              <li><Check size={14} /> Grad-CAM visualization when generated</li>
              <li><Check size={14} /> Explanation and severity information when provided</li>
              <li><Check size={14} /> Recommendations produced by the existing analysis flow</li>
            </ul>
          </div>
          <div className="ms-info-panel">
            <h3><FileText size={19} /> For blood reports</h3>
            <ul className="ms-check-list">
              <li><Check size={14} /> Extracted biomarker values</li>
              <li><Check size={14} /> Reference ranges from the report</li>
              <li><Check size={14} /> Highlighted abnormal values</li>
              <li><Check size={14} /> Extracted report information and summary</li>
              <li><Check size={14} /> Availability of the original document for download</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ms-section ms-section-tinted">
        <div className="ms-section-head">
          <span className="ms-eyebrow"><span className="ms-dot" /> SUPPORTED FILES</span>
          <h2>Prepare the right document before uploading</h2>
        </div>
        <div className="ms-file-grid">
          {[
            { title: "Chest X-Ray", formats: "PNG, JPG, JPEG", note: "PA or AP chest radiograph" },
            { title: "Dental Analysis", formats: "PNG, JPG, JPEG", note: "Panoramic, bitewing or periapical image" },
            { title: "Kidney Stone CT", formats: "PNG, JPG, JPEG", note: "Supported abdominal CT slice" },
            { title: "Blood Report", formats: "PDF, PNG, JPG, JPEG", note: "Laboratory report document" }
          ].map((item) => (
            <div className="ms-file-card" key={item.title}>
              <h3>{item.title}</h3>
              <strong>{item.formats}</strong>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ms-final-cta">
        <h2>Start with a single scan or report</h2>
        <p>Your first result will appear in your personal health history automatically.</p>
        <button type="button" className="ms-btn-primary" onClick={() => onNavigate("register")}>
          Create account <ArrowRight size={16} />
        </button>
      </section>
    </PublicLayout>
  );
}

/* ============================================================
   ABOUT PAGE (TECHNICAL CONTENT MOVED FROM DASHBOARD)
   ============================================================ */

const MODEL_CARDS = [
  {
    icon: <Brain size={22} />,
    modality: "Thoracic Imaging",
    title: "DenseNet-121",
    badge: "Chest X-Ray",
    desc: "Dense connectivity preserves feature propagation across the chest radiograph classifier. The platform also documents a ResNet-50 fallback path for compatible model weights.",
    specs: [
      ["Input", "224 × 224 RGB radiograph"],
      ["Findings", "Pneumonia, tuberculosis, normal"],
      ["Explainability", "Grad-CAM attention map"]
    ]
  },
  {
    icon: <Activity size={22} />,
    modality: "Dental Radiography",
    title: "EfficientNet-B0",
    badge: "Dental",
    desc: "Compound-scaled convolutional backbone used by the dental cavity engine to evaluate caries and enamel demineralization patterns.",
    specs: [
      ["Input", "224 × 224 dental radiograph"],
      ["Findings", "Cavity / healthy classification"],
      ["Explainability", "Heatmap overlay where generated"]
    ]
  },
  {
    icon: <Cpu size={22} />,
    modality: "Abdominal CT",
    title: "MobileNetV2",
    badge: "Kidney CT",
    desc: "Depthwise separable convolutions support rapid evaluation of axial abdominal CT slices for hyperdense renal calculi.",
    specs: [
      ["Input", "Axial CT slice"],
      ["Findings", "Kidney stone detection"],
      ["Explainability", "Renal attention heatmap where generated"]
    ]
  },
  {
    icon: <FileText size={22} />,
    modality: "Laboratory Documents",
    title: "OCR + NLP Engine",
    badge: "Blood Report",
    desc: "EasyOCR-based text extraction is combined with biomarker and reference-range parsing to identify abnormal laboratory values.",
    specs: [
      ["Documents", "CBC, lipid, metabolic panels"],
      ["Extraction", "OCR biomarker values"],
      ["Output", "Reference-range comparison"]
    ]
  }
];

export function AboutContent({ compact = false }) {
  return (
    <div className={compact ? "ms-about-content ms-about-compact" : "ms-about-content"}>
      <section className={compact ? "ms-about-section" : "ms-section"} id="about-platform">
        <span className="ms-eyebrow"><span className="ms-dot" /> ABOUT THE PLATFORM</span>
        <h2>Healthcare technology designed around the individual</h2>
        <p className="ms-about-lead">
          MediScan AI turns medical images and laboratory documents into structured,
          explainable insights. It is built as a personal healthcare workspace: the account you
          sign in with is the account your uploads, analyses and records belong to.
        </p>
        <p className="ms-about-lead">
          The platform is a decision-support and organization tool. It highlights likely findings,
          confidence and available visual evidence while leaving final clinical judgement to
          licensed professionals.
        </p>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="about-capabilities">
        <span className="ms-eyebrow"><span className="ms-dot" /> DIAGNOSTIC CAPABILITIES</span>
        <h2>Four supported analysis modules</h2>
        <div className="ms-mini-module-grid">
          {CAPABILITIES.map((item) => (
            <div className="ms-mini-module" key={item.mode}>
              <span>{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="platform-architecture">
        <span className="ms-eyebrow"><span className="ms-dot" /> PLATFORM ARCHITECTURE &amp; CAPABILITIES</span>
        <h2>Engineered for high-precision clinical intelligence</h2>
        <p className="ms-about-lead">
          Existing vision models and OCR processing are exposed through the same backend that
          powers the analysis modules. The interface presents their output without changing
          inference logic or class definitions.
        </p>
        <div className="ms-arch-grid">
          {[
            { value: "4/4", label: "Diagnostic modalities", note: "Chest X-Ray, Dental, Kidney CT, Blood Report", icon: <Activity size={22} /> },
            { value: "4", label: "Model families", note: "DenseNet-121, EfficientNet-B0, MobileNetV2, OCR + NLP", icon: <Cpu size={22} /> },
            { value: "End-to-end", label: "Analysis pipeline", note: "Upload, validation, inference and result synthesis", icon: <Layers size={22} /> },
            { value: "Grad-CAM", label: "Visual explanation", note: "Generated where the model pipeline supports it", icon: <Eye size={22} /> }
          ].map((stat) => (
            <div className="ms-arch-card" key={stat.label}>
              <span className="ms-arch-icon">{stat.icon}</span>
              <strong>{stat.value}</strong>
              <h3>{stat.label}</h3>
              <p>{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="deep-learning">
        <span className="ms-eyebrow"><span className="ms-dot" /> DEEP LEARNING ARCHITECTURES &amp; OCR</span>
        <h2>Specialized engines for specific visual patterns</h2>
        <div className="ms-model-grid">
          {MODEL_CARDS.map((model) => (
            <article className="ms-model-card" key={model.title}>
              <div className="ms-model-head">
                <span className="ms-model-icon">{model.icon}</span>
                <div>
                  <span>{model.modality}</span>
                  <h3>{model.title}</h3>
                </div>
                <span className="ms-model-badge">{model.badge}</span>
              </div>
              <p>{model.desc}</p>
              <div className="ms-model-specs">
                {model.specs.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="diagnostic-pipeline">
        <span className="ms-eyebrow"><span className="ms-dot" /> END-TO-END PIPELINE</span>
        <h2>How a document moves through the platform</h2>
        <div className="ms-pipeline">
          {[
            { icon: <Upload size={19} />, title: "1. Clinical ingestion", desc: "Radiograph or report uploaded through the protected analysis flow." },
            { icon: <ShieldCheck size={19} />, title: "2. Scan validation", desc: "Existing validation rejects unsupported or non-medical images." },
            { icon: <Cpu size={19} />, title: "3. Neural inference", desc: "The applicable engine returns a classification, confidence and available attention map." },
            { icon: <FileCheck size={19} />, title: "4. Clinical synthesis", desc: "Findings, explanation, severity and recommendations are assembled for review." }
          ].map((node, index, list) => (
            <React.Fragment key={node.title}>
              <div className="ms-pipe-node">
                <span>{node.icon}</span>
                <h3>{node.title}</h3>
                <p>{node.desc}</p>
              </div>
              {index < list.length - 1 && <span className="ms-pipe-arrow"><ChevronRight size={18} /></span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="explainable-ai">
        <span className="ms-eyebrow"><span className="ms-dot" /> EXPLAINABLE AI</span>
        <h2>Grad-CAM makes model attention visible</h2>
        <div className="ms-xai-panel">
          <div className="ms-xai-visual">
            <div className="ms-xai-pair">
              <div>
                <span>ORIGINAL RADIOGRAPH</span>
                <img src="/assets/modules/chest_xray.jpg" alt="Original chest radiograph" />
              </div>
              <div className="ms-xai-overlay">
                <span>GRAD-CAM ATTENTION</span>
                <img src="/assets/modules/chest_xray.jpg" alt="Grad-CAM attention overlay" />
                <span className="ms-heatmap-glow" />
              </div>
            </div>
            <div className="ms-xai-legend">
              <span>Lower attention</span>
              <div className="ms-xai-gradient" />
              <span>Higher attention</span>
            </div>
          </div>
          <div className="ms-xai-copy">
            <p>
              Grad-CAM highlights the regions that contributed to a model prediction. It helps
              reviewers check whether a result is based on plausible anatomy instead of an
              artifact or a marker on the image.
            </p>
            <ul className="ms-check-list">
              <li><Check size={14} /> Visual evidence for supported image modules</li>
              <li><Check size={14} /> Localized attention for focal findings</li>
              <li><Check size={14} /> A starting point for clinician review, not a diagnosis</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="technology-stack">
        <span className="ms-eyebrow"><span className="ms-dot" /> TECHNOLOGY STACK</span>
        <h2>Technologies used in this project</h2>
        <div className="ms-stack-grid">
          {[
            { title: "Frontend", items: "React, React Router, Lucide icons, responsive CSS", icon: <Layers size={19} /> },
            { title: "Backend API", items: "FastAPI, Pydantic, Uvicorn", icon: <Server size={19} /> },
            { title: "Deep learning", items: "PyTorch, TorchVision, DenseNet-121, EfficientNet-B0, MobileNetV2", icon: <Brain size={19} /> },
            { title: "OCR & documents", items: "EasyOCR, OpenCV, Pillow, report biomarker parsing", icon: <FileText size={19} /> },
            { title: "Explainability", items: "Grad-CAM heatmap generation for supported models", icon: <Eye size={19} /> },
            { title: "Data layer", items: "Existing SQLite / MongoDB-compatible persistence layer", icon: <Database size={19} /> }
          ].map((item) => (
            <div className="ms-stack-card" key={item.title}>
              <span>{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.items}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={compact ? "ms-about-section" : "ms-section"} id="responsible-ai">
        <span className="ms-eyebrow"><span className="ms-dot" /> PRIVACY &amp; RESPONSIBLE AI</span>
        <h2>Clear boundaries for medical AI</h2>
        <div className="ms-disclaimer-card">
          <AlertTriangle size={22} />
          <div>
            <h3>Medical disclaimer</h3>
            <p>
              MediScan AI is an algorithmic decision-support tool. It does not provide a medical
              diagnosis, does not replace professional medical judgment, and must not be used as
              the sole basis for treatment decisions. Always consult a qualified healthcare
              professional about your medical images, laboratory results and symptoms.
            </p>
            <p>
              Privacy controls in this application are limited to authenticated account access and
              separation of records by user account. There is no fabricated encryption or
              compliance certification presented in this interface.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PublicAbout({ onNavigate }) {
  return (
    <PublicLayout
      active="about"
      onNavigate={onNavigate}
      onLogin={() => onNavigate("login")}
      onRegister={() => onNavigate("register")}
    >
      <section className="ms-page-hero">
        <span className="ms-eyebrow"><span className="ms-dot" /> ABOUT MEDISCAN AI</span>
        <h1>A professional product and technology overview</h1>
        <p>
          The platform mission, supported diagnostic modules, underlying architectures and the
          boundaries of responsible medical AI.
        </p>
      </section>
      <AboutContent />
      <section className="ms-final-cta">
        <h2>Explore the platform with your own records</h2>
        <p>Create a personal account to access analysis modules and your health workspace.</p>
        <button type="button" className="ms-btn-primary" onClick={() => onNavigate("register")}>
          Get Started <ArrowRight size={16} />
        </button>
      </section>
    </PublicLayout>
  );
}

/* ============================================================
   HELP & SUPPORT
   ============================================================ */

const FAQS = [
  {
    group: "Account",
    q: "How do I create an account?",
    a: "Open Get Started, enter your full name, email address, password and confirm password, accept the terms and submit. Registration uses the existing account API and signs you in automatically when successful."
  },
  {
    group: "Account",
    q: "I forgot my password. Can I reset it here?",
    a: "The current backend does not expose a password-reset endpoint. The Forgot Password screen explains this honestly instead of pretending to send a reset link. Contact support with your registered email address for help."
  },
  {
    group: "Uploads",
    q: "How do I upload a medical image?",
    a: "From your dashboard choose Upload Medical Scan or open the relevant diagnostic module. Select the modality, drag a file into the upload area or browse for it, then run the analysis."
  },
  {
    group: "Uploads",
    q: "Which file formats are supported?",
    a: "Medical image modules accept PNG, JPG and JPEG files. Blood report analysis also accepts PDF documents. The existing backend validation still decides whether a file is an acceptable medical document."
  },
  {
    group: "Uploads",
    q: "Why was my image rejected?",
    a: "The backend validation screens uploads for supported medical modalities. Non-medical images, corrupt files or images that do not match the selected module can be rejected. Try a clear, correctly cropped medical image."
  },
  {
    group: "Results",
    q: "How should I interpret my analysis result?",
    a: "Treat the prediction, confidence and explanation as decision-support information. Grad-CAM highlights regions the model considered important, but it does not prove a diagnosis. Discuss the result with a qualified healthcare professional."
  },
  {
    group: "Results",
    q: "How do I download a report or original file?",
    a: "Open a result from Health History or Medical Records. Use the existing result actions to download the original stored document, or use the analysis workflow's report download action where it is available."
  },
  {
    group: "Records",
    q: "Where is my medical history stored?",
    a: "Analyses are stored against the patient record associated with your authenticated account. Health History and Medical Records only display records returned for that account."
  },
  {
    group: "Records",
    q: "Can another user see my records?",
    a: "The application requires an authenticated session before showing the dashboard, history, records or profile. The interface does not intentionally expose one user's records to another account."
  },
  {
    group: "Records",
    q: "How do I delete an analysis?",
    a: "Health History provides a delete action where the existing analysis delete endpoint is available. Deleting removes the analysis from your history after confirmation."
  },
  {
    group: "Contact",
    q: "How do I contact support?",
    a: "This build does not expose a live support phone line or ticketing API. For account, access or data questions, contact your MediScan AI project administrator. For medical questions, contact a qualified healthcare professional."
  },
  {
    group: "Disclaimer",
    q: "Is MediScan AI a substitute for a doctor?",
    a: "No. MediScan AI is a decision-support tool. Predictions, confidence scores, OCR findings and Grad-CAM heatmaps are informational and do not constitute a diagnosis. Always have results reviewed by a licensed clinician."
  }
];

export function SupportContent({ embedded = false }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className={embedded ? "ms-support-content ms-support-embedded" : "ms-support-content"}>
      {!embedded && (
        <section className="ms-page-hero">
          <span className="ms-eyebrow"><span className="ms-dot" /> HELP &amp; SUPPORT</span>
          <h1>Answers for using MediScan AI</h1>
          <p>Account setup, uploads, result interpretation, downloads, history and the medical disclaimer.</p>
        </section>
      )}

      <section className={embedded ? "" : "ms-section ms-section-tight"}>
        <div className="ms-support-grid">
          <div className="ms-support-faq">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <article className={`ms-faq-card ${isOpen ? "open" : ""}`} key={faq.q}>
                  <button
                    type="button"
                    className="ms-faq-question"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>
                      <small>{faq.group}</small>
                      {faq.q}
                    </span>
                    <ChevronRight size={17} className="ms-faq-chevron" />
                  </button>
                  {isOpen && <p className="ms-faq-answer">{faq.a}</p>}
                </article>
              );
            })}
          </div>

          <aside className="ms-support-side">
            <div className="ms-support-card">
              <h3><HelpIcon /> Need more help?</h3>
              <p>
                The platform does not publish a live support phone line in this interface.
                For account or data questions, contact the MediScan AI project administrator
                or your healthcare provider.
              </p>
            </div>
            <div className="ms-support-card ms-support-warning">
              <h3><AlertTriangle size={18} /> Medical disclaimer</h3>
              <p>
                MediScan AI results are decision-support information. They are not a diagnosis.
                Seek professional medical advice for any health concern or before making
                treatment decisions.
              </p>
            </div>
            <div className="ms-support-card">
              <h3><Clock size={18} /> Quick checklist</h3>
              <ul className="ms-check-list">
                <li><Check size={14} /> Use a clear, correctly cropped medical image.</li>
                <li><Check size={14} /> Select the matching diagnostic module.</li>
                <li><Check size={14} /> Review confidence and explanation together.</li>
                <li><Check size={14} /> Keep the original document in Medical Records.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function HelpIcon() {
  return <ShieldCheck size={18} />;
}

export function PublicSupport({ onNavigate }) {
  return (
    <PublicLayout
      active="support"
      onNavigate={onNavigate}
      onLogin={() => onNavigate("login")}
      onRegister={() => onNavigate("register")}
    >
      <SupportContent />
    </PublicLayout>
  );
}

/* ============================================================
   AUTHENTICATION PAGES
   ============================================================ */

const AUTH_COPY = {
  login: {
    eyebrow: "SECURE ACCOUNT ACCESS",
    title: "Welcome back",
    subtitle: "Sign in to your personal healthcare workspace.",
    submit: "Sign in"
  },
  register: {
    eyebrow: "CREATE YOUR WORKSPACE",
    title: "Create your account",
    subtitle: "One account for your scans, reports and health history.",
    submit: "Create account"
  },
  "forgot-password": {
    eyebrow: "ACCOUNT RECOVERY",
    title: "Forgot your password?",
    subtitle: "We will explain the available recovery options honestly.",
    submit: "Check recovery options"
  }
};

export function AuthPage({
  mode = "login",
  onNavigate,
  onLogin,
  onRegister,
  onForgotPassword,
  authError,
  authNotice,
  onClearAuthMessages
}) {
  const copy = AUTH_COPY[mode] || AUTH_COPY.login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocalError("");
    setSubmitting(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setAcceptedTerms(false);
  }, [mode]);

  const clearMessages = () => {
    setLocalError("");
    if (onClearAuthMessages) onClearAuthMessages();
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearMessages();

    if (mode === "login") {
      if (!email.trim() || !password) {
        setLocalError("Enter your email address and password.");
        return;
      }
      setSubmitting(true);
      const result = await onLogin({ username: email.trim(), password, remember });
      setSubmitting(false);
      if (!result?.ok) setLocalError(result?.error || "Unable to sign in.");
      return;
    }

    if (mode === "register") {
      if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
        setLocalError("Please complete all required fields.");
        return;
      }
      if (!validateEmail(email.trim())) {
        setLocalError("Enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setLocalError("Use a password with at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
      if (!acceptedTerms) {
        setLocalError("Please accept the Terms and Privacy Policy to continue.");
        return;
      }
      setSubmitting(true);
      const result = await onRegister({
        name: fullName.trim(),
        username: email.trim(),
        password,
        phone: phone.trim()
      });
      setSubmitting(false);
      if (!result?.ok) setLocalError(result?.error || "Unable to create your account.");
      return;
    }

    if (mode === "forgot-password") {
      if (!email.trim() || !validateEmail(email.trim())) {
        setLocalError("Enter the email address registered with your account.");
        return;
      }
      setSubmitting(true);
      await onForgotPassword({ email: email.trim() });
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="ms-auth-shell">
      <div className="ms-auth-visual">
        <button type="button" className="ms-auth-brand" onClick={() => onNavigate("home")}>
          <BrandMark subtitle="AI Healthcare Workspace" />
        </button>
        <div className="ms-auth-visual-copy">
          <span className="ms-eyebrow"><span className="ms-dot" /> YOUR HEALTH, ORGANIZED</span>
          <h2>Medical images, reports and results in one private workspace.</h2>
          <p>
            Sign in to upload a new scan, review previous analyses or open your medical records.
            Your dashboard is built from your own account data.
          </p>
          <div className="ms-auth-points">
            <span><Check size={14} /> Chest, dental, kidney CT and blood report modules</span>
            <span><Check size={14} /> Personal health history and records</span>
            <span><Check size={14} /> Explainable results where supported</span>
          </div>
        </div>
        <div className="ms-auth-visual-art" aria-hidden="true">
          <div className="ms-auth-ring" />
          <img src="/assets/modules/chest_xray.jpg" alt="" />
          <span className="ms-auth-scan-line" />
        </div>
        <button type="button" className="ms-auth-back" onClick={() => onNavigate("home")}>
          ← Back to MediScan AI
        </button>
      </div>

      <div className="ms-auth-form-side">
        <div className="ms-auth-card">
          <span className="ms-eyebrow"><span className="ms-dot" /> {copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p className="ms-auth-subtitle">{copy.subtitle}</p>

          {authNotice && (
            <div className="ms-auth-notice">
              <ShieldCheck size={17} />
              <span>{authNotice}</span>
            </div>
          )}
          {displayError && (
            <div className="ms-auth-error" role="alert">
              <AlertTriangle size={17} />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="ms-auth-form">
            {mode === "register" && (
              <label className="ms-field">
                <span>Full name</span>
                <div className="ms-field-control">
                  <User size={16} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearMessages(); }}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>
            )}

            <label className="ms-field">
              <span>{mode === "login" ? "Email address" : "Email address"}</span>
              <div className="ms-field-control">
                <Mail size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            {mode === "register" && (
              <label className="ms-field">
                <span>Phone number <em>optional</em></span>
                <div className="ms-field-control">
                  <Phone size={16} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </div>
              </label>
            )}

            {mode !== "forgot-password" && (
              <label className="ms-field">
                <span>Password</span>
                <div className="ms-field-control">
                  <Lock size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                    placeholder="Enter your password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                  />
                  <button
                    type="button"
                    className="ms-field-toggle"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            )}

            {mode === "register" && (
              <>
                <label className="ms-field">
                  <span>Confirm password</span>
                  <div className="ms-field-control">
                    <Lock size={16} />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearMessages(); }}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="ms-field-toggle"
                      onClick={() => setShowConfirm((show) => !show)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="ms-terms">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => { setAcceptedTerms(e.target.checked); clearMessages(); }}
                  />
                  <span>
                    I accept the Terms and Privacy Policy. I understand that MediScan AI
                    provides decision-support information, not a medical diagnosis.
                  </span>
                </label>
              </>
            )}

            {mode === "login" && (
              <div className="ms-auth-options">
                <label className="ms-checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="ms-text-link" onClick={() => onNavigate("forgot-password")}>
                  Forgot password?
                </button>
              </div>
            )}

            {mode === "forgot-password" && (
              <p className="ms-auth-note">
                Password recovery is not available through the current backend. This screen
                checks the address you enter and explains the available options. It never
                claims to send a reset email when no reset endpoint exists.
              </p>
            )}

            <button type="submit" className="ms-btn-primary ms-auth-submit" disabled={submitting}>
              {submitting ? "Please wait…" : copy.submit}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="ms-auth-switch">
            {mode === "login" && (
              <span>
                New to MediScan AI?{" "}
                <button type="button" onClick={() => onNavigate("register")}>Create an account</button>
              </span>
            )}
            {mode === "register" && (
              <span>
                Already have an account?{" "}
                <button type="button" onClick={() => onNavigate("login")}>Sign in</button>
              </span>
            )}
            {mode === "forgot-password" && (
              <span>
                Remembered it?{" "}
                <button type="button" onClick={() => onNavigate("login")}>Back to sign in</button>
              </span>
            )}
          </div>

          <p className="ms-auth-disclaimer">
            <Shield size={13} /> Private medical records require an authenticated session.
          </p>
        </div>
      </div>
    </div>
  );
}
