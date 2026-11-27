// Root build file. Plugin versions are declared here and applied in :app.
plugins {
    id("com.android.application") version "8.5.2" apply false
    // 1.9.24 is required by kotlinCompilerExtensionVersion 1.5.14
    // (see app/build.gradle.kts). 1.9.22 fails the Compose compiler check.
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
