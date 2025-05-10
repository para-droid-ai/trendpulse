import os
import sys
import pytest
from pathlib import Path

def main():
    # Add the src directory to Python path
    src_path = str(Path(__file__).parent.parent)
    if src_path not in sys.path:
        sys.path.append(src_path)
    
    # Ensure PERPLEXITY_API_KEY is set
    if not os.getenv("PERPLEXITY_API_KEY"):
        print("Error: PERPLEXITY_API_KEY environment variable not set")
        print("Please set it using:")
        print("export PERPLEXITY_API_KEY='your-api-key'")
        sys.exit(1)
    
    # Run tests with coverage
    pytest_args = [
        "test_perplexity_api.py",
        "-v",
        "--cov=perplexity_api",
        "--cov-report=term-missing",
        "--cov-report=html"
    ]
    
    # Run the tests
    exit_code = pytest.main(pytest_args)
    
    if exit_code == 0:
        print("\nAll tests passed successfully!")
    else:
        print("\nSome tests failed. Please check the output above.")
    
    sys.exit(exit_code)

if __name__ == "__main__":
    main() 