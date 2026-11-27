# Progress Tracker

Update this file after every meaningful implementation or confirmed planning change. Distinguish established decisions from proposals and unresolved items.

## Current Phase

- Context setup completed; application implementation has not started.

## Current Goal

- Use these six context files as the initial specification for a local Android English speech-transcription application.
- First implementation goal: prove microphone capture and on-device `whisper.cpp` `base.en` transcription on a physical Android device before building the complete editor experience.

## Completed

- Defined the product as an Android speech-to-text application for spoken English.
- Selected `whisper.cpp` as the speech-recognition engine.
- Selected the English-only Whisper `base.en` model (`ggml-base.en.bin`).
- Established local/on-device inference; no cloud transcription service is planned.
- Defined an editable, page-like transcript area.
- Defined append behavior: each later completed transcription is added after existing text on a new line; previous text must not be overwritten.
- Defined whole-document Copy and file Export actions.
- Defined System, Light, and Dark themes, with System as the default.
- Created the six initial context files. The uploaded templates covered five files; a UI template was not available, so `ui-context.md` is intentionally minimal.

## In Progress

- None. No application source code, build configuration, or Android project has been created in this planning session.

## Next Up

1. Decide the Android application language and UI framework before creating the project.
2. Decide the Android minimum supported version and native integration/build approach for `whisper.cpp`.
3. Build a minimal physical-device proof of concept: microphone capture, compatible audio input, model loading, and local `base.en` inference.
4. Verify transcription quality, runtime memory, latency, heat, and battery impact on the intended 8 GB device.
5. Implement the transcript document and non-destructive append behavior.
6. Implement editing, Copy, Export, theme selection, and the finalized reset/new-document behavior.

## Open Questions

- What application language will be used: Kotlin or Java?
- What UI framework will be used: Jetpack Compose, XML Views, or another explicitly selected option?
- What is the minimum supported Android version?
- Should transcription begin only after the user stops a recording segment, or should partial/live transcription appear while recording? The current working interpretation is stop-then-transcribe.
- What exactly should Reset do: clear the current document after confirmation, create a new document while preserving the old one, or another defined behavior?
- Should the transcript document be automatically saved and restored after the app closes or the process is killed?
- Should recorded audio be temporary and deleted after transcription, or should users be able to retain/replay recordings?
- Should `ggml-base.en.bin` be bundled with the app or downloaded on first use?
- What export format is required? Plain-text `.txt` is a proposal, not a confirmed decision.
- What is the expected maximum recording duration and document size?
- What is the final app name and visual identity?

## Architecture Decisions

- **Platform:** Android.
- **Speech engine:** `whisper.cpp`.
- **Model:** `base.en` / `ggml-base.en.bin`, selected because the app's recognition scope is English-only.
- **Inference location:** on-device; no remote transcription API or server.
- **Document behavior:** one editable transcript document; completed later segments append at the end with a line break.
- **User edits:** preserve existing text and edits when appending new transcription output.
- **Export/copy:** operate on the current complete edited document.
- **Themes:** System, Light, and Dark; System is the default.
- **Unselected implementation details:** application language, UI framework, minimum Android version, native bridge/build setup, local persistence strategy, audio retention policy, model delivery, and export format remain unresolved.

## Session Notes

- This session produced planning documentation only. No implementation, dependency installation, repository modification, build, or device test has occurred.
- The five uploaded templates were read and used for their corresponding files. No UI-context template was present among the available uploads; the sixth file uses a minimal project-specific structure rather than claiming to reproduce a missing template.
- Official upstream references are recorded in `architecture.md`. The upstream `whisper.cpp` Android sample recommends Tiny or Base models for Android; this project has selected the English-only Base variant.
