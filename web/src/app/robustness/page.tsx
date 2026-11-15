"use client"
import { useState } from "react"
import Link from "next/link"
import { Kpi, Loading, PageHeader, Panel, Pill, Seg } from "@/components/ui-bits"
import { useGet } from "@/lib/use-api"
import { f1, pct } from "@/lib/format"
import type { ConsRow, Kind } from "@/lib/types"

export default function Robustness() {
  const [kind, setKind] = useState<Kind>("bat"); const { data } = useGet<{ rows: ConsRow[] }>(`/consensus/${kind}`)
  const rows = data?.rows.slice(0, 16) ?? []; const MAX = 50
  const top = (key: "robust_rank" | "copeland_rank" | "mc4_rank") => new Set(data?.rows.filter((r) => r[key] <= 10).map((r) => r.id))
  const same = data ? [...top("robust_rank")].every((x) => top("copeland_rank").has(x) && top("mc4_rank").has(x)) : false
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Robustness" title="Stability of each ranking place" desc="Every player is re-ranked under 200 plausible definitions of pressure and scoring, and the rankings are then combined three ways. A place is credible only if the player stays close to it across definitions."
        right={<div className="w-52"><Seg value={kind} onChange={setKind} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} /></div>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Definitions tried" value="200" sub="thresholds, gates, weights and shrinkage" />
        <Kpi label="Aggregation methods" value="3" sub="Borda · Copeland · MC4" accent="pink" />
        <Kpi label="Identical top-10 set" value={data ? (same ? "Yes" : "No") : "–"} sub="across the three methods" accent="gold" />
        <Kpi label="Firmest place" value={kind === "bowl" ? "Bowlers 1–4" : "Sooryavanshi"} sub={kind === "bowl" ? "in the top 10 in at least 89% of definitions" : "ranked first whenever eligible"} />
      </div>
      <Panel title="Rank across 200 definitions" desc="Bar: 10th–90th percentile of rank. Gold: median rank. Diamond: consensus rank. Shaded band: top 10.">
        {!data ? <Loading h={460} /> : (
          <div className="space-y-1">
            <div className="flex items-center pl-[236px] pr-[170px] text-[10px] text-muted-foreground"><div className="relative h-4 flex-1">{[1, 10, 20, 30, 40, 50].map((t) => <span key={t} className="absolute -translate-x-1/2" style={{ left: `${((t - 1) / (MAX - 1)) * 100}%` }}>{t}</span>)}</div></div>
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md py-1 hover:bg-secondary/40">
                <span className="w-6 text-right text-xs font-semibold text-muted-foreground">{r.consensus_rank}</span>
                <Link href={`/players?kind=${kind}&id=${r.id}`} className="w-[196px] truncate text-[13px] font-medium hover:text-rr-blue">{r.name}</Link>
                <div className="relative h-5 flex-1 rounded bg-muted/50">
                  <div className="absolute inset-y-0 left-0 rounded-l bg-[#fdeaf4]" style={{ width: `${(9.5 / (MAX - 1)) * 100}%` }} />
                  <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-rr-blue/80" style={{ left: `${((r.p10_rank - 1) / (MAX - 1)) * 100}%`, width: `${Math.max(1.5, ((Math.min(r.p90_rank, MAX) - r.p10_rank) / (MAX - 1)) * 100)}%` }} />
                  <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-rr-gold shadow" style={{ left: `${((Math.min(r.median_rank, MAX) - 1) / (MAX - 1)) * 100}%` }} />
                  <div className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rr-navy" style={{ left: `${((r.consensus_rank - 1) / (MAX - 1)) * 100}%` }} />
                </div>
                <div className="flex w-[160px] items-center justify-end gap-1.5"><Pill tone={r.in_top10 >= 0.7 ? "green" : r.in_top10 >= 0.5 ? "blue" : "grey"}>In top 10: {pct(r.in_top10)}</Pill>{r.final && <Pill tone="pink">Final list</Pill>}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Aggregation methods" desc="The three methods select the same ten players and differ only in their order">
          {!data ? <Loading h={200} /> : (
            <table className="num w-full text-[12.5px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th className="pb-2">Player</th><th className="pb-2 text-right">Borda</th><th className="pb-2 text-right">Copeland</th><th className="pb-2 text-right">MC4</th><th className="pb-2 text-right">Default spec</th></tr></thead>
              <tbody>{rows.filter((r) => r.final).map((r) => <tr key={r.id} className="border-t border-border/60"><td className="py-1.5 font-medium">{r.name}</td><td className="text-right">{f1(r.robust_rank, 0)}</td><td className="text-right">{f1(r.copeland_rank, 0)}</td><td className="text-right">{f1(r.mc4_rank, 0)}</td><td className="text-right text-muted-foreground">{r.default_rank ? f1(r.default_rank, 0) : "–"}</td></tr>)}</tbody></table>
          )}
        </Panel>
        <Panel title="Definition grid" desc="Specification sensitivity, not data resampling">
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {["Pressure mode: leverage, rule, consensus, custom mix", "Live-match window: lower bound 5–20%, upper bound 80–95%", "HIGH threshold: 65th–90th percentile, grouped by innings and phase, innings, or all balls", "Rule parameters: closeness bandwidth, wicket weight, scarcity cap, knockout multiplier", "Recency half-lives, shrinkage constants, opposition-class and role-aware baselines", "Non-IPL evidence weight (1.0, 0.6, 0.4 for batters; 1.0, 0.6, 0.3 for bowlers)", "Each score weight varied by up to ±30%"].map((t) => <li key={t} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-rr-pink" />{t}</li>)}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
