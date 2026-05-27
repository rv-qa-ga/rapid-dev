import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BASE_BG } from "../theme";

type Props = {
  orbA: string;
  orbB: string;
};

export const BackgroundOrbs: React.FC<Props> = ({ orbA, orbB }) => {
  const frame = useCurrentFrame();

  const pulseA = interpolate(
    Math.sin((frame / 120) * Math.PI * 2),
    [-1, 1],
    [0.55, 0.85],
  );
  const pulseB = interpolate(
    Math.sin((frame / 160) * Math.PI * 2 + 1.2),
    [-1, 1],
    [0.45, 0.75],
  );
  const driftX = Math.sin(frame / 220) * 40;
  const driftY = Math.cos(frame / 260) * 30;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: BASE_BG,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -300 + driftX,
          top: -400 + driftY,
          borderRadius: "50%",
          background: `radial-gradient(circle at center, ${orbA} 0%, transparent 65%)`,
          opacity: pulseA,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          right: -200 - driftX,
          bottom: -300 - driftY,
          borderRadius: "50%",
          background: `radial-gradient(circle at center, ${orbB} 0%, transparent 65%)`,
          opacity: pulseB,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
};
