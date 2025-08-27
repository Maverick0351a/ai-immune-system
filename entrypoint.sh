#!/bin/sh
set -e
ls -l dist || echo "No dist directory"
if [ -f dist/server.js ]; then
  echo "Starting dist/server.js"
  exec node dist/server.js
elif [ -f dist/src/server.js ]; then
  echo "Starting dist/src/server.js"
  exec node dist/src/server.js
else
  echo "Could not find server.js. Contents:" >&2
  find dist -maxdepth 3 -type f -print >&2 || true
  exit 1
fi
