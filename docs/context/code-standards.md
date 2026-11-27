# Code Standards

## General

- Keep microphone capture, audio preparation, speech inference, transcript editing, export, and appearance preferences as separate responsibilities.
- Implement one feature unit at a time and keep each unit small enough to test on an Android device.
- Treat the user's transcript edits as source-of-truth content. Never overwrite the document with a newly generated transcript.
- Keep all inference local. Do not add remote services, API keys, analytics uploads containing audio/text, or network dependencies for transcription.
- Use clear names that describe user-visible behavior and state transitions.
- Handle errors explicitly; do not swallow microphone, model-loading, inference, clipboard, or export failures.
- Do not add dependencies unless the feature requires them and the dependency is compatible with the selected Android stack.

## Application Language and Framework

- **Unresolved:** The project language and UI framework have not been formally locked in. Reference Gradle/Kotlin scaffolding is provided to support the GitHub Actions APK build and signing pipeline, clearly separated into boundary interfaces.
- Once locked in, follow the language's official formatting, naming, type-safety, and Android lifecycle conventions consistently.
- Keep platform-specific APIs behind focused interfaces where that improves testability and separation of concerns.
- Avoid introducing a second application language or UI framework without an explicit architectural decision.

## Native `whisper.cpp` Integration

- Keep C/C++ inference code behind a small application-facing speech-engine interface.
- Do not place model loading or native inference calls directly inside UI event handlers.
- Make native resource ownership and cleanup explicit. Release audio buffers, model/context resources, and temporary files on success, failure, cancellation, and lifecycle interruption.
- Surface native initialization and inference errors to the application layer as actionable error states.
- Preserve upstream license notices and attribution when vendoring or packaging `whisper.cpp`.
- Do not modify upstream internals to work around application-layer problems without documenting the reason and scope.
- Verify the input format required by the exact `whisper.cpp` API used (16,000 Hz mono float32 PCM). Do not assume microphone output is already in the required sample rate, channel count, or numeric format.

## Audio and Transcription

- Keep microphone permission handling separate from recording implementation.
- Represent recording, processing, success, and failure states explicitly; prevent invalid overlapping record/transcribe operations.
- Ensure a completed recording segment is transcribed once unless the user explicitly retries it.
- Associate each result with the recording segment that produced it so retries do not accidentally append duplicate text.
- Append result text to the end of the current document using a line break. Do not replace existing content or modify previous segments.
- Handle empty recordings and empty transcription results without crashing or inserting misleading content.

## Transcript Editor

- Use one authoritative document value/state for the editable transcript.
- Support normal multiline text editing, selection, cursor movement, and deletion.
- Keep the editor's current user-modified content when a transcription completes; append only the new transcription segment.
- Copy and Export must read the current editor/document content, not a stale transcription result or the latest segment alone.
- Do not add rich-text formatting or automatic rewriting unless a separate requirement defines it.

## Styling and Themes

- Support System, Light, and Dark modes.
- Default to System mode on a fresh installation.
- Use semantic theme roles/tokens rather than scattering literal colors throughout components.
- Do not invent a branded color palette, typography system, spacing scale, or radius scale; those decisions are not yet defined.
- Ensure controls and text remain legible in all three theme modes.

## Error Handling and Lifecycle

- Handle microphone permission denial, microphone unavailability, recording interruption, model missing/corrupt, native initialization failure, transcription failure, empty audio, clipboard failure, and export cancellation/failure.
- Do not lose the transcript when recording or inference fails.
- Do not run long inference work on the UI thread.
- Respect Android lifecycle interruptions. Define behavior for app backgrounding, calls, process recreation, and interrupted recordings before relying on them.
- Show a clear processing state while inference is running and prevent conflicting operations.

## Testing

- Test append behavior, including appending after user edits and handling empty results.
- Test that successive transcriptions never replace previously entered text.
- Test Copy and Export against the current edited document.
- Test permission denial, missing model, invalid/empty audio, inference failure, and export cancellation.
- Test System, Light, and Dark modes, including the System default.
- Verify offline transcription on a physical Android device, not only an emulator.
- Record target-device performance measurements before declaring latency, maximum recording length, or resource use acceptable.
- Use the actual build and test commands for the selected Android project.

## File Organization

Use logical boundaries; exact paths are unresolved until the application stack is selected.

- **Recording** — microphone permission and capture lifecycle.
- **Audio preparation** — conversion/resampling and temporary audio handling.
- **Speech engine** — `whisper.cpp` model lifecycle and native inference adapter.
- **Transcript** — editable document state and append behavior.
- **Export** — clipboard and file-export operations.
- **Settings/theme** — appearance preference and theme application.
- **UI** — screens, controls, and user-visible state presentation.
- **Tests** — unit and device/integration tests for the above boundaries.

Do not create placeholder packages or folders for technologies that have not been selected.
