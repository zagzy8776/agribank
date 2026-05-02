#!/usr/bin/env python3
import os
import subprocess

os.chdir('/Users/zagzybig/Downloads/agri-bank-express-main')

# Test basic commands
tests = [
    ("pwd", ["pwd"]),
    ("ls", ["ls", "-la"]),
    ("git --version", ["git", "--version"]),
    ("git status", ["git", "status"]),
    ("git remote -v", ["git", "remote", "-v"]),
]

for name, cmd in tests:
    print(f"\n=== {name} ===")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        print(f"Return code: {result.returncode}")
        if result.stdout:
            print(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
    except Exception as e:
        print(f"ERROR: {e}")
