"use client"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Kpi, Panel, Pill, Loading } from "@/components/ui-bits"
import { useEvidence, useSummary } from "@/lib/data"
import { pct } from "@/lib/format"
import type { Kind, Summary } from "@/lib/types"

function TopList({ kind, s }: { kind: Kind; s?: Summary }) {
  const rows = s?.lists[kind].rows
  return (
    <Panel title={kind === "bat" ? "Top 10 batters under pressure" : "Top 10 bowlers under pressure"} desc={s ? `Final pressure definition, re-ranked under ${s.n_resamples.toLocaleString()} resamples of the matches` : undefined}
      right={<Link href="/rankings" className="text-xs font-medium text-rr-blue hover:underline">Full table →</Link>}>
      {!rows ? <Loading h={420} /> : (
        <>
          <ol className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/players?kind=${kind}&id=${r.id}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-secondary/70">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${r.rank <= 3 ? "bg-rr-blue text-white" : "bg-muted text-muted-foreground"}`}>{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13.5px] font-medium">{r.name}</span><span className="num shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">rank {r.p10.toFixed(0)}–{r.p90.toFixed(0)} · {r.n_high} HIGH balls</span></div>
                    <div className="mt-1 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-rr-blue to-rr-pink" style={{ width: `${r.top10_r * 100}%` }} /></div><span className="num w-24 text-right text-[11px] text-muted-foreground">top 10 in {pct(r.top10_r)}</span></div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  )
}

export default function Overview() {
  const { data: s } = useSummary(); const { data: ev } = useEvidence()
  const sep = (inn: number, c: string) => ev?.separation.find((x) => x.innings === inn && x.cls === c)
  const skill = (k: string) => ev?.skill.find((x) => x.kind === k && x.thr === 40)
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rr-navy via-[#13307f] to-rr-blue p-7 text-white sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-rr-pink/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#56b4e9]/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85"><Sparkles className="size-3 text-rr-pink" />SupeRR Selector Season 2 · Round 1</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Reliable Players Under Pressure</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">A pressure-adjusted, time-validated ranking of T20 batters and bowlers, built only from the supplied ball-by-ball data. Pressure is defined once, from the match situation. Each player is rated on performance under pressure relative to the player's usual level, and on consistency across matches.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/rankings" className="inline-flex items-center gap-2 rounded-lg bg-rr-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rr-pink/30 transition hover:brightness-110">View rankings <ArrowRight className="size-4" /></Link>
            <Link href="/validation" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Validation results</Link>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Matches analysed" value={s?.matches ?? "–"} sub={s ? `${s.date_min.slice(0, 4)}–${s.date_max.slice(0, 4)} · IPL, T20I and A-team events` : undefined} />
        <Kpi label="Deliveries" value={s ? s.balls.toLocaleString() : "–"} sub={s ? `${s.n_bat} batters · ${s.n_bowl} bowlers` : undefined} accent="pink" />
        <Kpi label="Chase win-probability AUC" value={s ? s.wp_chase.Average.auc.toFixed(3) : "–"} sub={s ? `${s.chase_auc_forward.toFixed(3)} when trained on earlier matches only` : undefined} />
        <Kpi label="Win-probability swing, chases" value={sep(2, "HIGH") ? `${(sep(2, "HIGH")!.swing / sep(2, "ordinary")!.swing).toFixed(1)}×` : "–"} sub="HIGH balls relative to ordinary live balls" accent="gold" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2"><TopList kind="bat" s={s} /><TopList kind="bowl" s={s} /></div>
      <div className="grid gap-5 md:grid-cols-3">
        <Panel title="Pressure is the situation"><p className="text-[13px] leading-relaxed text-muted-foreground">Pressure is computed from score, wickets, balls remaining, target and venue par, never from the player's own performance. Two independent definitions, win-probability leverage and a rule-based closeness × scarcity index, must agree. <Link href="/pressure" className="font-medium text-rr-blue hover:underline">How pressure is defined →</Link></p></Panel>
        <Panel title="Level and consistency"><p className="text-[13px] leading-relaxed text-muted-foreground">The score is the expected level under pressure, an empirical-Bayes estimate that weights a player's pressure edge by how much of it is real ({s ? `${pct(s.shrink.bat.median)} for a typical batter, ${pct(s.shrink.bowl.median)} for a typical bowler` : "…"}), together with consistency across matches. Every player card also shows the comparison with his usual level. <Link href="/method" className="font-medium text-rr-blue hover:underline">Method →</Link></p></Panel>
        <Panel title="What the data show"><p className="text-[13px] leading-relaxed text-muted-foreground">Batting under pressure is mostly general class: a batter's pressure-specific edge is barely repeatable (split-half r = {skill("bat")?.edge?.toFixed(2) ?? "–"}); bowlers show a small repeatable edge ({skill("bowl")?.edge?.toFixed(2) ?? "–"}). Every place carries two stability measures. <Link href="/stability" className="font-medium text-rr-blue hover:underline">Stability →</Link></p></Panel>
      </div>
      <Panel title="Validated forward in time" desc="Every model refitted on earlier matches only, at 13 quarterly cut-offs">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground"><Pill tone="green">No future information</Pill>{s && <span>{s.cuts[0]} to {s.cuts[s.cuts.length - 1]} · {s.test_balls.bat.toLocaleString()} batter and {s.test_balls.bowl.toLocaleString()} bowler test balls in {s.test_matches} matches. </span>}<Link href="/validation" className="font-medium text-rr-blue hover:underline">See the results →</Link></div>
      </Panel>
    </div>
  )
}
