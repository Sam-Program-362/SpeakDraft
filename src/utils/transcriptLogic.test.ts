import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialTranscriptState,
  applyUserTranscriptEdit,
  appendTranscriptionSegment,
  archiveAndResetDocument,
  prepareAudioForWhisper16kMono,
  computeTranscriptMetrics,
} from './transcriptLogic';

test('appends completed transcription segments with a newline and preserves authoritative user edits', () => {
  let state = createInitialTranscriptState('');

  const firstResult = appendTranscriptionSegment(state, {
    segmentId: 'seg-001',
    timestampIso: '2026-11-26T10:00:00Z',
    durationSeconds: 4.2,
    sampleCount16k: 67200,
    inferenceMs: 380,
    transcribedText: 'First recorded paragraph from SpeakDraft.',
    sourceLabel: 'Recording 1',
  });

  assert.equal(firstResult.appended, true);
  assert.equal(firstResult.state.text, 'First recorded paragraph from SpeakDraft.');

  // User edits existing text directly
  state = applyUserTranscriptEdit(
    firstResult.state,
    'First recorded paragraph [edited by user].'
  );

  // Second completed segment appends on a new line without replacing user edits
  const secondResult = appendTranscriptionSegment(state, {
    segmentId: 'seg-002',
    timestampIso: '2026-11-26T10:01:00Z',
    durationSeconds: 3.5,
    sampleCount16k: 56000,
    inferenceMs: 310,
    transcribedText: 'Second recorded segment appended below existing text.',
    sourceLabel: 'Recording 2',
  });

  assert.equal(secondResult.appended, true);
  assert.equal(
    secondResult.state.text,
    'First recorded paragraph [edited by user].\nSecond recorded segment appended below existing text.'
  );
});

test('ignores empty transcription results and blocks duplicate segment appends unless retried explicitly', () => {
  const initial = createInitialTranscriptState('Existing user note.');

  const emptyAttempt = appendTranscriptionSegment(initial, {
    segmentId: 'seg-empty',
    timestampIso: '2026-11-26T10:02:00Z',
    durationSeconds: 1.0,
    sampleCount16k: 16000,
    inferenceMs: 120,
    transcribedText: '   \n  ',
    sourceLabel: 'Silent audio',
  });

  assert.equal(emptyAttempt.appended, false);
  assert.equal(emptyAttempt.reason, 'EMPTY_RESULT');
  assert.equal(emptyAttempt.state.text, 'Existing user note.');

  const validAttempt = appendTranscriptionSegment(initial, {
    segmentId: 'seg-100',
    timestampIso: '2026-11-26T10:03:00Z',
    durationSeconds: 2.8,
    sampleCount16k: 44800,
    inferenceMs: 240,
    transcribedText: 'Appended line one.',
    sourceLabel: 'Voice capture',
  });
  assert.equal(validAttempt.appended, true);

  const duplicateAttempt = appendTranscriptionSegment(
    validAttempt.state,
    {
      segmentId: 'seg-100',
      timestampIso: '2026-11-26T10:03:05Z',
      durationSeconds: 2.8,
      sampleCount16k: 44800,
      inferenceMs: 240,
      transcribedText: 'Appended line one.',
      sourceLabel: 'Voice capture',
    },
    false
  );
  assert.equal(duplicateAttempt.appended, false);
  assert.equal(duplicateAttempt.reason, 'DUPLICATE_SEGMENT');
  assert.equal(duplicateAttempt.state.text, 'Existing user note.\nAppended line one.');

  const explicitRetry = appendTranscriptionSegment(
    validAttempt.state,
    {
      segmentId: 'seg-100',
      timestampIso: '2026-11-26T10:03:10Z',
      durationSeconds: 2.8,
      sampleCount16k: 44800,
      inferenceMs: 240,
      transcribedText: 'Appended line one.',
      sourceLabel: 'Voice capture',
    },
    true
  );
  assert.equal(explicitRetry.appended, true);
  assert.equal(
    explicitRetry.state.text,
    'Existing user note.\nAppended line one.\nAppended line one.'
  );
});

test('archiveAndResetDocument preserves a snapshot before clearing the current document', () => {
  const populated = createInitialTranscriptState(
    'Important draft notes that must not be lost.'
  );
  const afterReset = archiveAndResetDocument(
    populated,
    'draft-01',
    '11:00 AM'
  );

  assert.equal(afterReset.text, '');
  assert.equal(afterReset.archivedSnapshots.length, 1);
  assert.equal(
    afterReset.archivedSnapshots[0].text,
    'Important draft notes that must not be lost.'
  );
  assert.equal(afterReset.archivedSnapshots[0].wordCount, 8);
});

test('downmixes stereo 48kHz PCM to 16kHz mono Float32 for local speech inference', () => {
  const inputRate = 48000;
  const channels = 2;
  const frames = 48000;
  const stereoBuffer = new Float32Array(frames * channels);
  for (let i = 0; i < frames; i++) {
    const wave = Math.sin((2 * Math.PI * 440 * i) / inputRate) * 0.5;
    stereoBuffer[i * 2] = wave;
    stereoBuffer[i * 2 + 1] = wave;
  }

  const { samples16kMono, metrics } = prepareAudioForWhisper16kMono(
    stereoBuffer,
    inputRate,
    channels
  );

  assert.equal(metrics.outputSampleRate, 16000);
  assert.equal(metrics.outputChannels, 1);
  assert.equal(samples16kMono.length, 16000);
  assert.equal(metrics.durationSeconds, 1);
  assert.equal(metrics.isSilentOrEmpty, false);
  assert.ok(metrics.peakAmplitude > 0.45 && metrics.peakAmplitude <= 0.51);
});

test('computes accurate word, line, and character counts', () => {
  const empty = computeTranscriptMetrics('');
  assert.equal(empty.lineCount, 0);
  assert.equal(empty.wordCount, 0);
  assert.equal(empty.charCount, 0);

  const populated = computeTranscriptMetrics('Line 1\nLine 2 has four words');
  assert.equal(populated.lineCount, 2);
  assert.equal(populated.wordCount, 7);
});
