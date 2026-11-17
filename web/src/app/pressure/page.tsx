"use client"
import { Bar, BarChart, CartesianGrid, Legend as RLegend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PageHeader, Panel, Pill, Loading, Kpi } from "@/components/ui-bits"
import { C } from "@/components/charts"
import { useEvidence, usePressure, useSummary } from "@/lib/data"
import { pct } from "@/lib/format"

const axis = { fontSize: 11, fill: "#5a678a" }
function Heat({ cells }: { cells: { by: string; bx: string; n: number; high: number }[] }) {
  const lo = (s: string) => +s.replace("(", "").split(",")[0]
  const yl = Array.from(new Set(cells.map((c) => c.by))).sort((a, b) => lo(b) - lo(a)); const xl = Array.from(new Set(cells.map((c) => c.bx))).sort((a, b) => lo(b) - lo(a)); const get = (y: string, x: string) => cells.find((c) => c.by === y && c.bx === x)
  const col = (v: number) => `rgba(234,26,133,${Math.min(0.95, 0.06 + v * 1.4)})`
  return (
    <div>
      <div className="overflow-x-auto"><div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `52px repeat(${xl.length}, minmax(34px, 1fr))` }}>
        {yl.map((y) => (<div key={y} className="contents"><div className="num flex items-center justify-end pr-2 text-[10px] text-muted-foreground">{y.replace("(", "").replace("]", "").replace(",", "–")}</div>
          {xl.map((x) => { const c = get(y, x); return <div key={x} title={c ? `${(c.high * 100).toFixed(0)}% HIGH · ${c.n} balls` : ""} className="h-6 rounded-[3px]" style={{ background: c ? col(c.high) : "#f1f3f9" }} /> })}</div>))}
        <div />{xl.map((x) => <div key={x} className="num pt-1 text-center text-[9px] text-muted-foreground">{lo(x) === 0 ? "0–12" : `${lo(x)}–${lo(x) + 12}`}</div>)}
      </div></div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>Vertical: required run rate · Horizontal: balls left in the chase</span><span>Darker = more balls classed HIGH</span></div>
    </div>
  )
}

