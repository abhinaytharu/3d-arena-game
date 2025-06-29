#!/usr/bin/env python3
"""
Build script for C++ game logic module using pybind11
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return the result"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, 
                              capture_output=True, text=True, check=True)
        print(f"Command output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def check_pybind11():
    """Check if pybind11 is available"""
    try:
        import pybind11
        print(f"pybind11 found: {pybind11.__file__}")
        return True
    except ImportError:
        print("pybind11 not found. Installing...")
        return run_command(f"{sys.executable} -m pip install pybind11")

def build_module():
    """Build the C++ module"""
    cpp_dir = Path(__file__).parent
    backend_dir = cpp_dir.parent / "backend"
    
    print(f"Building C++ module in {cpp_dir}")
    
    # Check if pybind11 is available
    if not check_pybind11():
        print("Failed to install pybind11")
        return False
    
    # Create build directory
    build_dir = cpp_dir / "build"
    build_dir.mkdir(exist_ok=True)
    
    # Configure with CMake
    if not run_command("cmake ..", cwd=build_dir):
        print("CMake configuration failed")
        return False
    
    # Build the module
    if not run_command("cmake --build .", cwd=build_dir):
        print("Build failed")
        return False
    
    # Copy the built module to backend directory
    module_name = "cpp_logic"
    if sys.platform.startswith("win"):
        module_file = build_dir / f"{module_name}.pyd"
    else:
        module_file = build_dir / f"{module_name}.so"
    
    if module_file.exists():
        target_file = backend_dir / module_file.name
        shutil.copy2(module_file, target_file)
        print(f"Module copied to: {target_file}")
        return True
    else:
        print(f"Module file not found: {module_file}")
        return False

def test_module():
    """Test the built module"""
    print("Testing the built module...")
    
    # Add backend directory to Python path
    backend_dir = Path(__file__).parent.parent / "backend"
    sys.path.insert(0, str(backend_dir))
    
    try:
        import game_logic
        print("Game logic module imported successfully")
        
        # Run tests
        if hasattr(game_logic, 'test_sphere_intersection'):
            game_logic.test_sphere_intersection()
        
        if hasattr(game_logic, 'test_ray_hit_detection'):
            game_logic.test_ray_hit_detection()
        
        print("All tests passed!")
        return True
        
    except Exception as e:
        print(f"Test failed: {e}")
        return False

def main():
    """Main build function"""
    print("Building C++ game logic module...")
    
    if build_module():
        print("Build successful!")
        
        if test_module():
            print("Module tested successfully!")
            return True
        else:
            print("Module test failed!")
            return False
    else:
        print("Build failed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 