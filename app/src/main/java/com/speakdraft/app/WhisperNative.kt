package com.speakdraft.app

/**
 * JNI bridge to libwhisper_jni.so (see app/src/main/cpp/whisper_jni.cpp).
 *
 * This is the single, narrow application-facing interface to the native
 * whisper.cpp engine. UI and document-editing code must never call into it
 * directly except through [com.speakdraft.app.domain.speech.WhisperEngine].
 */
object WhisperNative {
    init {
        System.loadLibrary("whisper_jni")
    }

    /** Loads the model at [modelPath]; returns an opaque native context pointer (0 on failure). */
    external fun createContext(modelPath: String): Long

    /** Releases the native context created by [createContext]. */
    external fun freeContext(context: Long)

    /** Transcribes 16 kHz mono float PCM [samples]; returns the recognized text. */
    external fun transcribe(context: Long, samples: FloatArray): String
}
