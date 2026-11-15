"use client"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type Pressure = {
  mode: "consensus" | "leverage" | "rule" | "custom"; wp_lo: number; wp_hi: number; sigma: number; cmin: number; wkt_w: number; urg_cap: number
  high_pct: number; group: "innings_phase" | "innings" | "global"; innings: number[]; phases: string[]; tiers: string[]; ko_mult: number
  cw: { leverage: number; closeness: number; urgency: number; wickets: number; late: number }
}
export type Rate = {
  hl_bat: number; hl_bowl: number; k_all: number; k_hi: number; kb_all: number; kb_hi: number; opp_adjust: boolean; role_adjust: boolean
  gamma_bat: number; gamma_bowl: number; eb_k: number; min_w: { bat: number; bowl: number }; min_high: { bat: number; bowl: number }; min_app: number
  w_bat: Record<string, number>; w_bowl: Record<string, number>
}
export const DEFAULT_PRESSURE: Pressure = {
  mode: "consensus", wp_lo: 0.1, wp_hi: 0.9, sigma: 0.3, cmin: 0.3, wkt_w: 0.6, urg_cap: 5, high_pct: 0.75, group: "innings_phase",
  innings: [1, 2], phases: ["PP", "Mid", "Death"], tiers: ["IPL", "T20I", "A"], ko_mult: 1,
  cw: { leverage: 1, closeness: 1, urgency: 1, wickets: 0, late: 0 },
}
export const DEFAULT_RATE: Rate = {
  hl_bat: 365, hl_bowl: 730, k_all: 60, k_hi: 40, kb_all: 60, kb_hi: 40, opp_adjust: true, role_adjust: false, gamma_bat: 1, gamma_bowl: 1, eb_k: 0,
  min_w: { bat: 45, bowl: 40 }, min_high: { bat: 30, bowl: 24 }, min_app: 10,
  w_bat: { SRoA: 0.4, SRhA: 0.3, res: 0.15, cons: 0.15 }, w_bowl: { Pz: 0.5, res: 0.2, relz: 0.2, cz: 0.1 },
}

type Ctx = {
  pressure: Pressure; rate: Rate; setPressure: (p: Partial<Pressure>) => void; setRate: (r: Partial<Rate>) => void
  reset: () => void; dirty: boolean; debounced: { pressure: Pressure; rate: Rate }
}
const C = createContext<Ctx | null>(null)

export function useDebounced<T>(v: T, ms = 350): T {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms])
  return d
}

export function ParamsProvider({ children }: { children: ReactNode }) {
  const [pressure, setP] = useState<Pressure>(DEFAULT_PRESSURE)
  const [rate, setR] = useState<Rate>(DEFAULT_RATE)
  const dp = useDebounced(pressure), dr = useDebounced(rate)
  const debounced = useMemo(() => ({ pressure: dp, rate: dr }), [dp, dr])
  const dirty = JSON.stringify(pressure) !== JSON.stringify(DEFAULT_PRESSURE) || JSON.stringify(rate) !== JSON.stringify(DEFAULT_RATE)
  const value: Ctx = {
    pressure, rate, debounced, dirty,
    setPressure: (p) => setP((s) => ({ ...s, ...p })), setRate: (r) => setR((s) => ({ ...s, ...r })),
    reset: () => { setP(DEFAULT_PRESSURE); setR(DEFAULT_RATE) },
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useParams = () => { const c = useContext(C); if (!c) throw new Error("ParamsProvider missing"); return c }
