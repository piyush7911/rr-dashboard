"use client"
import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { PageHeader, Panel, Pill, Kpi, Seg, Loading } from "@/components/ui-bits"
import { GroupedBars, InningsStrip, PairedBars, C } from "@/components/charts"
import { Input } from "@/components/ui/input"
import { koRecord } from "@/components/knockout"
import { PlayerPicker } from "@/components/player-picker"
import { usePlayers, useSummary } from "@/lib/data"
import { pct } from "@/lib/format"
import type { Kind, Player, Summary } from "@/lib/types"

function ShareBar({ title, parts }: { title: string; parts: { l: string; v: number; c: string }[] }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      <div className="flex h-9 overflow-hidden rounded-lg bg-muted">
        {parts.map((x) => <div key={x.l} className="grid place-items-center text-[12px] font-semibold text-white" style={{ width: `${Math.max(x.v * 100, 0)}%`, background: x.c }} title={`${x.l}: ${pct(x.v)}`}>{x.v >= 0.12 ? pct(x.v) : ""}</div>)}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
        {parts.map((x) => <div key={x.l} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: x.c }} /><span className="text-muted-foreground">{x.l}</span><span className="num font-semibold">{pct(x.v)}</span></div>)}
      </div>
    </div>
  )
}

function notes(p: Player, s?: Summary) {
  const out: { t: string; tone: "green" | "pink" | "grey" | "gold" }[] = []; const bat = p.kind === "bat"
  if (p.final_rank) out.push({ t: `Final rank ${p.final_rank}`, tone: "green" })
  if (s && p.final_rank && s.lists[p.kind].close_in.includes(p.name)) out.push({ t: "Close call for the last places of the top 10", tone: "gold" })
  if (p.n_high < 75) out.push({ t: `Small pressure sample (${p.n_high} HIGH balls); rating leans on overall level`, tone: "gold" })
  if (p.ipl_share < 0.3) out.push({ t: `Mostly international evidence (IPL share ${pct(p.ipl_share)})`, tone: "grey" })
  if (p.stab && p.stab.top10_d != null && p.stab.top10_d < 0.25 && p.final_rank) out.push({ t: `Sensitive to the pressure definition (top 10 in ${pct(p.stab.top10_d)} of alternatives)`, tone: "pink" })
  const res = p.comp.res; if (res != null) out.push({ t: res > (bat ? 5 : 0.3) ? "Performs better under pressure than usual" : res < (bat ? -10 : -0.3) ? "Below his own usual level under pressure, but still above the league" : "Holds his usual level under pressure", tone: "grey" })
  return out
}

