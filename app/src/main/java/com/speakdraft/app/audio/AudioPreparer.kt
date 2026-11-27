package com.speakdraft.app.audio

/**
 * Audio preparation boundary.
 * Converts raw captured PCM audio into the 16,000 Hz mono float32 [-1.0, 1.0] format
 * required by whisper.cpp (ggml-base.en.bin).
 */
object AudioPreparer {
    const val WHISPER_SAMPLE_RATE = 16000

    fun pcm16MonoToFloat32(pcm16Samples: ShortArray): FloatArray {
        val output = FloatArray(pcm16Samples.size)
        for (i in pcm16Samples.indices) {
            val normalized = pcm16Samples[i].toFloat() / 32768.0f
            output[i] = normalized.coerceIn(-1.0f, 1.0f)
        }
        return output
    }
}
