"""
Subtle, professional ambient background pad.

Design rules (intentionally boring = intentionally unobtrusive):
  - ONLY sustained pads. No arpeggios, no bass pulses, no sparkle bells,
    no rhythmic elements. Nothing that can be mistaken for a melody or a beat.
  - Chords crossfade smoothly into each other (4 s overlap) so there are no
    hard cuts or phase clicks at segment boundaries.
  - Six-voice jazz voicings with mild detune chorus (~5 cents) per voice for
    natural width without beating.
  - Gentle sub-bass drone following the chord root.
  - Very quiet pink-ish noise bed for "air".
  - Slow breathing tremolo (0.15 Hz) at 3 percent depth.
  - Soft-clip limiter. No hard compression.
  - Track is 120 s and designed to loop cleanly (head and tail envelope match).

Output: video/public/audio/bgm.wav  (44100 Hz, 16-bit mono WAV, 120 s)
"""

from __future__ import annotations

import array
import math
import random
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "public" / "audio" / "bgm.wav"

SAMPLE_RATE: int = 44100
DURATION_SECONDS: float = 120.0

CHORD_DURATION: float = 15.0
CROSSFADE: float = 4.0

MASTER_VOLUME: float = 0.48
PAD_VOLUME: float = 0.18
SUB_VOLUME: float = 0.14
NOISE_VOLUME: float = 0.012

TREMOLO_HZ: float = 0.15
TREMOLO_DEPTH: float = 0.03


def midi_to_hz(midi: int) -> float:
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


PROGRESSION: list[list[int]] = [
    [36, 52, 55, 59, 62, 67],
    [33, 52, 55, 60, 64, 67],
    [29, 53, 57, 60, 64, 67],
    [31, 55, 59, 62, 64, 67],
    [36, 52, 55, 59, 62, 67],
    [33, 52, 55, 60, 64, 67],
    [29, 53, 57, 60, 64, 67],
    [31, 55, 59, 62, 64, 67],
]


def render() -> None:
    total_samples = int(SAMPLE_RATE * DURATION_SECONDS)
    buf = array.array("d", [0.0] * total_samples)

    crossfade_samples = int(CROSSFADE * SAMPLE_RATE)
    chord_samples = int(CHORD_DURATION * SAMPLE_RATE)
    segment_samples = chord_samples + crossfade_samples

    rng = random.Random(1337)

    def envelope(length: int, i: int, fade: int) -> float:
        if i < fade:
            x = i / fade
            return x * x * (3.0 - 2.0 * x)
        if i > length - fade:
            x = (length - i) / fade
            x = max(0.0, x)
            return x * x * (3.0 - 2.0 * x)
        return 1.0

    def add_pad_voice(freq: float, start: int, length: int, amp: float,
                      detune_cents: float, phase: float) -> None:
        f = freq * (2.0 ** (detune_cents / 1200.0))
        step = 2.0 * math.pi * f / SAMPLE_RATE
        for i in range(length):
            pos = start + i
            if pos < 0 or pos >= total_samples:
                continue
            env = envelope(length, i, crossfade_samples)
            buf[pos] += amp * env * math.sin(step * i + phase)

    def add_sub_drone(freq: float, start: int, length: int, amp: float,
                      phase: float) -> None:
        step = 2.0 * math.pi * freq / SAMPLE_RATE
        for i in range(length):
            pos = start + i
            if pos < 0 or pos >= total_samples:
                continue
            env = envelope(length, i, crossfade_samples)
            fundamental = math.sin(step * i + phase)
            second = 0.15 * math.sin(2.0 * step * i + phase)
            buf[pos] += amp * env * (fundamental + second)

    print(f"Rendering {DURATION_SECONDS:.0f}s ambient pad ({len(PROGRESSION)} chord segments)...")
    for c_idx, voicing in enumerate(PROGRESSION):
        start = c_idx * chord_samples - crossfade_samples // 2

        root_midi = voicing[0]
        sub_freq = midi_to_hz(root_midi) * 0.5
        add_sub_drone(sub_freq, start, segment_samples, SUB_VOLUME,
                      phase=rng.uniform(0, 2 * math.pi))

        for midi in voicing:
            freq = midi_to_hz(midi)
            voice_amp = PAD_VOLUME
            if midi < 48:
                voice_amp *= 0.55
            elif midi >= 67:
                voice_amp *= 0.75
            for detune in (-5.0, +5.0):
                add_pad_voice(
                    freq,
                    start,
                    segment_samples,
                    voice_amp * 0.5,
                    detune_cents=detune,
                    phase=rng.uniform(0, 2 * math.pi),
                )

    print("Adding air (filtered noise bed)...")
    prev = 0.0
    alpha = 0.008
    for i in range(total_samples):
        white = rng.uniform(-1.0, 1.0)
        prev = prev + alpha * (white - prev)
        buf[i] += NOISE_VOLUME * prev

    print("Breathing tremolo + master gain + soft limiter...")
    trem_step = 2.0 * math.pi * TREMOLO_HZ / SAMPLE_RATE
    for i in range(total_samples):
        trem = 1.0 + TREMOLO_DEPTH * math.sin(trem_step * i)
        s = buf[i] * trem * MASTER_VOLUME
        buf[i] = math.tanh(s * 0.85)

    track_fade = int(2.0 * SAMPLE_RATE)
    for i in range(track_fade):
        x = i / track_fade
        eased = x * x * (3.0 - 2.0 * x)
        buf[i] *= eased
        buf[-(i + 1)] *= eased

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Writing WAV -> {OUT_PATH}")
    max_amp = 32767
    with wave.open(str(OUT_PATH), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        pack = struct.Struct("<h").pack
        for s in buf:
            val = int(max(-1.0, min(1.0, s)) * max_amp)
            frames += pack(val)
        wf.writeframes(bytes(frames))

    size_mb = OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"Done. {OUT_PATH.name} ({size_mb:.1f} MB, {DURATION_SECONDS:.0f}s ambient pad, loop-safe)")


if __name__ == "__main__":
    render()
