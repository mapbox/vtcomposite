if(TARGET vendor-protozero)
  return()
endif()

add_library(vendor-protozero INTERFACE)

target_include_directories(
  vendor-protozero
  INTERFACE ${PROJECT_SOURCE_DIR}/vendor/protozero/include)
