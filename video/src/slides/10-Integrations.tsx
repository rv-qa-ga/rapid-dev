import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.integrations;

const INTEGRATIONS = [
  { name: "Jira",          body: "Work items, requirements, story sync" },
  { name: "Zephyr Scale",  body: "Test case management, execution cycles" },
  { name: "Confluence",    body: "Living documentation, audit evidence" },
  { name: "Azure DevOps",  body: "Pipelines, artifacts, release gates" },
];

export const Integrations: React.FC = () => {
  return (
    <SlideLayout slideId="10-integrations" palette={P}>
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
          Integrations
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Connected to the tools
        </GradientHeading>
        <GradientHeading from={P.from} to={P.to} size={120} style={{ marginTop: -4 }}>
          your team already uses.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={32}>
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
          Official REST APIs · environment-based secrets · provider pattern for extensibility.
          Zero credentials in code. Always.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginTop: 64,
          maxWidth: 1500,
        }}
      >
        {INTEGRATIONS.map((ig, i) => (
          <BlurIn key={ig.name} delay={46 + i * 10}>
            <GlassCard glow={P.glow} padding={34}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${P.from}44, ${P.to}22)`,
                    border: `1px solid ${P.from}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {ig.name.charAt(0)}
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, color: "#fff" }}>{ig.name}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 300, color: MUTED, lineHeight: 1.4 }}>
                {ig.body}
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
