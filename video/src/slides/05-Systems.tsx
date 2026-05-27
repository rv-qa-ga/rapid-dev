import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.systems;

const SYSTEMS = [
  { name: "Salesforce CRM",        kind: "Core Platform",      test: "UI + API" },
  { name: "Data Cloud",            kind: "Data Platform",      test: "API" },
  { name: "MuleSoft · ADP",        kind: "Integration Layer",  test: "API + ADP Contract" },
  { name: "Operations Workflow",   kind: "Business Process",   test: "UI + API" },
  { name: "Reference Data (RDM)",  kind: "Reference Mgmt",     test: "API" },
  { name: "Configuration (CMT)",   kind: "Config Mgmt",        test: "API" },
  { name: "ODS · SQL Server",      kind: "Data Store",         test: "Data Validation" },
  { name: "Dynamics 365",          kind: "CRM Platform",       test: "API" },
  { name: "Blob · SharePoint",     kind: "Storage",            test: "File I/O" },
];

export const Systems: React.FC = () => {
  return (
    <SlideLayout slideId="05-systems" palette={P}>
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
          Systems Supported
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Nine systems. One test suite.
        </GradientHeading>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 22,
          marginTop: 72,
          maxWidth: 1600,
        }}
      >
        {SYSTEMS.map((s, i) => (
          <BlurIn key={s.name} delay={30 + i * 6}>
            <GlassCard glow={P.glow} padding={26}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: P.from,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {s.kind}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 14,
                  minHeight: 70,
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#f5f7ff",
                  background: `${P.from}22`,
                  border: `1px solid ${P.from}44`,
                }}
              >
                {s.test}
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
