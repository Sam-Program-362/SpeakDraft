# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Platform | Android | Target application platform. Minimum Android version is not yet decided. |
| Application language | Unresolved | Choose before implementation; do not assume Kotlin or Java. |
| UI framework | Unresolved Android UI approach | Choose before implementation; do not assume Jetpack Compose or XML Views. |
| Speech engine | `whisper.cpp` (C/C++) | Run Whisper inference locally on the Android device. |
| Speech model | Whisper `base.en`, file `ggml-base.en.bin` | English-only Base model. The upstream model list reports approximately 141 MiB / 141.11 MB for this model file. |
| Audio capture | Android microphone capture | Capture speech and prepare audio in the format required by the selected `whisper.cpp` integration. Exact API and recording format are unresolved. |
| Native integration | Unresolved Android integration around `whisper.cpp` | Select and document the JNI/NDK or other supported integration approach during technical setup. |
| Transcript state | Local application state | Hold the editable transcript document and append new transcription segments without replacing existing content. Persistence across app restarts is unresolved. |
| Export | Android file export mechanism, to be selected | Write the current edited document to a user-accessible file. Export format and exact API are unresolved; plain-text `.txt` is a reasonable proposal, not a confirmed decision. |
| Backend / remote services | None planned | Recording and transcription are local. Do not add a backend or hosted transcription API. |
| Authentication | None planned | The initial product is a standalone, single-user Android utility with no sign-in flow. |

### Upstream References

- [`whisper.cpp` project and Android platform support](https://github.com/ggml-org/whisper.cpp)
- [Official Android sample application](https://github.com/ggml-org/whisper.cpp/tree/master/examples/whisper.android) — the upstream sample recommends Tiny or Base models for Android.
- [Upstream model list and download instructions](https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md) — model names ending in `.en` are English-only; the Base English model is `base.en`.

## System Boundaries

These are logical responsibilities, not a confirmed source-folder layout. The implementation agent must choose folder names only after the application language and UI framework are decided.

- **Recording boundary** — owns microphone permission checks, capture lifecycle, recording state, and audio-file/buffer lifecycle.
- **Audio preparation boundary** — makes captured audio compatible with the selected `whisper.cpp` API. Do not assume the microphone's raw sample rate or channel layout is directly usable by the model.
- **Speech-engine boundary** — owns model loading, native `whisper.cpp` calls, inference lifecycle, and transcription errors. Keep native-specific details behind a narrow application-facing interface.
- **Transcript-document boundary** — owns the editable document text and append operation. It must preserve existing user edits and append completed segments at the end.
- **Editor/UI boundary** — presents recording controls, status, the editable transcript page, Copy, Export, Reset/New Recording, and theme selection.
- **Export boundary** — exports the current document contents through the chosen Android file mechanism.
- **Preferences boundary** — owns appearance preference if theme selection is persisted. The persistence mechanism is not yet chosen.

## Storage Model

- **Speech model file:** Store the selected `ggml-base.en.bin` model in app-accessible local storage. Whether it is bundled with the installation or downloaded on first use is unresolved. Do not silently choose a model-delivery strategy.
- **Recorded audio:** Audio must remain on the device for capture and inference. Temporary-file versus retained-recording behavior, cleanup timing, and whether users can replay recordings are unresolved. Do not retain recordings indefinitely by assumption.
- **Transcript document:** The editable transcript is application-local data while the app is running. Whether documents are automatically saved and restored after app closure/restart is unresolved.
- **Exported document:** Export a snapshot of the current edited transcript. File extension/format and destination-selection flow are unresolved; `.txt` is a proposed simple default only.
- **Preferences:** The selected theme may be stored locally. The preference storage technology is unresolved.
- **Remote storage:** No remote transcript or audio storage is planned.

## Auth and Access Model

- No user account or sign-in is planned for the initial application.
- Request Android microphone permission only when microphone access is needed, and handle denial without crashing.
- Use app-private storage for internal model/audio working files unless a later explicit requirement says otherwise.
- Exported files must be written through an Android-supported user-visible file flow; do not assume broad filesystem access.
- Do not upload recordings or transcript content to a server. Model acquisition may require a one-time download depending on the model-delivery decision, but transcription itself must work locally after the model is available.

## Invariants

1. Speech recognition runs locally through `whisper.cpp`; do not add cloud transcription, remote inference, or an API-key dependency.
2. The initial supported recognition language is English, using the `base.en` model rather than a multilingual model.
3. A completed transcription segment is appended after the existing document text with a line break; it must never replace prior text.
4. User edits to the transcript are authoritative. The transcription pipeline may append a new segment, but must not rewrite or normalize earlier user-authored content.
5. Copy and Export operate on the current full document, including user edits and all appended segments.
6. Do not clear or discard transcript content as a side effect of starting, stopping, or resuming a recording.
7. Reset/New Recording must not silently destroy document content. Its exact document-clearing or new-document behavior must be specified before implementation.
8. Keep audio and model inference on-device. Do not introduce network access for audio processing.
9. Keep native `whisper.cpp` integration isolated from UI and document-editing logic.
10. Do not claim a specific Android build tool, programming language, UI framework, folder structure, persistence layer, or minimum SDK until it is explicitly selected.
