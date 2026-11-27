export type ThemeMode = 'system' | 'light' | 'dark';

export type RecordingLifecycleState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'error';

export type ModelHealthState =
  | 'ready'
  | 'missing'
  | 'corrupt';

export interface TranscribedSegmentRecord {
  segmentId: string;
  timestampIso: string;
  durationSeconds: number;
  sampleCount16k: number;
  inferenceMs: number;
  transcribedText: string;
  sourceLabel: string;
}

export interface TranscriptDocumentState {
  text: string;
  appendedSegmentIds: string[];
  segments: TranscribedSegmentRecord[];
  archivedSnapshots: Array<{
    id: string;
    savedAtIso: string;
    text: string;
    wordCount: number;
  }>;
}

export interface AppendResult {
  state: TranscriptDocumentState;
  appended: boolean;
  reason?: 'EMPTY_RESULT' | 'DUPLICATE_SEGMENT';
}

export interface AudioPrepMetrics {
  outputSampleRate: 16000;
  outputChannels: 1;
  inputSampleRate: number;
  inputChannels: number;
  outputSampleCount: number;
  durationSeconds: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  isSilentOrEmpty: boolean;
}

export interface TranscriptMetrics {
  lineCount: number;
  wordCount: number;
  charCount: number;
  byteSize: number;
}

export function createInitialTranscriptState(initialText = ''): TranscriptDocumentState {
  return {
    text: initialText,
    appendedSegmentIds: [],
    segments: [],
    archivedSnapshots: [],
  };
}

/**
 * Invariant 4: User edits to the transcript are authoritative.
 */
export function applyUserTranscriptEdit(
  state: TranscriptDocumentState,
  updatedText: string
): TranscriptDocumentState {
  return {
    ...state,
    text: updatedText,
  };
}

/**
 * Invariants 3 & 4:
 * - A completed transcription segment is appended after the existing document text with a line break (\n).
 * - Never replaces or rewrites prior user-edited text.
 * - Handles empty results without inserting blank lines.
 * - Prevents duplicate segment appends unless explicitly retried by the user.
 */
export function appendTranscriptionSegment(
  state: TranscriptDocumentState,
  segment: TranscribedSegmentRecord,
  allowDuplicateRetry = false
): AppendResult {
  const cleanedText = segment.transcribedText.trim();
  if (cleanedText.length === 0) {
    return {
      state,
      appended: false,
      reason: 'EMPTY_RESULT',
    };
  }

  const alreadyAppended = state.appendedSegmentIds.includes(segment.segmentId);
  if (alreadyAppended && !allowDuplicateRetry) {
    return {
      state,
      appended: false,
      reason: 'DUPLICATE_SEGMENT',
    };
  }

  let nextText: string;
  if (state.text.length === 0) {
    nextText = cleanedText;
  } else if (state.text.endsWith('\n')) {
    nextText = `${state.text}${cleanedText}`;
  } else {
    nextText = `${state.text}\n${cleanedText}`;
  }

  const nextIds = alreadyAppended
    ? state.appendedSegmentIds
    : [...state.appendedSegmentIds, segment.segmentId];

  const normalizedRecord: TranscribedSegmentRecord = {
    ...segment,
    transcribedText: cleanedText,
  };

  return {
    state: {
      ...state,
      text: nextText,
      appendedSegmentIds: nextIds,
      segments: [...state.segments, normalizedRecord],
    },
    appended: true,
  };
}

/**
 * Invariant 7: Reset/New Document must not silently destroy document content.
 * Archives current non-empty document into local snapshots before starting a clean page.
 */
export function archiveAndResetDocument(
  state: TranscriptDocumentState,
  snapshotId: string,
  timestampIso: string
): TranscriptDocumentState {
  const trimmed = state.text.trim();
  const metrics = computeTranscriptMetrics(state.text);
  const nextArchives =
    trimmed.length > 0
      ? [
          {
            id: snapshotId,
            savedAtIso: timestampIso,
            text: state.text,
            wordCount: metrics.wordCount,
          },
          ...state.archivedSnapshots,
        ]
      : state.archivedSnapshots;

  return {
    text: '',
    appendedSegmentIds: [],
    segments: [],
    archivedSnapshots: nextArchives,
  };
}

/**
 * Audio preparation boundary:
 * Converts raw captured audio samples from arbitrary sample rate & channels
 * into 16,000 Hz mono Float32 PCM samples clamped to [-1.0, 1.0] for whisper.cpp.
 */
export function prepareAudioForWhisper16kMono(
  interleavedSamples: Float32Array,
  inputSampleRate: number,
  inputChannels: number
): { samples16kMono: Float32Array; metrics: AudioPrepMetrics } {
  const safeChannels = Math.max(1, Math.floor(inputChannels));
  const safeInputRate = Math.max(8000, Math.floor(inputSampleRate));
  const totalFrames = Math.floor(interleavedSamples.length / safeChannels);

  if (totalFrames === 0) {
    return {
      samples16kMono: new Float32Array(0),
      metrics: {
        outputSampleRate: 16000,
        outputChannels: 1,
        inputSampleRate: safeInputRate,
        inputChannels: safeChannels,
        outputSampleCount: 0,
        durationSeconds: 0,
        peakAmplitude: 0,
        rmsAmplitude: 0,
        isSilentOrEmpty: true,
      },
    };
  }

  // Step 1: Downmix to mono if multi-channel
  const monoInput = new Float32Array(totalFrames);
  for (let frame = 0; frame < totalFrames; frame++) {
    let sum = 0;
    const baseIdx = frame * safeChannels;
    for (let ch = 0; ch < safeChannels; ch++) {
      sum += interleavedSamples[baseIdx + ch] ?? 0;
    }
    monoInput[frame] = sum / safeChannels;
  }

  // Step 2: Linear interpolation resample to 16,000 Hz
  const targetRate = 16000;
  const ratio = safeInputRate / targetRate;
  const outputLength = Math.max(1, Math.round(totalFrames / ratio));
  const output = new Float32Array(outputLength);

  let peak = 0;
  let sumSquares = 0;

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.min(totalFrames - 1, Math.floor(srcPos));
    const idx1 = Math.min(totalFrames - 1, idx0 + 1);
    const frac = srcPos - idx0;

    const interpolated = monoInput[idx0] * (1 - frac) + monoInput[idx1] * frac;
    const clamped = Math.max(-1.0, Math.min(1.0, interpolated));
    output[i] = clamped;

    const abs = Math.abs(clamped);
    if (abs > peak) peak = abs;
    sumSquares += clamped * clamped;
  }

  const rms = Math.sqrt(sumSquares / outputLength);
  const durationSeconds = Number((outputLength / targetRate).toFixed(2));
  const isSilentOrEmpty = outputLength < 1600 || rms < 0.002;

  return {
    samples16kMono: output,
    metrics: {
      outputSampleRate: 16000,
      outputChannels: 1,
      inputSampleRate: safeInputRate,
      inputChannels: safeChannels,
      outputSampleCount: outputLength,
      durationSeconds,
      peakAmplitude: Number(peak.toFixed(4)),
      rmsAmplitude: Number(rms.toFixed(4)),
      isSilentOrEmpty,
    },
  };
}

export function computeTranscriptMetrics(text: string): TranscriptMetrics {
  const charCount = text.length;
  const lineCount = text.length === 0 ? 0 : text.split('\n').length;
  const trimmed = text.trim();
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  const byteSize = new TextEncoder().encode(text).length;

  return {
    lineCount,
    wordCount,
    charCount,
    byteSize,
  };
}
