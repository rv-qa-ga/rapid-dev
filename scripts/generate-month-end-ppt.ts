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
  divider: "1E3554",
};

const FONT = "Calibri";
const FONT_BOLD = "Calibri";

function footer(s: PptxGenJS.Slide, n: number) {
  s.addShape(s.presObj?.ShapeType?.rect ?? ("rect" as any), {
    x: 0, y: 7.18, w: 13.33, h: 0.02, fill: { color: C.divider },
  });
  s.addText("ACCELERANT   ·   CONFIDENTIAL", {
    x: 0.6, y: 7.22, w: 5, h: 0.25,
    fontSize: 7.5, color: C.muted, fontFace: FONT,
  });
  s.addText(`${n}`, {
    x: 12.2, y: 7.22, w: 0.6, h: 0.25,
    fontSize: 7.5, color: C.muted, fontFace: FONT, align: "right",
  });
}

function accentBar(s: PptxGenJS.Slide, pptx: PptxGenJS) {
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.05, fill: { color: C.accent },
  });
}

function sectionTitle(s: PptxGenJS.Slide, text: string, x: number, y: number, w = 12) {
  s.addText(text, {
    x, y, w, h: 0.35,
    fontSize: 13, fontFace: FONT_BOLD, color: C.accent, bold: true,
  });
}

function card(s: PptxGenJS.Slide, pptx: PptxGenJS, x: number, y: number, w: number, h: number, color = C.cardBg) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color }, rectRadius: 0.08,
  });
}

