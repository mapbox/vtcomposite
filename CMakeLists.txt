cmake_minimum_required(VERSION 3.10 FATAL_ERROR)
cmake_policy(SET CMP0167 OLD)
project("vtcomposite" LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)

add_compile_options(-Wall -Wextra -Werror -pedantic -Wshadow -Wsign-compare -Wfloat-equal -Wconversion  -Wunused-parameter)

if (CMAKE_CXX_COMPILER_ID STREQUAL "Clang" OR CMAKE_CXX_COMPILER_ID STREQUAL "AppleClang")
    add_compile_options(-Wno-unsequenced -Wno-c++98-compat -Wno-c++98-compat-pedantic -Wno-exit-time-destructors)
endif()

find_package(Boost 1.73 REQUIRED)
add_library(vendor-boost INTERFACE)
target_include_directories(vendor-boost INTERFACE ${Boost_INCLUDE_DIR})
target_link_libraries(vendor-boost INTERFACE ${Boost_LIBRARIES})

include(${PROJECT_SOURCE_DIR}/vendor/geometry.hpp.cmake)
include(${PROJECT_SOURCE_DIR}/vendor/gzip.hpp.cmake)
include(${PROJECT_SOURCE_DIR}/vendor/spatial-algorithms.cmake)
include(${PROJECT_SOURCE_DIR}/vendor/protozero.cmake)
include(${PROJECT_SOURCE_DIR}/vendor/vtzero.cmake)

find_program(NODEJS_EXECUTABLE NAMES node nodejs)

if ("${NODEJS_EXECUTABLE}" MATCHES "NOTFOUND")
   message(FATAL_ERROR "Could not find Node.js")
endif()

if(NOT NODE_PLATFORM_ARCH_SLUG)
    execute_process(
        COMMAND "${NODEJS_EXECUTABLE}" -p "process.platform + '-' + process.arch"
        OUTPUT_VARIABLE NODE_PLATFORM_ARCH_SLUG
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
endif()

add_library(vtcomposite SHARED
    src/module.cpp
    src/feature_builder.hpp
    src/module_utils.hpp
    src/vtcomposite.cpp
    src/vtcomposite.hpp
    src/zxy_math.hpp
)

target_include_directories(
    vtcomposite
    PRIVATE
        ${PROJECT_SOURCE_DIR}/vendor/node-api-headers/include
        ${PROJECT_SOURCE_DIR}/vendor/node-addon-api
)

target_link_libraries(vtcomposite
                      PRIVATE vendor-protozero
                              vendor-vtzero
                              vendor-geometry.hpp
                              vendor-gzip.hpp
                              vendor-spatial-algorithms
                              vendor-boost)

set_target_properties(
    vtcomposite
    PROPERTIES
        PREFIX ""
        OUTPUT_NAME "vtcomposite-${NODE_PLATFORM_ARCH_SLUG}"
        LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/lib/$<0:>"
        SUFFIX ".node"
)

target_compile_definitions(
    vtcomposite
    PRIVATE
        NAPI_VERSION=7
        NODE_ADDON_API_DISABLE_DEPRECATED
)

# Ensures that linked symbols are loaded when the module is loaded
# instead of causing unresolved symbol errors later during runtime.
if(APPLE)
    set_target_properties(
        vtcomposite
        PROPERTIES LINK_FLAGS "-undefined dynamic_lookup -bind_at_load -Xlinker -dead_strip -Xlinker -exported_symbols_list -Xlinker ${CMAKE_CURRENT_SOURCE_DIR}/cmake/symbols.txt"
    )
else()
    set_target_properties(
        vtcomposite
        PROPERTIES LINK_FLAGS "-z now -Wl,--version-script=${CMAKE_CURRENT_SOURCE_DIR}/cmake/symbols.ld"
    )
endif()
