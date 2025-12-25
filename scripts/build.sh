#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(dirname "$0")"
MONOREPO_ROOT="$SCRIPT_DIR/.."

cd "$MONOREPO_ROOT"

echo "Building @sajn/embed..."
pnpm --filter @sajn/embed run build

echo "Building @sajn/embed-react..."
pnpm --filter @sajn/embed-react run build

echo "Building @sajn/embed-vue..."
pnpm --filter @sajn/embed-vue run build

echo "Done!"