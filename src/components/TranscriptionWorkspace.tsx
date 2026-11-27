import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Copy,
  Download,
  FilePlus2,
  Check,
  AlertCircle,
  X,
  History,
  Loader2,
} from 'lucide-react';
import {
  TranscriptDocumentState,
  RecordingLifecycleState,
  applyUserTranscriptEdit,
  appendTranscriptionSegment,
  archiveAndResetDocument,
  computeTranscriptMetrics,
} from '../utils/transcriptLogic';
import { BrowserSpeechRecorder } from '../utils/speechCapture';

interface TranscriptionWorkspaceProps {
  transcriptState: TranscriptDocumentState;
  onUpdateTranscriptState: (next: TranscriptDocumentState) => void;
}

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const TranscriptionWorkspace: React.FC<TranscriptionWorkspaceProps> = ({
  transcriptState,
  onUpdateTranscriptState,
}) => {
  const [lifecycleState, setLifecycleState] = useState<RecordingLifecycleState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to record in English');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [showNewDialog, setShowNewDialog] = useState<boolean>(false);
  const [showDraftsDialog, setShowDraftsDialog] = useState<boolean>(false);

  const recorderRef = useRef<BrowserSpeechRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const segmentCounterRef = useRef<number>(1);
  const transcriptStateRef = useRef<TranscriptDocumentState>(transcriptState);
  transcriptStateRef.current = transcriptState;

  useEffect(() => {
    recorderRef.current = new BrowserSpeechRecorder();
    return () => {
      recorderRef.current?.cancel();
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lifecycleState === 'recording') {
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [lifecycleState]);

  const metrics = computeTranscriptMetrics(transcriptState.text);

  const handleStartRecording = async () => {
    if (lifecycleState === 'recording' || lifecycleState === 'processing') return;
    setErrorBanner(null);
    setRecordingSeconds(0);
    setAudioLevel(0);

    const recorder = recorderRef.current;
    if (!recorder) return;

    const started = await recorder.start({
      onAudioLevel: (level) => setAudioLevel(level),
      onError: (err) => {
        setLifecycleState('idle');
        setAudioLevel(0);
        setErrorBanner(err.message);
        setStatusMessage('Ready to record in English');
      },
    });

    if (started) {
      setLifecycleState('recording');
      setStatusMessage('Listening — tap Stop when finished');
    }
  };

  const handleStopAndTranscribe = async () => {
    if (lifecycleState !== 'recording') return;
    const recorder = recorderRef.current;
    if (!recorder) return;

    setLifecycleState('processing');
    setAudioLevel(0);
    setStatusMessage('Transcribing speech...');

    const startedMs = performance.now();
    const { text, durationSeconds } = await recorder.stop();
    const inferenceMs = Math.max(120, Math.round(performance.now() - startedMs));

    const segId = `seg-${String(segmentCounterRef.current++).padStart(3, '0')}`;
    const result = appendTranscriptionSegment(transcriptStateRef.current, {
      segmentId: segId,
      timestampIso: new Date().toISOString(),
      durationSeconds,
      sampleCount16k: Math.round(durationSeconds * 16000),
      inferenceMs,
      transcribedText: text,
      sourceLabel: 'Voice recording',
    });

    setLifecycleState('idle');

    if (!result.appended) {
      setStatusMessage('No speech detected in that recording');
      return;
    }

    onUpdateTranscriptState(result.state);
    setStatusMessage('Transcription appended to document');
  };

  const handleCancelRecording = () => {
    recorderRef.current?.cancel();
    setLifecycleState('idle');
    setAudioLevel(0);
    setRecordingSeconds(0);
    setStatusMessage('Recording canceled — document unchanged');
  };

  const handleCopyFullDocument = async () => {
    if (transcriptState.text.length === 0) {
      setStatusMessage('Document is empty');
      return;
    }

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(transcriptState.text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const helper = document.createElement('textarea');
        helper.value = transcriptState.text;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        copied = document.execCommand('copy');
        document.body.removeChild(helper);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setErrorBanner(null);
      setCopiedFeedback(true);
      setStatusMessage(
        `Copied ${metrics.wordCount} ${metrics.wordCount === 1 ? 'word' : 'words'} to clipboard`
      );
      window.setTimeout(() => setCopiedFeedback(false), 2000);
    } else {
      setErrorBanner(
        'Could not copy automatically. Select the text inside the document to copy manually.'
      );
    }
  };

  const handleExportTxt = () => {
    if (transcriptState.text.length === 0) {
      setStatusMessage('Document is empty');
      return;
    }

    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `speakdraft-${dateStr}.txt`;
      const blob = new Blob([transcriptState.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(`Exported ${filename}`);
    } catch {
      setErrorBanner('Export failed. Your transcript is still intact in the editor.');
    }
  };

  const handleRequestNewDocument = () => {
    if (lifecycleState === 'recording' || lifecycleState === 'processing') return;
    if (transcriptState.text.trim().length === 0) {
      setStatusMessage('Ready for a new recording');
      return;
    }
    setShowNewDialog(true);
  };

  const handleSaveCopyAndClear = () => {
    const draftId = `draft-${Date.now().toString().slice(-4)}`;
    const savedAt = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    const next = archiveAndResetDocument(transcriptState, draftId, savedAt);
    onUpdateTranscriptState(next);
    setShowNewDialog(false);
    setStatusMessage('Previous draft saved — started a clean document');
  };

  const handleExportAndClear = () => {
    handleExportTxt();
    const draftId = `draft-${Date.now().toString().slice(-4)}`;
    const savedAt = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    const next = archiveAndResetDocument(transcriptState, draftId, savedAt);
    onUpdateTranscriptState(next);
    setShowNewDialog(false);
    setStatusMessage('Exported and saved copy — started a clean document');
  };

  const handleRestoreDraft = (draftText: string) => {
    onUpdateTranscriptState(applyUserTranscriptEdit(transcriptState, draftText));
    setShowDraftsDialog(false);
    setStatusMessage('Draft restored to editor');
  };

  const meterBars = [0.45, 0.75, 1.0, 0.85, 0.6];

  return (
    <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-6 gap-4">
      {/* Dismissible Plain-Language Error Notice */}
      {errorBanner && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-950 dark:text-amber-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss notice"
            className="p-1 rounded-md text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document Toolbar: Quiet Metrics + Whole-Document Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            {metrics.wordCount} {metrics.wordCount === 1 ? 'word' : 'words'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {metrics.lineCount} {metrics.lineCount === 1 ? 'line' : 'lines'}
          </span>
          {transcriptState.archivedSnapshots.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setShowDraftsDialog(true)}
                className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                <History className="w-3.5 h-3.5" />
                <span>Saved Drafts ({transcriptState.archivedSnapshots.length})</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyFullDocument}
            disabled={transcriptState.text.length === 0}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {copiedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportTxt}
            disabled={transcriptState.text.length === 0}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleRequestNewDocument}
            disabled={
              lifecycleState === 'recording' ||
              lifecycleState === 'processing' ||
              transcriptState.text.trim().length === 0
            }
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Central Focal Anchor: Page-Like Editable Transcript Sheet */}
      <section
        aria-label="Transcript document"
        className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
      >
        <label htmlFor="speakdraft-editor" className="sr-only">
          Transcript document
        </label>
        <textarea
          id="speakdraft-editor"
          aria-label="Transcript document"
          value={transcriptState.text}
          onChange={(e) =>
            onUpdateTranscriptState(applyUserTranscriptEdit(transcriptState, e.target.value))
          }
          placeholder="Tap Record below and speak in English, or start typing here. Each new recording appends on a new line without replacing your edits."
          className="flex-1 w-full min-h-[440px] sm:min-h-[520px] p-6 sm:p-8 bg-transparent text-base sm:text-[17px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none"
        />
      </section>

      {/* Bottom Recording Dock */}
      <section
        aria-label="Recording controls"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          {lifecycleState === 'recording' ? (
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex items-end gap-1 h-5"
              >
                {meterBars.map((weight, idx) => {
                  const barHeight = Math.max(
                    4,
                    Math.round((0.25 + audioLevel * 0.75) * weight * 20)
                  );
                  return (
                    <span
                      key={idx}
                      className="w-1 rounded-full bg-red-600 dark:bg-red-500 transition-transform duration-100"
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-sm font-mono font-semibold text-red-700 dark:text-red-400 tabular-nums">
                {formatTimer(recordingSeconds)}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                Recording English audio...
              </span>
            </div>
          ) : lifecycleState === 'processing' ? (
            <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {statusMessage}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          {lifecycleState === 'recording' ? (
            <>
              <button
                type="button"
                onClick={handleCancelRecording}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStopAndTranscribe}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <Square className="w-4 h-4 fill-current shrink-0" />
                <span>Stop</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={lifecycleState === 'processing'}
              className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Mic className="w-4 h-4 shrink-0" />
              <span>{transcriptState.text.trim().length > 0 ? 'Record More' : 'Record'}</span>
            </button>
          )}
        </div>
      </section>

      {/* Non-Destructive New Document Confirmation Dialog */}
      {showNewDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-doc-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2
              id="new-doc-dialog-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Start a new document?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your current transcript has {metrics.wordCount}{' '}
              {metrics.wordCount === 1 ? 'word' : 'words'}. A copy will be saved in Saved Drafts
              before clearing the page so nothing is lost.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExportAndClear}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Export .txt &amp; Start New
              </button>
              <button
                type="button"
                onClick={handleSaveCopyAndClear}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-medium transition-colors"
              >
                Save Copy &amp; Start New
              </button>
              <button
                type="button"
                onClick={() => setShowNewDialog(false)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Drafts Dialog */}
      {showDraftsDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-drafts-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2
                id="saved-drafts-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Saved Drafts
              </h2>
              <button
                type="button"
                onClick={() => setShowDraftsDialog(false)}
                aria-label="Close Saved Drafts"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {transcriptState.archivedSnapshots.map((draft) => (
                <li
                  key={draft.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      Saved at {draft.savedAtIso} · {draft.wordCount}{' '}
                      {draft.wordCount === 1 ? 'word' : 'words'}
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate mt-0.5">
                      {draft.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreDraft(draft.text)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
