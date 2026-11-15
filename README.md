# SupeRR Selector S2, Round 1: Pressure Lab (single service)

One Python service (FastAPI) serves both the API and the built dashboard (Next.js static export). No separate frontend server.

## Layout
| Path | Purpose |
|---|---|
| `api/main.py` | API + static site (`web/out`) |
| `app/engine.py` | Parameter-driven pressure and rating engine |
| `web/` | Dashboard source (Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, Recharts) |
| `results/` | Precomputed outputs: consensus rankings, evidence tables, the methodology report |
| `data/` | Derived per-ball table and small reference tables (committed; keep the repository private) |

## Data rule
The organisers' data pack "may not be shared or published". `data/` holds data derived from it, so **keep this repository private**. The Match Replay and Player Cards pages show ball-level detail, so consider who has the link.

## Run locally
```bash
cd web && pnpm install && pnpm build && cd ..        # builds web/out
pip install -r requirements.txt
uvicorn api.main:app --port 8000                       # open http://localhost:8000
```
For front-end development: `uvicorn api.main:app --port 8000` and, in `web/`, `pnpm dev` (talks to port 8000).

## Deploy on Render
1. Push this folder to a **private** repository and create a Render *Blueprint* (uses `render.yaml`), or a Docker web service.
2. The free instance is enough: the service was tested under a 512 MB limit (about 360 MB in use, with heavy concurrent requests). A free instance sleeps after ~15 minutes without traffic and takes about a minute to wake.
3. Optional: to keep the data out of git instead, remove it from the repository and set `DATA_URL` to a private link to a zip with `dash_balls.parquet` and `ref/*.csv` (optional `DATA_AUTH` header value).
