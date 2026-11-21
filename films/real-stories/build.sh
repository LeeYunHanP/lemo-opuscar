#!/bin/sh
# Rebuild "The Real Stories Behind GTA 6" from scratch. Run from anywhere.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
# voice/ is committed as recorded and checked (o1 was trimmed by hand), so it is not regenerated here
python3 "$HERE/build_timeline.py"                                          # timeline.json from the lines and their durations
cat "$HERE/engine_base.js" "$HERE/film_tail.js" > "$HERE/film.js"
.venv/bin/python "$HERE/mix.py"
LEMO_ANGLE=${LEMO_ANGLE:-swiftshader} node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/real-stories.mp4" 24 0
