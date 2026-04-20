#!/bin/bash
set -euo pipefail

# Only run full setup in remote Claude Code web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "=== Sports-Auction-Hub session start ==="

# Install htmlhint for HTML linting if not already present
if ! npm list -g htmlhint --depth=0 &>/dev/null; then
  echo "Installing htmlhint..."
  npm install -g htmlhint --silent
else
  echo "htmlhint already installed."
fi

echo "=== Setup complete ==="
