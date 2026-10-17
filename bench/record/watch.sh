#!/bin/bash
# Records new runs as they finish, until the runner log says everything is done.
cd "$(dirname "$0")/../.."
while true; do
  node bench/record/record.mjs >> /private/tmp/sbs-runs/recorder.log 2>&1
  python3 bench/catalog.py >> /private/tmp/sbs-runs/recorder.log 2>&1
  if grep -q "all runs finished" /private/tmp/sbs-runs/runner.log; then
    node bench/record/record.mjs >> /private/tmp/sbs-runs/recorder.log 2>&1
    python3 bench/catalog.py >> /private/tmp/sbs-runs/recorder.log 2>&1
    echo "watch: runner finished, final pass done" >> /private/tmp/sbs-runs/recorder.log
    break
  fi
  sleep 90
done
