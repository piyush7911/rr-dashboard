export const f1 = (x?: number | null, d = 1) => (x == null || Number.isNaN(x) ? "–" : x.toFixed(d))
export const pct = (x?: number | null, d = 0) => (x == null ? "–" : `${(x * 100).toFixed(d)}%`)
export const sign = (x?: number | null, d = 1) => (x == null ? "–" : `${x >= 0 ? "+" : ""}${x.toFixed(d)}`)
export const short = (n: string) => { const p = n.split(" "); return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(" ")}` : n }
export const BAT_LABELS: Record<string, string> = { SRoA: "Overall level", SRhA: "Pressure level", res: "Resilience", cons: "Consistency" }
export const BOWL_LABELS: Record<string, string> = { Pz: "Pressure rating", res: "Resilience", relz: "Consistency", cz: "Pressure-specific", ECOa: "Adj. economy (all)", WKa: "Wickets above avg (all)", ECOh: "Adj. economy (pressure)", WKh: "Wickets above avg (pressure)" }
export const LABELS = (kind: string) => (kind === "bat" ? BAT_LABELS : BOWL_LABELS)
