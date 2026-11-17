"use client"
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, ErrorBar, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Area, AreaChart, ReferenceArea } from "recharts"
import type { Ball, ListRow, Player } from "@/lib/types"

export const C = { blue: "#254aa5", pink: "#ea1a85", sky: "#56b4e9", gold: "#e69f00", green: "#009e73", verm: "#d55e00", grey: "#9aa6c4", navy: "#0a1a4a" }
const axis = { fontSize: 11, fill: "#5a678a" }
const grid = <CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" vertical={false} />
const tip = { contentStyle: { borderRadius: 10, border: "1px solid #e2e7f2", fontSize: 12, boxShadow: "0 8px 24px rgba(13,26,63,.08)" }, cursor: { fill: "rgba(37,74,165,.06)" } }

/** Rank spread of the finalists: bar = 10th-90th percentile rank across match resamples (blue) and across alternative definitions (pink). */
export function RankSpread({ rows, height = 420 }: { rows: ListRow[]; height?: number }) {
  const data = rows.map((r) => ({ name: `${r.rank}. ${r.name}`, r: [r.p10, r.p90], d: r.def_p10 != null ? [r.def_p10, r.def_p90] : [0, 0], med: r.median, dmed: r.def_median, top10_r: r.top10_r, top10_d: r.top10_d }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={-14} barCategoryGap={10}>
        <CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[1, "dataMax + 2"]} tick={axis} tickLine={false} axisLine={false} label={{ value: "Rank (lower is better)", position: "insideBottom", offset: -2, fontSize: 11, fill: "#5a678a" }} />
        <YAxis type="category" dataKey="name" tick={{ ...axis, fill: "#0d1a3f" }} width={150} tickLine={false} axisLine={false} />
        <ReferenceLine x={10.5} stroke={C.gold} strokeDasharray="4 3" />
        <Tooltip {...tip} formatter={(v: any, n: any, p: any) => [Array.isArray(v) ? `${v[0].toFixed(0)} – ${v[1].toFixed(0)}` : v, n === "r" ? `Match resamples (top 10 in ${(p.payload.top10_r * 100).toFixed(0)}%)` : `Alternative definitions${p.payload.top10_d != null ? ` (top 10 in ${(p.payload.top10_d * 100).toFixed(0)}%)` : ""}`]} />
        <Bar isAnimationActive={false} dataKey="r" fill={C.blue} barSize={9} radius={4} name="r" />
        <Bar isAnimationActive={false} dataKey="d" fill={C.pink} barSize={9} radius={4} name="d" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function Legend({ items }: { items: { c: string; l: string }[] }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">{items.map((i) => <span key={i.l} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: i.c }} />{i.l}</span>)}</div>
}

/** Horizontal interval chart: estimate with 90% interval per row. */
export function IntervalChart({ rows, height = 300, domain, unit }: { rows: { label: string; est: number; lo: number; hi: number; bold?: boolean; color?: string }[]; height?: number; domain?: [number, number]; unit?: string }) {
  const data = rows.map((r) => ({ ...r, err: [r.est - r.lo, r.hi - r.est] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={domain} tick={axis} tickLine={false} axisLine={false} unit={unit} />
        <YAxis type="category" dataKey="label" tick={axis} width={190} tickLine={false} axisLine={false} />
        <ReferenceLine x={0} stroke="#0d1a3f" />
        <Tooltip {...tip} formatter={(v: any, _n: any, p: any) => [`${p.payload.est.toFixed(1)}  [${p.payload.lo.toFixed(1)}, ${p.payload.hi.toFixed(1)}]`, "estimate [90% interval]"]} />
        <Bar isAnimationActive={false} dataKey="est" barSize={11} radius={3}>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? (d.bold ? C.pink : d.lo > 0 ? C.blue : d.hi < 0 ? C.verm : C.grey)} />)}
          <ErrorBar dataKey="err" width={5} stroke="#0d1a3f" strokeWidth={1.2} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Usual versus HIGH on a shared scale per metric (two thin bars with values). */
export function PairedBars({ rows, dec = 0, lowerBetter }: { rows: { label: string; usual: number | null; high: number | null; lowerBetter?: boolean }[]; dec?: number; lowerBetter?: boolean }) {
  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const mx = Math.max(r.usual ?? 0, r.high ?? 0, 1e-9) * 1.08; const lb = r.lowerBetter ?? lowerBetter; const better = r.usual != null && r.high != null ? (lb ? r.high < r.usual : r.high > r.usual) : null
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between text-xs"><span className="font-medium">{r.label}</span>{better != null && <span className={better ? "text-emerald-600" : "text-rr-pink"}>{better ? "better under pressure" : "lower under pressure"}</span>}</div>
            {([["Usual", r.usual, "bg-[#56b4e9]"], ["HIGH", r.high, "bg-rr-pink"]] as const).map(([n, v, c]) => (
              <div key={n} className="flex items-center gap-2 py-0.5"><span className="w-10 text-[10px] uppercase tracking-wide text-muted-foreground">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${c}`} style={{ width: `${v == null ? 0 : (v / mx) * 100}%` }} /></div>
                <span className="num w-12 text-right text-xs font-medium">{v == null ? "–" : v.toFixed(dec)}</span></div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Usual versus HIGH for one metric over a set of groups (years or phases). */
export function GroupedBars({ data, usualKey = "usual", highKey = "high", height = 200, unit }: { data: { name: string; usual: number | null; high: number | null }[]; usualKey?: string; highKey?: string; height?: number; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }} barGap={3}>
        {grid}<XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
        <Tooltip {...tip} formatter={(v: any) => (typeof v === "number" ? v.toFixed(unit === "econ" ? 2 : 0) : v)} />
        <Bar isAnimationActive={false} dataKey={usualKey} name="Usual (non-HIGH balls)" fill={C.sky} radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey={highKey} name="HIGH pressure" fill={C.pink} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Every pressure innings or spell: pressure-weighted value against the league (consistency). */
export function InningsStrip({ innings, unit }: { innings: Player["innings"]; unit: string }) {
  const data = innings.map((i, n) => ({ n, date: i.date, opp: i.opp, val: i.val, up: i.val > 0 }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ScatterChart margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" /><XAxis type="number" dataKey="n" tick={false} axisLine={false} tickLine={false} label={{ value: "Pressure innings in date order", position: "insideBottom", offset: -4, fontSize: 11, fill: "#5a678a" }} />
        <YAxis type="number" dataKey="val" tick={axis} tickLine={false} axisLine={false} /><ZAxis range={[40, 40]} /><ReferenceLine y={0} stroke="#0d1a3f" />
        <Tooltip {...tip} cursor={{ strokeDasharray: "3 3" }} formatter={(v: any) => [`${(+v).toFixed(1)} ${unit}`, "vs league"]} labelFormatter={() => ""} content={({ payload }) => payload?.length ? <div className="rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow"><div className="font-medium">{payload[0].payload.opp}</div><div className="text-muted-foreground">{payload[0].payload.date}</div><div className="num mt-0.5">{(+payload[0].payload.val).toFixed(1)} {unit} vs league</div></div> : null} />
        <Scatter isAnimationActive={false} data={data}>{data.map((d, i) => <Cell key={i} fill={d.up ? C.blue : C.verm} />)}</Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

/** Level against consistency for the whole pool, finalists highlighted. */
export function PoolScatter({ pool, xKey, yKey, xLabel, yLabel, onPick }: { pool: Player[]; xKey: string; yKey: string; xLabel: string; yLabel: string; onPick?: (p: Player) => void }) {
  const data = pool.filter((p) => p.comp[xKey] != null && p.comp[yKey] != null).map((p) => ({ x: p.comp[xKey] as number, y: p.comp[yKey] as number, name: p.name, fin: p.final_rank != null, p }))
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 14 }}>
        <CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" tick={axis} tickLine={false} axisLine={false} name={xLabel} label={{ value: xLabel, position: "insideBottom", offset: -8, fontSize: 11, fill: "#5a678a" }} />
        <YAxis type="number" dataKey="y" tick={axis} tickLine={false} axisLine={false} name={yLabel} label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11, fill: "#5a678a" }} /><ZAxis range={[46, 46]} />
        <Tooltip {...tip} cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => payload?.length ? <div className="rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow"><div className="font-medium">{payload[0].payload.name}</div><div className="num text-muted-foreground">{xLabel}: {(+payload[0].payload.x).toFixed(2)} · {yLabel}: {(+payload[0].payload.y).toFixed(2)}</div></div> : null} />
        <Scatter isAnimationActive={false} data={data.filter((d) => !d.fin)} fill={C.grey} fillOpacity={0.55} onClick={(d: any) => onPick?.(d.p)} cursor="pointer" />
        <Scatter isAnimationActive={false} data={data.filter((d) => d.fin)} fill={C.pink} stroke="#fff" onClick={(d: any) => onPick?.(d.p)} cursor="pointer" />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

/** Ball-by-ball win probability with HIGH-pressure stretches shaded, and the pressure index below. */
export function WinProbChart({ balls, target }: { balls: Ball[]; target?: number | null }) {
  const data = balls.map((b, i) => ({ i, over: b.o, wp: b.wp, pi: b.pi, hi: b.hi ? 1 : 0, bat: b.bat, bowl: b.bowl, r: b.r, w: b.w }))
  const areas: [number, number][] = []; let s: number | null = null
  data.forEach((d, i) => { if (d.hi && s == null) s = i; if ((!d.hi || i === data.length - 1) && s != null) { areas.push([s, d.hi ? i : i - 1]); s = null } })
  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }} syncId="wp">
          {grid}{areas.map((a, k) => <ReferenceArea key={k} x1={a[0]} x2={a[1]} fill={C.pink} fillOpacity={0.14} />)}
          <XAxis dataKey="i" type="number" domain={[0, data.length - 1]} tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.floor((data[Math.min(v, data.length - 1)]?.over ?? 0)) }`} />
          <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" /><ReferenceLine y={50} stroke="#9aa6c4" strokeDasharray="4 3" />
          <Tooltip {...tip} content={({ payload }) => payload?.length ? <div className="rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow"><div className="font-medium">{payload[0].payload.bowl} to {payload[0].payload.bat}</div><div className="num text-muted-foreground">over {payload[0].payload.over.toFixed(1)} · {payload[0].payload.r} runs{payload[0].payload.w ? " · WICKET" : ""}</div><div className="num mt-0.5">win probability {payload[0].payload.wp.toFixed(0)}% · pressure {(payload[0].payload.pi * 100).toFixed(0)}</div></div> : null} />
          <Line isAnimationActive={false} type="monotone" dataKey="wp" stroke={C.blue} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={90}>
        <AreaChart data={data} margin={{ left: -10, right: 8, top: 4, bottom: 0 }} syncId="wp">
          <XAxis dataKey="i" type="number" domain={[0, data.length - 1]} tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.floor((data[Math.min(v, data.length - 1)]?.over ?? 0))}`} />
          <YAxis domain={[0, 1]} tick={false} axisLine={false} tickLine={false} width={34} /><ReferenceLine y={0.75} stroke={C.pink} strokeDasharray="3 3" />
          <Area isAnimationActive={false} type="step" dataKey="pi" stroke={C.pink} fill={C.pink} fillOpacity={0.25} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
