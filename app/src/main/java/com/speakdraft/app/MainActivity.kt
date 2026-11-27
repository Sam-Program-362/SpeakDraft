package com.speakdraft.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.speakdraft.app.ui.screen.TranscribeScreen
import com.speakdraft.app.ui.theme.SpeakDraftTheme
import com.speakdraft.app.ui.viewmodel.TranscribeViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val viewModel: TranscribeViewModel = viewModel()
            val state by viewModel.uiState.collectAsStateWithLifecycle()
            SpeakDraftTheme(themeMode = state.themeMode) {
                TranscribeScreen(viewModel = viewModel)
            }
        }
    }
}
