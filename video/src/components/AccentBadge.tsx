import React from "react";
import { FONT_STACK } from "../theme";

type Props = {
  color: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const AccentBadge: React.FC<Props> = ({ color, children, style }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 999,
        fontFamily: FONT_STACK,
        fontSize: 22,
        fontWeight: 500,
        color: "rgba(255,255,255,0.92)",
        background: `linear-gradient(135deg, ${color}33 0%, ${color}14 100%), rgba(15, 15, 25, 0.55)`,
        border: `1px solid ${color}55`,
        boxShadow: `0 0 24px -8px ${color}66`,
        ...style,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      {children}
    </div>
  );
};
