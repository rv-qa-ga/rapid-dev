import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { AccentBadge } from "../components/AccentBadge";
import { FadeUp, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.title;

export const Title: React.FC = () => {
  return (
    <SlideLayout slideId="01-title" palette={P}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 1500,
        }}
      >
        <FadeUp delay={4}>
          <AccentBadge color={P.from} style={{ marginBottom: 36 }}>
            QA Engineering · Enterprise Edition
          </AccentBadge>
        </FadeUp>

        <FadeUp delay={12}>
          <GradientHeading from={P.from} to={P.to} size={156} weight={800} letterSpacing={-4}>
            E2E Automation
          </GradientHeading>
          <GradientHeading
            from={P.from}
            to={P.to}
            size={156}
            weight={800}
            letterSpacing={-4}
            style={{ marginTop: -10 }}
          >
            Framework
          </GradientHeading>
        </FadeUp>

        <FadeUp delay={28}>
          <p
            style={{
              fontSize: 36,
              fontWeight: 300,
              color: MUTED,
              maxWidth: 1200,
              marginTop: 42,
              lineHeight: 1.4,
            }}
          >
            A unified, enterprise-grade test automation platform for the entire
            Contract Lifecycle Management ecosystem.
          </p>
        </FadeUp>

        <div style={{ display: "flex", gap: 14, marginTop: 56, flexWrap: "wrap" }}>
          {["Playwright", "Cucumber / BDD", "TypeScript", "Axios", "SQL Server"].map(
            (label, i) => (
              <Pop key={label} delay={46 + i * 6}>
                <AccentBadge color={P.from}>{label}</AccentBadge>
              </Pop>
            ),
          )}
        </div>
      </div>
    </SlideLayout>
  );
};
