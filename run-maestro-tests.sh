#!/bin/bash

# Maestro Test Runner for Tutoria Mobile App
# Fixes applied:
#   1. Installed Java (required by Maestro)
#   2. Fixed all YAML flows: timeout -> waitUntilVisible, clearText -> eraseText

export JAVA_HOME=/opt/homebrew/opt/openjdk
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=true

cd "$(dirname "$0")"

TEST_DIR=".maestro/flows"
TEST_RESULTS="maestro-results.txt"

echo "========================================"
echo "🧪 Maestro E2E Test Suite - Tutoria Mobile App"
echo "========================================"
echo ""

# List available tests
echo "📋 Available Tests:"
ls -1 "$TEST_DIR"/*.yaml | sed 's|.*/||;s|\.yaml||' | nl
echo ""

# Run all tests
echo "�� Running all Maestro flows..."
echo "" > "$TEST_RESULTS"

maestro test "$TEST_DIR" \
  -e TEST_EMAIL=test@tutoria.local \
  -e TEST_PASSWORD=TestPassword123! \
  --headless \
  2>&1 | tee -a "$TEST_RESULTS"

echo ""
echo "✅ Test run complete! Results saved to: $TEST_RESULTS"
