import PptxGenJS from "pptxgenjs";
import * as path from "path";
import * as fs from "fs";

const C = {
  bg: "0A1628",
  cardBg: "111F36",
  cardBg2: "162844",
  accent: "00C9DB",
  blue: "2B7DE9",
  gold: "F2C744",
  white: "FFFFFF",
  offWhite: "D6DDE8",
  muted: "7B8CA3",
  red: "E5394A",
  amber: "F4A261",
  green: "2CC9A0",
  purple: "9B72F2",
  pink: "E84393",
  divider: "1E3554",
  dkCard: "0D1A2E",
};

const F = "Calibri";

function footer(s: PptxGenJS.Slide, n: number, total: number) {
  s.addShape("rect" as any, { x: 0, y: 7.18, w: 13.33, h: 0.015, fill: { color: C.divider } });
  s.addText("ACCELERANT   ·   Month-End Process Flow   ·   CONFIDENTIAL", {
    x: 0.5, y: 7.2, w: 8, h: 0.25, fontSize: 7, color: C.muted, fontFace: F,
  });
  s.addText(`${n} / ${total}`, {
    x: 12, y: 7.2, w: 0.8, h: 0.25, fontSize: 7, color: C.muted, fontFace: F, align: "right",
  });
}

function topBar(s: PptxGenJS.Slide, pptx: PptxGenJS) {
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.05, fill: { color: C.accent } });
}

function heading(s: PptxGenJS.Slide, title: string, subtitle: string) {
  s.addText(title, {
    x: 0.6, y: 0.3, w: 12, h: 0.6, fontSize: 28, fontFace: F, color: C.white, bold: true,
  });
  s.addText(subtitle, {
    x: 0.6, y: 0.85, w: 12, h: 0.3, fontSize: 14, fontFace: F, color: C.gold,
  });
}

function sectionLabel(s: PptxGenJS.Slide, text: string, x: number, y: number, w = 6) {
  s.addText(text, {
    x, y, w, h: 0.3, fontSize: 12, fontFace: F, color: C.accent, bold: true,
  });
}

function card(s: PptxGenJS.Slide, pptx: PptxGenJS, x: number, y: number, w: number, h: number, bg = C.cardBg) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: bg }, rectRadius: 0.08 });
}

function cardWithStripe(
  s: PptxGenJS.Slide, pptx: PptxGenJS,
  x: number, y: number, w: number, h: number,
  stripeColor: string, bg = C.cardBg
) {
  card(s, pptx, x, y, w, h, bg);
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: stripeColor } });
}

function bulletList(s: PptxGenJS.Slide, items: string[], x: number, y: number, w: number, color = C.offWhite, bulletColor = C.accent) {
  items.forEach((item, i) => {
    s.addText(item, {
      x, y: y + i * 0.28, w, h: 0.26,
      fontSize: 9.5, fontFace: F, color, valign: "middle",
      bullet: { type: "bullet", color: bulletColor },
    });
  });
}

function flowArrow(s: PptxGenJS.Slide, x: number, y: number, h = 0.4) {
  s.addText("\u25BC", { x: x - 0.15, y, w: 0.3, h, fontSize: 14, color: C.muted, align: "center", valign: "middle" });
}

function flowArrowRight(s: PptxGenJS.Slide, x: number, y: number, w = 0.35) {
  s.addText("\u25B8", { x, y, w, h: 0.35, fontSize: 14, color: C.muted, align: "center", valign: "middle" });
}

function systemBox(
  s: PptxGenJS.Slide, pptx: PptxGenJS,
  x: number, y: number, w: number, h: number,
  title: string, color: string, items?: string[]
) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: C.cardBg }, rectRadius: 0.06,
    line: { color, width: 1.2 },
  });
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.32, fill: { color },
  });
  s.addText(title, {
    x: x + 0.1, y, w: w - 0.2, h: 0.32,
    fontSize: 10, fontFace: F, color: C.white, bold: true, valign: "middle",
  });
  if (items) {
    items.forEach((item, i) => {
      s.addText(item, {
        x: x + 0.12, y: y + 0.38 + i * 0.24, w: w - 0.24, h: 0.22,
        fontSize: 8.5, fontFace: F, color: C.offWhite, valign: "middle",
      });
    });
  }
}

