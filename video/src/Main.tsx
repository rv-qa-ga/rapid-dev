import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

type TransitionSpec = {
  presentation: ReturnType<typeof fade> | ReturnType<typeof slide> | ReturnType<typeof wipe>;
  timing: ReturnType<typeof linearTiming> | ReturnType<typeof springTiming>;
};

import durationsJson from "./audio/durations.json";
import type { Durations, SlideId } from "./types";

import { Title } from "./slides/01-Title";
import { Problem } from "./slides/02-Problem";
import { Unified } from "./slides/03-Unified";
import { Architecture } from "./slides/04-Architecture";
import { Systems } from "./slides/05-Systems";
import { TechStack } from "./slides/06-TechStack";
import { Capabilities } from "./slides/07-Capabilities";
import { BuildValidation } from "./slides/build-validation";
import { Lifecycle } from "./slides/08-Lifecycle";
import { AITestGen } from "./slides/09-AITestGen";
import { Integrations } from "./slides/10-Integrations";
import { Reporting } from "./slides/11-Reporting";
import { Scale } from "./slides/12-Scale";
import { Close } from "./slides/13-Close";
import { BASE_BG } from "./theme";

const durations = durationsJson as unknown as Durations;

const ORDER: { id: SlideId; Component: React.FC }[] = [
  { id: "01-title",        Component: Title },
  { id: "02-problem",      Component: Problem },
  { id: "03-unified",      Component: Unified },
  { id: "04-architecture", Component: Architecture },
  { id: "05-systems",      Component: Systems },
  { id: "06-tech-stack",   Component: TechStack },
  { id: "07-capabilities", Component: Capabilities },
  { id: "build-validation",Component: BuildValidation },
  { id: "08-lifecycle",    Component: Lifecycle },
  { id: "09-ai-test-gen",  Component: AITestGen },
  { id: "10-integrations", Component: Integrations },
  { id: "11-reporting",    Component: Reporting },
  { id: "12-scale",        Component: Scale },
  { id: "13-close",        Component: Close },
];

const TRANSITION_FRAMES = 25;

const transitionForIndex = (i: number): TransitionSpec => {
  const bucket = i % 4;
  if (bucket === 0) {
    return {
      presentation: fade(),
      timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }),
    };
  }
  if (bucket === 1) {
    return {
      presentation: slide({ direction: "from-right" }),
      timing: springTiming({
        config: { damping: 200, mass: 1, stiffness: 120 },
        durationInFrames: TRANSITION_FRAMES + 5,
      }),
    };
  }
  if (bucket === 2) {
    return {
      presentation: wipe({ direction: "from-top-left" }),
      timing: linearTiming({ durationInFrames: TRANSITION_FRAMES + 5 }),
    };
  }
  return {
    presentation: fade(),
    timing: springTiming({
      config: { damping: 200, mass: 1, stiffness: 140 },
      durationInFrames: TRANSITION_FRAMES,
    }),
  };
};

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BASE_BG }}>
      <Audio src={staticFile("audio/bgm.wav")} loop volume={0.22} />
      <TransitionSeries>
        {ORDER.map((slide, i) => {
          const frames = durations.slides[slide.id].frames;
          const isLast = i === ORDER.length - 1;
          const t = transitionForIndex(i);
          return (
            <React.Fragment key={slide.id}>
              <TransitionSeries.Sequence durationInFrames={frames}>
                <slide.Component />
              </TransitionSeries.Sequence>
              {!isLast && (
                <TransitionSeries.Transition
                  presentation={t.presentation as never}
                  timing={t.timing}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const computeTotalFrames = (): number => {
  const sum = ORDER.reduce(
    (acc, s) => acc + durations.slides[s.id].frames,
    0,
  );
  const overlaps = (ORDER.length - 1) * TRANSITION_FRAMES;
  return Math.max(60, sum - overlaps);
};
