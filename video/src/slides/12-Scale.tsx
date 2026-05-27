import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.scale;

const STATS = [
  { value: "2500+", label: "Test cases per project" },
  { value: "9",      label: "Systems under test" },
  { value: "100%",   label: "Deterministic & repeatable" },
  { value: "0",      label: "Hardcoded test data" },
];

export const Scale: React.FC = () => {
  return (
    <SlideLayout slideId="12-scale" palette={P}>
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
          Scale & Reliability
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Reliability is enforced by the architecture.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={28}>
        <p
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: MUTED,
            maxWidth: 1300,
            marginTop: 28,
            lineHeight: 1.4,
          }}
        >
          Independent. Repeatable. Deterministic. Parallel-safe by default.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 22,
          marginTop: 72,
          maxWidth: 1600,
        }}
      >
        {STATS.map((s, i) => (
          <Pop key={s.label} delay={46 + i * 10}>
            <GlassCard glow={P.glow} padding={34}>
              <div
                style={{
                  fontSize: 92,
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${P.from}, ${P.to})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: -4,
                  lineHeight: 1,
                  marginBottom: 14,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 20, fontWeight: 300, color: MUTED, lineHeight: 1.4 }}>
                {s.label}
              </div>
            </GlassCard>
          </Pop>
        ))}
      </div>

      <BlurIn delay={92} style={{ marginTop: 40 }}>
        <GlassCard glow={P.glow} padding={22} style={{ maxWidth: 1600 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: MUTED,
              letterSpacing: 0.5,
            }}
          >
            <span style={{ color: P.from, fontWeight: 600 }}>Enforced by design:</span>{"  "}
            no hardcoded data · no order-dependent tests · no flaky selectors · no brittle waits
          </div>
        </GlassCard>
      </BlurIn>
    </SlideLayout>
  );
};
