if(TARGET vendor-geometry.hpp)
  return()
endif()

add_library(vendor-geometry.hpp INTERFACE)

target_include_directories(
  vendor-geometry.hpp
  INTERFACE ${PROJECT_SOURCE_DIR}/vendor/geometry-hpp-internal/include)
