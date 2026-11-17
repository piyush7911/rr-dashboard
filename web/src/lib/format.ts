export const pct = (x?: number | null, d = 0) => (x == null ? "–" : `${(x * 100).toFixed(d)}%`)
