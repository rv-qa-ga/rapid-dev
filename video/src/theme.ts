export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const BASE_BG = "#0a0a12";

export const FONT_STACK =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const MUTED = "rgba(230, 232, 255, 0.72)";
export const MUTED_SOFT = "rgba(230, 232, 255, 0.48)";
export const WHITE = "#f5f7ff";

export type Palette = {
  from: string;
  to: string;
  glow: string;
  orbA: string;
  orbB: string;
};

export const PALETTES: Record<string, Palette> = {
  title:         { from: "#7cc7ff", to: "#c084fc", glow: "rgba(124,199,255,0.38)", orbA: "#1a2a6c", orbB: "#4b1d6b" },
  problem:       { from: "#fbbf24", to: "#f87171", glow: "rgba(251,191,36,0.32)", orbA: "#5a2a10", orbB: "#3a1212" },
  unified:       { from: "#14b8a6", to: "#34d399", glow: "rgba(20,184,166,0.32)", orbA: "#0e3d3a", orbB: "#123a2a" },
  architecture:  { from: "#a78bfa", to: "#818cf8", glow: "rgba(167,139,250,0.36)", orbA: "#221a4a", orbB: "#1c2350" },
  systems:       { from: "#38bdf8", to: "#60a5fa", glow: "rgba(56,189,248,0.34)", orbA: "#0f2a4a", orbB: "#102a58" },
  techStack:     { from: "#f472b6", to: "#fb7185", glow: "rgba(244,114,182,0.34)", orbA: "#3d1030", orbB: "#401424" },
  capabilities:  { from: "#34d399", to: "#a3e635", glow: "rgba(52,211,153,0.32)", orbA: "#103a2a", orbB: "#244010" },
  buildValidation:{ from: "#10b981", to: "#06b6d4", glow: "rgba(16,185,129,0.34)", orbA: "#0b3a2a", orbB: "#0b2a38" },
  lifecycle:     { from: "#fb923c", to: "#fbbf24", glow: "rgba(251,146,60,0.32)", orbA: "#3d1e08", orbB: "#3d2a08" },
  aiTestGen:     { from: "#e879f9", to: "#a78bfa", glow: "rgba(232,121,249,0.36)", orbA: "#3a1040", orbB: "#25164a" },
  integrations:  { from: "#22d3ee", to: "#3b82f6", glow: "rgba(34,211,238,0.34)", orbA: "#0e2d3a", orbB: "#0f2048" },
  reporting:     { from: "#22c55e", to: "#14b8a6", glow: "rgba(34,197,94,0.30)", orbA: "#0f3a20", orbB: "#0d3a38" },
  scale:         { from: "#fb7185", to: "#f97316", glow: "rgba(251,113,133,0.34)", orbA: "#3d1220", orbB: "#3d1a08" },
  close:         { from: "#a78bfa", to: "#7cc7ff", glow: "rgba(167,139,250,0.38)", orbA: "#231a4a", orbB: "#14284a" },
};
