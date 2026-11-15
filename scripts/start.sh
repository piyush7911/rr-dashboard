#!/usr/bin/env bash
# Container entrypoint. If the data files are not baked into the image, fetch them from DATA_URL (a private zip containing
# dash_balls.parquet and ref/{teams,matches,competitions}.csv) before starting the service.
set -euo pipefail
cd /srv
if [ ! -f data/dash_balls.parquet ]; then
  if [ -z "${DATA_URL:-}" ]; then echo "ERROR: data/dash_balls.parquet is missing and DATA_URL is not set (see README)." >&2; exit 1; fi
  echo "Fetching data archive..."
  python - <<'PY'
import os, urllib.request, zipfile, io
req = urllib.request.Request(os.environ["DATA_URL"], headers=({"Authorization": os.environ["DATA_AUTH"]} if os.environ.get("DATA_AUTH") else {}))
zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(req, timeout=120).read())).extractall("data")
PY
fi
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
