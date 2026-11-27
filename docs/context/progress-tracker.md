# Progress Tracker

Update this file after every meaningful implementation or confirmed planning change. Distinguish established decisions from proposals and unresolved items.

## Current Phase

- Context setup completed; application implementation started (first build scaffold + CI/CD signing pipeline).

## Current Goal

- Use these six context files as the initial specification for a local Android English speech-transcription application.
- First implementation goal: prove microphone capture and on-device `whisper.cpp` `base.en` transcription on a physical Android device before building the complete editor experience.
- Establish a buildable Gradle/Compose/Kotlin project plus a CI/CD workflow system that produces a **signed release APK** (consuming `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` secrets) and a `v*`-tag release workflow that attaches the APK to a GitHub Release.

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
- **Recorded the previously-unresolved implementation decisions** (language Kotlin, Jetpack Compose, minSdk 26 / target/compile 34, NDK+JNI `externalNativeBuild` with `whisper.cpp` submodule, Gradle Kotlin DSL, package `com.speakdraft.app`, model-into-assets delivery, 16 kHz mono capture, stop-then-transcribe, in-memory transcript, SAF `.txt` export). See `architecture.md`.
- **Created the Gradle/Compose/Kotlin project scaffold** implementing the architecture boundaries: recording, audio preparation, speech engine (JNI bridge), transcript document, export, theme, and UI.
- **Created the CI/CD signing pipeline**: `build-apk.yml` (signed APK artifact) and `release-apk.yml` (`v*`-tag release that attaches the signed APK). Both consume the `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` secrets.
- **Fixed the CI/CD pipeline after the merge to `main` failed** (run `45986625620`): removed `android-actions/setup-android@v3` (fails on Node 24 runners, exit 127) and installed SDK components directly via `$ANDROID_HOME`/`sdkmanager`; upgraded to `actions/checkout@v5` and `actions/setup-java@v5`; added `gradle/actions/setup-gradle@v4` caching, `testDebugUnitTest`, `apksigner` verification, keystore sanitization/validation, and keystore shredding. Added a real git submodule gitlink for `app/src/main/cpp/whisper.cpp` (previously only a plain `.gitmodules` file existed, so `submodules: recursive` checked out nothing).
- **Fixed the `v*` release workflow not firing on published releases**: publishing a GitHub Release on an existing tag fires a `release` event, not a tag push. `release-apk.yml` now also triggers on `release: types: [published, released]` and on `workflow_dispatch` (with an optional `tag_name` input), and resolves the tag from the event/input/ref. Note: tag `v1.0.0` still points to the pre-merge commit `1f51c510` (which predates the current workflows); retarget it to `main` HEAD or re-run the release workflow via manual dispatch to attach the APK to the existing `v1.0.0` release.
- **Fixed codebase build/runtime bugs found in audit**: Kotlin `1.9.22` → `1.9.24` (required by Compose compiler `1.5.14`); `themes.xml` parent changed from `Theme.Material3.DayNight.NoActionBar` (requires the Material library, AAPT2 link failure) to the framework `android:Theme.Material.Light.NoActionBar`; added missing `heightIn` import in `TranscribeScreen.kt`; disabled the record FAB while transcribing/model-loading; forced a static/PIC/no-OpenMP `whisper.cpp` build and fixed include paths in `CMakeLists.txt`; added `noCompress += "bin"` for the model asset; serialized `WhisperEngine` JNI calls with a `Mutex` and made model extraction atomic; guarded `toggleRecording()` while `isProcessing`; validated model download size in `download_model.sh`.

## In Progress

- None. No application source code, build configuration, or Android project has been created in this planning session.

## Next Up

1. Verify the project builds end to end on a CI runner (NDK, CMake, `whisper.cpp` submodule, model download, signed APK).
2. Build a minimal physical-device proof of concept: microphone capture, compatible audio input, model loading, and local `base.en` inference.
3. Verify transcription quality, runtime memory, latency, heat, and battery impact on the intended 8 GB device.
4. Implement editing, Copy, Export, theme selection, and the finalized reset/new-document behavior (currently reset clears only after explicit confirmation).
5. Decide and implement transcript persistence across restarts and recorded-audio retention policy.

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
- **Application language:** Kotlin (selected).
- **UI framework:** Jetpack Compose + Material 3 (selected).
- **Minimum / target / compile SDK:** 26 / 34 / 34 (selected).
- **Native bridge/build:** Android NDK + JNI via `externalNativeBuild` (CMake); `whisper.cpp` as a git submodule; JNI wrapper links the upstream `whisper` library (selected).
- **Build system:** Gradle (Kotlin DSL) + Android Gradle Plugin (selected).
- **Package name / app name:** `com.speakdraft.app` / "SpeakDraft" (selected).
- **Model delivery:** downloaded into `app/src/main/assets/` at build time, extracted to app-private storage on first launch (selected for the initial build).
- **Audio capture:** 16 kHz mono 16-bit PCM via `AudioRecord` (selected for the initial build).
- **Transcription flow:** stop-then-transcribe (working interpretation adopted).
- **Export format:** plain-text `.txt` via Storage Access Framework (selected for the initial build).
- **Deferred (still open):** transcript persistence across restarts, recorded-audio retention policy, final reset/new-document semantics, branding/icon.

## Session Notes

- This session produced planning documentation only. No implementation, dependency installation, repository modification, build, or device test has occurred.
- The five uploaded templates were read and used for their corresponding files. No UI-context template was present among the available uploads; the sixth file uses a minimal project-specific structure rather than claiming to reproduce a missing template.
- Official upstream references are recorded in `architecture.md`. The upstream `whisper.cpp` Android sample recommends Tiny or Base models for Android; this project has selected the English-only Base variant.
