"""
Generate one MP3 per slide using edge-tts (free, no API key, neural voices).
Reads each MP3 with mutagen to compute Remotion frame counts:
    frames = ceil(duration_seconds * FPS) + PADDING_FRAMES

Writes:
    video/public/audio/slide-XX.mp3   (one per slide)
    video/src/audio/durations.json    (frame map consumed by Main.tsx)

Customize:
    - SLIDES     : narration text per slide
    - VOICE      : edge-tts voice identifier
    - RATE       : speech rate, e.g. "+20%" for +20% faster
    - FPS        : must match Remotion composition fps
    - PADDING_FRAMES : silent tail after narration
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import os
import sys
from pathlib import Path

# On machines behind a corporate SSL-intercepting proxy, Python's bundled CA
# store won't include the re-signing CA. `truststore` makes Python use the OS
# certificate store (where the corporate CA is already trusted), which fixes
# edge-tts's WebSocket handshake. No-op if the package isn't installed.
try:
    import truststore  # type: ignore

    truststore.inject_into_ssl()
except ImportError:
    pass

import edge_tts
from mutagen.mp3 import MP3


VOICE: str = "en-US-AndrewNeural"
RATE: str = "+20%"
FPS: int = 30
PADDING_FRAMES: int = 30
MIN_SLIDE_FRAMES: int = 120

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
DURATIONS_FILE = ROOT / "src" / "audio" / "durations.json"
HASH_FILE = AUDIO_DIR / ".narration-hashes.json"


def narration_signature(text: str) -> str:
    payload = f"{VOICE}|{RATE}|{text}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


SLIDES: dict[str, str] = {
    "01-title": (
        "Welcome. This is the End-to-End Automation Framework. "
        "A unified, enterprise-grade test automation platform. "
        "Built with Playwright, Cucumber, and TypeScript. "
        "Designed to validate every layer of the Contract Lifecycle Management ecosystem "
        "from the user interface, to the A P I, to the database, and every downstream integration."
    ),
    "02-problem": (
        "Enterprise Q A has a fragmentation problem. "
        "Different teams, different tools, different coverage. "
        "U I tests live in one place. A P I tests live in another. "
        "Data validation is an afterthought. Traceability is manual. "
        "This framework solves all of that with one unified platform."
    ),
    "03-unified": (
        "One framework. One set of tools. One source of truth. "
        "Covering Salesforce, Dynamics, MuleSoft, SQL Server, "
        "Reference Data Management, Configuration Management, and every downstream system. "
        "U I and A P I testing share the same project, the same steps, and the same data factories."
    ),
    "04-architecture": (
        "The architecture is strictly layered. "
        "Feature files describe behavior in plain Gherkin. "
        "Step definitions handle orchestration. "
        "Page Objects and A P I clients hide implementation details. "
        "Utilities and a test data factory keep everything reusable. "
        "This separation is non-negotiable, and it scales."
    ),
    "05-systems": (
        "The framework validates nine distinct systems. "
        "Salesforce C R M. Data Cloud. "
        "The MuleSoft integration layer, including the A D P integration. "
        "Operations Workflow. Reference Data Management. Configuration Management. "
        "The Operational Data Store in SQL Server. Dynamics three sixty five. "
        "And blob and SharePoint storage. All from a single test suite."
    ),
    "06-tech-stack": (
        "The foundation is Playwright for browser automation. "
        "Cucumber with Gherkin for readable scenarios. "
        "TypeScript for type-safe test code. "
        "Axios handles every A P I call through shared client wrappers. "
        "A dedicated SQL Server module validates data at rest. "
        "Reports flow to H T M L, J S O N, Allure, and Cucumber."
    ),
    "07-capabilities": (
        "Capabilities span the full stack. "
        "Interactive U I testing with Playwright Inspector. "
        "Contract testing for every A P I. "
        "Direct S Q L validation of database state. "
        "Verification of batch jobs and E T L processes. "
        "Integration testing across Salesforce, Dynamics, and MuleSoft. "
        "One framework. Complete coverage."
    ),
    "build-validation": (
        "Every Salesforce deployment triggers automated build validation. "
        "A focused sanity suite runs the moment code lands in the org. "
        "Critical flows verified. Regressions caught before a single user is impacted. "
        "And the same deployment gate pattern extends to every other system on the platform. "
        "Continuous quality, enforced at the build boundary."
    ),
    "08-lifecycle": (
        "The framework automates five phases of the Q A lifecycle. "
        "Test Case Generation from Jira work items. "
        "Human review and refinement. "
        "Upload into Zephyr Scale. "
        "Automatic linking back to Jira. "
        "And execution with comprehensive reporting. "
        "Every phase has Q A oversight built in."
    ),
    "09-ai-test-gen": (
        "Artificial Intelligence accelerates the slowest part of Q A, writing tests. "
        "Feed the framework a Jira work item I D. "
        "It reads the requirements, analyzes the acceptance criteria, "
        "and generates complete Behavior-Driven test cases in Gherkin format. "
        "Q A reviews. Q A refines. The machine handles the rest."
    ),
    "10-integrations": (
        "First-class integrations with the tools your team already uses. "
        "Jira for work items and requirements. "
        "Zephyr Scale for test case management. "
        "Confluence for living documentation. "
        "Azure DevOps for pipelines. "
        "Every integration uses official REST A P Is, "
        "environment-based secrets, and the provider pattern for extensibility."
    ),
    "11-reporting": (
        "Every test execution produces full traceability. "
        "From Jira work item, to Zephyr test case, to execution run, to captured evidence. "
        "Screenshots, videos, network logs, and database snapshots. "
        "Audit-ready reports. Zero manual tracking. "
        "Quality leadership finally gets the visibility they need."
    ),
    "12-scale": (
        "The framework is built to scale. "
        "Over twenty five hundred test cases per project, running in parallel. "
        "Deterministic, repeatable, and isolated by design. "
        "No hardcoded data. No flaky selectors. No order-dependent tests. "
        "Reliability is not an afterthought. It is enforced by the architecture itself."
    ),
    "13-close": (
        "Unified. Scalable. A I augmented. "
        "The End-to-End Automation Framework turns Q A from a bottleneck into an accelerator. "
        "One platform. Every system. Full visibility. "
        "Built by engineers, for engineers."
    ),
}


async def synth_slide(slide_id: str, text: str, out_path: Path) -> None:
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(out_path))


def mp3_duration_seconds(path: Path) -> float:
    audio = MP3(str(path))
    return float(audio.info.length)


def duration_to_frames(seconds: float) -> int:
    frames = math.ceil(seconds * FPS) + PADDING_FRAMES
    return max(frames, MIN_SLIDE_FRAMES)


async def main() -> int:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    DURATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)

    force_all = os.environ.get("FORCE_REGEN", "").lower() in ("1", "true", "yes")

    prior_hashes: dict[str, str] = {}
    if HASH_FILE.exists() and not force_all:
        try:
            prior_hashes = json.loads(HASH_FILE.read_text(encoding="utf-8"))
        except Exception:
            prior_hashes = {}

    new_hashes: dict[str, str] = {}
    durations: dict[str, dict[str, float | int | str]] = {}

    print(f"Voice : {VOICE}")
    print(f"Rate  : {RATE}")
    print(f"FPS   : {FPS}  (padding={PADDING_FRAMES} frames)")
    print(f"Out   : {AUDIO_DIR}")
    print(f"Mode  : {'FORCE regenerate ALL' if force_all else 'incremental (only changed/missing)'}")
    print("-" * 60)

    for slide_id, text in SLIDES.items():
        mp3_path = AUDIO_DIR / f"{slide_id}.mp3"
        sig = narration_signature(text)
        new_hashes[slide_id] = sig

        needs_regen = (
            force_all
            or not mp3_path.exists()
            or prior_hashes.get(slide_id) != sig
        )

        if needs_regen:
            print(f"  -> {slide_id} ... synthesizing", flush=True)
            await synth_slide(slide_id, text, mp3_path)
        else:
            print(f"  -> {slide_id} ... cached", flush=True)

        seconds = mp3_duration_seconds(mp3_path)
        frames = duration_to_frames(seconds)
        durations[slide_id] = {
            "seconds": round(seconds, 3),
            "frames": frames,
            "file": f"audio/{slide_id}.mp3",
        }
        print(
            f"     {mp3_path.name}  {seconds:6.2f}s  =>  {frames:4d} frames",
            flush=True,
        )

    HASH_FILE.write_text(json.dumps(new_hashes, indent=2), encoding="utf-8")

    total_frames = sum(int(d["frames"]) for d in durations.values())  # type: ignore[arg-type]
    total_seconds = total_frames / FPS
    print("-" * 60)
    print(f"Total narration frames : {total_frames}  (~{total_seconds:.1f}s)")

    payload = {
        "fps": FPS,
        "voice": VOICE,
        "rate": RATE,
        "paddingFrames": PADDING_FRAMES,
        "totalFrames": total_frames,
        "slides": durations,
    }
    DURATIONS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote durations: {DURATIONS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
