package com.speakdraft.app.transcript

/**
 * Transcript-document boundary (Architecture Invariants 3, 4, 5, 6, 7).
 *
 * - User edits to the transcript are authoritative.
 * - Completed transcription segments are appended at the end with a line break (\n).
 * - Never overwrites or normalizes earlier user-authored content.
 * - Prevents duplicate segment appends unless explicitly retried.
 */
data class TranscriptState(
    val text: String = "",
    val appendedSegmentIds: Set<String> = emptySet()
)

object TranscriptDocument {

    fun applyUserEdit(current: TranscriptState, updatedText: String): TranscriptState {
        return current.copy(text = updatedText)
    }

    fun appendSegment(
        current: TranscriptState,
        segmentId: String,
        rawSegmentText: String,
        allowRetryDuplicate: Boolean = false
    ): TranscriptState {
        val cleanedSegment = rawSegmentText.trim()
        if (cleanedSegment.isEmpty()) {
            return current
        }
        if (!allowRetryDuplicate && current.appendedSegmentIds.contains(segmentId)) {
            return current
        }

        val updatedText = if (current.text.isEmpty()) {
            cleanedSegment
        } else if (current.text.endsWith("\n")) {
            "${current.text}$cleanedSegment"
        } else {
            "${current.text}\n$cleanedSegment"
        }

        return current.copy(
            text = updatedText,
            appendedSegmentIds = current.appendedSegmentIds + segmentId
        )
    }
}
