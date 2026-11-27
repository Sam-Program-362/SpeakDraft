package com.speakdraft.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// No branded palette is defined yet, so the default Material 3 schemes are used.
// Semantic color roles (MaterialTheme.colorScheme.*) are used throughout the UI.
private val DarkColorScheme = darkColorScheme()
private val LightColorScheme = lightColorScheme()

@Composable
fun SpeakDraftTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    content: @Composable () -> Unit
) {
    val useDark = when (themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    MaterialTheme(
        colorScheme = if (useDark) DarkColorScheme else LightColorScheme,
        typography = Typography,
        content = content
    )
}
