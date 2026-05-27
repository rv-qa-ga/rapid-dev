import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.capabilities;

const CAPS = [
  { title: "UI Testing",         body: "Playwright with interactive Inspector · deep selector intelligence" },
  { title: "API Contracts",      body: "Every endpoint tested · schema validation · error paths" },
  { title: "Database Validation",body: "Direct SQL Server verification · field-level mapping" },
  { title: "Batch & ETL",        body: "Background jobs · SSIS packages · data pipelines" },
  { title: "Integrations",       body: "Salesforce · Dynamics · MuleSoft · RDM · CMT" },
  { title: "Evidence Capture",   body: "Screenshots · videos · network logs · DB snapshots" },
];

export const Capabilities: React.FC = () => {
  return (
    <SlideLayout slideId="07-capabilities" palette={P}>
      <FadeUp delay={4}>
        <p
          style={{
            fontSize: 28,
            color: P.from,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 600,
            margin: 0,
            marginBottom: 18,
          }}
        >
          Capabilities
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Full-stack coverage.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={26}>
        <p
          style={{
            fontSize: 30,
            fontWeight: 300,
            color: MUTED,
            maxWidth: 1200,
            marginTop: 24,
            lineHeight: 1.4,
          }}
        >
          Every layer, every seam, every integration — validated automatically.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 22,
          marginTop: 60,
          maxWidth: 1600,
        }}
      >
        {CAPS.map((c, i) => (
          <BlurIn key={c.title} delay={42 + i * 7}>
            <GlassCard glow={P.glow} padding={28}>
              <div
                style={{
                  width: 42,
                  height: 4,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${P.from}, ${P.to})`,
                  marginBottom: 16,
                }}
              />
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {c.title}
              </div>
              <div style={{ fontSize: 20, fontWeight: 300, color: MUTED, lineHeight: 1.4 }}>
                {c.body}
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
