# ---- stage 1: build the static dashboard (Next.js export) ----
FROM node:22-slim AS web
RUN npm install -g pnpm
WORKDIR /web
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

# ---- stage 2: one Python service that serves the API and the built site ----
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 MALLOC_ARENA_MAX=2 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api api
COPY app app
COPY results results
COPY scripts scripts
COPY data data
COPY --from=web /web/out web/out
EXPOSE 8000
CMD ["bash", "scripts/start.sh"]
