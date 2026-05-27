import React from "react";
import { FONT_STACK } from "../theme";

type Props = {
  from: string;
  to: string;
  size?: number;
  weight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const GradientHeading: React.FC<Props> = ({
  from,
  to,
  size = 112,
  weight = 800,
  letterSpacing = -2,
  lineHeight = 1.02,
  children,
  style,
}) => {
  return (
    <h1
      style={{
        fontFamily: FONT_STACK,
        fontSize: size,
        fontWeight: weight,
        letterSpacing,
        lineHeight,
        margin: 0,
        background: `linear-gradient(135deg, #ffffff 0%, ${from} 55%, ${to} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        textShadow: "0 0 40px rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      {children}
    </h1>
  );
};
