if(TARGET vendor-vtzero)
  return()
endif()

add_library(vendor-vtzero INTERFACE)

target_include_directories(
  vendor-vtzero
  INTERFACE ${PROJECT_SOURCE_DIR}/vendor/vtzero/include)
