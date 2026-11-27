# AI Workflow Rules

## Approach

Build this project incrementally using the six context files as the specification. The user is the final decision-maker. Implement only established requirements and explicitly confirmed technical decisions. Keep planning and implementation separate. Do not infer missing product behavior or silently promote a proposal into a decision.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments over broad changes.
- Keep Android UI, microphone capture, audio preparation, native inference, transcript editing, export, and theme work separately scoped.
- Do not add a backend, account system, cloud transcription provider, or API-key requirement.
- Do not add non-English recognition or an alternative speech model without an explicit scope change.
- Do not change the selected `whisper.cpp` `base.en` model without an explicit decision.

## When to Split Work

Split an implementation step if it combines:

- Microphone capture and native model integration.
- Audio conversion and UI redesign.
- Native inference changes and transcript-editor behavior.
- Transcript state changes and file-export changes.
- Theme work and unrelated recording lifecycle changes.
- More than one unresolved technical decision.

If a change cannot be verified end to end within a focused test, split it further.

## Handling Missing Requirements

- Do not invent the Android programming language, UI framework, minimum SDK, package name, folder structure, persistence technology, or build setup without marking proposals distinctly from confirmed decisions.
- Do not choose between Kotlin and Java, Jetpack Compose and XML Views, or alternative native integration approaches without recording the decision.
- Treat live/partial transcription versus transcription after a recording segment stops as unresolved until specified. The current working flow is stop-then-transcribe; do not silently implement streaming behavior.
- Treat document persistence across app restarts, audio retention, model delivery, export format, and reset semantics as unresolved.
- Before implementing behavior that depends on an unresolved item, record the question in `progress-tracker.md` and obtain a decision or implement only the clearly separable work.
- Do not silently discard transcript text. When reset behavior is not defined, preserve the document and avoid destructive reset behavior.
- Do not add speculative features or broaden scope to solve an ambiguity.

## Transcript Safety Rules

- Never overwrite existing document text when a new transcription completes.
- Append each completed result at the end with a line break.
- Preserve prior user edits exactly; do not re-transcribe, rewrite, normalize, or reformat earlier content as a side effect of a new recording.
- Ensure retries do not append duplicate output without an explicit user action.
- Copy and Export must use the current edited document, not a cached model result.

## Protected Files and Third-Party Code

Do not modify the following unless the task explicitly requires it and the change is scoped:

- Vendored or copied upstream `whisper.cpp` source files and native internals.
- The `ggml-base.en.bin` model artifact; do not edit, truncate, or regenerate it as part of ordinary feature work.
- Generated native/build outputs and downloaded model artifacts.
- Third-party dependencies and license/notice files.
- Context templates or the six context files, except when a confirmed decision or implementation change requires synchronized documentation updates.

Do not remove upstream license notices or attribution.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes affect:

- Product behavior, scope, or success criteria (`project-overview.md`).
- Stack, system boundaries, data retention, model delivery, permissions, or invariants (`architecture.md`).
- Language/framework conventions, native integration, tests, or file organization (`code-standards.md`).
- Visual behavior, theme modes, layouts, or interaction states (`ui-context.md`).
- Agent constraints or verification rules (`ai-workflow-rules.md`).
- Phase, completed work, current goal, or open decisions (`progress-tracker.md`).

Keep all six files consistent when a confirmed decision changes.

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant in `architecture.md` was violated, especially local inference and non-destructive transcript append behavior.
3. Relevant tests pass, including physical-device testing where microphone/native inference behavior is involved.
4. The project builds using the build system actually selected for the Android app.
5. `progress-tracker.md` reflects what was actually completed; do not report planned work as implemented.
6. Relevant context files are synchronized and contain no unsupported assumptions.
