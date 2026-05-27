import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.reporting;

const CHAIN = ["Jira Item", "Test Case", "Execution", "Evidence"];

const EVIDENCE = [
  "Screenshots",
  "Video recording",
  "Network logs",
  "Database snapshots",
  "Allure reports",
  "Cucumber JSON",
];

export const Reporting: React.FC = () => {
  return (
    <SlideLayout slideId="11-reporting" palette={P}>
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
          Reporting & Traceability
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Full audit trail.
        </GradientHeading>
        <GradientHeading from={P.from} to={P.to} size={120} style={{ marginTop: -4 }}>
          Zero manual tracking.
        </GradientHeading>
      </FadeUp>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 60,
          flexWrap: "wrap",
        }}
      >
        {CHAIN.map((c, i) => (
          <React.Fragment key={c}>
            <Pop delay={34 + i * 10}>
              <div
                style={{
                  padding: "16px 28px",
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${P.from}22, ${P.to}11)`,
                  border: `1px solid ${P.from}55`,
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {c}
              </div>
            </Pop>
            {i < CHAIN.length - 1 && (
              <Pop delay={38 + i * 10}>
                <div
                  style={{
                    fontSize: 34,
                    color: P.from,
                    opacity: 0.8,
                  }}
                >
                  →
                </div>
              </Pop>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: 54, maxWidth: 1500 }}>
        <BlurIn delay={78}>
          <GlassCard glow={P.glow} padding={34}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: P.from,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              Evidence Captured Per Run
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 14,
              }}
            >
              {EVIDENCE.map((e) => (
                <div
                  key={e}
                  style={{
                    fontSize: 24,
                    color: MUTED,
                    fontWeight: 300,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: P.from,
                      boxShadow: `0 0 10px ${P.from}`,
                    }}
                  />
                  {e}
                </div>
              ))}
            </div>
          </GlassCard>
        </BlurIn>
      </div>
    </SlideLayout>
  );
};
