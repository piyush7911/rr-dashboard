"use client"
import { useEffect } from "react"
import { prefetch } from "@/lib/use-api"
import { DEFAULT_PRESSURE, DEFAULT_RATE } from "@/lib/params"

/** Warm the cache right after first paint so every page opens with its data already on screen. */
export function Prefetcher() {
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = []
    const run = (fn: () => void, ms: number) => ids.push(setTimeout(fn, ms))
    prefetch("/meta"); prefetch("/consensus/bat"); prefetch("/consensus/bowl"); prefetch("/evidence")
    run(() => { prefetch("/pressure", { pressure: DEFAULT_PRESSURE }); for (const kind of ["bat", "bowl"]) prefetch("/rank", { kind, pressure: DEFAULT_PRESSURE, rate: DEFAULT_RATE, situation: {}, limit: 200 }) }, 150)
    run(() => { prefetch("/players?kind=bat&q="); prefetch("/matches?q=") }, 600)
    return () => ids.forEach(clearTimeout)
  }, [])
  return null
}
