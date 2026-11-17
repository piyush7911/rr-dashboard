"use client"
import { useEffect, useState } from "react"
import type { Evidence, PressureData, Players, Summary } from "@/lib/types"

// Static JSON written by work/export_dashboard.py. No backend: every page reads these files.
const cache: Record<string, Promise<unknown>> = {}
function load<T>(name: string): Promise<T> {
  if (!cache[name]) cache[name] = fetch(`/data/${name}.json`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json() })
  return cache[name] as Promise<T>
}
function useJson<T>(name: string) {
  const [data, setData] = useState<T | undefined>(); const [error, setError] = useState<string | undefined>()
  useEffect(() => { let on = true; load<T>(name).then((d) => on && setData(d)).catch((e) => on && setError(String(e))); return () => { on = false } }, [name])
  return { data, error }
}
export const useSummary = () => useJson<Summary>("summary")
export const usePlayers = () => useJson<Players>("players")
export const useEvidence = () => useJson<Evidence>("evidence")
export const usePressure = () => useJson<PressureData>("pressure")