function Card({ p, s }: { p: Player; s?: Summary }) {
  const bat = p.kind === "bat"; const H = p.high, U = p.usual; const unit = bat ? "runs/100 balls" : "runs/over"
  const yearData = p.by_year.map((y) => ({ name: String(y.year), usual: (bat ? y.usual?.sr : y.usual?.econ) ?? null, high: (bat ? y.high?.sr : y.high?.econ) ?? null }))
  const order = ['PP', 'Mid', 'Death']; const phaseData = [...p.by_phase].sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase)).map((y) => ({ name: y.phase === "PP" ? "Powerplay" : y.phase === "Mid" ? "Middle" : "Death", usual: (bat ? y.usual?.sr : y.usual?.econ) ?? null, high: (bat ? y.high?.sr : y.high?.econ) ?? null }))
  const c = p.comp
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-rr-navy via-[#13307f] to-rr-blue p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rr-pink">{bat ? "Batter" : "Bowler"}{p.type ? ` · ${p.type}` : ""}{p.pos ? ` · usually batting at ${p.pos.toFixed(0)}` : ""}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">{p.name}</h2><div className="mt-1 text-xs text-white/70">{p.matches} matches · last match {p.last_match}</div></div>
          <div className="text-right"><div className="text-[11px] uppercase tracking-wider text-white/60">{p.final_rank ? "Final rank" : "Pool rank"}</div><div className="num text-4xl font-semibold">{p.final_rank ?? p.pool_rank}</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">{notes(p, s).map((n) => <Pill key={n.t} tone={n.tone}>{n.t}</Pill>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Score" value={p.score.toFixed(2)} sub="standardised, higher is better" />
        <Kpi label="HIGH balls" value={p.n_high} sub={`${p.n_app ?? "–"} pressure innings or spells`} accent="pink" />
        <Kpi label="Top 10 in (match resamples)" value={p.stab ? pct(p.stab.top10_r) : "–"} sub={p.stab ? `rank range ${p.stab.p10.toFixed(0)}–${p.stab.p90.toFixed(0)}` : "not in the candidate set"} accent="gold" />
        <Kpi label="Top 10 in (alternative definitions)" value={p.stab?.top10_d != null ? pct(p.stab.top10_d) : "–"} sub={`IPL share ${pct(p.ipl_share)}`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Usual level against level under pressure" desc="Raw, unadjusted description. HIGH balls in chases are scored faster by everyone.">
          <PairedBars dec={bat ? 0 : 2} rows={bat ? [{ label: "Strike rate", usual: U?.sr ?? null, high: H?.sr ?? null }, { label: "Boundary %", usual: U?.boundary ?? null, high: H?.boundary ?? null }, { label: "Dot-ball %", usual: U?.dot ?? null, high: H?.dot ?? null, lowerBetter: true }, { label: "Dismissals per 100 balls", usual: U?.out ?? null, high: H?.out ?? null, lowerBetter: true }]
            : [{ label: "Economy (runs per over)", usual: U?.econ ?? null, high: H?.econ ?? null, lowerBetter: true }, { label: "Dot-ball %", usual: U?.dot ?? null, high: H?.dot ?? null }, { label: "Wickets per 100 balls", usual: U?.wkts ?? null, high: H?.wkts ?? null }, { label: "Wides and no-balls %", usual: U?.wides ?? null, high: H?.wides ?? null, lowerBetter: true }]} />
        </Panel>
        <Panel title="Where the score comes from" desc="Adjusted components, each against the league in the same condition">
          <dl className="space-y-2.5 text-[13px]">
            {([["Overall level", bat ? c.SRoA : c.ECOa, bat ? "runs per 100 balls vs league" : "runs per over saved vs league"], ["Observed pressure edge", c.edge_eb != null && c.shrink ? c.edge_eb / c.shrink : null, "level on HIGH balls minus level on usual balls"], ["Share of the edge treated as real (B)", c.shrink, "empirical-Bayes weight: τ² / (τ² + sampling variance)"], ["Edge counted in the score", c.edge_eb, "B × observed edge"], ["Expected pressure level", c.EBh, "overall level + edge counted"], ...(bat ? [["Consistency", c.cons, "share of pressure innings above league"]] : [["Opposition-adjusted rating", c.Pz, "ridge model at HIGH pressure"], ["Consistency", c.relz, "share of pressure spells above league (z)"]])] as [string, number | null, string][]).map(([l, v, d]) => (
              <div key={l} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5"><div><dt className="font-medium">{l}</dt><dd className="text-[11px] text-muted-foreground">{d}</dd></div><span className="num text-base font-semibold">{v == null ? "–" : l.startsWith("Share of the edge") ? pct(v) : v.toFixed(2)}</span></div>
            ))}
          </dl>
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="By season" desc={`${bat ? "Strike rate" : "Economy"}, usual against HIGH balls`}><GroupedBars data={yearData} unit={bat ? "sr" : "econ"} /></Panel>
        <Panel title="By phase of the innings" desc={`${bat ? "Strike rate" : "Economy"}, usual against HIGH balls`}><GroupedBars data={phaseData} unit={bat ? "sr" : "econ"} /></Panel>
      </div>
      <Panel title="Consistency: every pressure innings" desc={`${bat ? "Pressure-weighted runs per 100 balls" : "Pressure-weighted runs per over saved"} against the league. Blue = above the league, vermillion = below.`}
        right={<Pill tone="grey">{p.innings.filter((i) => i.val > 0).length} of {p.innings.length} above league</Pill>}>
        {p.innings.length ? <InningsStrip innings={p.innings} unit={unit} /> : <p className="text-sm text-muted-foreground">No pressure innings with enough pressure-weighted balls.</p>}
      </Panel>
      {p.phase_share_high && <Panel title="Where his pressure balls come from" desc={`Share of his ${p.n_high} HIGH-pressure balls, by phase of the innings and by innings`}>
        <div className="grid gap-6 sm:grid-cols-2">
          <ShareBar title="By phase" parts={[{ l: "Powerplay", v: p.phase_share_high.PP ?? 0, c: "#254aa5" }, { l: "Middle overs", v: p.phase_share_high.Mid ?? 0, c: "#56b4e9" }, { l: "Death overs", v: p.phase_share_high.Death ?? 0, c: "#ea1a85" }]} />
          <ShareBar title="By innings" parts={[{ l: "First innings", v: 1 - (p.chase_share_high ?? 0), c: "#254aa5" }, { l: "Chase", v: p.chase_share_high ?? 0, c: "#ea1a85" }]} />
        </div>
      </Panel>}
      {p.knockout && <Panel title="Knockout matches" desc="Supporting evidence only: the rating does not use it. Finals, qualifiers, eliminators and semi-finals are 28 of the 809 matches analysed.">
        {p.knockout.balls === 0 ? <p className="text-[13px] text-muted-foreground">No knockout matches in the data for this player.</p> : (
          <div className="grid gap-4 sm:grid-cols-4">
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Knockout matches</div><div className="num text-lg font-semibold">{p.knockout.matches}</div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Balls in knockouts</div><div className="num text-lg font-semibold">{p.knockout.balls}</div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pressure balls in knockouts</div><div className="num text-lg font-semibold">{p.knockout.high_balls} <span className="text-[12px] font-normal text-muted-foreground">({pct(p.knockout.high_share ?? 0)} of his pressure balls)</span></div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Record on those balls</div><div className="text-[13px] font-medium">{koRecord(p)}</div></div>
          </div>)}
      </Panel>}
    </div>
  )
}

