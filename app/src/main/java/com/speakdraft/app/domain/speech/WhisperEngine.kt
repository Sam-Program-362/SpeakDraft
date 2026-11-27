package com.speakdraft.app.domain.speech

import android.content.Context
import com.speakdraft.app.WhisperNative
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * Speech-engine boundary: owns whisper.cpp model loading and native inference.
 *
 * All native calls live behind this interface. The model is bundled in
 * app/src/main/assets and extracted to app-private storage on first use, so no
 * network access is required at runtime (transcription stays on-device).
 */
class WhisperEngine(private val context: Context) {

    private var contextPtr: Long = 0L

    val isLoaded: Boolean get() = contextPtr != 0L

    /** Extracts the bundled model (once) and loads it into whisper.cpp. */
    suspend fun loadModel() {
        withContext(Dispatchers.IO) {
            if (contextPtr != 0L) return@withContext
            val model = extractModel()
            contextPtr = WhisperNative.createContext(model.absolutePath)
            if (contextPtr == 0L) {
                throw IllegalStateException("Failed to load Whisper model: ${model.absolutePath}")
            }
        }
    }

    private fun extractModel(): File {
        val out = File(context.filesDir, MODEL_NAME)
        if (out.exists() && out.length() > 0) return out
        context.assets.open(MODEL_NAME).use { input ->
            FileOutputStream(out).use { output -> input.copyTo(output) }
        }
        return out
    }

    /**
     * Transcribes 16 kHz mono 16-bit PCM [pcm16] and returns recognized text.
     * Runs on a computation dispatcher; never call from the UI thread.
     */
    suspend fun transcribe(pcm16: ShortArray): String = withContext(Dispatchers.Default) {
        check(contextPtr != 0L) { "Model not loaded. Call loadModel() first." }
        if (pcm16.isEmpty()) return@withContext ""
        // whisper.cpp expects float samples normalized to [-1, 1].
        val samples = FloatArray(pcm16.size) { pcm16[it] / 32768.0f }
        WhisperNative.transcribe(contextPtr, samples)
    }

    /** Releases native resources. Call on ViewModel clear / process death. */
    fun release() {
        if (contextPtr != 0L) {
            WhisperNative.freeContext(contextPtr)
            contextPtr = 0L
        }
    }

    companion object {
        const val MODEL_NAME = "ggml-base.en.bin"
    }
}
