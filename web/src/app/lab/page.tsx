"use client"
import { Kpi, Loading, PageHeader, Panel } from "@/components/ui-bits"
import { ByOverChart, ChaseMap, SwingChart } from "@/components/charts/lab-charts"
import { useParams } from "@/lib/params"
import { usePost } from "@/lib/use-api"
import { f1 } from "@/lib/format"
import type { PressureOut } from "@/lib/types"

export default function Lab() {
  const { debounced, pressure } = useParams(); const settled = JSON.stringify(debounced.pressure) === JSON.stringify(pressure)
  const { data, loading } = usePost<PressureOut>("/pressure", { pressure: debounced.pressure })
  const sep = (inn: number, c: string) => data?.separation.find((s) => s.innings === inn && s.cls === c)
  const ratio = (inn: number) => (sep(inn, "HIGH") && sep(inn, "ordinary") ? sep(inn, "HIGH")!.swing / sep(inn, "ordinary")!.swing : null)
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Pressure Lab" title="Defining pressure" desc="Adjust the definition in the panel; every chart recomputes from the ball-by-ball records. A sound definition separates HIGH-pressure balls clearly from ordinary ones." right={(loading || !settled) && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">Updating…</span>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Live balls" value={data ? `${f1(data.live)}%` : "–"} sub={`${data ? f1(data.decided) : "–"}% decided (outside the live window)`} />
        <Kpi label="HIGH-pressure balls" value={data ? data.high_balls.toLocaleString() : "–"} sub={`${data ? f1(data.high) : "–"}% of all balls`} accent="pink" />
        <Kpi label="Swing ratio, chases" value={ratio(2) ? `${ratio(2)!.toFixed(1)}×` : "–"} sub="HIGH relative to ordinary live balls" accent="gold" />
        <Kpi label="Overlap with default" value={data ? `${f1(data.overlap_default, 0)}%` : "–"} sub="Share of HIGH balls in common with the default" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Win-probability swing" desc="Mean change in win probability per ball (points), by pressure class">{data ? <SwingChart sep={data.separation} /> : <Loading />}</Panel>
        <Panel title="HIGH share by over" desc="Share of legal balls rated HIGH in each over. Under “Innings and phase” grouping, HIGH marks the most pressured balls within each phase, so it peaks near phase ends; set the reference group to “All balls” to see the raw build-up.">{data ? <ByOverChart data={data.by_over} /> : <Loading />}</Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Chase pressure map" desc="Share of balls rated HIGH, by required run rate and balls remaining">{data ? <ChaseMap cells={data.chase_map} /> : <Loading h={330} />}</Panel>
        <Panel className="lg:col-span-2" title="Outcome rates by pressure class" desc="Wickets, scoring and dot balls by class and innings">
          {data ? (
            <div className="overflow-x-auto"><table className="num w-full text-xs">
              <thead><tr className="text-left text-muted-foreground"><th className="pb-2 font-medium">Class</th><th className="pb-2 font-medium">Inn</th><th className="pb-2 text-right font-medium">Balls</th><th className="pb-2 text-right font-medium">Wkts/100</th><th className="pb-2 text-right font-medium">Runs/ov</th><th className="pb-2 text-right font-medium">Dot %</th></tr></thead>
              <tbody>{["HIGH", "ordinary", "decided"].flatMap((c) => [1, 2].map((i) => { const s = sep(i, c); return s && (
                <tr key={c + i} className="border-t border-border/60"><td className="py-1.5"><span className={`inline-block size-2 rounded-full ${c === "HIGH" ? "bg-rr-pink" : c === "ordinary" ? "bg-[#56b4e9]" : "bg-[#c9d1e6]"} mr-1.5`} />{c}</td><td>{i === 1 ? "1st" : "Chase"}</td><td className="text-right">{s.balls.toLocaleString()}</td><td className="text-right">{f1(s.wkts_per_100)}</td><td className="text-right">{f1(s.runs_per_over, 2)}</td><td className="text-right">{f1(s.dot_pct)}</td></tr>
              ) }))}</tbody>
            </table></div>
          ) : <Loading h={260} />}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Under the default definition, wickets fall faster on HIGH balls in both innings and chases are scored faster. In the first innings the scoring rate is unchanged: pressure shows in the stakes rather than the run rate.</p>
        </Panel>
      </div>
    </div>
  )
}
