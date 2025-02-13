# How to build spam with pyodide
1. Generally follow these intructions:
 - https://pyodide.org/en/stable/development/building-and-testing-packages.html
2. Change this line in pyproject.toml:
 - `spam = ["*.txt", "*.tif", "*.p", "**/*.hpp"]`
3. Add `src/spam/external` to the pybind11 `include_dirs` in `setup.py`. Then copy across the required libraries (couldn't work how to link them properly):
```
  mkdir -p src/spam/external/cgal
  cp -r /usr/include/CGAL/* src/spam/external/cgal/
  mkdir src/spam/external/boost
  cp -r /usr/include/boost/* src/spam/external/boost/
  mkdir src/spam/external/Eigen
  cp -r /usr/include/eigen3/Eigen/* src/spam/external/Eigen/
  mkdir src/spam/external/pybind11
  cp -r /usr/include/pybind11/* src/spam/external/pybind11/
  ```
4. Build with: `pyodide build`
5. There are lots of packages that aren't compiled yet for pyodide, so I cut down the dependencies in `pyproject.toml` to:
```
dependencies = [
    "numpy",
    "scipy",
    "scikit-image",
    "h5py",
    "pyyaml",
]
```
6. I also had to comment out a _LOT_ of code that relied on those packages. In particular in the __init__.py files.