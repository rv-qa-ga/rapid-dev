import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.lifecycle;

const PHASES = [
  { n: "1", title: "Generate",  body: "AI reads Jira → drafts Gherkin scenarios" },
  { n: "2", title: "Review",    body: "QA refines the acceptance criteria" },
  { n: "3", title: "Upload",    body: "Push to Zephyr Scale automatically" },
  { n: "4", title: "Link",      body: "Bidirectional Jira ↔ Zephyr traceability" },
  { n: "5", title: "Execute",   body: "Run, report, archive evidence" },
];

export const Lifecycle: React.FC = () => {
  return (
    <SlideLayout slideId="08-lifecycle" palette={P}>
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
          QA Lifecycle Automation
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={116}>
          Five phases. One workflow.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={26}>
        <p
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: MUTED,
            maxWidth: 1200,
            marginTop: 24,
            lineHeight: 1.4,
          }}
        >
          Every phase is automated — and every phase has a human review gate.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 20,
          marginTop: 80,
          maxWidth: 1640,
        }}
      >
        {PHASES.map((p, i) => (
          <BlurIn key={p.title} delay={42 + i * 9}>
            <GlassCard glow={P.glow} padding={26}>
              <div
                style={{
                  fontSize: 60,
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${P.from}, ${P.to})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: -2,
                  marginBottom: 6,
                  lineHeight: 1,
                }}
              >
                {p.n}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {p.title}
              </div>
              <div style={{ fontSize: 18, fontWeight: 300, color: MUTED, lineHeight: 1.4 }}>
                {p.body}
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
