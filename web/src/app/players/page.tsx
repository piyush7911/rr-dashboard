"use client"
import { ANIM, DUR } from "@/lib/anim"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Bar, BarChart, CartesianGrid, Cell, Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts"
import { Search } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Kpi, Loading, PageHeader, Panel, Pill, Seg } from "@/components/ui-bits"
import { useParams } from "@/lib/params"
import { useGet, usePost } from "@/lib/use-api"
import { f1, LABELS, pct } from "@/lib/format"
import type { Kind, PlayerOut } from "@/lib/types"

const cfg: ChartConfig = { usual: { label: "Usual", color: "#56b4e9" }, high: { label: "HIGH pressure", color: "#ea1a85" } }
function Inner() {
  const sp = useSearchParams(); const router = useRouter(); const { debounced } = useParams()
  const kind = (sp.get("kind") as Kind) ?? "bat"; const id = sp.get("id"); const [q, setQ] = useState(""); const [dq, setDq] = useState("")
  useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t) }, [q])
  const list = useGet<{ id: number; name: string; balls: number }[]>(`/players?kind=${kind}&q=${encodeURIComponent(dq)}`)
  const { data: pl, loading } = usePost<PlayerOut>("/player", { kind, id: Number(id), pressure: debounced.pressure, rate: debounced.rate }, !!id)
  const go = (k: string, i?: number) => router.replace(`/players?kind=${k}${i ? `&id=${i}` : ""}`)
  const bat = kind === "bat"; const metric = (s: any) => (s ? (bat ? s.sr : s.econ) : null)
  const ORDER = ['PP', 'Mid', 'Death']
  const phaseData = pl?.by_phase.slice().sort((a, b) => ORDER.indexOf(a.phase) - ORDER.indexOf(b.phase)).map((p) => ({ name: { PP: "Powerplay", Mid: "Overs 7–15", Death: "Death overs" }[p.phase] ?? p.phase, usual: metric(p.usual), high: metric(p.high) })) ?? []
  const yearData = pl?.by_year.map((p) => ({ name: String(p.year), usual: metric(p.usual), high: metric(p.high) })) ?? []
  const inn = pl?.innings.map((r, i) => ({ i: i + 1, v: r.v, label: `${r.date} v ${r.opp_name}` })) ?? []
  const labels = LABELS(kind); const keys = bat ? ["SRoA", "SRhA", "res", "cons"] : ["Pz", "res", "relz", "cz"]
  const SHORT: Record<string, string> = { SRoA: 'Overall', SRhA: 'Pressure', res: 'Resilience', cons: 'Consistency', Pz: 'Pressure', relz: 'Consistency', cz: 'Specific' }
  const comp = pl ? keys.map((k) => ({ k: SHORT[k] ?? labels[k], v: pl.components[k] ?? 0 })) : []
  const above = inn.filter((x) => x.v > 0).length
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Player cards" title="Player profile" desc="Compare a player’s performance on HIGH-pressure balls with his usual level, by phase and by year." right={<div className="w-52"><Seg value={kind} onChange={(v) => go(v)} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} /></div>} />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Panel title="Select player">
          <div className="relative mb-3"><Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-9 pl-8 text-sm" /></div>
          <div className="max-h-[520px] space-y-0.5 overflow-y-auto pr-1">{list.data?.map((p) => <button key={p.id} onClick={() => go(kind, p.id)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${String(p.id) === id ? "bg-rr-blue text-white" : "hover:bg-secondary"}`}><span className="truncate">{p.name}</span><span className={`num text-[11px] ${String(p.id) === id ? "text-white/70" : "text-muted-foreground"}`}>{p.balls}</span></button>)}</div>
        </Panel>
        {!id ? <div className="grid place-items-center rounded-xl border border-dashed p-12 text-sm text-muted-foreground">Select a player to view the profile.</div> : !pl ? <Loading h={500} /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-rr-navy to-rr-blue p-5 text-white">
              <div><div className="text-xl font-semibold">{pl.name}</div><div className="mt-1 text-xs text-white/70">{pl.teams_played.join(" · ")} · {pl.matches} matches · {pct(pl.ipl_share)} of balls in the IPL</div></div>
              <div className="flex flex-wrap gap-2">{pl.consensus_rank && <span className="rounded-full bg-rr-pink px-3 py-1 text-xs font-semibold">Consensus rank {pl.consensus_rank}</span>}<span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{pl.eligible ? `Rank ${pl.rank} of ${pl.n_eligible} (current settings)` : "Not eligible under current settings"}</span>{loading && <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Updating…</span>}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="HIGH-pressure balls" value={pl.high?.balls ?? 0} sub={`${pl.usual?.balls ?? 0} on ordinary balls`} />
              <Kpi label={bat ? "Strike rate, usual → HIGH" : "Economy, usual → HIGH"} value={<span className="text-xl">{f1(metric(pl.usual), bat ? 0 : 2)} → {f1(metric(pl.high), bat ? 0 : 2)}</span>} accent="pink" />
              <Kpi label={bat ? "Out per 100 HIGH balls" : "Wickets per 100 HIGH balls"} value={f1(bat ? pl.high?.out : pl.high?.wkts)} sub={`usual ${f1(bat ? pl.usual?.out : pl.usual?.wkts)}`} />
              <Kpi label={bat ? "Innings above league" : "Spells above league"} value={inn.length ? `${above}/${inn.length}` : "–"} sub={inn.length ? pct(above / inn.length) + (bat ? " of innings" : " of spells") : undefined} accent="gold" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title={bat ? "Strike rate by phase" : "Economy by phase"} desc="Unadjusted: usual versus HIGH-pressure balls">
                <ChartContainer config={cfg} className="h-[230px] w-full"><BarChart data={phaseData} barCategoryGap="30%" margin={{ left: -10, top: 6 }}><CartesianGrid vertical={false} stroke="#e8ecf5" /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11.5} /><YAxis tickLine={false} axisLine={false} fontSize={11} /><ChartTooltip content={<ChartTooltipContent indicator="dot" />} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="usual" name="Usual" fill="#56b4e9" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /><Bar dataKey="high" name="HIGH pressure" fill="#ea1a85" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /></BarChart></ChartContainer>
              </Panel>
              <Panel title={bat ? "Strike rate by year" : "Economy by year"} desc="Unadjusted: usual versus HIGH-pressure balls">
                <ChartContainer config={cfg} className="h-[230px] w-full"><BarChart data={yearData} barCategoryGap="30%" margin={{ left: -10, top: 6 }}><CartesianGrid vertical={false} stroke="#e8ecf5" /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11.5} /><YAxis tickLine={false} axisLine={false} fontSize={11} /><ChartTooltip content={<ChartTooltipContent indicator="dot" />} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="usual" name="Usual" fill="#56b4e9" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /><Bar dataKey="high" name="HIGH pressure" fill="#ea1a85" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /></BarChart></ChartContainer>
              </Panel>
            </div>
            <div className="grid gap-5 lg:grid-cols-5">
              <Panel className="lg:col-span-3" title={bat ? "Consistency by innings" : "Consistency by spell"} desc={`Pressure-weighted ${bat ? "runs above" : "runs saved against"} the league average. Blue: above; pink: below.`}>
                {inn.length ? (
                  <ChartContainer config={{ v: { label: "Value", color: "#254aa5" } }} className="h-[240px] w-full"><ScatterChart margin={{ left: -10, top: 6, right: 10 }}><CartesianGrid stroke="#e8ecf5" /><XAxis type="number" dataKey="i" tickLine={false} axisLine={false} fontSize={11} name="Innings #" /><YAxis type="number" dataKey="v" tickLine={false} axisLine={false} fontSize={11} /><ZAxis range={[40, 40]} /><ReferenceLine y={0} stroke="#0a1a4a" strokeWidth={1.2} /><ChartTooltip content={({ payload }) => payload?.length ? <div className="rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow"><div className="font-medium">{(payload[0].payload as any).label}</div><div className="num text-muted-foreground">{f1((payload[0].payload as any).v, 2)}</div></div> : null} /><Scatter data={inn} isAnimationActive={ANIM} animationDuration={DUR}>{inn.map((d, i) => <Cell key={i} fill={d.v > 0 ? "#254aa5" : "#ea1a85"} fillOpacity={0.8} />)}</Scatter></ScatterChart></ChartContainer>
                ) : <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">No innings with enough pressure balls.</div>}
              </Panel>
              <Panel className="lg:col-span-2" title="Score components" desc="Standardised across eligible players (0 = average)">
                {pl.eligible ? (
                  <ChartContainer config={{ v: { label: "z", color: "#254aa5" } }} className="mx-auto h-[240px] w-full"><RadarChart data={comp} outerRadius="62%" margin={{ left: 44, right: 44, top: 12, bottom: 12 }}><PolarGrid stroke="#dfe5f1" /><PolarAngleAxis dataKey="k" fontSize={11} /><Radar dataKey="v" stroke="#254aa5" fill="#254aa5" fillOpacity={0.25} strokeWidth={2} isAnimationActive={ANIM} animationDuration={DUR} /><ChartTooltip content={<ChartTooltipContent />} /></RadarChart></ChartContainer>
                ) : <div className="grid h-[240px] place-items-center text-center text-sm text-muted-foreground">Not eligible under current settings.<br />Relax the eligibility rules to see components.</div>}
              </Panel>
            </div>
            {pl.consensus_rank && <Panel title="Stability across 200 definitions"><div className="flex flex-wrap gap-2 text-[13px]"><Pill tone="blue">Consensus rank {pl.consensus_rank}</Pill><Pill tone="green">In top 10 under {pct(pl.top10_share)} of definitions</Pill><Pill tone="grey">Rank range {f1(pl.p10, 0)}–{f1(pl.p90, 0)}</Pill></div></Panel>}
          </div>
        )}
      </div>
    </div>
  )
}
export default function Players() { return <Suspense fallback={<Loading h={400} />}><Inner /></Suspense> }
