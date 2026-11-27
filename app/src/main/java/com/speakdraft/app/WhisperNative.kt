package com.speakdraft.app

/**
 * JNI bridge to libwhisper_jni.so (see app/src/main/cpp/whisper_jni.cpp).
 *
 * This is the single, narrow application-facing interface to the native
 * whisper.cpp engine. UI and document-editing code must never call into it
 * directly except through [com.speakdraft.app.domain.speech.WhisperEngine].
 *
 * The native library is loaded defensively: if `System.loadLibrary` fails
 * (missing .so for the device ABI, 16 KB page-size misalignment, etc.), the
 * object still initializes with [isLoaded] = false instead of throwing from
 * `init` (which would leave the class in an erroneous state and crash the
 * app on launch). Callers must check [isLoaded] before invoking native
 * methods; [com.speakdraft.app.domain.speech.WhisperEngine] does.
 */
object WhisperNative {

    val isLoaded: Boolean = try {
        System.loadLibrary("whisper_jni")
        true
    } catch (e: UnsatisfiedLinkError) {
        false
    }

    /** Loads the model at [modelPath]; returns an opaque native context pointer (0 on failure). */
    external fun createContext(modelPath: String): Long

    /** Releases the native context created by [createContext]. */
    external fun freeContext(context: Long)

    /** Transcribes 16 kHz mono float PCM [samples]; returns the recognized text. */
    external fun transcribe(context: Long, samples: FloatArray): String
}
