import React from "react";
import { Composition } from "remotion";
import { Main, computeTotalFrames } from "./Main";
import { FPS, HEIGHT, WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={computeTotalFrames()}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
