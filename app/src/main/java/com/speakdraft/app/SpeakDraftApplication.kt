package com.speakdraft.app

import android.app.Application

/**
 * Application class. Kept minimal; no global singletons are created here so that
 * each boundary (recording, speech, transcript, export) is instantiated by the
 * ViewModel with explicit dependencies.
 */
class SpeakDraftApplication : Application()