// ══════════════════════════════════════════════════
function create() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "QA Engineering";
  pptx.company = "Accelerant";
  pptx.title = "Month-End Close — Detailed Process Flow";

  const TOTAL_SLIDES = 8;

  // ─────────────────────────────────────────────
  // SLIDE 1 — Title Slide
  // ─────────────────────────────────────────────
  const s1 = pptx.addSlide();
  s1.background = { color: C.bg };
  topBar(s1, pptx);

  s1.addText("Month-End Close", {
    x: 0.8, y: 1.8, w: 11, h: 1.0,
    fontSize: 44, fontFace: F, color: C.white, bold: true,
  });
  s1.addText("Detailed Process Flow", {
    x: 0.8, y: 2.7, w: 11, h: 0.7,
    fontSize: 32, fontFace: F, color: C.accent,
  });

  s1.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 3.6, w: 2.5, h: 0.03, fill: { color: C.gold },
  });

  s1.addText(
    "End-to-end data flow architecture across source systems, data pipelines,\n" +
    "financial platforms, and reporting systems — supporting the monthly close\n" +
    "cycle for a publicly listed insurance holding company.",
    {
      x: 0.8, y: 3.85, w: 9, h: 0.9,
      fontSize: 13, fontFace: F, color: C.muted, lineSpacingMultiple: 1.4,
    }
  );

  const metaItems = [
    ["Regions", "EU  ·  UK  ·  US  ·  CA"],
    ["Timeline", "WD0 – WD14  (Working Day calendar)"],
    ["Entities", "ASIC · ANIC · AICC · AIUK · AIGB · AIEL + Reinsurers"],
    ["Systems", "15+ integrated platforms"],
  ];
  metaItems.forEach((m, i) => {
    const y = 5.1 + i * 0.42;
    s1.addText(m[0], {
      x: 0.8, y, w: 1.4, h: 0.35, fontSize: 10, fontFace: F, color: C.accent, bold: true,
    });
    s1.addText(m[1], {
      x: 2.2, y, w: 6, h: 0.35, fontSize: 10, fontFace: F, color: C.offWhite,
    });
  });

  s1.addText("Accelerant   ·   QA Engineering   ·   February 2026", {
    x: 0.8, y: 6.8, w: 8, h: 0.3, fontSize: 9, fontFace: F, color: C.muted,
  });
  footer(s1, 1, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 2 — End-to-End Overview
  // ─────────────────────────────────────────────
  const s2 = pptx.addSlide();
  s2.background = { color: C.bg };
  topBar(s2, pptx);
  heading(s2, "End-to-End Process Overview", "High-level data flow from source to close");

  const stages = [
    { label: "1. Source\nSystems", sub: "BDX, Sharepoint,\nManual Files", color: C.blue },
    { label: "2. Data\nIngestion", sub: "ADP Platform,\nRAW Layer", color: C.blue },
    { label: "3. ODS", sub: "Enrichment &\nTransformations", color: C.purple },
    { label: "4. TDS", sub: "Calculations &\nIntegrations", color: C.purple },
    { label: "5. Data\nProducts", sub: "Reporting,\nPower BI", color: C.accent },
    { label: "6. D365\nF&O", sub: "GL, SL, AR/AP\nPosting", color: C.green },
    { label: "7. Tagetik", sub: "Consol., SII,\nReporting", color: C.gold },
    { label: "8. Close &\nReport", sub: "Sign-off,\nPublish", color: C.red },
  ];

  const stgW = 1.3;
  const stgGap = 0.2;
  const stgX = 0.4;
  const stgY = 1.5;

  stages.forEach((stg, i) => {
    const x = stgX + i * (stgW + stgGap);
    s2.addShape(pptx.ShapeType.roundRect, {
      x, y: stgY, w: stgW, h: 0.9,
      fill: { color: stg.color }, rectRadius: 0.06,
    });
    s2.addText(stg.label, {
      x, y: stgY, w: stgW, h: 0.55,
      fontSize: 10, fontFace: F, color: C.white, bold: true,
      align: "center", valign: "middle", lineSpacingMultiple: 0.9,
    });
    s2.addText(stg.sub, {
      x, y: stgY + 0.5, w: stgW, h: 0.38,
      fontSize: 7.5, fontFace: F, color: "FFFFFFCC",
      align: "center", valign: "top", lineSpacingMultiple: 0.95,
    });
    if (i < stages.length - 1) {
      flowArrowRight(s2, x + stgW - 0.02, stgY + 0.27, stgGap + 0.04);
    }
  });

  // Parallel systems below
  sectionLabel(s2, "Parallel & Supporting Systems", 0.6, 2.7);

  const parallelSystems = [
    { name: "Datasource\n(Dynamics)", items: ["Contract Master", "Master Data / LOB", "BDX Repository", "Operation Workflow"], color: C.green, x: 0.5 },
    { name: "DCR\n(Deal Capture)", items: ["Ceded: ASIC, ANIC, AICC, AIUK, AIGB, AIEL", "3rd party: Hadron US/UK, Amtrust, Woodstar", "Assumed: Cayman, Puerto Rico", "Business Objects / Jasper"], color: C.purple, x: 3.3 },
    { name: "Reference\nData", items: ["Product Maps", "Contract Data", "Master Data – LOB etc.", "BDX Repository"], color: C.accent, x: 6.1 },
    { name: "Reporting\nLayer", items: ["Financial Data Mart", "Power BI (Expenses, Consol.)", "TDS Data & Transactional", "Reference Data"], color: C.blue, x: 8.9 },
    { name: "FX & External\nRates", items: ["Oanda (Currency Pair FX)", "API – Daily / Overnight", "Feeds D365 & Tagetik"], color: C.gold, x: 11.3 },
  ];

  parallelSystems.forEach((sys) => {
    const y = 3.1;
    const w = sys.x >= 11 ? 1.6 : 2.5;
    systemBox(s2, pptx, sys.x, y, w, 1.7, sys.name, sys.color, sys.items);
  });

  // Key interactions
  sectionLabel(s2, "Key Process Interactions", 0.6, 5.1);

  const interactions = [
    { from: "Operations Team", action: "Stops BDX loading ~1 week before close", to: "Source Systems", color: C.blue },
    { from: "Stored Procedures", action: "Executed in sequence → generate CSV files", to: "Downstream Systems", color: C.purple },
    { from: "D365 Posting", action: "GL / SL entries → feeds Tagetik consolidation", to: "Tagetik", color: C.green },
    { from: "Tagetik Consol.", action: "FX translation, IC elimination, COA mapping", to: "Final Close", color: C.gold },
  ];

  interactions.forEach((int, i) => {
    const y = 5.5 + i * 0.42;
    const bg = i % 2 === 0 ? C.cardBg : C.dkCard;
    s2.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 12.3, h: 0.38, fill: { color: bg } });

    s2.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: y + 0.06, w: 0.08, h: 0.26, fill: { color: int.color }, rectRadius: 0.02,
    });
    s2.addText(int.from, {
      x: 0.8, y, w: 2.2, h: 0.38, fontSize: 9.5, fontFace: F, color: C.white, bold: true, valign: "middle",
    });
    s2.addText(int.action, {
      x: 3.1, y, w: 6.5, h: 0.38, fontSize: 9.5, fontFace: F, color: C.offWhite, valign: "middle",
    });
    s2.addText(int.to, {
      x: 10, y, w: 2.5, h: 0.38, fontSize: 9.5, fontFace: F, color: int.color, bold: true, valign: "middle", align: "right",
    });
  });

  footer(s2, 2, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 3 — Source Systems & Data Ingestion
  // ─────────────────────────────────────────────
  const s3 = pptx.addSlide();
  s3.background = { color: C.bg };
  topBar(s3, pptx);
  heading(s3, "Stage 1–2: Source Systems & Data Ingestion", "BDX files, manual inputs, and the ADP ingestion layer");

  // Left: Source systems
  sectionLabel(s3, "Source Systems", 0.6, 1.4);

  systemBox(s3, pptx, 0.5, 1.8, 3.5, 2.3, "Bordereaux (BDX) Files", C.blue, [
    "Written BDX  →  POLICY data",
    "Claims BDX  →  CLAIMS data",
    "Fund BDX  →  FA03 processing",
  ]);

  systemBox(s3, pptx, 0.5, 4.35, 3.5, 1.5, "Manual & Scheduled Inputs", C.amber, [
    "Sharepoint → BDX Repository",
    "Manual CSV files (IMP-003) — Daily",
    "IMP-007/008/005 — Last Friday of prior month",
  ]);

  // Middle: Datasource (Dynamics reference master)
  sectionLabel(s3, "Datasource (Reference Master)", 4.5, 1.4);

  systemBox(s3, pptx, 4.4, 1.8, 3.8, 2.8, "Dynamics Reference Platform", C.green, [
    "Contract Entity  (Contract Master)",
    "Contract Master  (Code only)",
    "Master Data  –  LOB, Products, Fees",
    "BDX Repository",
    "Operation Workflow",
    "External Master  (Code)",
    "Contract Master  (Code)",
  ]);

  // Arrows from left to middle
  flowArrowRight(s3, 4.0, 2.6);
  flowArrowRight(s3, 4.0, 4.8);

  // Right: ADP Ingestion & RAW
  sectionLabel(s3, "Ingestion Pipeline", 8.8, 1.4);

  systemBox(s3, pptx, 8.7, 1.8, 4.1, 1.4, "ADP Ingestion Platform", C.purple, [
    "Validates formatting, schema, control totals",
    "Detects duplicates, missing keys",
    "Monitors ingestion logs, landing accuracy",
  ]);

  flowArrow(s3, 10.75, 3.25);

  systemBox(s3, pptx, 8.7, 3.7, 4.1, 1.2, "RAW Layer", C.purple, [
    "Landing zone for all ingested data",
    "Schema alignment checks vs. source",
  ]);

  // Arrow from Datasource to ADP
  flowArrowRight(s3, 8.2, 2.3);

  // BDX Repository detail
  sectionLabel(s3, "BDX Repository", 0.6, 6.1);

  const bdxItems = ["FKS", "BDX1", "Library", "Previous BDX files (DXI)"];
  bdxItems.forEach((item, i) => {
    const x = 0.6 + i * 2.2;
    card(s3, pptx, x, 6.45, 2.0, 0.4);
    s3.addText(item, {
      x, y: 6.45, w: 2.0, h: 0.4,
      fontSize: 10, fontFace: F, color: C.offWhite, align: "center", valign: "middle",
    });
  });

  // Cash matching callout
  card(s3, pptx, 4.4, 4.85, 3.8, 0.8, C.cardBg2);
  s3.addText("Cash Matching Tool", {
    x: 4.55, y: 4.9, w: 3.5, h: 0.3,
    fontSize: 10, fontFace: F, color: C.amber, bold: true,
  });
  s3.addText("Manual excel-based process — done by FRS team", {
    x: 4.55, y: 5.2, w: 3.5, h: 0.3,
    fontSize: 9, fontFace: F, color: C.muted,
  });

  footer(s3, 3, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 4 — ODS / TDS / Data Products
  // ─────────────────────────────────────────────
  const s4 = pptx.addSlide();
  s4.background = { color: C.bg };
  topBar(s4, pptx);
  heading(s4, "Stage 3–5: ODS, TDS & Data Products", "Core transformation, calculation, and reporting layers");

  // ODS
  systemBox(s4, pptx, 0.5, 1.5, 3.8, 2.8, "ODS  (Underwriting / Claims)", C.purple, [
    "Enrichments",
    "Transformations",
    "Underwriting data processing",
    "Claims data processing",
    "dbt validations: integrity, uniqueness, joins",
    "Trigger point for downstream TDS",
  ]);

  flowArrowRight(s4, 4.3, 2.6);

  // TDS
  systemBox(s4, pptx, 4.8, 1.5, 3.8, 2.8, "TDS  (Integrations)", C.accent, [
    "Calculations",
    "Transformations",
    "Integration with downstream systems",
    "Feeds Data Products & Reporting",
    "Cross-system join validation",
    "Schema alignment with D365",
  ]);

  flowArrowRight(s4, 8.6, 2.6);

  // Data Products
  systemBox(s4, pptx, 9.1, 1.5, 3.7, 2.8, "Data Products & Reporting", C.blue, [
    "Financial Data Mart",
    "Power BI dashboards",
    "Expenses & Consolidation views",
    "TDS Data feeds",
    "Transactional data",
    "Reference data",
  ]);

  // References box
  sectionLabel(s4, "Reference Data Layer (shared across pipeline)", 0.6, 4.7);

  const refItems = [
    { name: "Product Maps", desc: "Product-to-LOB mapping definitions" },
    { name: "Contract Data", desc: "Contract master reference" },
    { name: "Master Data", desc: "LOB, fee codes, commission structures" },
    { name: "Reference Data", desc: "Lookup values, codes, hierarchies" },
    { name: "BDX Repository", desc: "Bordereaux file definitions & templates" },
  ];

  refItems.forEach((ref, i) => {
    const x = 0.5 + i * 2.55;
    card(s4, pptx, x, 5.1, 2.35, 0.95);
    s4.addText(ref.name, {
      x: x + 0.12, y: 5.15, w: 2.1, h: 0.32,
      fontSize: 10.5, fontFace: F, color: C.accent, bold: true,
    });
    s4.addText(ref.desc, {
      x: x + 0.12, y: 5.48, w: 2.1, h: 0.45,
      fontSize: 8.5, fontFace: F, color: C.muted, lineSpacingMultiple: 1.1,
    });
  });

  // Validation callout
  card(s4, pptx, 0.5, 6.3, 12.3, 0.7, C.cardBg2);
  s4.addShape(pptx.ShapeType.rect, { x: 0.5, y: 6.3, w: 0.06, h: 0.7, fill: { color: C.amber } });
  s4.addText("Validation Gate", {
    x: 0.75, y: 6.32, w: 2, h: 0.3,
    fontSize: 10, fontFace: F, color: C.amber, bold: true,
  });
  s4.addText(
    "Any failure at ODS or TDS returns the flow to data ingestion (Stage 2) for correction and reload. " +
    "dbt tests cover integrity, uniqueness, and join correctness across all layers.",
    {
      x: 0.75, y: 6.6, w: 11.8, h: 0.35,
      fontSize: 9.5, fontFace: F, color: C.offWhite,
    }
  );

  footer(s4, 4, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 5 — D365 F&O & Financial Posting
  // ─────────────────────────────────────────────
  const s5 = pptx.addSlide();
  s5.background = { color: C.bg };
  topBar(s5, pptx);
  heading(s5, "Stage 6: D365 F&O — Financial Posting", "General Ledger, Subledger, AR/AP, and entity management");

  // Main D365 box
  card(s5, pptx, 0.5, 1.5, 8.0, 3.8, C.cardBg2);
  s5.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.5, w: 8.0, h: 0.38, fill: { color: C.green } });
  s5.addText("D365 F&O  —  AR / AP / Subledger / General Ledger", {
    x: 0.65, y: 1.5, w: 7.7, h: 0.38,
    fontSize: 12, fontFace: F, color: C.white, bold: true, valign: "middle",
  });

  // Entity groups
  const entityGroups = [
    { label: "Accelerant Insurers", entities: "ASIC  ·  ANIC  ·  AICC  ·  AIUK  ·  AIGB  ·  AIEL", color: C.blue },
    { label: "BDX Entities", entities: "ASNA  ·  ASCA  ·  ASEU  ·  MI  ·  Subs Bk", color: C.purple },
    { label: "Accelerant Reinsurers", entities: "ARKY  ·  AIPR  ·  ARPU", color: C.accent },
    { label: "Other", entities: "Service Companies  ·  Hold Co  ·  Mission Entities", color: C.gold },
  ];

  entityGroups.forEach((eg, i) => {
    const y = 2.1 + i * 0.55;
    s5.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y, w: 0.08, h: 0.4, fill: { color: eg.color }, rectRadius: 0.02,
    });
    s5.addText(eg.label, {
      x: 0.9, y, w: 2.5, h: 0.4, fontSize: 10, fontFace: F, color: eg.color, bold: true, valign: "middle",
    });
    s5.addText(eg.entities, {
      x: 3.5, y, w: 4.8, h: 0.4, fontSize: 9.5, fontFace: F, color: C.offWhite, valign: "middle",
    });
  });

  // Subledger components
  sectionLabel(s5, "D365 Components", 0.7, 4.4);
  const d365Components = [
    "Vendors / Customers", "FX Rates", "Subledger (AP/AR)",
    "GL Transactions", "Trial Balance", "Non-Tech Expenses / Investments",
  ];
  d365Components.forEach((comp, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.7 + col * 2.55;
    const y = 4.75 + row * 0.38;
    card(s5, pptx, x, y, 2.35, 0.32);
    s5.addText(comp, {
      x, y, w: 2.35, h: 0.32,
      fontSize: 9, fontFace: F, color: C.offWhite, align: "center", valign: "middle",
    });
  });

  // D365Lator
  sectionLabel(s5, "D365Lator", 9.0, 1.5);
  systemBox(s5, pptx, 9.0, 1.85, 3.8, 1.3, "D365Lator (Translation Layer)", C.green, [
    "Subledger data translation",
    "Reference data alignment",
    "GL Sub / Account lines setup",
  ]);

  // DMS / RDM
  sectionLabel(s5, "DMS / RDM", 9.0, 3.4);
  systemBox(s5, pptx, 9.0, 3.75, 3.8, 1.5, "Contract & Reference Data", C.accent, [
    "All Rules & Auth configuration",
    "GL Sub, Account lines setup",
    "Debit / overnight processing",
    "Daily oversight cycle",
  ]);

  // Posting flow callout
  card(s5, pptx, 0.5, 5.8, 12.3, 1.1, C.cardBg2);
  s5.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.8, w: 0.06, h: 1.1, fill: { color: C.green } });
  s5.addText("Posting Process", {
    x: 0.75, y: 5.85, w: 3, h: 0.3, fontSize: 11, fontFace: F, color: C.green, bold: true,
  });
  s5.addText(
    "Journal entries are posted to GL and subledgers.  Posting logs, timestamps, and evidence are captured for audit.\n" +
    "Failed postings are corrected and resubmitted; re-approval is required if materially different.\n" +
    "Earned premiums, agency/audit commissions, and FX revaluations feed directly into Tagetik.",
    {
      x: 0.75, y: 6.15, w: 11.7, h: 0.7,
      fontSize: 9.5, fontFace: F, color: C.offWhite, lineSpacingMultiple: 1.25,
    }
  );

  footer(s5, 5, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 6 — DCR Detail
  // ─────────────────────────────────────────────
  const s6 = pptx.addSlide();
  s6.background = { color: C.bg };
  topBar(s6, pptx);
  heading(s6, "DCR — Deal Capture & Routing", "Ceded, Assumed, Contract Resume, and import jobs");

  // DCR Ceded
  systemBox(s6, pptx, 0.5, 1.5, 5.8, 2.0, "DCR Ceded", C.purple, [
    "Accelerant Insurers:  ASIC · ANIC · AICC · AIUK · AIGB · AIEL",
    "3rd Party Carriers:  Hadron US · Amtrust · Hadron UK · Woodstar",
  ]);

  // DCR Assumed
  systemBox(s6, pptx, 6.7, 1.5, 5.8, 1.2, "DCR Assumed", C.accent, [
    "Accelerant Reinsurers:  Cayman · Puerto Rico",
  ]);

  // Business Objects
  sectionLabel(s6, "Business Objects / Jasper — DCR Processing Engine", 0.6, 3.8);

  const boComponents = [
    { title: "Ref / Contract Setup", items: ["COA", "Contracts", "Ref & repository data"], color: C.blue },
    { title: "Technical Accounting", items: ["Data imports", "Technical calcs"], color: C.purple },
    { title: "Financial Accounting", items: ["AR / AP", "Cash / Settlements", "GAE"], color: C.green },
  ];

  boComponents.forEach((comp, i) => {
    const x = 0.5 + i * 4.2;
    systemBox(s6, pptx, x, 4.15, 3.9, 1.5, comp.title, comp.color, comp.items);
  });

  // Alteryx
  card(s6, pptx, 6.7, 2.85, 2.5, 0.55);
  s6.addText("Alteryx  →  Data Processing", {
    x: 6.85, y: 2.85, w: 2.2, h: 0.55,
    fontSize: 10, fontFace: F, color: C.amber, bold: true, valign: "middle",
  });

  // Contract Resume
  sectionLabel(s6, "Contract Resume — Import Jobs", 0.6, 5.9);

  const contracts = [
    { type: "FAC", imps: "IMP-011, 023, 018, 025, 020, 047, 021", color: C.red },
    { type: "QS", imps: "IMP-018, 023, 020, 027, 021, 033", color: C.amber },
    { type: "XOL", imps: "IMP-013, 020, 023, 031, 021, 033, 025", color: C.blue },
    { type: "Manual Adj.", imps: "IMP-051", color: C.muted },
  ];

  contracts.forEach((c, i) => {
    const x = 0.5 + i * 3.15;
    cardWithStripe(s6, pptx, x, 6.25, 2.95, 0.75, c.color);
    s6.addText(c.type, {
      x: x + 0.2, y: 6.28, w: 2.5, h: 0.3,
      fontSize: 11, fontFace: F, color: c.color, bold: true,
    });
    s6.addText(c.imps, {
      x: x + 0.2, y: 6.58, w: 2.5, h: 0.3,
      fontSize: 8, fontFace: F, color: C.muted,
    });
  });

  // CSV timing note
  card(s6, pptx, 9.5, 2.85, 3.0, 0.55, C.cardBg2);
  s6.addText("Written/Claims Data (IMP-003)", {
    x: 9.6, y: 2.85, w: 2.8, h: 0.25,
    fontSize: 8.5, fontFace: F, color: C.white, bold: true,
  });
  s6.addText("Manual CSV · Daily", {
    x: 9.6, y: 3.1, w: 2.8, h: 0.2,
    fontSize: 8, fontFace: F, color: C.muted,
  });

  footer(s6, 6, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 7 — Tagetik Ecosystem
  // ─────────────────────────────────────────────
  const s7 = pptx.addSlide();
  s7.background = { color: C.bg };
  topBar(s7, pptx);
  heading(s7, "Stage 7: Tagetik Ecosystem & Consolidation", "Accounting, Solvency II, consolidation, and reporting");

  // Tagetik AR
  systemBox(s7, pptx, 0.5, 1.5, 3.7, 2.8, "Tagetik AR  (Accounting)", C.gold, [
    "Accelerant insurers: ASE, ANF, ANS,",
    "  A5B, ANG, AISE, AGB-18",
    "Earned premiums Lab",
    "Agency / Audit commission",
    "FX Revaluations",
    "IBML Link",
  ]);

  // Tagetik Consolidation
  systemBox(s7, pptx, 4.5, 1.5, 4.0, 2.8, "Tagetik Consolidation", C.green, [
    "FX Conversions to USD",
    "IC Eliminations",
    "D365 to Group COA Mappings",
    "Financial Consolidation & Close",
    "",
    "  → Produces final consolidated results",
  ]);

  // Tagetik SII
  systemBox(s7, pptx, 8.8, 1.5, 4.0, 2.8, "Tagetik SII  (Solvency II)", C.purple, [
    "Entities: AIUK, AIGB, AIEL, AUHU",
    "Data transformation",
    "Best estimates calculation",
    "Investments & payment patterns",
    "Pillar I: CPDR, CAT, UW, SCR, Risk Margin",
    "Pillar III: Annual & Quarterly QRTs",
  ]);

  // Tagetik IA
  sectionLabel(s7, "Tagetik IA (Insurance Accounting)", 0.6, 4.6);
  card(s7, pptx, 0.5, 4.95, 5.0, 1.1);
  s7.addText(
    "Covers all Accelerant insurer entities across regions.\n" +
    "Manages reporting packs (RP), Trial Balance (TB) ingestion,\n" +
    "Claims Loss Roll, DAC/DCC reconciliation, and IC declarations.",
    {
      x: 0.7, y: 5.0, w: 4.6, h: 1.0,
      fontSize: 10, fontFace: F, color: C.offWhite, lineSpacingMultiple: 1.3,
    }
  );

  // Tagetik FP&A (decommissioned)
  sectionLabel(s7, "Tagetik FP&A  (Being Decommissioned)", 6.0, 4.6);
  card(s7, pptx, 5.9, 4.95, 3.3, 1.1, C.dkCard);
  s7.addShape(pptx.ShapeType.rect, { x: 5.9, y: 4.95, w: 0.06, h: 1.1, fill: { color: C.red } });
  s7.addText(
    "Budgeting & Forecasting\n" +
    "→ Being replaced by Pigment",
    {
      x: 6.1, y: 5.0, w: 3.0, h: 0.55,
      fontSize: 10, fontFace: F, color: C.muted, lineSpacingMultiple: 1.3,
    }
  );
  s7.addShape(pptx.ShapeType.roundRect, {
    x: 6.1, y: 5.6, w: 1.7, h: 0.25,
    fill: { color: C.red }, rectRadius: 0.04,
  });
  s7.addText("TO BE DECOMMISSIONED", {
    x: 6.1, y: 5.6, w: 1.7, h: 0.25,
    fontSize: 7, fontFace: F, color: C.white, bold: true, align: "center", valign: "middle",
  });

  // Governance timeline
  sectionLabel(s7, "Governance Timeline", 0.6, 6.3);
  const govItems = [
    { wd: "WD5", desc: "Initial TB (all key balances exc. recharge/tax)", color: C.blue },
    { wd: "WD8", desc: "Final TB, IC balances agreed", color: C.accent },
    { wd: "WD10–31", desc: "SOX 302 certifications", color: C.amber },
    { wd: "WD17", desc: "Account reconciliations due", color: C.gold },
  ];
  govItems.forEach((g, i) => {
    const x = 0.5 + i * 3.15;
    card(s7, pptx, x, 6.6, 2.95, 0.45);
    s7.addText(g.wd, {
      x: x + 0.1, y: 6.6, w: 0.8, h: 0.45,
      fontSize: 10, fontFace: F, color: g.color, bold: true, valign: "middle",
    });
    s7.addText(g.desc, {
      x: x + 0.9, y: 6.6, w: 1.95, h: 0.45,
      fontSize: 8.5, fontFace: F, color: C.offWhite, valign: "middle",
    });
  });

  // Pigment on right
  systemBox(s7, pptx, 9.5, 4.95, 3.3, 1.1, "Pigment  (Replacing FP&A)", C.pink, [
    "Accelerant Insurers / Reinsurers",
    "Risk Exchange · REX entities",
    "Mission, NBS etc.",
  ]);

  footer(s7, 7, TOTAL_SLIDES);

  // ─────────────────────────────────────────────
  // SLIDE 8 — External & Peripheral Systems
  // ─────────────────────────────────────────────
  const s8 = pptx.addSlide();
  s8.background = { color: C.bg };
  topBar(s8, pptx);
  heading(s8, "External & Peripheral Systems", "Integrations supporting the month-end close ecosystem");

  // Row 1
  const extSystems1 = [
    {
      name: "Oanda", color: C.gold, items: [
        "Currency Pair FX Rates", "API — Daily / Overnight",
        "Feeds D365 & Tagetik",
      ],
    },
    {
      name: "Vision", color: C.blue, items: [
        "Bank statements", "Outgoing technical payments",
        "Barclays, CIBC",
      ],
    },
    {
      name: "Vitesse", color: C.accent, items: [
        "Claims liability processing",
        "Technical payments routing",
      ],
    },
    {
      name: "Clearwater (Investments)", color: C.green, items: [
        "External Collateral", "Internal Collateral",
        "Insurance Investments", "MMF",
      ],
    },
  ];

  extSystems1.forEach((sys, i) => {
    const x = 0.5 + i * 3.15;
    systemBox(s8, pptx, x, 1.5, 2.95, 1.8, sys.name, sys.color, sys.items);
  });

  // Row 2
  const extSystems2 = [
    {
      name: "Sovos", color: C.purple, items: [
        "ASIC, ANIC, ARPR",
        "Woodstar — separate instance",
        "NAIC Yellow Book reporting",
      ],
    },
    {
      name: "Coupa (TBD)", color: C.amber, items: [
        "Procure-to-Pay (P2P)",
        "Non-technical Payments",
        "Expense Management / AP Automation",
        "Supplier Management",
      ],
    },
    {
      name: "Workiva", color: C.blue, items: [
        "Financial reporting",
        "SEC / regulatory filings",
        "Workday-ledger integration",
      ],
    },
    {
      name: "Pigment Underwriting", color: C.pink, items: [
        "Insurers / Reinsurers",
        "Risk Exchange · REX entities",
        "Budgeting & forecasting",
        "Expenses & margin analysis",
      ],
    },
  ];

  extSystems2.forEach((sys, i) => {
    const x = 0.5 + i * 3.15;
    systemBox(s8, pptx, x, 3.7, 2.95, 1.95, sys.name, sys.color, sys.items);
  });

  // Banks & PEPPOL
  sectionLabel(s8, "Banking & Payment Networks", 0.6, 5.95);

  card(s8, pptx, 0.5, 6.25, 6.0, 0.8);
  s8.addText("Banks", {
    x: 0.7, y: 6.3, w: 1.5, h: 0.3,
    fontSize: 11, fontFace: F, color: C.blue, bold: true,
  });
  s8.addText(
    "Multiple banking connections for settlements, technical payments, and cash management.  " +
    "Vision handles bank statements and outgoing technical payments via Barclays and CIBC.",
    {
      x: 0.7, y: 6.6, w: 5.5, h: 0.35,
      fontSize: 9, fontFace: F, color: C.muted, lineSpacingMultiple: 1.15,
    }
  );

  card(s8, pptx, 6.8, 6.25, 6.0, 0.8);
  s8.addText("PEPPOL Network → Coupa", {
    x: 7.0, y: 6.3, w: 4, h: 0.3,
    fontSize: 11, fontFace: F, color: C.amber, bold: true,
  });
  s8.addText(
    "Electronic invoicing network for P2P automation.  Coupa integration (TBD) will handle " +
    "non-technical payments, expense management, AP automation, and supplier management.",
    {
      x: 7.0, y: 6.6, w: 5.5, h: 0.35,
      fontSize: 9, fontFace: F, color: C.muted, lineSpacingMultiple: 1.15,
    }
  );

  footer(s8, 8, TOTAL_SLIDES);

  // ── Save ──
  const outDir = path.resolve(__dirname, "..", "data", "reports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `Month-End-Process-Flow-Detail-${ts}.pptx`);

  pptx.writeFile({ fileName: outPath }).then(() => {
    console.log(`\nDetailed Process Flow presentation generated!`);
    console.log(`File: ${outPath}`);
    console.log(`Total slides: ${TOTAL_SLIDES}`);
  });
}

create();
