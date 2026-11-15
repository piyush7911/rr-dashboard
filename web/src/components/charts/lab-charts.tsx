"use client"
import { ANIM, DUR } from "@/lib/anim"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { PressureOut } from "@/lib/types"

const COL = { decided: "#c9d1e6", ordinary: "#56b4e9", HIGH: "#ea1a85" }
export function SwingChart({ sep, metric = "swing" as "swing" | "wkts_per_100" | "runs_per_over" | "dot_pct", height = 250 }: { sep: PressureOut["separation"]; metric?: "swing" | "wkts_per_100" | "runs_per_over" | "dot_pct"; height?: number }) {
  const rows = [1, 2].map((inn) => ({ name: inn === 1 ? "First innings" : "Chase", ...Object.fromEntries((["decided", "ordinary", "HIGH"] as const).map((c) => [c, sep.find((s) => s.innings === inn && s.cls === c)?.[metric] ?? 0])) }))
  const config: ChartConfig = { decided: { label: "Decided", color: COL.decided }, ordinary: { label: "Live, not HIGH", color: COL.ordinary }, HIGH: { label: "HIGH pressure", color: COL.HIGH } }
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={rows} barCategoryGap="28%" margin={{ top: 8, right: 8, left: -8 }}>
        <CartesianGrid vertical={false} stroke="#e8ecf5" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} domain={metric === "runs_per_over" ? [0, "auto"] : [0, "auto"]} />
        <ChartTooltip cursor={{ fill: "rgba(37,74,165,0.05)" }} content={<ChartTooltipContent indicator="dot" />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {(["decided", "ordinary", "HIGH"] as const).map((c) => <Bar key={c} isAnimationActive={ANIM} animationDuration={DUR} dataKey={c} fill={COL[c]} radius={[5, 5, 0, 0]} name={config[c].label as string} />)}
      </BarChart>
    </ChartContainer>
  )
}
export function ByOverChart({ data, height = 250 }: { data: PressureOut["by_over"]; height?: number }) {
  const rows = Array.from({ length: 20 }, (_, i) => ({ over: i + 1, first: data.find((d) => d.inn === 1 && d.over === i + 1)?.high ?? 0, chase: data.find((d) => d.inn === 2 && d.over === i + 1)?.high ?? 0 }))
  const config: ChartConfig = { first: { label: "First innings", color: "#254aa5" }, chase: { label: "Chase", color: "#ea1a85" } }
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8 }}>
        <defs>
          <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#254aa5" stopOpacity={0.35} /><stop offset="100%" stopColor="#254aa5" stopOpacity={0} /></linearGradient>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ea1a85" stopOpacity={0.35} /><stop offset="100%" stopColor="#ea1a85" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e8ecf5" />
        <XAxis dataKey="over" tickLine={false} axisLine={false} fontSize={11} interval={1} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} unit="%" />
        <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => `Over ${v}`} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Area isAnimationActive={ANIM} animationDuration={DUR} type="monotone" dataKey="first" stroke="#254aa5" strokeWidth={2} fill="url(#gf)" name="First innings" />
        <Area isAnimationActive={ANIM} animationDuration={DUR} type="monotone" dataKey="chase" stroke="#ea1a85" strokeWidth={2} fill="url(#gc)" name="Chase" />
      </AreaChart>
    </ChartContainer>
  )
}
function mix(t: number) { const a = [255, 255, 255], b = [37, 74, 165]; const c = a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, Math.max(0, t)))); return `rgb(${c.join(",")})` }
export function ChaseMap({ cells }: { cells: PressureOut["chase_map"] }) {
  const cols = Array.from({ length: 10 }, (_, i) => 9 - i), rows = Array.from({ length: 10 }, (_, i) => 9 - i); const get = (by: number, bx: number) => cells.find((c) => c.by === by && c.bx === bx)
  const max = Math.max(0.01, ...cells.map((c) => c.high))
  return (
    <div>
      <div className="flex">
        <div className="mr-2 flex flex-col justify-between py-0.5 text-[10px] text-muted-foreground">{rows.map((r) => <span key={r} className="flex h-7 items-center">{r * 2}–{r * 2 + 2}</span>)}</div>
        <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
          {rows.flatMap((r) => cols.map((c) => { const cell = get(r, c); return (
            <div key={`${r}-${c}`} title={cell ? `Required ${r * 2}–${r * 2 + 2} rpo, ${c * 12}–${c * 12 + 12} balls left: ${(cell.high * 100).toFixed(0)}% HIGH (${cell.n} balls)` : "too few balls"}
              className="num grid h-7 place-items-center rounded-[5px] text-[9px] font-medium" style={{ background: cell ? mix(cell.high / max) : "#f2f4fa", color: cell && cell.high / max > 0.55 ? "white" : "#5a678a" }}>{cell && cell.high > 0.03 ? Math.round(cell.high * 100) : ""}</div>
          ) }))}
        </div>
      </div>
      <div className="ml-9 mt-1.5 grid grid-cols-10 gap-[3px] text-center text-[10px] text-muted-foreground">{cols.map((c) => <span key={c}>{c * 12 + 12}</span>)}</div>
      <div className="mt-1 text-center text-[11px] text-muted-foreground">Columns: balls remaining (the chase starts at the left). Rows: required run rate. Cell value: % of balls rated HIGH.</div>
    </div>
  )
}
