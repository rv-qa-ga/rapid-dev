import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { AccentBadge } from "../components/AccentBadge";
import { FadeUp, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.unified;

const SYSTEMS = [
  "Salesforce",
  "Dynamics 365",
  "MuleSoft",
  "ADP (via MuleSoft)",
  "SQL Server (ODS)",
  "Data Cloud",
  "Reference Data (RDM)",
  "Configuration (CMT)",
  "Operations Workflow",
  "Blob / SharePoint",
];

export const Unified: React.FC = () => {
  return (
    <SlideLayout slideId="03-unified" palette={P}>
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
          The Solution
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={132}>
          One framework.
        </GradientHeading>
        <GradientHeading
          from={P.from}
          to={P.to}
          size={132}
          style={{ marginTop: -4 }}
        >
          One source of truth.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={32}>
        <p
          style={{
            fontSize: 32,
            fontWeight: 300,
            color: MUTED,
            maxWidth: 1200,
            marginTop: 36,
            lineHeight: 1.4,
          }}
        >
          UI and API testing share the same project, the same steps, and the same data factories
          — across every system in the CLM ecosystem.
        </p>
      </FadeUp>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          marginTop: 64,
          maxWidth: 1500,
        }}
      >
        {SYSTEMS.map((sys, i) => (
          <Pop key={sys} delay={52 + i * 4}>
            <AccentBadge color={P.from} style={{ fontSize: 24, padding: "12px 24px" }}>
              {sys}
            </AccentBadge>
          </Pop>
        ))}
      </div>
    </SlideLayout>
  );
};
