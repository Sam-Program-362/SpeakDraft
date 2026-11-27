package com.speakdraft.app.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.speakdraft.app.domain.export.ExportController
import com.speakdraft.app.domain.recording.RecordingController
import com.speakdraft.app.domain.settings.ThemePreference
import com.speakdraft.app.domain.speech.WhisperEngine
import com.speakdraft.app.domain.transcript.TranscriptDocument
import com.speakdraft.app.ui.theme.ThemeMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Orchestrates the recording -> transcription -> append flow and exposes a single
 * observable UI state. Keeps the document authoritative: transcriptions append,
 * they never replace existing user text.
 */
data class TranscribeUiState(
    val transcript: String = "",
    val isRecording: Boolean = false,
    val isProcessing: Boolean = false,
    val modelReady: Boolean = false,
    val status: String = "Idle",
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val error: String? = null
)

class TranscribeViewModel(application: Application) : AndroidViewModel(application) {

    private val document = TranscriptDocument()
    private val recorder = RecordingController()
    private val engine = WhisperEngine(application)
    private val exporter = ExportController(application)
    private val themePref = ThemePreference(application)

    private val _uiState = MutableStateFlow(
        TranscribeUiState(themeMode = themePref.getThemeMode())
    )
    val uiState = _uiState.asStateFlow()

    init {
        prepareModel()
    }

    private fun prepareModel() {
        viewModelScope.launch {
            _uiState.update { it.copy(status = "Loading model…") }
            runCatching { engine.loadModel() }
                .onSuccess {
                    _uiState.update { it.copy(modelReady = true, status = "Ready") }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(status = "Model error", error = e.message) }
                }
        }
    }

    /** Starts or stops a recording depending on current state. */
    fun toggleRecording() {
        val state = _uiState.value
        // Never start a second record/transcribe cycle while one is running:
        // overlapping inference would race the native whisper context.
        if (state.isProcessing) return
        if (state.isRecording) stopAndTranscribe() else startRecording()
    }

    private fun startRecording() {
        if (!_uiState.value.modelReady) {
            _uiState.update { it.copy(error = "Model is still loading. Please wait.") }
            return
        }
        runCatching { recorder.start() }
            .onSuccess {
                _uiState.update { it.copy(isRecording = true, status = "Recording…", error = null) }
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "Microphone error: ${e.message}") }
            }
    }

    private fun stopAndTranscribe() {
        val audio = recorder.stop()
        _uiState.update { it.copy(isRecording = false, isProcessing = true, status = "Transcribing…") }

        viewModelScope.launch {
            runCatching {
                if (audio.isEmpty()) throw IllegalStateException("Recording was empty")
                engine.transcribe(audio)
            }.onSuccess { text ->
                document.appendSegment(text)
                _uiState.update {
                    it.copy(isProcessing = false, status = "Ready", transcript = document.text)
                }
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isProcessing = false, status = "Ready", error = "Transcription failed: ${e.message}")
                }
            }
        }
    }

    /** Reflects user edits from the text field into the authoritative document. */
    fun onTranscriptChanged(value: String) {
        document.setText(value)
        _uiState.update { it.copy(transcript = value) }
    }

    fun copyDocument() {
        runCatching { exporter.copyToClipboard(document.text) }
            .onSuccess { _uiState.update { it.copy(status = "Copied to clipboard") } }
            .onFailure { e -> _uiState.update { it.copy(error = "Copy failed: ${e.message}") } }
    }

    fun exportToUri(uri: Uri) {
        runCatching { exporter.writeToUri(uri, document.text) }
            .onSuccess { _uiState.update { it.copy(status = "Exported") } }
            .onFailure { e -> _uiState.update { it.copy(error = "Export failed: ${e.message}") } }
    }

    fun setTheme(mode: ThemeMode) {
        themePref.setThemeMode(mode)
        _uiState.update { it.copy(themeMode = mode) }
    }

    /**
     * Reset / New document. Clears the document, but only after the UI has
     * obtained explicit user confirmation (non-destructive by design).
     */
    fun newDocument() {
        document.clear()
        _uiState.update { it.copy(transcript = "", status = "New document") }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    override fun onCleared() {
        super.onCleared()
        recorder.stop()
        engine.release()
    }
}
