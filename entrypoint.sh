#!/bin/sh
echo "Deprecated entrypoint (kept temporarily). Use CMD node dist/server.js in Dockerfile."
exec node dist/server.js
