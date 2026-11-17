# SupeRR Selector S2, Round 1: Reliable Players Under Pressure (dashboard)

Static dashboard (Next.js, no backend). Every page reads the pre-computed JSON in `web/public/data/`, written by `work/export_dashboard.py` in the main project.

## Run locally
```bash
cd web
pnpm install
pnpm build                     # writes web/out
python serve.py 8000 out       # or any static server; open http://localhost:8000
```

## Deploy on Render (free static site)
New, Static Site, connect this repository. `render.yaml` sets the build command (`pnpm build` in `web/`) and the publish directory (`web/out`). No environment variables are needed beyond `NODE_VERSION` (22), which the blueprint sets.

## Contents
| Path | Purpose |
|---|---|
| `web/src/` | Pages and components |
| `web/public/data/` | Pre-computed results (rankings, player cards, evidence, pressure maps) |
| `web/public/report.pdf` | The methodology report |
