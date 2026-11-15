"use client"
import { useEffect, useState } from "react"
import { post, get } from "@/lib/api"

// Shared stale-while-revalidate cache: pages open populated, and parameter changes keep the previous result on screen until the new one arrives.
type Entry = { d: unknown; t: number }
const cache = new Map<string, Entry>(); const inflight = new Map<string, Promise<unknown>>(); const MAX = 80, FRESH = 120_000
const put = (k: string, d: unknown) => { cache.delete(k); cache.set(k, { d, t: Date.now() }); if (cache.size > MAX) cache.delete(cache.keys().next().value as string) }
export const keyOf = (path: string, body?: unknown) => (body === undefined ? `GET ${path}` : `POST ${path} ${JSON.stringify(body)}`)
export function prefetch(path: string, body?: unknown) {
  const k = keyOf(path, body); if (cache.has(k) || inflight.has(k)) return
  const p = (body === undefined ? get(path) : post(path, body)).then((d) => put(k, d)).catch(() => {}).finally(() => inflight.delete(k)); inflight.set(k, p)
}
export function useQuery<T>(key: string | null, fetcher: (s: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(() => (key ? ((cache.get(key)?.d as T) ?? null) : null)); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!key) return
    const hit = cache.get(key); if (hit) { setData(hit.d as T); setLoading(false); if (Date.now() - hit.t < FRESH) return }
    const ac = new AbortController(); setLoading(true); setError(null)
    fetcher(ac.signal).then((d) => { if (ac.signal.aborted) return; put(key, d); setData(d); setLoading(false) }).catch((e) => { if (!ac.signal.aborted) { setError(String(e)); setLoading(false) } })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { data, loading, error }
}
export const usePost = <T,>(path: string, body: unknown, on = true) => useQuery<T>(on ? keyOf(path, body) : null, (s) => post<T>(path, body, s))
export const useGet = <T,>(path: string) => useQuery<T>(keyOf(path), (s) => get<T>(path, s))
