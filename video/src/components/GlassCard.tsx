import React from "react";

type Props = {
  glow?: string;
  padding?: number;
  radius?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const GlassCard: React.FC<Props> = ({
  glow = "rgba(255,255,255,0.08)",
  padding = 28,
  radius = 24,
  children,
  style,
}) => {
  return (
    <div
      style={{
        position: "relative",
        padding,
        borderRadius: radius,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%), rgba(15, 15, 25, 0.55)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 30px 80px -20px rgba(0,0,0,0.5), 0 0 60px -20px ${glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
