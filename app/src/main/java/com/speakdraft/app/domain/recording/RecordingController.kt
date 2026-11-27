package com.speakdraft.app.domain.recording

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlin.math.abs

/**
 * Recording boundary: owns microphone capture lifecycle and produces 16 kHz mono
 * 16-bit PCM. Because we capture directly in the sample rate/channels/encoding
 * that whisper.cpp expects, the audio-preparation step is a no-op (no resampling).
 *
 * Microphone permission is assumed to be granted by the caller before [start].
 */
class RecordingController {

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null

    @Volatile private var isRecording = false
    private val accumulated = mutableListOf<ShortArray>()

    val isRecordingNow: Boolean get() = isRecording

    /**
     * Begins capturing. [onLevel] receives a normalized 0..1 loudness estimate
     * for UI feedback; it runs on the capture thread, so keep it cheap.
     */
    fun start(onLevel: ((Float) -> Unit)? = null) {
        if (isRecording) return

        val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (minBuffer <= 0) throw IllegalStateException("Microphone unavailable on this device")

        val record = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            minBuffer
        )
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            throw IllegalStateException("Could not initialize the microphone")
        }

        synchronized(accumulated) { accumulated.clear() }
        audioRecord = record
        isRecording = true
        record.startRecording()

        recordingThread = Thread({
            val byteBuffer = ByteArray(minBuffer)
            val shortBuffer = ShortArray(minBuffer / 2)
            while (isRecording) {
                val read = record.read(byteBuffer, 0, byteBuffer.size)
                if (read <= 0) continue

                val count = read / 2
                var sumSquares = 0.0
                for (i in 0 until count) {
                    val sample = ((byteBuffer[2 * i].toInt() and 0xFF) or
                            (byteBuffer[2 * i + 1].toInt() shl 8)).toShort()
                    shortBuffer[i] = sample
                    sumSquares += sample.toDouble() * sample
                }

                synchronized(accumulated) { accumulated.add(shortBuffer.copyOf(count)) }

                val rms = kotlin.math.sqrt(sumSquares / count) / 32768.0
                onLevel?.invoke(rms.toFloat().coerceIn(0f, 1f))
            }
        }, "whisper-recorder").also { it.start() }
    }

    /**
     * Stops capture and returns the full recorded clip as 16 kHz mono 16-bit PCM.
     * Safe to call when not recording (returns an empty array).
     */
    fun stop(): ShortArray {
        isRecording = false
        recordingThread?.join(2000)
        recordingThread = null
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        synchronized(accumulated) {
            val total = accumulated.sumOf { it.size }
            val out = ShortArray(total)
            var offset = 0
            for (part in accumulated) {
                part.copyInto(out, offset)
                offset += part.size
            }
            accumulated.clear()
            return out
        }
    }

    companion object {
        const val SAMPLE_RATE = 16000
        val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }
}
