#!/bin/bash
# Claude Code on the web: install the test tooling so `npm test` works from the first prompt.
# Runs before the session starts (not async), so nothing races it. The container is cached afterwards,
# which is why this is npm install rather than npm ci.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
