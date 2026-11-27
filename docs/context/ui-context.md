# UI Context

> **Template note:** No `ui-context.md` template was included in the uploaded project files available for this session. This is a minimal project-specific structure based only on confirmed UI requirements. Do not treat unspecified visual styling as a design decision.

## UI Purpose

The interface is a focused Android speech-transcription workspace. The primary task is to record speech, review and edit the resulting text, then copy or export it. The transcript document is the central workspace and must remain easy to read and edit.

## Primary Screen

The initial product concept is a single main transcription screen containing:

- **Recording area:** clear control to start recording and a visible state while recording or transcribing. Support starting another recording segment after a previous segment is complete.
- **Transcript page:** a large, multiline editable text area that displays all transcription segments and allows unrestricted user edits.
- **Document actions:** clearly accessible Copy and Export actions that operate on the entire current document.
- **Reset/New Recording action:** a quick way to begin a new recording. Its effect on the current document is unresolved; do not design or implement it as a silent destructive clear.
- **Appearance setting:** access to System, Light, and Dark theme choices.

Exact control placement, navigation structure, and screen count have not been decided.

## Core Interaction Rules

- A completed transcription is added after the current document text with a line break.
- Existing text remains visible and unchanged when another segment is appended.
- The transcript area is directly editable; it must behave like a normal multiline text page rather than a read-only result panel.
- Copy copies the complete current document, including edits and all segments.
- Export writes the complete current document, including edits and all segments.
- Show the current recording/processing state so users can distinguish idle, recording, and transcription work.
- Handle microphone permission requests and denials with clear system-appropriate messaging.
- Do not silently remove text when the user starts another recording.

## Themes

- Available modes: **System**, **Light**, and **Dark**.
- Default mode: **System**. Follow the device's current appearance preference unless the user selects Light or Dark.
- Exact colors, typography, spacing, corner radii, elevations, and icon set have not been selected.
- Use the platform's semantic theme facilities once the UI framework is chosen. Do not invent a branded visual system or hardcode arbitrary colors.

## Layout and Responsiveness

- The primary target is an Android phone.
- Prioritize readable transcript text and sufficient editing space.
- Keep recording and document actions easy to reach without obscuring the transcript.
- Adapt to the selected Android UI framework's supported screen sizes and system insets.
- Tablet-specific layouts and landscape-specific behavior are not yet specified.

## Components and Navigation

- Use standard Android controls/components from the selected UI framework unless a custom component is justified by a confirmed requirement.
- No third-party component library has been selected.
- No multi-screen navigation model has been selected. Keep the primary recording-and-editing flow straightforward.
- Use standard platform interactions for clipboard, file selection/export, and permission prompts.

## Visual Decisions Still Open

- App icon and branding (Application name is confirmed as **SpeakDraft**).
- UI framework and component library.
- Exact screen composition and navigation.
- Typography, semantic color tokens, spacing, radii, elevation, and icon family.
- Whether settings appear on the main screen or in a separate settings destination.
- Reset confirmation and new-document behavior.
