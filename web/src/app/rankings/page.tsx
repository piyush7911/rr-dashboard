"use client"
import { useMemo, useState } from "react"
import { Download, Star, X, ArrowUp, ArrowDown, Minus } from "lucide-react"
import Link from "next/link"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Chips, Loading, PageHeader, Panel, Pill, Seg, StatStrip } from "@/components/ui-bits"
import { ContribBars } from "@/components/charts/rank-bars"
import { useParams } from "@/lib/params"
import { usePost } from "@/lib/use-api"
import { f1, LABELS, pct, short } from "@/lib/format"
import type { Kind, RankOut, RankRow } from "@/lib/types"

const BAT_W = ["SRoA", "SRhA", "res", "cons"], BOWL_W = ["Pz", "res", "relz", "cz"]
export default function Rankings() {
  const { debounced, rate, setRate } = useParams()
  const [kind, setKind] = useState<Kind>("bat"); const [q, setQ] = useState(""); const [n, setN] = useState(30)
  const [phases, setPhases] = useState(["PP", "Mid", "Death"]); const [innings, setInnings] = useState([1, 2]); const [pace, setPace] = useState(["Pace", "Spin"]); const [arm, setArm] = useState("any"); const [bo, setBo] = useState<number[]>([1, 11])
  const [pins, setPins] = useState<RankRow[]>([])
  const situation = useMemo(() => ({ phases: phases.length === 3 ? undefined : phases, innings: innings.length === 2 ? undefined : innings, pace: pace.length === 2 ? undefined : pace, arm: kind === "bowl" && arm !== "any" ? arm : undefined, bat_order: kind === "bat" && (bo[0] !== 1 || bo[1] !== 11) ? bo : undefined }), [phases, innings, pace, arm, bo, kind])
  const { data, loading } = usePost<RankOut>("/rank", { kind, pressure: debounced.pressure, rate: debounced.rate, situation, limit: 200 })
  const labels = LABELS(kind); const wkeys = kind === "bat" ? BAT_W : BOWL_W; const w = kind === "bat" ? rate.w_bat : rate.w_bowl
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())).slice(0, n), [data, q, n])
  const setW = (k: string, v: number) => setRate(kind === "bat" ? { w_bat: { ...rate.w_bat, [k]: v } } : { w_bowl: { ...rate.w_bowl, [k]: v } })
  const togglePin = (r: RankRow) => setPins((p) => (p.find((x) => x.id === r.id) ? p.filter((x) => x.id !== r.id) : [...p, r]))
  const csv = () => { const t = ["rank,player,score,high_balls,ipl_share", ...pins.map((p) => `${p.rank},"${p.name}",${p.score.toFixed(3)},${p.n_high ?? ""},${p.ipl_share.toFixed(2)}`)].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/csv" })); a.download = `shortlist_${kind}.csv`; a.click() }
  const valueCols = kind === "bat" ? [["SRhA", "Pressure"], ["SRoA", "Overall"], ["res", "Resil."], ["cons", "Consist."]] : [["Pz", "Pressure"], ["res", "Resil."], ["relz", "Consist."], ["cz", "Specific"]]
  const delta = (r: RankRow) => (r.default_rank == null ? null : r.default_rank - r.rank)
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Rankings & shortlist" title="Player rankings" desc="Ratings recompute from the definition panel and the weights below. Pin players to build a shortlist and export it."
        right={<div className="flex items-center gap-2">{loading && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">Updating…</span>}<div className="w-52"><Seg value={kind} onChange={(v) => { setKind(v); setPins([]) }} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} /></div></div>} />
      <StatStrip items={[
        { label: "Eligible players", value: data?.n_eligible ?? "–", sub: "under current rules" },
        { label: data ? `Leader · score ${f1(data.rows[0]?.score, 2)}` : "Leader", value: <span className="truncate text-base">{data?.rows[0]?.name ?? "–"}</span> },
        { label: "Overlap with consensus", value: data ? `${data.rows.slice(0, 10).filter((r) => r.in_final).length}/10` : "–", sub: "of published top 10" },
        { label: "Shortlist", value: pins.length, sub: "players pinned" },
      ]} />
      <Panel title="Scoring and filters" desc="Each component is standardised across eligible players and then weighted. Filters restrict the ratings to one part of the game.">
        <div className="grid gap-x-10 gap-y-5 lg:grid-cols-2">
          <div className="space-y-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Score weights</div>
            {wkeys.map((k) => (
              <div key={k} className="grid grid-cols-[120px_1fr_36px] items-center gap-3 text-xs"><span className="font-medium">{labels[k]}</span><Slider min={0} max={1} step={0.05} value={[w[k] ?? 0]} onValueChange={(v) => setW(k, (v as number[])[0])} /><span className="num text-right font-semibold text-rr-blue">{(w[k] ?? 0).toFixed(2)}</span></div>
            ))}
          </div>
          <div className="space-y-3 text-xs lg:border-l lg:border-border/70 lg:pl-10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Situation filter</div>
            <div className="grid grid-cols-[96px_1fr] items-center gap-3"><span className="font-medium">Phases</span><Chips value={phases} onChange={setPhases} options={[{ v: "PP", l: "Powerplay" }, { v: "Mid", l: "7–15" }, { v: "Death", l: "Death" }]} /></div>
            <div className="grid grid-cols-[96px_1fr] items-center gap-3"><span className="font-medium">Innings</span><Chips value={innings} onChange={setInnings} options={[{ v: 1, l: "First" }, { v: 2, l: "Chase" }]} /></div>
            <div className="grid grid-cols-[96px_1fr] items-center gap-3"><span className="font-medium">Bowling type</span><Chips value={pace} onChange={setPace} options={[{ v: "Pace", l: "Pace" }, { v: "Spin", l: "Spin" }]} /></div>
            {kind === "bowl" ? <div className="grid grid-cols-[96px_1fr] items-center gap-3"><span className="font-medium">Bowling arm</span><div className="max-w-[240px]"><Seg value={arm} onChange={setArm} options={[{ v: "any", l: "Any" }, { v: "Left", l: "Left" }, { v: "Right", l: "Right" }]} /></div></div>
              : <div className="grid grid-cols-[96px_1fr_44px] items-center gap-3"><span className="font-medium">Batting order</span><Slider min={1} max={11} step={1} value={bo} onValueChange={(v) => setBo(v as number[])} /><span className="num text-right font-semibold text-rr-blue">{bo[0]}–{bo[1]}</span></div>}
          </div>
        </div>
      </Panel>
      <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-white/60 px-4 py-2">
        <span className="text-xs font-semibold text-foreground/80">Shortlist</span>
        {pins.length === 0 ? <span className="text-xs text-muted-foreground">Use the star in the leaderboard to add players.</span> : pins.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-2.5 pr-1.5 text-xs font-medium text-secondary-foreground"><span className="num text-rr-blue">#{p.rank}</span>{short(p.name)}<button onClick={() => togglePin(p)} aria-label="Remove"><X className="size-3 text-muted-foreground hover:text-rr-pink" /></button></span>
        ))}
        {pins.length > 0 && <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 text-xs" onClick={csv}><Download className="size-3" />Export CSV</Button>}
      </div>
      <Panel title={`Leaderboard · ${kind === "bat" ? "batters" : "bowlers"}`} desc="Change is relative to the default definition. Players with fewer than 70 HIGH balls are marked as small samples."
        right={<div className="flex items-center gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" className="h-8 w-40 text-xs" /><select value={n} onChange={(e) => setN(+e.target.value)} className="h-8 rounded-lg border border-input bg-white px-2 text-xs"><option value={15}>Top 15</option><option value={30}>Top 30</option><option value={60}>Top 60</option><option value={200}>All</option></select></div>}>
        {!data ? <Loading h={420} /> : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="num w-full text-[12.5px]">
              <thead><tr className="border-b border-border bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="w-9 py-2.5 pl-5"></th><th className="py-2.5 pr-2">#</th><th>Player</th><th className="w-44">Score</th>{valueCols.map(([k, l]) => <th key={k} className="pl-4 text-right">{l}</th>)}<th className="pl-4 text-right">HIGH balls</th><th className="pl-4 text-right">IPL</th><th className="pl-4 text-right">Change</th><th className="pl-4 pr-5 text-right">Consensus</th></tr></thead>
              <tbody>
                {rows.map((r) => { const d = delta(r); const pinned = !!pins.find((x) => x.id === r.id); const max = data.rows[0].score || 1; return (
                  <tr key={r.id} className="border-b border-border/60 transition hover:bg-secondary/40">
                    <td className="pl-5 pr-1"><button onClick={() => togglePin(r)} title="Add to shortlist"><Star className={`size-4 ${pinned ? "fill-rr-gold text-rr-gold" : "text-muted-foreground/50 hover:text-rr-gold"}`} /></button></td>
                    <td className="py-2 pr-2 font-semibold text-muted-foreground">{r.rank}</td>
                    <td className="whitespace-nowrap"><Link href={`/players?kind=${kind}&id=${r.id}`} className="font-medium hover:text-rr-blue">{r.name}</Link>{r.n_high != null && r.n_high < 70 && <span className="ml-1.5"><Pill tone="gold">Small sample</Pill></span>}</td>
                    <td><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-rr-blue to-rr-pink" style={{ width: `${Math.max(2, (r.score / max) * 100)}%` }} /></div><span className="w-9 text-right font-semibold">{f1(r.score, 2)}</span></div></td>
                    {valueCols.map(([k]) => <td key={k} className="pl-4 text-right text-muted-foreground">{k === "cons" ? pct(r[k] as number) : f1(r[k] as number, 1)}</td>)}
                    <td className="pl-4 text-right">{r.n_high ?? "–"}</td><td className="pl-4 text-right text-muted-foreground">{pct(r.ipl_share)}</td>
                    <td className="pl-4 text-right">{d == null ? "–" : d === 0 ? <Minus className="ml-auto size-3.5 text-muted-foreground" /> : d > 0 ? <span className="inline-flex items-center gap-0.5 text-[#00805a]"><ArrowUp className="size-3" />{d}</span> : <span className="inline-flex items-center gap-0.5 text-rr-pink"><ArrowDown className="size-3" />{-d}</span>}</td>
                    <td className="pr-5 text-right">{r.consensus_rank ? <Pill tone={r.in_final ? "blue" : "grey"}>#{r.consensus_rank}</Pill> : "–"}</td>
                  </tr>) })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Score composition" desc="Contribution of each weighted component for the top 15 players (standardised units)">{data ? <ContribBars rows={data.rows.slice(0, 15)} labels={labels} keys={wkeys} height={400} /> : <Loading h={400} />}</Panel>
      </div>
  )
}
