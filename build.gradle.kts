// Root build file. Plugin versions are declared here and applied in :app.
plugins {
    id("com.android.application") version "8.5.2" apply false
    // 1.9.24 pairs with kotlinCompilerExtensionVersion 1.6.11
    // (see app/build.gradle.kts).
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
