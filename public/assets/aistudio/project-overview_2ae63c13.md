# Offline English Speech Transcription App (Working Title)

> **Project name:** Not decided. “Offline English Speech Transcription App” is a descriptive working title only.

## Overview

An Android application for recording spoken English and converting the recording into editable text on the device. The application uses `whisper.cpp` with the English-only Whisper `base.en` model. Transcription output appears in a page-like text editor. Users can freely edit the text, copy it, or export it as a file. When another recording is transcribed in the same document, its result is appended after the existing text rather than replacing it. The interface offers System, Light, and Dark theme modes, with System selected by default.

## Goals

1. Record speech on an Android device and transcribe it locally with `whisper.cpp` `base.en`, without sending audio to a transcription server.
2. Preserve existing document text when adding a later transcription; append each completed transcription segment at the end on a new line.
3. Let users edit the complete transcription document, copy its contents, and export its contents as a file.
4. Make starting another recording straightforward while protecting existing user-edited text from accidental loss.
5. Provide System, Light, and Dark appearance modes, defaulting to System.

## Core User Flow

1. The user opens the app and grants microphone permission when requested.
2. The user starts a recording and speaks in English.
3. The user finishes the recording. The app processes that audio locally with the configured `whisper.cpp` `base.en` model.
4. The resulting text is added to the bottom of the editable document, separated from existing text by a newline. Existing text is not replaced.
5. The user can edit the document, copy all its text, or export it as a file.
6. The user can record another segment and append its transcription to the same document.
7. The user can use the reset/new-recording action to begin again. Its exact effect on the current document must be settled before implementation; it must not silently destroy unsaved or user-edited text.

**Working interpretation:** the initial flow records a segment and transcribes it when the segment is finished. Whether live/partial transcription while recording is required remains unresolved.

## Features

### Recording and Transcription

- Capture speech through the Android device microphone.
- Transcribe English speech on-device using `whisper.cpp` and the `base.en` model.
- Provide clear recording, processing, and idle states.
- Support making another recording and appending the next completed transcription to the existing document.

### Editable Transcript Document

- Display transcription output in a page-like, multi-line editable text area.
- Allow normal text editing, selection, and cursor placement.
- Append new transcription output after existing content, with a line break; never replace prior text as part of an append operation.
- Keep transcription output and user edits in one document.

### Copy and Export

- Provide a clear action to copy the document's text to the clipboard.
- Provide an action to export the document's text as a file.
- Preserve the current edited document contents when copying or exporting.

### Appearance

- Provide System, Light, and Dark theme modes.
- Select System by default so the app follows the device appearance setting.

## Scope

### In Scope

- Android mobile application.
- English speech transcription only.
- Local/on-device transcription using `whisper.cpp` `base.en`.
- Microphone recording and transcription of completed audio segments.
- Append behavior for successive transcription segments.
- A freely editable, page-like transcript document.
- Copy-to-clipboard and file-export actions.
- A quick reset/new-recording action, with non-destructive behavior to be finalized.
- System, Light, and Dark appearance modes.

### Out of Scope

- Cloud-hosted transcription or sending recorded audio to an external transcription API.
- User accounts, sign-in, cloud synchronization, or multi-user collaboration.
- Transcription of languages other than English.
- Replacing the selected speech engine with a hosted speech-to-text provider.

## Success Criteria

1. On a supported Android device, a user can record English speech and receive a transcription produced locally by `whisper.cpp` `base.en`.
2. Completing a second recording adds its transcription after the first transcription on a new line; the previous text remains intact.
3. Users can edit any part of the transcript document without the app unexpectedly replacing those edits.
4. The Copy action copies the current edited document contents, not only the latest transcription segment.
5. The Export action creates a file containing the current edited document contents.
6. Users can choose System, Light, or Dark appearance, and a fresh installation defaults to System.
7. Starting a new recording does not silently discard existing document text.
