import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { GlassCard } from "../components/GlassCard";
import { FadeUp, BlurIn } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.architecture;

const LAYERS = [
  {
    tag: "01",
    title: "Test Layer",
    desc: "Feature files in Gherkin — readable by humans, executable by machines",
  },
  {
    tag: "02",
    title: "Step Definitions",
    desc: "Cucumber orchestration, prefer shared/common over work-item-specific",
  },
  {
    tag: "03",
    title: "Abstraction Layer",
    desc: "Page Objects for UI · API Clients & services for backend calls",
  },
  {
    tag: "04",
    title: "Utility Layer",
    desc: "Helpers, field registry, reusable waits, validation helpers",
  },
  {
    tag: "05",
    title: "Data Layer",
    desc: "Factories, mappings, test data, DB validation — one canonical source",
  },
];

export const Architecture: React.FC = () => {
  return (
    <SlideLayout slideId="04-architecture" palette={P}>
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
          Architecture
        </p>
      </FadeUp>

      <FadeUp delay={10}>
        <GradientHeading from={P.from} to={P.to} size={112}>
          Strictly layered. Relentlessly reusable.
        </GradientHeading>
      </FadeUp>

      <FadeUp delay={28}>
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
          Every layer has one job — and every test composes the layers instead of
          duplicating them.
        </p>
      </FadeUp>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: 54,
          maxWidth: 1500,
        }}
      >
        {LAYERS.map((layer, i) => (
          <BlurIn key={layer.tag} delay={46 + i * 8}>
            <GlassCard glow={P.glow} padding={24}>
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${P.from}, ${P.to})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    minWidth: 80,
                    letterSpacing: -2,
                  }}
                >
                  {layer.tag}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: 4,
                    }}
                  >
                    {layer.title}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 300, color: MUTED }}>
                    {layer.desc}
                  </div>
                </div>
              </div>
            </GlassCard>
          </BlurIn>
        ))}
      </div>
    </SlideLayout>
  );
};
