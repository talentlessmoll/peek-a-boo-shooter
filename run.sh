#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
PORT=${1:-8080}
python3 server.py "$PORT"
