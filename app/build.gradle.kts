import java.io.File

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.speakdraft.app"
    compileSdk = 34
    // Pinned so CI and local builds use the same NDK that provides libc++_shared.
    ndkVersion = "25.2.9519653"

    defaultConfig {
        applicationId = "com.speakdraft.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Only the ABIs we ship. arm64-v8a is the primary target device (8 GB phone).
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64")
        }

        externalNativeBuild {
            cmake {
                arguments += "-DANDROID_STL=c++_shared"
            }
        }
    }

    // Signing reads from the environment. CI provides these via the
    // KEYSTORE_* secrets; local developers can set them in ~/.gradle/gradle.properties.
    // If KEYSTORE_FILE is absent, release builds are NOT signed (debug-only use).
    // When KEYSTORE_FILE is present, all four values are required; a missing
    // one fails the build with a clear message instead of a cryptic signing error.
    signingConfigs {
        create("release") {
            val keystoreFile = System.getenv("KEYSTORE_FILE")
            if (!keystoreFile.isNullOrBlank()) {
                val keystorePassword = System.getenv("KEYSTORE_PASSWORD")
                val keyAlias = System.getenv("KEY_ALIAS")
                val keyPassword = System.getenv("KEY_PASSWORD")
                check(!keystorePassword.isNullOrBlank()) {
                    "KEYSTORE_PASSWORD is required when KEYSTORE_FILE is set"
                }
                check(!keyAlias.isNullOrBlank()) {
                    "KEY_ALIAS is required when KEYSTORE_FILE is set"
                }
                check(!keyPassword.isNullOrBlank()) {
                    "KEY_PASSWORD is required when KEYSTORE_FILE is set"
                }
                storeFile = File(keystoreFile)
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Only attach the signing config when a keystore is actually available.
            if (!System.getenv("KEYSTORE_FILE").isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        // 1.5.14 is the documented pairing for Kotlin 1.9.24.
        // NOTE: this is the Compose COMPILER version, not the runtime
        // version — the 1.6.x compiler line never existed (the compiler
        // moved into Kotlin 2.0). The runtime version comes from the BOM
        // below and is independent.
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    androidResources {
        // The 141 MB ggml-base.en.bin model must be stored uncompressed in
        // the APK (it is memory-mapped by whisper.cpp). Without this,
        // aapt2 compresses it and the app pays a huge inflate cost on
        // first launch (and extraction can fail on low-storage devices).
        noCompress += "bin"
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    packaging {
        jniLibs {
            useLegacyPackaging = false
        }
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/DEPENDENCIES"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.3")
    implementation("androidx.activity:activity-compose:1.9.0")

    // Compose runtime 1.6.8 line (BOM 2024.06.00). lifecycle-*-compose 2.8.x
    // was compiled against Compose 1.6+/1.7-alpha and crashes with
    // NoSuchMethodError at first composition when the runtime is older
    // (lifecycle 2.8.1+ restored compatibility with the 1.6.x line), so the
    // runtime must be >= 1.6.x. The Compose compiler stays at 1.5.14
    // (Kotlin 1.9.24 pairing) — older-compiler code runs fine on a newer
    // runtime.
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("androidx.documentfile:documentfile:1.0.1")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
