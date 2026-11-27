package com.speakdraft.app.domain.settings

import android.content.Context
import android.content.SharedPreferences
import com.speakdraft.app.ui.theme.ThemeMode

/**
 * Preferences boundary: persists the chosen appearance mode.
 * Defaults to SYSTEM on a fresh install, per the product spec.
 */
class ThemePreference(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getThemeMode(): ThemeMode {
        val name = prefs.getString(KEY_THEME, ThemeMode.SYSTEM.name) ?: ThemeMode.SYSTEM.name
        return runCatching { ThemeMode.valueOf(name) }.getOrDefault(ThemeMode.SYSTEM)
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME, mode.name).apply()
    }

    companion object {
        const val PREFS_NAME = "speakdraft_prefs"
        const val KEY_THEME = "theme_mode"
    }
}
