import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.techStack;

const STACK = [
  { tool: "Playwright",    role: "Browser automation · Chromium · Firefox · WebKit" },
  { tool: "Cucumber",      role: "BDD · Gherkin · human-readable scenarios" },
  { tool: "TypeScript",    role: "Type-safe test code · compile-time guarantees" },
  { tool: "Axios",         role: "HTTP client · shared wrappers · interceptors" },
  { tool: "SQL Server",    role: "Parameterized queries · multi-db routing" },
  { tool: "Allure / HTML", role: "Rich reports · JSON · Cucumber output" },
];

export const TechStack: React.FC = () => {
  return (
    <SlideLayout slideId="06-tech-stack" palette={P}>
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
          Technology Stack
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={120}>
          Battle-tested tools.
        </GradientHeading>
        <GradientHeading from={P.from} to={P.to} size={120} style={{ marginTop: -4 }}>
          Zero vendor lock-in.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={32}>
        <p
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: MUTED,
            maxWidth: 1200,
            marginTop: 28,
            lineHeight: 1.4,
          }}
        >
          Open-source foundations. Enterprise-grade discipline.
        </p>
      </FadeUp>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 22,
          marginTop: 54,
          maxWidth: 1600,
        }}
      >
        {STACK.map((s, i) => (
          <BlurIn key={s.tool} delay={48 + i * 7}>
            <GlassCard glow={P.glow} padding={28}>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 10,
                  letterSpacing: -1,
                }}
              >
                {s.tool}
              </div>
              <div style={{ fontSize: 20, fontWeight: 300, color: MUTED, lineHeight: 1.4 }}>
                {s.role}
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
