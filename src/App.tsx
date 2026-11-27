/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  ThemeMode,
  TranscriptDocumentState,
  createInitialTranscriptState,
} from './utils/transcriptLogic';
import { TranscriptionWorkspace } from './components/TranscriptionWorkspace';

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [transcriptState, setTranscriptState] = useState<TranscriptDocumentState>(() =>
    createInitialTranscriptState('')
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isEffectiveDark =
    themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark);

  useEffect(() => {
    const rootEl = document.documentElement;
    if (isEffectiveDark) {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }
  }, [isEffectiveDark]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Clean Single-Row Application Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-display">
            SpeakDraft
          </span>

          {/* Appearance Mode Switcher: System (Default), Light, Dark */}
          <div
            role="group"
            aria-label="Theme mode"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0"
          >
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              aria-pressed={themeMode === 'system'}
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                themeMode === 'system'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>System</span>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('light')}
              aria-pressed={themeMode === 'light'}
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                themeMode === 'light'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              aria-pressed={themeMode === 'dark'}
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                themeMode === 'dark'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Transcription Workspace */}
      <main className="flex-1 flex flex-col">
        <TranscriptionWorkspace
          transcriptState={transcriptState}
          onUpdateTranscriptState={setTranscriptState}
        />
      </main>
    </div>
  );
}
