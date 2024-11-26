if(TARGET vendor-spatial-algorithms)
  return()
endif()

add_library(vendor-spatial-algorithms INTERFACE)

target_include_directories(
  vendor-spatial-algorithms
  INTERFACE ${PROJECT_SOURCE_DIR}/vendor/spatial-algorithms/include)
