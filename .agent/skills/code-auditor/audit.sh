#!/bin/bash
echo "Starting Code Audit..."
EXIT_CODE=0

echo "--- Checking TypeScript Types ---"
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found."
  EXIT_CODE=1
else
  echo "✅ TypeScript check passed."
fi

echo ""
echo "--- Checking Formatting (Prettier) ---"
npx prettier --check .
if [ $? -ne 0 ]; then
  echo "❌ Formatting errors found."
  EXIT_CODE=1
else
  echo "✅ Formatting check passed."
fi

echo ""
echo "--- Running Tests ---"
pnpm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed."
  EXIT_CODE=1
else
  echo "✅ Tests passed."
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "🎉 All checks passed! The code is in great shape."
else
    echo ""
    echo "⚠️ Some checks failed. Please review the output above."
fi

exit $EXIT_CODE
