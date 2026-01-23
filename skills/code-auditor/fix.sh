#!/bin/bash
echo "Starting Code Fixes..."

echo "--- Fixing Formatting (Prettier) ---"
npx prettier --write .

echo "✅ Formatting fixed."
