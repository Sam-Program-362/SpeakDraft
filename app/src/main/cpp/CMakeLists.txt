cmake_minimum_required(VERSION 3.22.1)
project(whisper_jni CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Android (bionic) cannot load versioned shared libraries the way desktop
# Linux can: whisper.cpp defaults to BUILD_SHARED_LIBS=ON with SOVERSION 1
# (libwhisper.so.1) and GGML_OPENMP=ON (libomp.so), which causes
# UnsatisfiedLinkError at runtime. Force a static, position-independent
# build and disable OpenMP / native tuning / dynamic backends so the
# whisper code is linked directly into libwhisper_jni.so.
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(CMAKE_POSITION_INDEPENDENT_CODE ON CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_BACKEND_DL OFF CACHE BOOL "" FORCE)

# whisper.cpp is vendored as a git submodule at ./whisper.cpp.
# Disable its bundled tests/examples so we only build the core library.
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
add_subdirectory(whisper.cpp)

add_library(whisper_jni SHARED
        whisper_jni.cpp
)

find_library(log-lib log)

# whisper.h lives in whisper.cpp/include/whisper.h (not whisper.cpp/whisper.h).
target_include_directories(whisper_jni PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/whisper.cpp/include
        ${CMAKE_CURRENT_SOURCE_DIR}/whisper.cpp/ggml/include
)

target_link_libraries(whisper_jni
        whisper
        ${log-lib}
        android
)
