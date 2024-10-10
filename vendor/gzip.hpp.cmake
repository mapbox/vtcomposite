if(TARGET vendor-gzip.hpp)
  return()
endif()

add_library(vendor-gzip.hpp INTERFACE)

target_include_directories(
  vendor-gzip.hpp
  INTERFACE ${PROJECT_SOURCE_DIR}/vendor/gzip-hpp/include)
