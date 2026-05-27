import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.aiTestGen;

const FLOW = [
  { label: "Jira Work Item",   hint: "SF-570" },
  { label: "AI Analysis",      hint: "Acceptance criteria → scenarios" },
  { label: "Gherkin Features", hint: "BDD test cases, ready to review" },
];

export const AITestGen: React.FC = () => {
  return (
    <SlideLayout slideId="09-ai-test-gen" palette={P}>
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
          AI-Powered Test Generation
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          From ticket to test case.
        </GradientHeading>
        <GradientHeading from={P.from} to={P.to} size={120} style={{ marginTop: -4 }}>
          In seconds.
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
          Feed the framework a Jira ID. It reads the requirements, analyzes the acceptance
          criteria, and produces complete BDD scenarios. Engineers review. Engineers ship.
        </p>
      </FadeUp>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 72,
          maxWidth: 1700,
        }}
      >
        {FLOW.map((step, i) => (
          <React.Fragment key={step.label}>
            <BlurIn delay={50 + i * 16}>
              <GlassCard glow={P.glow} padding={28} style={{ minWidth: 420 }}>
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
                <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 300, color: MUTED }}>{step.hint}</div>
              </GlassCard>
            </BlurIn>
            {i < FLOW.length - 1 && (
              <Pop delay={60 + i * 16}>
                <div
                  style={{
                    fontSize: 60,
                    background: `linear-gradient(90deg, ${P.from}, ${P.to})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 1,
                  }}
                >
                  →
                </div>
              </Pop>
            )}
          </React.Fragment>
        ))}
      </div>
    </SlideLayout>
  );
};
