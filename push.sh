#!/bin/bash
# Push to GitHub

cd "$(dirname "$0")"

echo "=== Checking Git status ==="
git status

echo "=== Adding all changes ==="
git add -A

echo "=== Committing changes ==="
git commit -m "Update project"

echo "=== Pushing to GitHub ==="
git push -u origin main

echo "=== Done! ==="
