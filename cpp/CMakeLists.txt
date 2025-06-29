cmake_minimum_required(VERSION 3.4...3.18)
project(cpp_logic)

# Find Python and pybind11
find_package(Python 3.6 REQUIRED COMPONENTS Interpreter Development)
find_package(pybind11 REQUIRED)

# Add pybind11 module
pybind11_add_module(cpp_logic cpp_logic.cpp)

# Set C++ standard
target_compile_features(cpp_logic PRIVATE cxx_std_17)

# Set output directory
set_target_properties(cpp_logic PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}
)

# Platform-specific settings
if(WIN32)
    # Windows-specific settings
    set_target_properties(cpp_logic PROPERTIES
        SUFFIX ".pyd"
    )
else()
    # Unix-specific settings
    set_target_properties(cpp_logic PROPERTIES
        SUFFIX ".so"
    )
endif()

# Print configuration info
message(STATUS "Python executable: ${Python_EXECUTABLE}")
message(STATUS "Python version: ${Python_VERSION}")
message(STATUS "pybind11 found: ${pybind11_FOUND}")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}") 