function create() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "QA Engineering";
  pptx.company = "Accelerant";
  pptx.title = "Month-End Close Process & QA Involvement";

  // ════════════════════════════════════════════════
  //  SLIDE 1 — What is Month-End? Who is Involved?
  // ════════════════════════════════════════════════
  const s1 = pptx.addSlide();
  s1.background = { color: C.bg };
  accentBar(s1, pptx);

  s1.addText("Month-End Close Process", {
    x: 0.6, y: 0.35, w: 12, h: 0.65,
    fontSize: 30, fontFace: FONT_BOLD, color: C.white, bold: true,
  });
  s1.addText("What It Is   &   Who Is Involved", {
    x: 0.6, y: 0.95, w: 12, h: 0.35,
    fontSize: 15, fontFace: FONT, color: C.gold,
  });

  // Definition card
  card(s1, pptx, 0.5, 1.5, 12.3, 1.3);
  s1.addText(
    "The month-end close is a critical, recurring operational cycle where Accelerant " +
    "processes, validates, and reconciles all financial data across multiple systems, " +
    "regions, and entities — culminating in consolidated financial statements for a " +
    "publicly listed company.",
    {
      x: 0.8, y: 1.6, w: 11.7, h: 0.55,
      fontSize: 12.5, fontFace: FONT, color: C.white, lineSpacingMultiple: 1.25,
    }
  );
  s1.addText(
    "It runs on a Working Day calendar (WD0 – WD14) and involves executing a sequenced set of stored " +
    "procedures that generate CSV files consumed by downstream finance, reinsurance, and reporting systems.",
    {
      x: 0.8, y: 2.2, w: 11.7, h: 0.5,
      fontSize: 11, fontFace: FONT, color: C.muted, lineSpacingMultiple: 1.2,
    }
  );

  // Teams section
  sectionTitle(s1, "Teams Involved", 0.6, 3.05);

  const teams = [
    ["Operations", "Stops BDX loading ~1 week before close per the month-end calendar"],
    ["Production Support (Stacy's team)", "Runs the month-end process in production every month"],
    ["Finance (EU / US / Central)", "Reviews, approves, and posts journal entries to the ledger"],
    ["Data Engineering", "Maintains ADP, ODS, TDS, and Data Products pipelines"],
    ["Enterprise Technology", "System availability — Dynamics 365, Tagetik, infrastructure"],
    ["QA Engineering", "Tests process changes; validates new insurers and regions"],
  ];

  teams.forEach((t, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const x = 0.6 + col * 6.3;
    const y = 3.55 + row * 0.78;

    // Left accent bar
    s1.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.05, h: 0.65, fill: { color: C.blue },
    });

    s1.addText(t[0], {
      x: x + 0.2, y, w: 5.6, h: 0.32,
      fontSize: 12, fontFace: FONT_BOLD, color: C.white, bold: true,
    });
    s1.addText(t[1], {
      x: x + 0.2, y: y + 0.3, w: 5.6, h: 0.32,
      fontSize: 10, fontFace: FONT, color: C.muted,
    });
  });

  // System flow section
  sectionTitle(s1, "End-to-End System Flow", 0.6, 6.0);

  const flow = [
    "BDX\nSources", "ADP\nIngestion", "ODS\nEnrich",
    "TDS\nTransform", "Data\nProducts", "D365\nGL / SL",
    "Tagetik\nConsol.", "Close &\nReport",
  ];

  const bw = 1.25;
  const sp = 0.22;
  const sx = 0.6;
  const fy = 6.45;

  flow.forEach((label, i) => {
    const x = sx + i * (bw + sp);
    const isLast = i === flow.length - 1;

    s1.addShape(pptx.ShapeType.roundRect, {
      x, y: fy, w: bw, h: 0.55,
      fill: { color: isLast ? C.accent : C.blue }, rectRadius: 0.06,
    });
    s1.addText(label, {
      x, y: fy, w: bw, h: 0.55,
      fontSize: 9, fontFace: FONT_BOLD, color: C.white,
      align: "center", valign: "middle", bold: true, lineSpacingMultiple: 0.9,
    });

    if (i < flow.length - 1) {
      s1.addText("\u25B8", {
        x: x + bw - 0.02, y: fy, w: sp + 0.04, h: 0.55,
        fontSize: 12, color: C.muted, align: "center", valign: "middle",
      });
    }
  });

  footer(s1, 1);

  // ════════════════════════════════════════════════
  //  SLIDE 2 — QA Team's Role
  // ════════════════════════════════════════════════
  const s2 = pptx.addSlide();
  s2.background = { color: C.bg };
  accentBar(s2, pptx);

  s2.addText("QA Team's Role in Month-End", {
    x: 0.6, y: 0.35, w: 12, h: 0.65,
    fontSize: 30, fontFace: FONT_BOLD, color: C.white, bold: true,
  });
  s2.addText("Testing Changes   ·   Validating Outputs   ·   Supporting Stability", {
    x: 0.6, y: 0.95, w: 12, h: 0.35,
    fontSize: 15, fontFace: FONT, color: C.gold,
  });

  // Key message banner
  card(s2, pptx, 0.5, 1.5, 12.3, 0.75);
  s2.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 1.5, w: 0.06, h: 0.75, fill: { color: C.gold },
  });
  s2.addText(
    "QA does not run the month-end process in production. Production Support (Stacy's team) " +
    "executes it monthly. QA is engaged when changes are made to stored procedures, mappings, " +
    "or when new insurers / regions are onboarded.",
    {
      x: 0.85, y: 1.55, w: 11.7, h: 0.65,
      fontSize: 12, fontFace: FONT, color: C.white,
      lineSpacingMultiple: 1.3, valign: "middle",
    }
  );

  // 4 Activity cards
  const activities = [
    {
      title: "Change Testing",
      color: C.blue,
      lines: [
        "Stored procedure modifications",
        "New / updated field mappings",
        "Schema or table changes",
        "New fee codes or LOB mappings",
      ],
    },
    {
      title: "Output Validation",
      color: C.accent,
      lines: [
        "CSV file generation verification",
        "File format & schema compliance",
        "Control totals & row counts",
        "Data completeness checks",
      ],
    },
    {
      title: "New Insurer / Region",
      color: C.gold,
      lines: [
        "End-to-end data flow for new entity",
        "Reference data alignment (RDM / CMT)",
        "Downstream system acceptance",
        "DCR mapping validation",
      ],
    },
    {
      title: "Test Types",
      color: C.green,
      lines: [
        "Smoke — system readiness checks",
        "Integration — multi-hop data flows",
        "Regression — monthly validation pack",
        "Reconciliation — cross-system totals",
      ],
    },
  ];

  const cardW = 2.88;
  const cardGap = 0.18;
  const cardStartX = 0.5;
  const cardY = 2.6;
  const cardH = 3.8;

  activities.forEach((act, i) => {
    const x = cardStartX + i * (cardW + cardGap);

    card(s2, pptx, x, cardY, cardW, cardH);

    // Top color stripe
    s2.addShape(pptx.ShapeType.rect, {
      x, y: cardY, w: cardW, h: 0.06,
      fill: { color: act.color },
    });

    // Title
    s2.addText(act.title, {
      x: x + 0.2, y: cardY + 0.3, w: cardW - 0.4, h: 0.35,
      fontSize: 14, fontFace: FONT_BOLD, color: act.color, bold: true,
    });

    // Divider
    s2.addShape(pptx.ShapeType.rect, {
      x: x + 0.2, y: cardY + 0.75, w: cardW - 0.4, h: 0.015,
      fill: { color: C.divider },
    });

    // Bullet items
    act.lines.forEach((line, j) => {
      s2.addText(line, {
        x: x + 0.2, y: cardY + 1.0 + j * 0.65, w: cardW - 0.4, h: 0.55,
        fontSize: 10.5, fontFace: FONT, color: C.offWhite,
        valign: "top", lineSpacingMultiple: 1.2,
        bullet: { type: "bullet", color: act.color },
      });
    });
  });

  // Bottom goal bar
  card(s2, pptx, 0.5, 6.65, 12.3, 0.4, C.cardBg2);
  s2.addText(
    "Goal:  Catch issues before they reach production — reduce multi-day resolution cycles during the live close window.",
    {
      x: 0.8, y: 6.65, w: 11.7, h: 0.4,
      fontSize: 11, fontFace: FONT, color: C.gold, italic: true, valign: "middle",
    }
  );

  footer(s2, 2);

  // ════════════════════════════════════════════════
  //  SLIDE 3 — Production Challenges & Path Forward
  // ════════════════════════════════════════════════
  const s3 = pptx.addSlide();
  s3.background = { color: C.bg };
  accentBar(s3, pptx);

  s3.addText("Production Challenges & Path Forward", {
    x: 0.6, y: 0.35, w: 12, h: 0.65,
    fontSize: 30, fontFace: FONT_BOLD, color: C.white, bold: true,
  });
  s3.addText("Recurring Issues   ·   Business Impact   ·   Strategic Options", {
    x: 0.6, y: 0.95, w: 12, h: 0.35,
    fontSize: 15, fontFace: FONT, color: C.gold,
  });

  // ── Left: Bottleneck heatmap ──
  sectionTitle(s3, "Bottleneck Heatmap", 0.6, 1.5);

  const heatmapData = [
    { area: "DCR Alignment", risk: "HIGH", rc: C.red, cause: "Late-arriving data, mismatched mappings, missing reference values" },
    { area: "File Load Failures", risk: "HIGH", rc: C.red, cause: "BDX format mismatches, schema drift, missing fields" },
    { area: "Historical Data Fixes", risk: "HIGH", rc: C.red, cause: "Manual fix scripts per region / insurer before every snapshot" },
    { area: "Posting & Journal Errors", risk: "MED", rc: C.amber, cause: "Dynamics mismatches, incorrect mappings, missing RDM values" },
    { area: "Approvals (EU / US)", risk: "MED", rc: C.amber, cause: "SLA variance, inconsistent thresholds, manual routing delays" },
    { area: "IC Reconciliations", risk: "LOW", rc: C.green, cause: "Minor timing differences, reference mismatches" },
  ];

  // Column headers
  const tblY = 1.95;
  card(s3, pptx, 0.5, tblY, 7.8, 0.35, C.cardBg2);
  s3.addText("Area", {
    x: 0.7, y: tblY, w: 2.3, h: 0.35,
    fontSize: 9.5, fontFace: FONT_BOLD, color: C.accent, bold: true, valign: "middle",
  });
  s3.addText("Risk", {
    x: 3.0, y: tblY, w: 0.8, h: 0.35,
    fontSize: 9.5, fontFace: FONT_BOLD, color: C.accent, bold: true, valign: "middle", align: "center",
  });
  s3.addText("Root Cause", {
    x: 3.9, y: tblY, w: 4.2, h: 0.35,
    fontSize: 9.5, fontFace: FONT_BOLD, color: C.accent, bold: true, valign: "middle",
  });

  heatmapData.forEach((row, i) => {
    const y = tblY + 0.38 + i * 0.48;
    const bg = i % 2 === 0 ? C.cardBg : "0D1A2E";

    s3.addShape(pptx.ShapeType.rect, {
      x: 0.5, y, w: 7.8, h: 0.45, fill: { color: bg },
    });

    s3.addText(row.area, {
      x: 0.7, y, w: 2.3, h: 0.45,
      fontSize: 10.5, fontFace: FONT, color: C.white, valign: "middle",
    });

    // Risk badge
    s3.addShape(pptx.ShapeType.roundRect, {
      x: 3.05, y: y + 0.09, w: 0.7, h: 0.27,
      fill: { color: row.rc }, rectRadius: 0.04,
    });
    s3.addText(row.risk, {
      x: 3.05, y: y + 0.09, w: 0.7, h: 0.27,
      fontSize: 8, fontFace: FONT_BOLD, color: C.white, bold: true,
      align: "center", valign: "middle",
    });

    s3.addText(row.cause, {
      x: 3.9, y, w: 4.2, h: 0.45,
      fontSize: 9.5, fontFace: FONT, color: C.offWhite, valign: "middle",
    });
  });

  // ── Right: Business Impact ──
  sectionTitle(s3, "Business Impact", 8.8, 1.5);

  const impacts = [
    { metric: "Multi-Day", detail: "Resolution cycles\nevery month-end close", icon: C.red },
    { metric: "4 Regions", detail: "EU, UK, US, CA\nall impacted simultaneously", icon: C.amber },
    { metric: "6+ Systems", detail: "Finance, DCR, Tagetik\nblocked downstream", icon: C.amber },
    { metric: "Public Co.", detail: "Reporting deadlines\nare non-negotiable", icon: C.red },
  ];

  impacts.forEach((imp, i) => {
    const y = 1.95 + i * 0.95;
    card(s3, pptx, 8.8, y, 4.0, 0.8);

    // Colored left bar
    s3.addShape(pptx.ShapeType.rect, {
      x: 8.8, y, w: 0.06, h: 0.8, fill: { color: imp.icon },
    });

    s3.addText(imp.metric, {
      x: 9.05, y: y + 0.05, w: 1.5, h: 0.7,
      fontSize: 18, fontFace: FONT_BOLD, color: imp.icon, bold: true, valign: "middle",
    });
    s3.addText(imp.detail, {
      x: 10.55, y: y + 0.05, w: 2.1, h: 0.7,
      fontSize: 10, fontFace: FONT, color: C.offWhite, valign: "middle",
      lineSpacingMultiple: 1.2,
    });
  });

  // ── Bottom: Path Forward ──
  sectionTitle(s3, "Strategic Options Under Evaluation", 0.6, 5.35);

  const options = [
    {
      phase: "Short-term", badge: C.green,
      title: "Stabilise & Automate Checks",
      detail: "Automated pre-run validations, early detection scripts, structured error reporting to reduce manual triage",
    },
    {
      phase: "Mid-term", badge: C.amber,
      title: "Regression & Monitoring Suite",
      detail: "Automated regression pack (WD0–WD2), real-time pipeline monitoring, cross-system reconciliation",
    },
    {
      phase: "Long-term", badge: C.red,
      title: "Re-Architecture Evaluation",
      detail: "Assess complete re-architecture of the stored procedure chain — modernise pipelines to eliminate structural failures",
    },
  ];

  options.forEach((opt, i) => {
    const x = 0.5 + i * 4.2;
    const y = 5.8;

    card(s3, pptx, x, y, 3.95, 1.25);

    // Phase badge
    s3.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.15, y: y + 0.12, w: 1.0, h: 0.24,
      fill: { color: opt.badge }, rectRadius: 0.04,
    });
    s3.addText(opt.phase, {
      x: x + 0.15, y: y + 0.12, w: 1.0, h: 0.24,
      fontSize: 8, fontFace: FONT_BOLD, color: C.white, bold: true,
      align: "center", valign: "middle",
    });

    s3.addText(opt.title, {
      x: x + 1.25, y: y + 0.08, w: 2.5, h: 0.32,
      fontSize: 12, fontFace: FONT_BOLD, color: C.white, bold: true, valign: "middle",
    });

    s3.addText(opt.detail, {
      x: x + 0.15, y: y + 0.5, w: 3.6, h: 0.65,
      fontSize: 9.5, fontFace: FONT, color: C.muted, valign: "top",
      lineSpacingMultiple: 1.2,
    });
  });

  footer(s3, 3);

  // ── Save ──
  const outDir = path.resolve(__dirname, "..", "data", "reports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `Month-End-Close-Process-${ts}.pptx`);

  pptx.writeFile({ fileName: outPath }).then(() => {
    console.log(`\nPresentation generated successfully!`);
    console.log(`File: ${outPath}`);
  });
}

create();
