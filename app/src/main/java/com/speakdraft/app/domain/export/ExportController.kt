package com.speakdraft.app.domain.export

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri

/**
 * Export boundary: clipboard copy and file export of the current document.
 * Both operations act on the full edited document (never a stale segment).
 */
class ExportController(private val context: Context) {

    /** Copies the full document text to the system clipboard. */
    fun copyToClipboard(text: String, label: String = "SpeakDraft transcript") {
        val manager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        manager.setPrimaryClip(ClipData.newPlainText(label, text))
    }

    /**
     * Writes the full document text to a user-selected file URI via the
     * Storage Access Framework. Call this from the result of an
     * ACTION_CREATE_DOCUMENT picker.
     */
    fun writeToUri(uri: Uri, text: String) {
        context.contentResolver.openOutputStream(uri)?.use { out ->
            out.write(text.toByteArray(Charsets.UTF_8))
        } ?: throw IllegalStateException("Unable to open the selected file for writing")
    }
}
