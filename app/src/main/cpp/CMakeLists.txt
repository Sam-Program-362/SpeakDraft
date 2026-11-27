cmake_minimum_required(VERSION 3.22.1)
project(speakdraft_jni LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# If upstream whisper.cpp is present in third_party/whisper.cpp, link against it
if (EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/third_party/whisper.cpp/CMakeLists.txt")
    add_subdirectory(third_party/whisper.cpp)
    add_definitions(-DWHISPER_CPP_LINKED=1)
endif()

add_library(whisper_jni SHARED
    whisper_jni.cpp
)

find_library(log-lib log)

if (TARGET whisper)
    target_link_libraries(whisper_jni whisper ${log-lib})
else()
    target_link_libraries(whisper_jni ${log-lib})
endif()
