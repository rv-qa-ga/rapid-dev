export type SlideId =
  | "01-title"
  | "02-problem"
  | "03-unified"
  | "04-architecture"
  | "05-systems"
  | "06-tech-stack"
  | "07-capabilities"
  | "build-validation"
  | "08-lifecycle"
  | "09-ai-test-gen"
  | "10-integrations"
  | "11-reporting"
  | "12-scale"
  | "13-close";

export type DurationEntry = {
  seconds: number;
  frames: number;
  file: string;
};

export type Durations = {
  fps: number;
  voice: string;
  rate: string;
  paddingFrames: number;
  totalFrames: number;
  slides: Record<SlideId, DurationEntry>;
};
