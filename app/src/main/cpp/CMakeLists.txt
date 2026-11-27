cmake_minimum_required(VERSION 3.22.1)
project(whisper_jni CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

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

target_include_directories(whisper_jni PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/whisper.cpp
)

target_link_libraries(whisper_jni
        whisper
        ${log-lib}
        android
)
