import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.problem;

const PAIN_POINTS = [
  { k: "Fragmentation", v: "Different teams, different tools, zero alignment" },
  { k: "UI vs API silos", v: "Two projects. Two CI jobs. Double the maintenance." },
  { k: "Data validation gaps", v: "Database state is an afterthought" },
  { k: "Manual traceability", v: "Jira → Test → Evidence is stitched by hand" },
];

export const Problem: React.FC = () => {
  return (
    <SlideLayout slideId="02-problem" palette={P}>
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
          The Problem
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Enterprise QA is fragmented.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={26}>
        <p
          style={{
            fontSize: 32,
            fontWeight: 300,
            color: MUTED,
            maxWidth: 1200,
            marginTop: 28,
            lineHeight: 1.4,
          }}
        >
          Different teams. Different tools. Different coverage. Until now.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
          marginTop: 72,
          maxWidth: 1500,
        }}
      >
        {PAIN_POINTS.map((pp, i) => (
          <BlurIn key={pp.k} delay={44 + i * 10}>
            <GlassCard glow={P.glow} padding={34}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {pp.k}
              </div>
              <div style={{ fontSize: 22, fontWeight: 300, color: MUTED }}>{pp.v}</div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
