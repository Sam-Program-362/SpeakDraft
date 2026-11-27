# Keep the JNI bridge so native methods are not stripped/renamed.
-keepclassmembers class com.speakdraft.app.WhisperNative {
    native <methods>;
}

# Keep Compose / Kotlin metadata that R8 may otherwise prune.
-keepattributes *Annotation*
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlinx.coroutines.**
