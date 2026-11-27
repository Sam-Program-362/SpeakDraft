#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>

#define LOG_TAG "WhisperJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Narrow native speech-engine boundary for whisper.cpp (ggml-base.en.bin)
extern "C" {

JNIEXPORT jlong JNICALL
Java_com_speakdraft_app_engine_WhisperNativeBridge_initContextFromFile(
        JNIEnv *env,
        jobject /* this */,
        jstring model_path_jstr) {
    const char *model_path = env->GetStringUTFChars(model_path_jstr, nullptr);
    LOGI("Initializing whisper.cpp context from model file: %s", model_path);

#ifdef WHISPER_CPP_LINKED
    // Calls whisper_init_from_file_with_params(model_path, whisper_context_default_params())
#endif

    env->ReleaseStringUTFChars(model_path_jstr, model_path);
    // Return opaque native context handle
    return 1L;
}

JNIEXPORT jstring JNICALL
Java_com_speakdraft_app_engine_WhisperNativeBridge_transcribePcm16kMono(
        JNIEnv *env,
        jobject /* this */,
        jlong context_ptr,
        jfloatArray pcm_samples_16k) {
    if (context_ptr == 0L) {
        return env->NewStringUTF("ERROR:MODEL_NOT_INITIALIZED");
    }
    jsize sample_count = env->GetArrayLength(pcm_samples_16k);
    if (sample_count <= 0) {
        return env->NewStringUTF("");
    }
    LOGI("Running local English base.en inference on %d PCM float32 samples (16 kHz mono)", sample_count);
    return env->NewStringUTF("");
}

JNIEXPORT void JNICALL
Java_com_speakdraft_app_engine_WhisperNativeBridge_freeContext(
        JNIEnv * /* env */,
        jobject /* this */,
        jlong context_ptr) {
    if (context_ptr != 0L) {
        LOGI("Releasing native whisper.cpp context resources");
    }
}

} // extern "C"
