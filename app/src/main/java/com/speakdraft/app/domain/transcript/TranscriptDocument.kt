package com.speakdraft.app.domain.transcript

/**
 * Authoritative, editable transcript document.
 *
 * Invariants (architecture.md #3, #4): a completed transcription segment is
 * appended AFTER existing text with a single line break; existing user-authored
 * content is never replaced, rewritten, or normalized. Copy/Export read [text].
 *
 * This class is deliberately free of any Android dependency so its append
 * behavior can be unit-tested on the JVM (see TranscriptDocumentTest).
 */
class TranscriptDocument(initial: String = "") {
    private val _text = StringBuilder(initial)

    /** The full current document, including all user edits and appended segments. */
    val text: String get() = _text.toString()

    /**
     * Appends [segment] after the current document, separated by exactly one
     * newline. Blank segments are ignored so empty/quiet recordings add nothing.
     * Existing text is preserved unchanged.
     */
    fun appendSegment(segment: String) {
        val trimmed = segment.trim()
        if (trimmed.isEmpty()) return
        if (_text.isNotEmpty() && !_text.endsWith('\n')) {
            _text.append('\n')
        }
        _text.append(trimmed)
    }

    /** Replaces the entire document (driven by the editable UI / explicit user action). */
    fun setText(value: String) {
        _text.clear()
        _text.append(value)
    }

    /**
     * Clears the document. Only ever call after an explicit user confirmation;
     * it must never run automatically (reset semantics are non-destructive).
     */
    fun clear() {
        _text.clear()
    }
}
