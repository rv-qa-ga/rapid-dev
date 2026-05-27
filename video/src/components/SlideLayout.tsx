import React from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import { BackgroundOrbs } from "./BackgroundOrbs";
import { FONT_STACK, Palette } from "../theme";
import durationsJson from "../audio/durations.json";
import type { Durations, SlideId } from "../types";

const durations = durationsJson as unknown as Durations;

type Props = {
  slideId: SlideId;
  palette: Palette;
  children: React.ReactNode;
};

export const SlideLayout: React.FC<Props> = ({ slideId, palette, children }) => {
  const { fps } = useVideoConfig();
  const entry = durations.slides[slideId];

  const narrationFile = entry?.file ?? `audio/${slideId}.mp3`;

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        color: "#f5f7ff",
        overflow: "hidden",
      }}
    >
      <BackgroundOrbs orbA={palette.orbA} orbB={palette.orbB} />
      <AbsoluteFill
        style={{
          padding: "110px 140px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </AbsoluteFill>
      <NarrationAudio src={narrationFile} fps={fps} />
    </AbsoluteFill>
  );
};

const NarrationAudio: React.FC<{ src: string; fps: number }> = ({ src }) => {
  try {
    return <Audio src={staticFile(src)} volume={1.0} />;
  } catch {
    return null;
  }
};
