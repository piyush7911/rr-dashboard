"use client"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Kpi, Panel, Pill, Loading } from "@/components/ui-bits"
import { useGet } from "@/lib/use-api"
import { f1, pct } from "@/lib/format"
import type { ConsRow, Kind, Meta } from "@/lib/types"

function TopList({ kind, rows }: { kind: Kind; rows?: ConsRow[] }) {
  return (
    <Panel title={kind === "bat" ? "Top 10 batters under pressure" : "Top 10 bowlers under pressure"} desc="Consensus of three aggregation methods across 200 plausible definitions"
      right={<Link href="/robustness" className="text-xs font-medium text-rr-blue hover:underline">Rank stability →</Link>}>
      {!rows ? <Loading h={420} /> : (
        <ol className="space-y-1.5">
          {rows.filter((r) => r.final).sort((a, b) => a.consensus_rank - b.consensus_rank).slice(0, 10).map((r, i) => (
            <li key={r.id}>
              <Link href={`/players?kind=${kind}&id=${r.id}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-secondary/70">
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${i < 3 ? "bg-rr-blue text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13.5px] font-medium">{r.name}</span><span className="num shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">Rank range {f1(r.p10_rank, 0)}–{f1(r.p90_rank, 0)}</span></div>
                  <div className="mt-1 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-rr-blue to-rr-pink" style={{ width: `${r.in_top10 * 100}%` }} /></div><span className="num w-[92px] shrink-0 whitespace-nowrap text-right text-[11px] font-medium text-foreground/70">Top 10: {pct(r.in_top10)}</span></div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

export default function Overview() {
  const meta = useGet<Meta>("/meta"); const bat = useGet<{ rows: ConsRow[] }>("/consensus/bat"); const bowl = useGet<{ rows: ConsRow[] }>("/consensus/bowl"); const ev = useGet<any>("/evidence")
  const f = meta.data?.facts; const auc = f?.wp_chase?.Average?.auc
  const sep = (inn: number, c: string) => ev.data?.separation?.find((s: any) => s.innings === inn && s.cls === c)
  const skill = ev.data?.skill?.filter((s: any) => s.thr === 40); const edge = (k: string) => skill?.find((s: any) => s.kind === k)?.edge
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rr-navy via-[#13307f] to-rr-blue p-7 text-white sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-rr-pink/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#56b4e9]/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85"><Sparkles className="size-3 text-rr-pink" />Season 2 · Round 1</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who delivers when it matters?</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">A pressure-adjusted, uncertainty-aware ranking of T20 batters and bowlers, built entirely from the supplied ball-by-ball data. Redefine what counts as pressure and every rating recomputes.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/lab" className="inline-flex items-center gap-2 rounded-lg bg-rr-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rr-pink/30 transition hover:brightness-110">Open the Pressure Lab <ArrowRight className="size-4" /></Link>
            <Link href="/rankings" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Build a shortlist</Link>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Matches analysed" value={meta.data?.matches ?? "–"} sub={meta.data ? `${meta.data.date_min.slice(0, 4)}–${meta.data.date_max.slice(0, 4)} · IPL, T20I and A-team events` : undefined} />
        <Kpi label="Deliveries" value={meta.data ? meta.data.balls.toLocaleString() : "–"} sub={`${meta.data?.batters ?? "–"} batters · ${meta.data?.bowlers ?? "–"} bowlers`} accent="pink" />
        <Kpi label="Chase win-probability AUC" value={auc ? auc.toFixed(3) : "–"} sub="LightGBM + dynamic program, out-of-fold" />
        <Kpi label="Win-probability swing, chases" value={sep(2, "HIGH") ? `${(sep(2, "HIGH").swing / sep(2, "ordinary").swing).toFixed(1)}×` : "–"} sub="HIGH balls relative to ordinary live balls" accent="gold" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2"><TopList kind="bat" rows={bat.data?.rows} /><TopList kind="bowl" rows={bowl.data?.rows} /></div>
      <div className="grid gap-5 md:grid-cols-3">
        <Panel title="Pressure belongs to the situation"><p className="text-[13px] leading-relaxed text-muted-foreground">Pressure is computed from score, wickets, balls remaining, target and venue par, never from the player’s own performance. Two independent definitions must agree before a ball is rated HIGH.</p><div className="mt-3 flex gap-1.5"><Pill>Leverage</Pill><Pill tone="pink">Rule-based</Pill><Pill tone="gold">Consensus</Pill></div></Panel>
        <Panel title="Bowlers show a pressure edge; batters largely do not"><p className="text-[13px] leading-relaxed text-muted-foreground">Split-half repeatability of the pressure-specific edge: bowlers <b className="text-foreground">{f1(edge("bowl"), 2)}</b>, batters <b className="text-foreground">{f1(edge("bat"), 2)}</b>. Batter rankings largely reflect general ability in high-leverage moments.</p><Link href="/evidence" className="mt-3 inline-block text-xs font-medium text-rr-blue hover:underline">View the tests →</Link></Panel>
        <Panel title="No single definition is relied on"><p className="text-[13px] leading-relaxed text-muted-foreground">Players are re-ranked under 200 plausible definitions. Three aggregation methods select the same ten players in each list, and bowler places 1–4 barely move.</p><Link href="/robustness" className="mt-3 inline-block text-xs font-medium text-rr-blue hover:underline">View rank spreads →</Link></Panel>
      </div>
    </div>
  )
}
