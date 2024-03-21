#!/bin/bash
cd "$(dirname "$0")"
pkg -t node18-linux-x64,node18-macos-x64,node18-win-x64 ./app.js