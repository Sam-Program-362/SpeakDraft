package com.speakdraft.app.domain.transcript

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Verifies the non-destructive append behavior of [TranscriptDocument].
 * These run on the JVM (the class has no Android dependencies), so they execute
 * without a device.
 */
class TranscriptDocumentTest {

    @Test
    fun appendToEmptyDocumentAddsTextWithoutLeadingNewline() {
        val doc = TranscriptDocument()
        doc.appendSegment("Hello world")
        assertEquals("Hello world", doc.text)
    }

    @Test
    fun appendSeparatesSegmentsWithSingleNewline() {
        val doc = TranscriptDocument("First segment")
        doc.appendSegment("Second segment")
        assertEquals("First segment\nSecond segment", doc.text)
    }

    @Test
    fun appendNeverOverwritesExistingText() {
        val doc = TranscriptDocument("Existing user text")
        doc.appendSegment("Appended transcription")
        assertEquals("Existing user text\nAppended transcription", doc.text)
    }

    @Test
    fun appendIgnoresBlankSegments() {
        val doc = TranscriptDocument("Existing")
        doc.appendSegment("   ")
        doc.appendSegment("")
        doc.appendSegment("\n\n")
        assertEquals("Existing", doc.text)
    }

    @Test
    fun appendPreservesUserEditsMadeBetweenSegments() {
        val doc = TranscriptDocument()
        doc.appendSegment("Alpha")
        doc.setText("Alpha and my edit")
        doc.appendSegment("Beta")
        assertEquals("Alpha and my edit\nBeta", doc.text)
    }

    @Test
    fun setTextReplacesWholeDocument() {
        val doc = TranscriptDocument("old")
        doc.setText("new content")
        assertEquals("new content", doc.text)
    }

    @Test
    fun clearEmptiesDocument() {
        val doc = TranscriptDocument("something")
        doc.clear()
        assertEquals("", doc.text)
    }
}