export default function Pressure() {
  const { data: s } = useSummary(); const { data: ev } = useEvidence(); const { data: pr } = usePressure()
  const sep = ev?.separation ?? []; const sw = (inn: number, c: string) => sep.find((x) => x.innings === inn && x.cls === c)
  const sepData = [1, 2].map((inn) => ({ name: inn === 1 ? "First innings" : "Chase", Decided: sw(inn, "decided")?.swing, Ordinary: sw(inn, "ordinary")?.swing, HIGH: sw(inn, "HIGH")?.swing }))
  const wkData = [1, 2].map((inn) => ({ name: inn === 1 ? "First innings" : "Chase", Decided: sw(inn, "decided")?.wkts_per_100, Ordinary: sw(inn, "ordinary")?.wkts_per_100, HIGH: sw(inn, "HIGH")?.wkts_per_100 }))
  const over = (inn: number) => (pr?.by_over ?? []).filter((o) => o.innings === inn).map((o) => ({ over: o.over, High: +(o.high * 100).toFixed(1) }))
  const overData = Array.from({ length: 20 }, (_, i) => ({ over: i + 1, "First innings": over(1)[i]?.High, Chase: over(2)[i]?.High }))
  const fac = (key: string, inn: number, out: string) => ev?.factors.find((f) => f.key === key && f.innings === inn && f.outcome === out)
  const factRows = [["new_bat", 2, "Bat runs per 100 balls", "Striker on 0–5 balls faced", "Used in the batter baseline"], ["wk12", 1, "Bat runs per 100 balls", "Each wicket in the previous 12 balls (first innings)", "Part of the custom definitions in the grid"], ["dots6", 2, "Wickets per 100 balls", "Each dot in the previous 6 balls (wickets)", "Not used: no wicket effect"], ["ko", 1, "Wickets per 100 balls", "Knockout match (first-innings wickets)", "Not used by default"], ["big_target", 2, "Bat runs per 100 balls", "Chasing 200 or more", "Captured by the required-rate terms"]] as const
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Definition" title="How pressure is defined" desc="Pressure is the degree to which the next ball can change the result. It is a property of the situation, computed from state only, never from what the batter or bowler does." />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="A. Leverage"><p className="text-[13px] leading-relaxed text-muted-foreground">The expected swing in win probability from the next ball, summed over outcomes (dot, 1, 2, 3, 4, 6, wicket). Win probability comes from a LightGBM model averaged with an exactly solved dynamic program (chase AUC <b className="text-foreground">{s?.wp_chase.Average.auc.toFixed(3) ?? "–"}</b>). Counted only while the match is live (win probability between 10% and 90%).</p></Panel>
        <Panel title="B. Rule-based"><p className="text-[13px] leading-relaxed text-muted-foreground"><b className="text-foreground">Closeness</b> = exp(−ln(ratio)² / 2σ²), where ratio is the required rate over the normal rate for the resources left (first innings: venue par over projected total). <b className="text-foreground">Scarcity</b> grows as balls and wickets run out. Score = closeness × scarcity.</p></Panel>
        <Panel title="Consensus (used)"><p className="text-[13px] leading-relaxed text-muted-foreground">Average of the two percentiles, counted only when <i>both</i> say the match is live. <b className="text-foreground">HIGH pressure = top 25%</b> of live balls within each innings and phase, so a powerplay ball is compared with powerplay balls and a death-over ball with death-over balls.</p></Panel>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="HIGH balls" value={s ? s.high_balls.toLocaleString() : "–"} sub={s ? `${pct(s.high_share, 1)} of all balls` : undefined} accent="pink" />
        <Kpi label="Decided matches" value={s ? pct(s.decided_share, 1) : "–"} sub="not treated as pressure" />
        <Kpi label="Chase swing, HIGH vs ordinary" value={sw(2, "HIGH") ? `${(sw(2, "HIGH")!.swing / sw(2, "ordinary")!.swing).toFixed(1)}×` : "–"} accent="gold" />
        <Kpi label="First-innings swing" value={sw(1, "HIGH") ? `${(sw(1, "HIGH")!.swing / sw(1, "ordinary")!.swing).toFixed(1)}×` : "–"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="HIGH balls carry far more of the match" desc="Mean change in win probability per ball (points)">
          {!ev ? <Loading /> : <ResponsiveContainer width="100%" height={260}><BarChart data={sepData} margin={{ left: -10, right: 8, top: 8 }}><CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} /><Tooltip formatter={(v: any) => (+v).toFixed(2)} /><RLegend wrapperStyle={{ fontSize: 11 }} />
            <Bar isAnimationActive={false} dataKey="Decided" fill="#cfd7ea" radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey="Ordinary" fill={C.sky} radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey="HIGH" fill={C.pink} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}
        </Panel>
        <Panel title="Wickets fall faster under HIGH pressure" desc="Wickets per 100 legal balls">
          {!ev ? <Loading /> : <ResponsiveContainer width="100%" height={260}><BarChart data={wkData} margin={{ left: -10, right: 8, top: 8 }}><CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} /><Tooltip formatter={(v: any) => (+v).toFixed(2)} /><RLegend wrapperStyle={{ fontSize: 11 }} />
            <Bar isAnimationActive={false} dataKey="Decided" fill="#cfd7ea" radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey="Ordinary" fill={C.sky} radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey="HIGH" fill={C.pink} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title="Where pressure sits in a chase" desc="Share of balls classed HIGH by required run rate and balls left" className="lg:col-span-3">{!pr ? <Loading h={300} /> : <Heat cells={pr.chase_map} />}</Panel>
        <Panel title="HIGH share by over" desc="Percentage of legal balls classed HIGH" className="lg:col-span-2">
          {!pr ? <Loading h={300} /> : <ResponsiveContainer width="100%" height={280}><LineChart data={overData} margin={{ left: -10, right: 8, top: 8 }}><CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="over" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} unit="%" /><Tooltip /><RLegend wrapperStyle={{ fontSize: 11 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="First innings" stroke={C.blue} strokeWidth={2} dot={false} /><Line isAnimationActive={false} type="monotone" dataKey="Chase" stroke={C.pink} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>}
        </Panel>
      </div>
      <Panel title="Other situational factors" desc="Each tested for an effect on the next ball with the match state held fixed (innings × over, tier × year, wickets down; match-clustered errors)" className="overflow-x-auto">
        {!ev ? <Loading h={160} /> : <table className="w-full min-w-[640px] text-[13px]"><thead><tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Factor</th><th className="px-3 py-2 text-right">Effect</th><th className="px-3 py-2 text-right">t</th><th className="px-3 py-2">How it is used</th></tr></thead>
          <tbody>{factRows.map(([k, i, o, l, u]) => { const f = fac(k, i, o); return <tr key={k} className="border-t border-border/60"><td className="py-2 pr-3">{l}</td><td className="num px-3 py-2 text-right">{f ? `${f.effect > 0 ? "+" : ""}${f.effect.toFixed(2)}` : "–"} <span className="text-[11px] text-muted-foreground">{o.replace("Bat ", "").replace("Wickets per 100 balls", "wkts / 100")}</span></td><td className="num px-3 py-2 text-right">{f ? f.t.toFixed(1) : "–"}</td><td className="px-3 py-2 text-muted-foreground">{u}</td></tr> })}</tbody></table>}
      </Panel>
      <div className="flex flex-wrap gap-2"><Pill tone="grey">Pressure is defined once for the final lists</Pill><Pill tone="grey">Alternative definitions are reported as a stability check</Pill></div>
    </div>
  )
}
