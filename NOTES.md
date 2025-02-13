# HOW I ACTUALLY GOT IT TO WORK
1. Generally followed these intructions:
 - https://pyodide.org/en/stable/development/building-and-testing-packages.html
2. Changed this line in pyproject.toml:
 - `spam = ["*.txt", "*.tif", "*.p", "**/*.hpp"]`
3. Copy across the required libraries:
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
5. There are lots of packages that aren't compiled yet for pyodide, so I cut it down to:
```
dependencies = [
    "numpy",
    "scipy",
    "scikit-image",
    "matplotlib",
    "h5py",
    "pyyaml",
]
```
6. I also had to comment out a _LOT_ of code that relied on those packages. In particular in the __init__.py files.