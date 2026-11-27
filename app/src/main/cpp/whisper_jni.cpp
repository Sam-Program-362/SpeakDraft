#include "whisper_jni.h"

#include "whisper.h"

#include <string>
#include <vector>

// Opaque native peer that owns the whisper_context and survives across JNI calls.
struct ContextHolder {
    struct whisper_context* ctx = nullptr;
};

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_speakdraft_app_WhisperNative_createContext(JNIEnv* env, jobject /*thiz*/, jstring model_path) {
    const char* path = env->GetStringUTFChars(model_path, nullptr);
    if (!path) {
        return 0;
    }

    struct whisper_context_params cparams = whisper_context_default_params();
    struct whisper_context* ctx = whisper_init_from_file_with_params(path, cparams);

    env->ReleaseStringUTFChars(model_path, path);

    if (!ctx) {
        return 0;
    }

    auto* holder = new (std::nothrow) ContextHolder();
    if (!holder) {
        whisper_free(ctx);
        return 0;
    }
    holder->ctx = ctx;
    return reinterpret_cast<jlong>(holder);
}

JNIEXPORT void JNICALL
Java_com_speakdraft_app_WhisperNative_freeContext(JNIEnv* /*env*/, jobject /*thiz*/, jlong ptr) {
    if (ptr == 0) {
        return;
    }
    auto* holder = reinterpret_cast<ContextHolder*>(ptr);
    if (holder->ctx) {
        whisper_free(holder->ctx);
        holder->ctx = nullptr;
    }
    delete holder;
}

JNIEXPORT jstring JNICALL
Java_com_speakdraft_app_WhisperNative_transcribe(JNIEnv* env, jobject /*thiz*/, jlong ptr, jfloatArray samples) {
    if (ptr == 0) {
        return env->NewStringUTF("");
    }
    auto* holder = reinterpret_cast<ContextHolder*>(ptr);
    if (!holder->ctx) {
        return env->NewStringUTF("");
    }

    jsize n = env->GetArrayLength(samples);
    jfloat* buf = env->GetFloatArrayElements(samples, nullptr);
    if (!buf) {
        return env->NewStringUTF("");
    }
    std::vector<float> pcm(buf, buf + n);
    env->ReleaseFloatArrayElements(samples, buf, JNI_ABORT);

    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_progress = false;
    params.print_timestamps = false;
    params.language = "en";
    params.n_threads = 4;
    params.temperature = 0.0f;

    if (whisper_full(holder->ctx, params, pcm.data(), static_cast<int>(pcm.size())) != 0) {
        return env->NewStringUTF("");
    }

    std::string result;
    const int n_segments = whisper_full_n_segments(holder->ctx);
    for (int i = 0; i < n_segments; ++i) {
        const char* text = whisper_full_get_segment_text(holder->ctx, i);
        if (text) {
            result += text;
        }
    }

    return env->NewStringUTF(result.c_str());
}

} // extern "C"
