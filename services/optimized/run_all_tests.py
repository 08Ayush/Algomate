"""Run all tests including GA and Hybrid solvers."""

import sys
import pytest

if __name__ == "__main__":
    # Run all tests with verbose output
    args = [
        "tests/",
        "-v",
        "--tb=short",
        "-ra",  # Show summary of all test results
        "--color=yes"
    ]
    
    sys.exit(pytest.main(args))
