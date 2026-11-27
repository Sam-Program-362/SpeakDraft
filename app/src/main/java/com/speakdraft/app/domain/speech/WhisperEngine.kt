package com.speakdraft.app.domain.speech

import android.content.Context
import com.speakdraft.app.WhisperNative
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * Speech-engine boundary: owns whisper.cpp model loading and native inference.
 *
 * All native calls live behind this interface. The model is bundled in
 * app/src/main/assets and extracted to app-private storage on first use, so no
 * network access is required at runtime (transcription stays on-device).
 *
 * The native whisper_context is NOT thread-safe: every load / transcribe /
 * release call is serialized through [mutex] so a transcription can never
 * race a release (use-after-free) or a second transcription.
 */
class WhisperEngine(private val context: Context) {

    private val mutex = Mutex()

    @Volatile
    private var contextPtr: Long = 0L

    val isLoaded: Boolean get() = contextPtr != 0L

    /** Extracts the bundled model (once) and loads it into whisper.cpp. */
    suspend fun loadModel() {
        withContext(Dispatchers.IO) {
            mutex.withLock {
                if (contextPtr != 0L) return@withLock
                if (!WhisperNative.isLoaded) {
                    throw IllegalStateException(
                        "Native whisper library failed to load on this device"
                    )
                }
                val model = extractModel()
                val ptr = WhisperNative.createContext(model.absolutePath)
                if (ptr == 0L) {
                    throw IllegalStateException("Failed to load Whisper model: ${model.absolutePath}")
                }
                contextPtr = ptr
            }
        }
    }

    /**
     * Extracts the bundled model to app-private storage.
     *
     * The copy is written to a `.tmp` file and atomically renamed into place,
     * so a crash or kill mid-copy can never leave a truncated model behind
     * that a later launch would mistake for a complete one.
     */
    private fun extractModel(): File {
        val out = File(context.filesDir, MODEL_NAME)
        if (out.exists() && out.length() > 0) return out
        val tmp = File(context.filesDir, "$MODEL_NAME.tmp")
        try {
            context.assets.open(MODEL_NAME).use { input ->
                FileOutputStream(tmp).use { output -> input.copyTo(output) }
            }
            if (!tmp.renameTo(out)) {
                // Fallback for filesystems where rename fails: copy then delete.
                tmp.copyTo(out, overwrite = true)
                tmp.delete()
            }
        } finally {
            if (tmp.exists()) tmp.delete()
        }
        return out
    }

    /**
     * Transcribes 16 kHz mono 16-bit PCM [pcm16] and returns recognized text.
     * Runs on a computation dispatcher; never call from the UI thread.
     */
    suspend fun transcribe(pcm16: ShortArray): String = withContext(Dispatchers.Default) {
        mutex.withLock {
            val ptr = contextPtr
            check(ptr != 0L) { "Model not loaded. Call loadModel() first." }
            if (pcm16.isEmpty()) return@withLock ""
            // whisper.cpp expects float samples normalized to [-1, 1].
            val samples = FloatArray(pcm16.size) { pcm16[it] / 32768.0f }
            WhisperNative.transcribe(ptr, samples)
        }
    }

    /** Releases native resources. Call on ViewModel clear / process death. */
    fun release() {
        // Called from onCleared (main thread); the native free is fast, but
        // take the lock so it cannot interleave with an in-flight transcribe.
        // tryLock avoids blocking the main thread if a transcription is running.
        if (mutex.tryLock()) {
            try {
                val ptr = contextPtr
                if (ptr != 0L) {
                    WhisperNative.freeContext(ptr)
                    contextPtr = 0L
                }
            } finally {
                mutex.unlock()
            }
        }
    }

    companion object {
        const val MODEL_NAME = "ggml-base.en.bin"
    }
}
