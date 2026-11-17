"use client"
import { PageHeader, Panel, Seg, Loading, Pill } from "@/components/ui-bits"
import { Legend, RankSpread, C } from "@/components/charts"
import { useSummary } from "@/lib/data"
import { pct } from "@/lib/format"
import { useState } from "react"
import type { Kind } from "@/lib/types"

export default function Stability() {
  const { data: s } = useSummary(); const [kind, setKind] = useState<Kind>("bat"); const rows = s?.lists[kind].rows
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stability" title="How firm is each place?" desc="Two sources of uncertainty are reported separately: the data (which matches happened to be played) and the definition (how pressure and the score are specified)." right={<Seg value={kind} onChange={setKind} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} className="w-56" />} />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Data uncertainty (match resamples)"><p className="text-[13px] leading-relaxed text-muted-foreground">Every match is re-weighted at random (Bayesian bootstrap) and the whole ranking recomputed, {s?.n_resamples.toLocaleString() ?? "…"} times. Three rank-aggregation methods (Borda, Copeland, Markov-chain MC4) turn the resamples into the final order. This is the run that builds the lists.</p></Panel>
        <Panel title="Definition uncertainty (alternative definitions)"><p className="text-[13px] leading-relaxed text-muted-foreground">{s?.n_definitions.toLocaleString() ?? "…"} plausible alternative definitions of pressure and scoring (live gate, HIGH threshold 0.65–0.90, percentile grouping, knockout weight, shrinkage, recency, baselines, every weight jittered by ±30%) are run separately. It is reported next to each player, not used to build the order.</p></Panel>
      </div>
      <Panel title={kind === "bat" ? "Batters: rank spread" : "Bowlers: rank spread"} desc="Bars are the 10th to 90th percentile of the player's rank. The dashed line marks the top 10." right={<Legend items={[{ c: C.blue, l: "Match resamples" }, { c: C.pink, l: "Alternative definitions" }]} />}>
        {!rows ? <Loading h={420} /> : <RankSpread rows={rows} />}
      </Panel>
      <Panel title="Top-10 share by player" className="overflow-x-auto">
        {!rows ? <Loading h={200} /> : <table className="w-full min-w-[560px] text-[13px]"><thead><tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><th className="py-2">#</th><th className="px-3 py-2">Player</th><th className="px-3 py-2 text-right">Match resamples</th><th className="px-3 py-2 text-right">Alternative definitions</th><th className="px-3 py-2 text-right">Median rank</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-border/60"><td className="py-2">{r.rank}</td><td className="px-3 py-2 font-medium">{r.name}</td><td className="num px-3 py-2 text-right">{pct(r.top10_r)}</td><td className="num px-3 py-2 text-right">{r.top10_d == null ? "–" : pct(r.top10_d)}</td><td className="num px-3 py-2 text-right">{r.median.toFixed(0)}</td></tr>)}</tbody></table>}
        {s && <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground"><Pill tone="gold">Close calls</Pill>{s.lists[kind].close_in.join(", ")} (in the list) and {s.lists[kind].close_out.join(", ")} (just outside)</div>}
      </Panel>
    </div>
  )
}
