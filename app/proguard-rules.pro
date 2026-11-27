# Keep the JNI bridge so native methods are not stripped/renamed.
# IMPORTANT: this must be a full -keep (not just -keepclassmembers).
# R8 otherwise renames the WhisperNative class, and JNI can no longer find
# Java_com_speakdraft_app_WhisperNative_* methods at runtime
# (UnsatisfiedLinkError when loading the model in release builds).
-keep class com.speakdraft.app.WhisperNative { *; }

# Keep Compose / Kotlin metadata that R8 may otherwise prune.
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlinx.coroutines.**
