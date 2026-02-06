"""Run Phase 3 ML tests."""

import subprocess
import sys

def main():
    """Run Phase 3 ML layer tests."""
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "tests/test_features.py",
        "tests/test_predictor.py",
        "tests/test_patterns.py",
        "tests/test_adaptive.py",
        "-v",
        "--no-cov",
        "--tb=short"
    ]
    
    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
