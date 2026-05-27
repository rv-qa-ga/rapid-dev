import React from "react";
import { SlideLayout } from "../components/SlideLayout";
import { GradientHeading } from "../components/GradientHeading";
import { AccentBadge } from "../components/AccentBadge";
import { FadeUp, Pop } from "../components/Animated";
import { MUTED, PALETTES } from "../theme";

const P = PALETTES.close;

export const Close: React.FC = () => {
  return (
    <SlideLayout slideId="13-close" palette={P}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 1600,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", gap: 14, marginBottom: 42 }}>
          {["Unified", "Scalable", "AI-Augmented"].map((w, i) => (
            <Pop key={w} delay={6 + i * 8}>
              <AccentBadge color={P.from} style={{ fontSize: 26, padding: "14px 28px" }}>
                {w}
              </AccentBadge>
            </Pop>
          ))}
        </div>

        <FadeUp delay={28}>
          <GradientHeading
            from={P.from}
            to={P.to}
            size={156}
            weight={800}
            letterSpacing={-4}
            style={{ textAlign: "center" }}
          >
            QA, accelerated.
          </GradientHeading>
        </FadeUp>

        <FadeUp delay={46}>
          <p
            style={{
              fontSize: 36,
              fontWeight: 300,
              color: MUTED,
              maxWidth: 1300,
              marginTop: 38,
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            One platform. Every system. Full visibility.
          </p>
        </FadeUp>

        <FadeUp delay={64}>
          <p
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: P.from,
              marginTop: 36,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Built by engineers · for engineers
          </p>
        </FadeUp>
      </div>
    </SlideLayout>
  );
};
