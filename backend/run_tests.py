#!/usr/bin/env python3
"""
Test runner script for DReflowPro ETL Platform.
"""
import sys
import subprocess
import os
from pathlib import Path

# Test categories and their markers
TEST_CATEGORIES = {
    "unit": "unit",
    "integration": "integration", 
    "e2e": "e2e",
    "auth": "auth",
    "connector": "connector", 
    "pipeline": "pipeline",
    "api": "api",
    "db": "db",
    "redis": "redis",
    "slow": "slow"
}

def run_tests(category=None, coverage=True, verbose=True, fail_fast=False):
    """Run tests with specified parameters."""
    
    # Base command
    cmd = ["python", "-m", "pytest"]
    
    # Add verbosity
    if verbose:
        cmd.append("-v")
    
    # Add coverage
    if coverage:
        cmd.extend(["--cov=app", "--cov-report=term-missing", "--cov-report=html"])
    
    # Add fail fast
    if fail_fast:
        cmd.append("-x")
    
    # Add specific test category
    if category and category in TEST_CATEGORIES:
        cmd.extend(["-m", TEST_CATEGORIES[category]])
    elif category:
        print(f"Unknown test category: {category}")
        print(f"Available categories: {', '.join(TEST_CATEGORIES.keys())}")
        return False
    
    # Run the command
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    
    return result.returncode == 0

def main():
    """Main test runner function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run DReflowPro tests")
    parser.add_argument(
        "--category", 
        choices=list(TEST_CATEGORIES.keys()),
        help="Run specific test category"
    )
    parser.add_argument(
        "--no-coverage",
        action="store_true", 
        help="Skip coverage reporting"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Reduce verbosity"
    )
    parser.add_argument(
        "--fail-fast",
        action="store_true",
        help="Stop on first failure"
    )
    parser.add_argument(
        "--list-categories",
        action="store_true",
        help="List available test categories"
    )
    
    args = parser.parse_args()
    
    # List categories if requested
    if args.list_categories:
        print("Available test categories:")
        for category, marker in TEST_CATEGORIES.items():
            print(f"  {category}: {marker}")
        return
    
    # Check if we're in the right directory
    if not Path("pytest.ini").exists():
        print("Error: pytest.ini not found. Please run from the project root.")
        sys.exit(1)
    
    # Run tests
    success = run_tests(
        category=args.category,
        coverage=not args.no_coverage,
        verbose=not args.quiet,
        fail_fast=args.fail_fast
    )
    
    if success:
        print("\n✅ All tests passed!")
        if not args.no_coverage:
            print("📊 Coverage report generated in htmlcov/")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()