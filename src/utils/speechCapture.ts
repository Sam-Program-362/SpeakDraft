/**
 * Recording & Speech Recognition boundary for the browser preview.
 * Isolates microphone stream acquisition, live audio-level metering,
 * English speech recognition (stop-then-transcribe), and deterministic resource cleanup.
 */

export type CaptureErrorCode =
  | 'PERMISSION_DENIED'
  | 'NO_MICROPHONE'
  | 'UNSUPPORTED_SPEECH_API'
  | 'CAPTURE_FAILED';

export interface CaptureError {
  code: CaptureErrorCode;
  message: string;
}

export interface SpeechSessionCallbacks {
  onAudioLevel: (level: number) => void;
  onError: (error: CaptureError) => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export class BrowserSpeechRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelRafId: number | null = null;
  private recognition: SpeechRecognitionLike | null = null;
  private collectedChunks: string[] = [];
  private isRecording = false;
  private isStopping = false;
  private stopResolver: ((text: string) => void) | null = null;
  private startedAtMs = 0;

  public async start(callbacks: SpeechSessionCallbacks): Promise<boolean> {
    this.cleanupResources();
    this.collectedChunks = [];
    this.isStopping = false;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      callbacks.onError({
        code: 'NO_MICROPHONE',
        message:
          'Microphone capture is not available in this browser environment. You can still type, edit, copy, and export your document directly.',
      });
      return false;
    }

    const SpeechCtor = getSpeechRecognitionCtor();
    if (!SpeechCtor) {
      callbacks.onError({
        code: 'UNSUPPORTED_SPEECH_API',
        message:
          'On-device browser speech recognition is not supported in this browser. Try Chrome, Edge, or Safari, or edit your document directly.',
      });
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        callbacks.onError({
          code: 'PERMISSION_DENIED',
          message:
            'Microphone access was denied. Allow microphone permission in your browser settings to record speech.',
        });
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        callbacks.onError({
          code: 'NO_MICROPHONE',
          message:
            'No microphone was found on this device. Connect a microphone and try again.',
        });
      } else {
        callbacks.onError({
          code: 'CAPTURE_FAILED',
          message:
            'Unable to access the microphone right now. Please check your audio device and try again.',
        });
      }
      this.cleanupResources();
      return false;
    }

    // Start live audio level metering
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx && this.mediaStream) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const tick = () => {
          if (!this.analyser || !this.isRecording) return;
          this.analyser.getByteTimeDomainData(dataArray);
          let sumSq = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const norm = (dataArray[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / dataArray.length);
          const scaledLevel = Math.min(1, rms * 3.8);
          callbacks.onAudioLevel(scaledLevel);
          this.levelRafId = window.requestAnimationFrame(tick);
        };
        this.isRecording = true;
        this.levelRafId = window.requestAnimationFrame(tick);
      } else {
        this.isRecording = true;
      }
    } catch {
      this.isRecording = true;
    }

    // Configure English stop-then-transcribe recognition session
    const recognition = new SpeechCtor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.isFinal && result[0]?.transcript) {
          const piece = result[0].transcript.trim();
          if (piece.length > 0) {
            this.collectedChunks.push(piece);
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        callbacks.onError({
          code: 'PERMISSION_DENIED',
          message:
            'Microphone permission was denied. Enable microphone access and try again.',
        });
      } else {
        callbacks.onError({
          code: 'CAPTURE_FAILED',
          message:
            'Recording was interrupted before speech could be transcribed. Your existing document is safe.',
        });
      }
    };

    recognition.onend = () => {
      if (this.isStopping && this.stopResolver) {
        const resolve = this.stopResolver;
        this.stopResolver = null;
        const transcript = this.collectedChunks.join(' ').trim();
        this.cleanupResources();
        resolve(transcript);
      } else if (this.isRecording && !this.isStopping) {
        // Keep continuous capture alive until the user explicitly taps Stop
        try {
          recognition.start();
        } catch {
          // Ignore restart race if user just stopped
        }
      }
    };

    this.recognition = recognition;
    this.startedAtMs = Date.now();

    try {
      recognition.start();
      return true;
    } catch {
      this.cleanupResources();
      callbacks.onError({
        code: 'CAPTURE_FAILED',
        message: 'Could not start speech capture. Please try again.',
      });
      return false;
    }
  }

  public stop(): Promise<{ text: string; durationSeconds: number }> {
    const elapsedSec = Math.max(
      0.5,
      Number(((Date.now() - this.startedAtMs) / 1000).toFixed(1))
    );

    if (!this.isRecording) {
      this.cleanupResources();
      return Promise.resolve({ text: '', durationSeconds: 0 });
    }

    this.isRecording = false;
    this.isStopping = true;

    if (this.levelRafId !== null) {
      window.cancelAnimationFrame(this.levelRafId);
      this.levelRafId = null;
    }

    return new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        if (this.stopResolver) {
          this.stopResolver = null;
          const fallbackText = this.collectedChunks.join(' ').trim();
          this.cleanupResources();
          resolve({ text: fallbackText, durationSeconds: elapsedSec });
        }
      }, 1500);

      this.stopResolver = (finalText: string) => {
        window.clearTimeout(timeoutId);
        resolve({ text: finalText, durationSeconds: elapsedSec });
      };

      try {
        this.recognition?.stop();
      } catch {
        window.clearTimeout(timeoutId);
        this.stopResolver = null;
        const fallbackText = this.collectedChunks.join(' ').trim();
        this.cleanupResources();
        resolve({ text: fallbackText, durationSeconds: elapsedSec });
      }
    });
  }

  public cancel(): void {
    this.isRecording = false;
    this.isStopping = true;
    this.stopResolver = null;
    this.collectedChunks = [];
    try {
      this.recognition?.abort();
    } catch {
      // Ignore abort error
    }
    this.cleanupResources();
  }

  private cleanupResources(): void {
    this.isRecording = false;
    if (this.levelRafId !== null) {
      window.cancelAnimationFrame(this.levelRafId);
      this.levelRafId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.recognition = null;
  }
}
