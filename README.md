# SpeakDraft

Offline English speech-transcription app for Android. Records spoken English and
transcribes it **locally** with [`whisper.cpp`](https://github.com/ggerganov/whisper.cpp)
using the English-only `base.en` model (`ggml-base.en.bin`). No audio or text ever
leaves the device — there is no cloud transcription, no backend, and no network
permission at runtime.

This repository is built from the six context files in [`docs/context/`](docs/context).

---

## Architecture boundaries

| Boundary | Location | Responsibility |
| --- | --- | --- |
| Recording | `domain/recording/RecordingController.kt` | Microphone capture (16 kHz mono 16-bit PCM), lifecycle, state. |
| Audio preparation | (folded into recording) | Capture is already in whisper.cpp's required format, so no resampling. |
| Speech engine | `domain/speech/WhisperEngine.kt` + `cpp/whisper_jni.*` | Model loading + native `whisper.cpp` inference behind a narrow interface. |
| Transcript document | `domain/transcript/TranscriptDocument.kt` | Editable document; non-destructive **append** of completed segments. |
| Export | `domain/export/ExportController.kt` | Copy to clipboard; file export via Storage Access Framework. |
| Settings / theme | `domain/settings/ThemePreference.kt`, `ui/theme/*` | System / Light / Dark (System default). |
| UI | `ui/screen/TranscribeScreen.kt`, `ui/viewmodel/*` | Recording controls, editable transcript, actions. |

Key invariant: a completed transcription is **appended after** existing text with a
single newline; it never replaces prior content or user edits.

## Selected implementation decisions

These were unresolved in the original context files and are recorded in
[`docs/context/architecture.md`](docs/context/architecture.md):

- **Language / UI:** Kotlin + Jetpack Compose (Material 3).
- **SDK:** `minSdk 26`, `targetSdk 34`, `compileSdk 34`.
- **Native:** Android NDK + JNI via `externalNativeBuild` (CMake). `whisper.cpp`
  is a git submodule at `app/src/main/cpp/whisper.cpp`; `whisper_jni.cpp` links it.
- **Build:** Gradle (Kotlin DSL) + Android Gradle Plugin 8.5.2.
- **Package / name:** `com.speakdraft.app` / **SpeakDraft**.
- **Model delivery:** `ggml-base.en.bin` is downloaded into `app/src/main/assets/`
  at build time (`app/download_model.sh`) and extracted to app-private storage on
  first launch.
- **Audio:** `AudioRecord` at 16 kHz mono 16-bit PCM (no resampling needed).
- **Flow:** stop-then-transcribe. Themes default to System. Reset ("New") clears
  only after explicit confirmation. Export is plain-text `.txt` via SAF.

## Prerequisites

- JDK 17
- Android SDK (cmdline-tools) with **NDK 25.2.9519653** and **CMake 3.22.1**
- Git (with submodule support)

## Getting started (local build)

```bash
# 1. Fetch the whisper.cpp submodule (and its own ggml submodule)
git submodule update --init --recursive

# 2. Download the Whisper base.en model into app assets
bash app/download_model.sh

# 3. Build a debug APK
./gradlew assembleDebug
```

To build a **signed** release APK locally, provide the signing values (e.g. in
`~/.gradle/gradle.properties` or as environment variables):

```properties
KEYSTORE_FILE=/path/to/release.keystore
KEYSTORE_PASSWORD=****
KEY_ALIAS=release
KEY_PASSWORD=****
```

The Gradle signing config in `app/build.gradle.kts` reads these from the
environment; if `KEYSTORE_FILE` is absent the release build is left unsigned.

## CI/CD — signed APK workflows

Two GitHub Actions workflows live in `.github/workflows/`:

| Workflow | File | Trigger | Result |
| --- | --- | --- | --- |
| Build Signed APK | `build-apk.yml` | push to `main`/`develop`, pull requests, or manual dispatch | uploads signed `app-release.apk` as an artifact (unsigned debug APK on PRs from forks, where secrets are unavailable) |
| Release Signed APK | `release-apk.yml` | push of a tag `v*` (e.g. `v1.0.0`), publishing a GitHub Release, or manual dispatch | builds the signed APK and attaches it to a GitHub Release |

> **Note on the existing `v1.0.0` tag:** it still points to a pre-merge commit
> that predates the current workflows. To attach an APK to the existing
> `v1.0.0` release, either retarget the tag to `main` HEAD
> (`git push origin main:refs/tags/v1.0.0 --force`) and re-publish, or run
> **Release Signed APK** from the Actions tab with `tag_name = v1.0.0`.

### Required repository secrets

Configure these under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `KEYSTORE_BASE64` | base64-encoded release keystore (`base64 -w0 release.keystore`) |
| `KEYSTORE_PASSWORD` | password protecting the keystore |
| `KEY_ALIAS` | alias of the signing key inside the keystore |
| `KEY_PASSWORD` | password of the signing key |

### Generating and encoding a signing keystore

```bash
# Create the keystore (keep the passwords safe)
keytool -genkeypair -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias release

# Encode it for the KEYSTORE_BASE64 secret
base64 -w0 release.keystore > release.keystore.b64
# Paste the contents of release.keystore.b64 into the KEYSTORE_BASE64 secret.
```

### Cutting a release

Either push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

or create the release from the GitHub UI / `gh release create v1.0.0`. Both paths
trigger `release-apk.yml` (tag push **and** the `release` published event — the
latter is what fires when you publish a release on an existing tag). You can also
run the workflow manually from the Actions tab with an optional `tag_name`.

`release-apk.yml` checks out the tagged commit (with submodules), decodes the
keystore, downloads the model, runs unit tests, builds the signed APK, verifies
its signature with `apksigner`, and attaches it to the GitHub Release for the
tag (release notes are generated automatically).

## Testing

- **Unit:** `TranscriptDocumentTest` (non-destructive append behavior) runs on the
  JVM via `./gradlew testDebugUnitTest`.
- **Device:** microphone capture and on-device transcription require a physical
  Android device or emulator (`androidTest`).

## Notes / still open

- Transcript persistence across app restarts and recorded-audio retention are
  deferred decisions (currently in-memory / temporary).
- Branding (final app name, icon, palette) is placeholder.
- Live/streaming transcription is not implemented (stop-then-transcribe only).
