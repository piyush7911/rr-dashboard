"use client"
import { ANIM, DUR } from "@/lib/anim"
import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Kpi, Loading, PageHeader, Panel, Pill, Seg } from "@/components/ui-bits"
import { useParams } from "@/lib/params"
import { useGet, usePost } from "@/lib/use-api"
import { f1 } from "@/lib/format"
import type { MatchOut, MatchRow } from "@/lib/types"

export default function Replay() {
  const { debounced } = useParams(); const [q, setQ] = useState(""); const [dq, setDq] = useState(""); const [sel, setSel] = useState<number | null>(null); const [inn, setInn] = useState(2); const [sortBy, setSortBy] = useState<'date' | 'hi'>('date')
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t) }, [q])
  const list = useGet<MatchRow[]>(`/matches?q=${encodeURIComponent(dq)}`)
  useEffect(() => { if (sel == null && list.data?.length) setSel([...list.data].sort((a, b) => (b.ko - a.ko) * 10 + (b.hi_share - a.hi_share))[0].match_id) }, [list.data, sel])
  const { data: m } = usePost<MatchOut>("/match", { id: sel, pressure: debounced.pressure }, sel != null)
  const innings = m?.innings.find((x) => x.innings === inn) ?? m?.innings[0]; const balls = innings?.balls ?? []
  useEffect(() => { if (m && !m.innings.find((x) => x.innings === inn)) setInn(m.innings[0].innings) }, [m, inn])
  const moments = useMemo(() => [...balls].filter((b) => b.hi).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8), [balls])
  const wk = balls.filter((b) => b.wicket), hiShare = balls.length ? balls.filter((b) => b.hi).length / balls.length : 0
  const data = balls.map((b) => ({ ...b, over: Math.ceil((b.n) / 6) }))
  const xt = (v: number) => `${Math.floor(v / 6)}`
  const abbr = (t: string) => (t.split(' ').length > 1 ? t.split(' ').map((w) => w[0]).join('').toUpperCase() : t)
  const cur = list.data?.find((x) => x.match_id === sel)
  const wpCfg: ChartConfig = { wp: { label: "Win probability (batting side)", color: "#254aa5" } }, piCfg: ChartConfig = { pi: { label: "Pressure index", color: "#ea1a85" } }
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Match replay" title="Pressure, ball by ball" desc="Select a match to follow the batting side’s win probability and the pressure index through each innings. Dots mark wickets; the dashed line marks the HIGH threshold of the current definition." />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Panel title="Matches"><div className="mb-2"><Seg value={sortBy} onChange={setSortBy} options={[{ v: "date", l: "Latest" }, { v: "hi", l: "Most pressure" }]} /></div><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, competition or stage" className="mb-3 h-9 text-sm" />
          <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">{[...(list.data ?? [])].sort((a, b) => (sortBy === 'hi' ? b.hi_share - a.hi_share : 0)).map((r) => <button key={r.match_id} onClick={() => setSel(r.match_id)} className={`w-full rounded-lg px-2.5 py-2 text-left transition ${sel === r.match_id ? "bg-rr-blue text-white" : "hover:bg-secondary"}`}><div className="truncate text-[13px] font-medium">{r.teams}</div><div className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${sel === r.match_id ? "text-white/75" : "text-muted-foreground"}`}>{r.date} · {r.comp}{r.ko === 1 && <span className="rounded bg-rr-pink px-1 text-[10px] font-semibold text-white">KO</span>}<span className="num ml-auto whitespace-nowrap">{(r.hi_share * 100).toFixed(0)}% HIGH</span></div></button>)}</div>
        </Panel>
        {!m || !innings ? <Loading h={560} /> : (
          <div className="space-y-5">
            <div className="rounded-xl bg-gradient-to-r from-rr-navy to-rr-blue p-5 text-white"><div className="text-lg font-semibold">{cur?.teams}</div><div className="mt-1 text-xs text-white/75">{m.info.date} · {m.info.comp}{m.info.stage ? ` · ${m.info.stage}` : ""}</div><div className="mt-2 text-sm text-white/90">{m.info.result}</div></div>
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="w-72"><Seg value={innings.innings} onChange={setInn} options={m.innings.map((x) => ({ v: x.innings, l: `${x.innings === 1 ? "First innings" : "Chase"} · ${abbr(x.team)}` }))} /></div><div className="flex gap-2"><Pill tone="pink">{f1(hiShare * 100, 0)}% of balls rated HIGH</Pill><Pill tone="blue">{wk.length} {wk.length === 1 ? "wicket" : "wickets"}</Pill>{innings.target && <Pill tone="gold">target {innings.target}</Pill>}</div></div>
            <Panel title="Win probability, batting side" desc="Out-of-fold model; dots mark wickets">
              <ChartContainer config={wpCfg} className="h-[210px] w-full"><LineChart data={data} margin={{ left: -6, top: 8, right: 8 }}><CartesianGrid vertical={false} stroke="#e8ecf5" /><XAxis dataKey="n" type="number" domain={[1, "dataMax"]} tickFormatter={xt} tickLine={false} axisLine={false} fontSize={11} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} unit="%" /><ReferenceLine y={50} stroke="#b9c3de" strokeDasharray="3 3" /><ChartTooltip content={({ payload }) => payload?.length ? <div className="rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow"><div className="font-medium">Over {(payload[0].payload as any).over} · {(payload[0].payload as any).bat} v {(payload[0].payload as any).bowl}</div><div className="num text-muted-foreground">win prob {f1((payload[0].payload as any).wp)}% · score {(payload[0].payload as any).runs_before}/{(payload[0].payload as any).wkts}</div></div> : null} /><Line type="monotone" dataKey="wp" stroke="#254aa5" strokeWidth={2.2} dot={false} isAnimationActive={ANIM} animationDuration={DUR} />{wk.map((w) => <ReferenceDot key={w.n} x={w.n} y={w.wp} r={4} fill="#ea1a85" stroke="white" strokeWidth={1.5} />)}</LineChart></ChartContainer>
            </Panel>
            <Panel title="Pressure index" desc="Percentile within innings and phase under the current definition; 0 means the match is effectively decided"><ChartContainer config={piCfg} className="h-[170px] w-full"><AreaChart data={data} margin={{ left: -6, top: 8, right: 8 }}><defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ea1a85" stopOpacity={0.4} /><stop offset="100%" stopColor="#ea1a85" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8ecf5" /><XAxis dataKey="n" type="number" domain={[1, "dataMax"]} tickFormatter={xt} tickLine={false} axisLine={false} fontSize={11} /><YAxis domain={[0, 1]} tickLine={false} axisLine={false} fontSize={11} /><ReferenceLine y={debounced.pressure.high_pct} stroke="#0a1a4a" strokeDasharray="4 3" /><Area type="stepAfter" dataKey="pi" stroke="#ea1a85" strokeWidth={1.6} fill="url(#gp)" isAnimationActive={ANIM} animationDuration={DUR} /></AreaChart></ChartContainer></Panel>
            <Panel title="Highest-impact HIGH-pressure balls" desc="Balls rated HIGH, ordered by change in win probability">
              <table className="num w-full text-[12.5px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th className="pb-2">Over</th><th className="pb-2">Batter v bowler</th><th className="pb-2">Score</th><th className="pb-2 text-right">Outcome</th><th className="pb-2 text-right">Win prob. change</th></tr></thead>
                <tbody>{moments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No balls in this innings meet the HIGH threshold under the current definition.</td></tr>}{moments.map((b) => <tr key={b.n} className="border-t border-border/60"><td className="py-1.5">{Math.floor((b.n - 1) / 6)}.{((b.n - 1) % 6) + 1}</td><td>{b.bat} <span className="text-muted-foreground">v</span> {b.bowl}</td><td>{b.runs_before}/{b.wkts}</td><td className="text-right">{b.wicket ? <Pill tone="pink">WICKET</Pill> : `${b.runs} run${b.runs === 1 ? "" : "s"}`}</td><td className={`text-right font-semibold ${b.delta >= 0 ? "text-[#00805a]" : "text-rr-pink"}`}>{b.delta >= 0 ? "+" : ""}{f1(b.delta)}</td></tr>)}</tbody></table>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
