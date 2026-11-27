#ifndef WHISPER_JNI_H
#define WHISPER_JNI_H

#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * JNI bindings for com.speakdraft.app.WhisperNative.
 * The native peer holds a whisper_context* behind an opaque pointer.
 */

JNIEXPORT jlong JNICALL
Java_com_speakdraft_app_WhisperNative_createContext(JNIEnv *env, jobject thiz, jstring model_path);

JNIEXPORT void JNICALL
Java_com_speakdraft_app_WhisperNative_freeContext(JNIEnv *env, jobject thiz, jlong ptr);

JNIEXPORT jstring JNICALL
Java_com_speakdraft_app_WhisperNative_transcribe(JNIEnv *env, jobject thiz, jlong ptr, jfloatArray samples);

#ifdef __cplusplus
}
#endif

#endif // WHISPER_JNI_H
