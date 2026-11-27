# SpeakDraft — Offline English Speech Transcription Android & CI/CD Repository

**SpeakDraft** is an offline-first Android English speech transcription repository built around `whisper.cpp` and the English-only `ggml-base.en.bin` (~141.11 MB) model. Organized under the **6-Context Specification** (`docs/context/`) with automated **GitHub Actions CI/CD pipelines** for APK building, cryptographic keystore signing via GitHub Secrets, and `v*` tag-triggered GitHub Releases.

---

## 1. Repository Layout & 6-Context Core

```text
├── .github/
│   └── workflows/
│       ├── android-build-sign.yml     # Continuous APK build + cryptographic signing via GitHub Secrets
│       └── android-release.yml        # Triggered on 'v*' tag push: builds, signs & creates GitHub Release
├── docs/
│   └── context/                       # The 6 Core Specification Context Files
│       ├── architecture.md            # Stack, system boundaries, storage model & 10 invariants
│       ├── progress-tracker.md        # Phase status, completed milestones & open decisions
│       ├── project-overview.md        # Product scope, core user flow & success criteria
│       ├── code-standards.md          # Native JNI isolation, transcript safety & testing rules
│       ├── ui-context.md              # Single-screen layout, System/Light/Dark themes & interactions
│       └── ai-workflow-rules.md       # Incremental scoping, transcript safety & sync rules
├── app/                               # Android Application Module & Native whisper.cpp JNI Bridge
│   ├── build.gradle.kts               # Environment-driven signingConfigs.release & CMake NDK config
│   └── src/main/
│       ├── AndroidManifest.xml        # Requests RECORD_AUDIO only (no cloud/network upload permissions)
│       ├── cpp/
│       │   ├── CMakeLists.txt         # Native CMake build linking whisper.cpp & whisper_jni
│       │   └── whisper_jni.cpp        # Narrow JNI bridge for ggml-base.en.bin local inference
│       └── java/com/speakdraft/app/
│           ├── audio/AudioPreparer.kt # 16,000 Hz mono float32 PCM normalization boundary
│           └── transcript/            # Non-destructive newline append & segment deduplication
│               └── TranscriptDocument.kt
├── src/                               # SpeakDraft Interactive Web App (Clean End-User Workspace)
├── settings.gradle.kts
└── build.gradle.kts
```

---

## 2. GitHub Actions CI/CD Setup (APK Building, Signing & `v*` Tag Releases)

### Required GitHub Repository Secrets

Navigate to your GitHub Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** and add:

| Secret Name | Description | How to Generate |
| :--- | :--- | :--- |
| `KEYSTORE_BASE64` | Base64-encoded string of your `.jks` or `.keystore` signing file | `base64 -w 0 release-keystore.jks` (Linux) or `openssl base64 -A -in release-keystore.jks` (macOS) |
| `KEYSTORE_PASSWORD` | Password protecting the keystore container | Specified during `keytool -genkeypair` |
| `KEY_ALIAS` | Alias name of the signing private key entry | e.g., `speakdraft-release-key` |
| `KEY_PASSWORD` | Password for the specific key alias | Specified during `keytool -genkeypair` |

> **Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions with `permissions: contents: write` in `android-release.yml` to create releases and attach compiled APK artifacts.

### Workflow 1: Continuous APK Build & Signing (`.github/workflows/android-build-sign.yml`)

- **Triggers:** Push to `main` or `develop`, Pull Requests targeting `main`, or manual `workflow_dispatch`.
- **Pipeline Steps:**
  1. Checks out repository (including `whisper.cpp` submodules if configured).
  2. Sets up Temurin JDK 17 and Gradle build cache.
  3. Validates presence of the 4 signing secrets and decodes `KEYSTORE_BASE64` to `app/release-keystore.jks`.
  4. Runs unit tests (`./gradlew testDebugUnitTest`).
  5. Compiles native C/C++ JNI code and assembles the signed release APK (`./gradlew assembleRelease`).
  6. Cryptographically verifies the APK v2/v3 signature using Android SDK `apksigner verify --verbose --print-certs`.
  7. Uploads the signed `.apk` and `.sha256` checksum as a workflow artifact and securely shreds the temporary `.jks` file in an `if: always()` step.

### Workflow 2: Automated Version Tag Release (`.github/workflows/android-release.yml`)

- **Trigger:** Pushing any Git tag starting with `v` (e.g., `v0.1.0`, `v1.0.0`, `v1.2.0-beta.1`).
- **How to Trigger a Release:**
  ```bash
  git tag -a v1.0.0 -m "Release v1.0.0: SpeakDraft offline base.en transcription"
  git push origin v1.0.0
  ```
- **Pipeline Steps:**
  1. Parses `GITHUB_REF_NAME` (`v1.0.0`) into `APP_VERSION_NAME` (`1.0.0`) and deterministic integer `APP_VERSION_CODE` (`10000`).
  2. Decodes `KEYSTORE_BASE64` and builds + signs the release APK via `./gradlew assembleRelease`.
  3. Verifies the signature with `apksigner` and generates `speakdraft-base-en-v1.0.0-signed.apk` + `.sha256`.
  4. Publishes a GitHub Release for the `v*` tag using `softprops/action-gh-release@v2` with auto-generated release notes and attaches the signed APK and SHA-256 checksum directly to the release assets.
