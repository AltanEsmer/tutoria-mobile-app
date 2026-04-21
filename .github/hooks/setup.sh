#!/bin/sh

cd "$(git rev-parse --show-toplevel)"

git config core.hooksPath .github/hooks

chmod +x .github/hooks/pre-commit .github/hooks/pre-push

GREEN='\033[0;32m'
RESET='\033[0m'

printf "${GREEN}✅ Git hooks configured! Hooks directory: .github/hooks${RESET}\n"
echo "   Active hooks: pre-commit, pre-push"
