import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { AccentBadge } from "../components/AccentBadge";
import { FadeUp, BlurIn, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.buildValidation;

const FLOW = [
  {
    label: "Deployment Trigger",
    body: "Salesforce CI fires on every release",
  },
  {
    label: "Sanity Suite",
    body: "Critical flows re-verified in minutes",
  },
  {
    label: "Green Light or Block",
    body: "Promote with confidence — or roll back before users notice",
  },
];

export const BuildValidation: React.FC = () => {
  return (
    <SlideLayout slideId="build-validation" palette={P}>
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
          Build Validation
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={116}>
          Every deployment,
        </GradientHeading>
        <GradientHeading from={P.from} to={P.to} size={116} style={{ marginTop: -4 }}>
          a quality gate.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={30}>
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
          A focused sanity suite runs automatically after every Salesforce deployment —
          and the same pattern extends to every other system in the platform.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 22,
          marginTop: 64,
          maxWidth: 1600,
        }}
      >
        {FLOW.map((step, i) => (
          <BlurIn key={step.label} delay={48 + i * 10}>
            <GlassCard glow={P.glow} padding={28}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: P.from,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Step {i + 1}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                  lineHeight: 1.15,
                  minHeight: 70,
                }}
              >
                {step.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 300, color: MUTED, lineHeight: 1.45 }}>
                {step.body}
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>

      <Pop delay={90} style={{ marginTop: 40 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <AccentBadge color={P.from}>Live today: Salesforce</AccentBadge>
          <AccentBadge color={P.to}>Extensible to every system</AccentBadge>
          <AccentBadge color={P.from}>Rollback-safe</AccentBadge>
        </div>
      </Pop>
    </SlideLayout>
  );
};
