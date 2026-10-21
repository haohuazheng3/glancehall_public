#!/bin/bash
# Records new runs as they finish, for as long as a runner (bench/run.py) is alive; then one final pass.
cd "$(dirname "$0")/../.."
LOG=/private/tmp/sbs-runs/recorder.log
while pgrep -f "bench/run.py" >/dev/null; do
  node bench/record/record.mjs >> "$LOG" 2>&1
  python3 bench/catalog.py >> "$LOG" 2>&1
  sleep 90
done
node bench/record/record.mjs >> "$LOG" 2>&1
python3 bench/catalog.py >> "$LOG" 2>&1
echo "watch: runner finished, final pass done ($(date +%H:%M:%S))" >> "$LOG"
