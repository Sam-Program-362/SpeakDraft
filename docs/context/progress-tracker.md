# Progress Tracker

Update this file after every meaningful implementation or confirmed planning change. Distinguish established decisions from proposals and unresolved items.

## Current Phase

- Repository structure, 6-Context core specification, interactive verification workbench, and GitHub Actions CI/CD APK signing & `v*` tag release pipelines configured.
- Physical Android device verification of `whisper.cpp` `ggml-base.en.bin` remains the next hardware milestone.

## Current Goal

- Maintain this repository under Git version control for GitHub remote storage with the six context files as the core architectural contract.
- Provide production-ready GitHub Actions CI/CD workflows for:
  1. Building and cryptographically signing the Android APK using credentials stored in GitHub Secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
  2. Triggering an automated APK build, signing, and GitHub Release publication (with attached signed APK and SHA-256 checksum artifacts) whenever a `v*` version tag (e.g. `v1.0.0`) is pushed.
- First hardware goal: prove microphone capture and on-device `whisper.cpp` `base.en` transcription on a physical Android device.

## Completed

- Defined the product (**SpeakDraft**) as an Android speech-to-text application for spoken English.
- Confirmed the application name as **SpeakDraft**.
- Selected `whisper.cpp` as the speech-recognition engine.
- Selected the English-only Whisper `base.en` model (`ggml-base.en.bin`).
- Established local/on-device inference; no cloud transcription service is planned.
- Defined an editable, page-like transcript area.
- Defined append behavior: each later completed transcription is added after existing text on a new line; previous text must not be overwritten.
- Defined whole-document Copy and file Export actions.
- Defined System, Light, and Dark themes, with System as the default.
- Organized the project in Git Repository format with the 6-Context files stored in `docs/context/`.
- Configured `.github/workflows/android-build-sign.yml` for continuous APK building and keystore signing via GitHub Secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) with `apksigner` verification and secure keystore cleanup.
- Configured `.github/workflows/android-release.yml` triggered by `v*` Git tags (`on: push: tags: ['v*']`) to build, sign, and publish a GitHub Release (`softprops/action-gh-release@v2`) with the signed APK and `.sha256` checksum attached.
- Implemented unit-tested boundary modules for non-destructive transcript appending, segment deduplication, 16 kHz mono PCM audio preparation, and CI/CD workflow verification.

## In Progress

- Awaiting user confirmation on final Android language/UI framework lock-in and physical 8 GB Android device benchmarking.

## Next Up

1. Confirm final Android application language and UI framework decision (reference Gradle & JNI bridge files are staged for CI/CD pipeline builds).
2. Confirm Android minimum supported SDK version and model-delivery strategy (bundled vs. first-run download of `ggml-base.en.bin`).
3. Build and deploy the signed APK to a physical 8 GB Android device: verify microphone capture, 16 kHz PCM conversion, model loading, and local `base.en` inference.
4. Measure transcription quality, runtime memory, latency, heat, and battery impact on the physical target device.
5. Finalize reset/new-document semantics and local persistence across app restarts.

## Open Questions

- What application language will be formally locked in: Kotlin or Java?
- What UI framework will be formally locked in: Jetpack Compose, XML Views, or another explicitly selected option?
- What is the minimum supported Android version?
- Should transcription begin only after the user stops a recording segment, or should partial/live transcription appear while recording? The current working interpretation is stop-then-transcribe.
- What exactly should Reset do: clear the current document after confirmation, create a new document while preserving the old one, or another defined behavior?
- Should the transcript document be automatically saved and restored after the app closes or the process is killed?
- Should recorded audio be temporary and deleted after transcription, or should users be able to retain/replay recordings?
- Should `ggml-base.en.bin` be bundled with the app or downloaded on first use?
- What export format is required? Plain-text `.txt` is a proposal, not a confirmed decision.
- What is the expected maximum recording duration and document size?
- What is the final visual identity and app icon for **SpeakDraft**?

## Architecture Decisions

- **Application Name:** **SpeakDraft**.
- **Platform:** Android.
- **Version Control & Remote Storage:** Git repository hosted on GitHub with automated GitHub Actions CI/CD workflows.
- **CI/CD APK Signing:** Release APKs are signed in GitHub Actions by decoding `KEYSTORE_BASE64` and passing `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD` from GitHub Secrets to Gradle `signingConfigs.release`.
- **CI/CD Tag Release:** Pushing a tag matching `v*` (e.g., `v1.0.0`) automatically extracts the version, builds and signs the APK, verifies the signature, and publishes a GitHub Release with the signed APK artifact attached.
- **Speech engine:** `whisper.cpp`.
- **Model:** `base.en` / `ggml-base.en.bin`, selected because the app's recognition scope is English-only.
- **Inference location:** on-device; no remote transcription API or server.
- **Document behavior:** one editable transcript document; completed later segments append at the end with a line break.
- **User edits:** preserve existing text and edits when appending new transcription output.
- **Export/copy:** operate on the current complete edited document.
- **Themes:** System, Light, and Dark; System is the default.
- **Unselected implementation details:** application language, UI framework, minimum Android version, local persistence strategy, audio retention policy, model delivery, and export format remain open for final user confirmation.

## Session Notes

- Repository initialized with Git version control, `.github/workflows/android-build-sign.yml`, `.github/workflows/android-release.yml`, Android Gradle + JNI/CMake build scaffolding, and the 6-Context core specification under `docs/context/`.
- Built the clean, normal-user **SpeakDraft** transcription workspace (editable document, Record/Stop/Cancel flow, Copy, Export `.txt`, non-destructive New/Saved Drafts, and System/Light/Dark themes), strictly separated from GitHub Actions workflows and repository context docs.
