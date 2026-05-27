import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

type BaseProps = {
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const FadeUp: React.FC<
  BaseProps & { distance?: number; damping?: number; stiffness?: number; mass?: number }
> = ({
  delay = 0,
  distance = 40,
  damping = 200,
  stiffness = 120,
  mass = 0.8,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping, stiffness, mass },
    durationInFrames: 35,
  });

  const opacity = Math.max(0, Math.min(1, progress));
  const translateY = (1 - opacity) * distance;
  const scale = 0.985 + opacity * 0.015;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const BlurIn: React.FC<BaseProps> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 180, stiffness: 100, mass: 0.9 },
    durationInFrames: 40,
  });
  const clamped = Math.max(0, Math.min(1, progress));
  const blur = (1 - clamped) * 14;

  return (
    <div
      style={{
        opacity: clamped,
        filter: `blur(${blur}px)`,
        transform: `scale(${0.97 + clamped * 0.03})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Pop: React.FC<BaseProps> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 180, mass: 0.6 },
    durationInFrames: 30,
  });
  const clamped = Math.max(0, Math.min(1.05, progress));

  return (
    <div
      style={{
        opacity: Math.min(1, clamped),
        transform: `scale(${clamped})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