export default function Players() {
  const { data: pl } = usePlayers(); const { data: s } = useSummary()
  const [kind, setKind] = useState<Kind>("bat"); const [q, setQ] = useState(""); const [sel, setSel] = useState<number | null>(null)
  useEffect(() => { const u = new URLSearchParams(window.location.search); const k = u.get("kind"); const id = u.get("id"); if (k === "bat" || k === "bowl") setKind(k); if (id) setSel(+id) }, [])
  const list = useMemo(() => (pl?.[kind] ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (a.final_rank ?? 99) - (b.final_rank ?? 99) || a.pool_rank - b.pool_rank), [pl, kind, q])
  const cur = useMemo(() => { const all = pl?.[kind] ?? []; return all.find((p) => p.id === sel) ?? all.find((p) => p.final_rank === 1) ?? null }, [pl, kind, sel])
  const pick = (id: number) => { setSel(id); window.history.replaceState(null, "", `?kind=${kind}&id=${id}`); window.scrollTo({ top: 0, behavior: "smooth" }) }
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Players" title="Player cards" desc="Every eligible player, with the comparison against his usual level, consistency, season and phase splits, and stability." />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Seg value={kind} onChange={(k) => { setKind(k); setSel(null) }} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} />
          <PlayerPicker players={list} current={cur} onPick={pick} />
          <div className="relative hidden lg:block"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player" className="pl-8" /></div>
          <div className="hidden max-h-[70vh] space-y-0.5 overflow-y-auto rounded-xl border border-border bg-card p-1.5 lg:block">
            {!pl ? <Loading h={300} /> : list.map((p) => (
              <button key={p.id} onClick={() => pick(p.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${p.id === cur?.id ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${p.final_rank ? "bg-rr-blue text-white" : "bg-muted text-muted-foreground"}`}>{p.final_rank ?? p.pool_rank}</span><span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </aside>
        <div>{cur ? <Card p={cur} s={s} /> : <Panel><p className="py-16 text-center text-sm text-muted-foreground">Choose a player from the list, or open one from the rankings.</p></Panel>}</div>
      </div>
    </div>
  )
}
