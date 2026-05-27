# E2E Automation Framework — Video Presentation

Programmatic video presentation about the E2E Automation Framework, built with
[Remotion](https://www.remotion.dev/). Everything is generated from code —
voiceover, background music, animations, and the final MP4 — with **zero
external media assets** and **no API keys**.

- **Output**: 1920×1080, 30fps, MP4
- **Duration**: ~3½ minutes
- **Voice**: `en-US-AndrewNeural` via `edge-tts` (free, no API key)
- **Music**: ambient pad loop synthesized in pure Python
- **Design**: dark cinematic, glassmorphism, spring animations, gradient headings

## Prerequisites

- Node.js 18+ (tested on 22.x)
- Python 3.10+ (tested on 3.12)
- ffmpeg (bundled by `@remotion/renderer`, no separate install needed)

## One-time setup

From the `video/` folder:

```bash
npm install
npm run py:install
```

`npm run py:install` installs `edge-tts` and `mutagen` into your active Python
environment.

## Generate audio

```bash
npm run voiceover   # edge-tts → public/audio/*.mp3 + src/audio/durations.json
npm run bgm         # pure-Python synth → public/audio/bgm.wav
```

Or both at once:

```bash
npm run audio
```

Running `voiceover` overwrites `src/audio/durations.json` with frame counts
derived from the actual MP3 lengths (`duration × 30fps + 30 frames padding`).

## Preview in Remotion Studio

```bash
npm run studio
```

Opens the live preview at <http://localhost:3000>. Edits hot-reload.

## Render the final MP4

```bash
npm run render       # → out/e2e-automation-framework.mp4
```

Or the complete pipeline (audio + render) in one command:

```bash
npm run build
```

## Customization quick reference

| What                   | Where                                              |
| ---------------------- | -------------------------------------------------- |
| Slide content / layout | `src/slides/01-Title.tsx` … `13-Close.tsx`         |
| Narration text         | `SLIDES` dict in `scripts/generate-voiceover.py`   |
| Voice / speech rate    | `VOICE` + `RATE` in `scripts/generate-voiceover.py`|
| Per-slide accent colors| `PALETTES` in `src/theme.ts`                       |
| Music mood             | `PROGRESSION` + `TEMPO_BPM` in `scripts/generate-bgm.py` |
| Transitions            | `transitionForIndex()` in `src/Main.tsx`           |
| Slide order            | `ORDER` array in `src/Main.tsx`                    |
| Composition FPS / size | `src/theme.ts` (`FPS`, `WIDTH`, `HEIGHT`)          |

## Project layout

```
video/
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── requirements.txt
├── scripts/
│   ├── generate-voiceover.py    # edge-tts + mutagen → MP3s + durations.json
│   └── generate-bgm.py          # pure-Python ambient WAV synth
├── public/
│   └── audio/                   # generated MP3s + bgm.wav  (git-ignored)
├── src/
│   ├── index.ts                 # Remotion entry (registerRoot)
│   ├── Root.tsx                 # <Composition> registration
│   ├── Main.tsx                 # TransitionSeries + BGM + slide order
│   ├── theme.ts                 # palettes, fonts, canvas size
│   ├── types.ts
│   ├── audio/
│   │   └── durations.json       # per-slide frame counts (generated)
│   ├── components/
│   │   ├── SlideLayout.tsx      # background orbs + narration audio per slide
│   │   ├── BackgroundOrbs.tsx
│   │   ├── GlassCard.tsx
│   │   ├── GradientHeading.tsx
│   │   ├── AccentBadge.tsx
│   │   └── Animated.tsx         # FadeUp / BlurIn / Pop spring primitives
│   └── slides/
│       ├── 01-Title.tsx
│       ├── 02-Problem.tsx
│       ├── 03-Unified.tsx
│       ├── 04-Architecture.tsx
│       ├── 05-Systems.tsx
│       ├── 06-TechStack.tsx
│       ├── 07-Capabilities.tsx
│       ├── 08-Lifecycle.tsx
│       ├── 09-AITestGen.tsx
│       ├── 10-Integrations.tsx
│       ├── 11-Reporting.tsx
│       ├── 12-Scale.tsx
│       └── 13-Close.tsx
└── out/                         # rendered MP4s  (git-ignored)
```

## How narration timing works

1. `generate-voiceover.py` writes one MP3 per slide.
2. `mutagen` reads each MP3 and returns its duration in seconds.
3. `frames = ceil(duration × 30) + 30` (padding frames ensure voice finishes
   before the transition starts).
4. Results are written to `src/audio/durations.json`.
5. `Main.tsx` reads that JSON and sets `TransitionSeries.Sequence`
   `durationInFrames` accordingly, so animation timing stays in sync with
   speech length — even after you rewrite the narration.

## Gotchas

| Issue                          | Fix                                                                 |
| ------------------------------ | ------------------------------------------------------------------- |
| `springTiming` import errors   | Import from `@remotion/transitions`, not a sub-path.                |
| `ffprobe not found`            | Use `mutagen` (already in `requirements.txt`).                      |
| BGM too quiet                  | Keep `MASTER_VOLUME ≥ 0.30` in `generate-bgm.py` **and** the `<Audio volume={…} />` prop in `Main.tsx`. |
| Durations file missing         | Placeholder defaults ship with the repo so preview works; run `npm run voiceover` for real timings. |
| Python not found on Windows    | `winget install Python.Python.3.12`, then open a fresh terminal.    |
| `SSLCertVerificationError` from edge-tts | Corporate SSL-intercepting proxy. The script already calls `truststore.inject_into_ssl()` — make sure `pip install truststore` succeeded. |
| edge-tts returns **403** from `speech.platform.bing.com` | Microsoft rotated their auth handshake. Always use `edge-tts >= 7.x` (pinned in `requirements.txt`). |

## Framework reuse note

This sub-project is deliberately isolated from the main Playwright framework:
it has its own `package.json`, its own `node_modules`, and its own `out/`
directory — none of which are shared with the test automation code in
`../src/`. That keeps Remotion's (large) dependency tree from polluting QA
installs or CI pipelines.
