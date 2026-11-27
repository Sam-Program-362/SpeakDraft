package com.speakdraft.app

import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Placeholder instrumented test. Real device tests (microphone capture,
 * on-device whisper.cpp transcription) belong here and run on a physical device
 * or emulator, not in the APK-build CI jobs.
 */
class ExampleInstrumentedTest {
    @Test
    fun useAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.speakdraft.app", appContext.packageName)
    }
}
