#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(readlink -f "$(dirname "$0")")"
MONOREPO_ROOT="$(readlink -f "$SCRIPT_DIR/../")"

pushd "$MONOREPO_ROOT" > /dev/null

trap "popd > /dev/null" EXIT
trap "popd > /dev/null" ERR

npm run build -w @sajn/embed

npm run build -w @sajn/embed-react

npm run format