"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader, Panel, Pill, Seg, Loading } from "@/components/ui-bits"
import { PoolScatter, Legend, C } from "@/components/charts"
import { usePlayers, useSummary } from "@/lib/data"
import { pct } from "@/lib/format"
import type { Kind, Player } from "@/lib/types"

const COLS: Record<Kind, { k: string; l: string; d: number; tip: string }[]> = {
  bat: [{ k: "EBh", l: "Expected pressure level", d: 1, tip: "Overall level + shrunk pressure edge (runs per 100 balls vs league)" }, { k: "SRhA", l: "Pressure level", d: 1, tip: "Level on HIGH balls vs league" }, { k: "res", l: "Resilience", d: 1, tip: "Pressure level minus own usual level" }, { k: "cons", l: "Consistency", d: 2, tip: "Share of pressure innings above league" }],
  bowl: [{ k: "EBh", l: "Expected pressure level", d: 2, tip: "Overall economy saved + shrunk edge (runs per over)" }, { k: "Pz", l: "Opposition-adjusted", d: 2, tip: "Ridge-model rating at HIGH pressure" }, { k: "res", l: "Resilience", d: 2, tip: "Runs per over saved under pressure vs own usual" }, { k: "relz", l: "Consistency", d: 2, tip: "Share of pressure spells above league (z)" }],
}

export default function Rankings() {
  const [kind, setKind] = useState<Kind>("bat"); const [all, setAll] = useState(false); const router = useRouter()
  const { data: s } = useSummary(); const { data: pl } = usePlayers()
  const pool = pl?.[kind] ?? []; const fin = pool.filter((p) => p.final_rank).sort((a, b) => a.final_rank! - b.final_rank!)
  const rowsByRank = s?.lists[kind].rows ?? []; const cols = COLS[kind]
  const next = [...pool].filter((p) => !p.final_rank).sort((a, b) => (b.stab?.top10_r ?? -1) - (a.stab?.top10_r ?? -1) || a.pool_rank - b.pool_rank).slice(0, all ? 40 : 10)
  const open = (p: Player) => router.push(`/players?kind=${kind}&id=${p.id}`)
  const Row = ({ p, rank, cand }: { p: Player; rank: string | number; cand?: boolean }) => {
    const r = rowsByRank.find((x) => x.id === p.id)
    return (
      <tr onClick={() => open(p)} className="cursor-pointer border-t border-border/60 transition hover:bg-secondary/60">
        <td className="px-3 py-2.5"><span className={`grid size-7 place-items-center rounded-lg text-xs font-bold ${!cand && typeof rank === "number" && rank <= 3 ? "bg-rr-blue text-white" : "bg-muted text-muted-foreground"}`}>{rank}</span></td>
        <td className="px-3 py-2.5 font-medium">{p.name}{p.type && <span className="ml-2 text-[11px] font-normal text-muted-foreground">{p.type}</span>}</td>
        {cols.map((c) => <td key={c.k} className="num px-3 py-2.5 text-right">{p.comp[c.k] == null ? "–" : (p.comp[c.k] as number).toFixed(c.d)}</td>)}
        <td className="num px-3 py-2.5 text-right">{p.n_high}</td><td className="num px-3 py-2.5 text-right">{pct(p.ipl_share)}</td>
        <td className="px-3 py-2.5">{r ? <div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-rr-blue to-rr-pink" style={{ width: `${r.top10_r * 100}%` }} /></div><span className="num text-[11px] text-muted-foreground">{pct(r.top10_r)}</span></div> : p.stab ? <span className="num text-[11px] text-muted-foreground">{pct(p.stab.top10_r)}</span> : "–"}</td>
        <td className="num px-3 py-2.5 text-right text-xs text-muted-foreground">{r ? `${r.p10.toFixed(0)}–${r.p90.toFixed(0)}` : p.stab ? `${p.stab.p10.toFixed(0)}–${p.stab.p90.toFixed(0)}` : "–"}</td>
      </tr>
    )
  }
  const head = (
    <thead><tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><th className="px-3 py-2">#</th><th className="px-3 py-2">Player</th>{cols.map((c) => <th key={c.k} className="px-3 py-2 text-right" title={c.tip}>{c.l}</th>)}<th className="px-3 py-2 text-right">HIGH balls</th><th className="px-3 py-2 text-right">IPL share</th><th className="px-3 py-2">Top-10 share</th><th className="px-3 py-2 text-right">Rank range</th></tr></thead>
  )
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Final lists" title="Rankings" desc="The final ten for each list, with the evidence behind every place. Click any player for the full card." right={<Seg value={kind} onChange={setKind} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} className="w-56" />} />
      <Panel title={kind === "bat" ? "Top 10 batters" : "Top 10 bowlers"} desc={s ? `Both lists use the same method. Top-10 share = share of ${s.n_resamples.toLocaleString()} match resamples that keep the player in the top 10.` : undefined} className="overflow-x-auto">
        {!pl ? <Loading h={420} /> : <table className="w-full min-w-[760px] text-[13px]">{head}<tbody>{fin.map((p) => <Row key={p.id} p={p} rank={p.final_rank!} />)}</tbody></table>}
        {s && <p className="mt-3 rounded-lg bg-accent/60 px-3 py-2 text-[11.5px] leading-snug text-accent-foreground"><b>Close calls:</b> the evidence cannot reliably separate {s.lists[kind].close_in.join(", ")} from {s.lists[kind].close_out.join(", ")}; the order shown follows the ordering rule (Method page). A 75-ball floor would replace {s.floor75[kind].out.join(", ")} with {s.floor75[kind].into.join(", ")} (see Method).</p>}
      </Panel>
      <div className="space-y-5">
        <Panel title="Level against consistency" desc="Every eligible player; the final ten are highlighted. Click a dot to open the card.">
          {pl ? <><PoolScatter pool={pool} xKey="EBh" yKey={kind === "bat" ? "cons" : "relz"} xLabel="Expected pressure level" yLabel="Consistency" onPick={open} /><Legend items={[{ c: C.pink, l: "Final ten" }, { c: C.grey, l: "Other eligible players" }]} /></> : <Loading h={340} />}
        </Panel>
        <Panel title="How to read the table">
          <ul className="grid gap-5 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <li><b className="text-foreground">Expected pressure level</b> is the player's overall level plus his pressure edge, shrunk by the share of that edge the data show to be real.</li>
            <li><b className="text-foreground">Resilience</b> is shown for information: pressure level minus own usual level. It has little forward value on its own, so it is not part of the score.</li>
            <li><b className="text-foreground">Consistency</b> is the share of pressure innings or spells above the league.</li>
            <li><b className="text-foreground">Rank range</b> is the 10th to 90th percentile of the player's rank across the match resamples.</li>
          </ul>
        </Panel>
      </div>
      <Panel title="Next candidates" desc="Players outside the final ten, ordered by how often they reach the top 10 across the match resamples (# is the single-definition pool rank)" right={<button onClick={() => setAll(!all)} className="text-xs font-medium text-rr-blue hover:underline">{all ? "Show fewer" : "Show 40"}</button>} className="overflow-x-auto">
        {!pl ? <Loading h={200} /> : <table className="w-full min-w-[760px] text-[13px]">{head}<tbody>{next.map((p) => <Row key={p.id} p={p} rank={p.pool_rank} cand />)}</tbody></table>}
      </Panel>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground"><Pill tone="grey">{pool.length} eligible {kind === "bat" ? "batters" : "bowlers"}</Pill><Pill tone="grey">minimum {s?.params.min_high ?? 50} HIGH balls</Pill></div>
    </div>
  )
}
