#!/bin/zsh

cd "$(dirname "$0")" || exit 1

PORT=4173
URL="http://127.0.0.1:${PORT}"

echo "Starting Olden Era Hero Randomizer on ${URL}"
echo "Press Ctrl+C to stop the server."

python3 -m http.server "${PORT}" &
SERVER_PID=$!

sleep 1
open "${URL}"

wait "${SERVER_PID}"
