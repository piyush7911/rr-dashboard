"use client"
import { Bar, BarChart, CartesianGrid, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend as RLegend } from "recharts"
import { PageHeader, Panel, Kpi, Loading, Seg } from "@/components/ui-bits"
import { IntervalChart, C } from "@/components/charts"
import { useEvidence, useSummary } from "@/lib/data"
import { useState } from "react"
import type { Kind } from "@/lib/types"

const axis = { fontSize: 11, fill: "#5a678a" }
const f = (x?: number | null, d = 2) => (x == null ? "–" : `${x >= 0 ? "+" : ""}${x.toFixed(d)}`)

export default function Validation() {
  const { data: s } = useSummary(); const { data: ev } = useEvidence(); const [kind, setKind] = useState<Kind>("bat")
  const comp = (ev?.components ?? []).filter((c) => c.kind === kind && c.scope === "whole pool")
  const compRows = comp.map((c) => ({ label: c.method, est: c["PI-wtd runs"], lo: c["PI-wtd runs|lo"], hi: c["PI-wtd runs|hi"], bold: c.method === "Final score" }))
  const compWin = comp.map((c) => ({ label: c.method, est: c["PI-wtd win%"], lo: c["PI-wtd win%|lo"], hi: c["PI-wtd win%|hi"], bold: c.method === "Final score" }))
  const thin = (ev?.thin ?? []).filter((t) => t.kind === kind).map((t) => ({ name: t.hi >= 9999 ? `${t.lo}+` : `${Math.max(t.lo, kind === "bat" ? 30 : 24)}–${t.hi - 1}`, runs: t.runs, err: [t.runs - t.runs_lo, t.runs_hi - t.runs] }))
  const rep = (ev?.replication ?? []).filter((r) => r.scope === "top 10")
  const wf = (ev?.walkforward ?? []).filter((w) => w.kind === kind)
  const sk = (k: string, thr = 40) => ev?.skill.find((x) => x.kind === k && x.thr === thr)
  const alt = (ev?.decisions ?? []).filter((d) => d.kind === kind && d.scope === "whole pool")
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Validation" title="Does the rating predict later pressure performance?" desc="Strictly time-ordered. At each quarterly cut-off every model (win probability, venue par, expected runs, pressure percentiles) is refitted on earlier matches only; players are rated on earlier balls and scored on every later ball." right={<Seg value={kind} onChange={setKind} options={[{ v: "bat", l: "Batters" }, { v: "bowl", l: "Bowlers" }]} className="w-56" />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cut-offs" value={s?.cuts.length ?? "–"} sub={s ? `${s.cuts[0]} to ${s.cuts[s.cuts.length - 1]}` : undefined} />
        <Kpi label="Test balls" value={s ? s.test_balls[kind].toLocaleString() : "–"} sub={s ? `${s.test_matches} matches` : undefined} accent="pink" />
        <Kpi label="Forward chase AUC" value={s ? s.chase_auc_forward.toFixed(3) : "–"} sub="win-probability models trained on earlier matches only" />
        <Kpi label="Final score, top 10 vs rest" value={ev ? f(ev.components.find((c) => c.kind === kind && c.scope === "top 10" && c.method === "Final score")?.["PI-wtd runs"], 1) : "–"} sub="runs per 100 pressure-weighted balls" accent="gold" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Signal of each building block: runs lens" desc="Later value per 100 pressure-weighted balls for a player rated one standard deviation higher (90% match-bootstrap intervals)">{!ev ? <Loading h={320} /> : <IntervalChart rows={compRows} height={kind === "bat" ? 280 : 320} />}</Panel>
        <Panel title="Signal of each building block: win-probability lens" desc="Same test, scored by win probability added">{!ev ? <Loading h={320} /> : <IntervalChart rows={compWin} height={kind === "bat" ? 280 : 320} />}</Panel>
      </div>
      <p className="rounded-lg bg-secondary/60 px-4 py-3 text-[13px] leading-relaxed text-secondary-foreground">{kind === "bat" ? "For batters, overall level carries most of the signal; raw pressure level alone carries none and resilience alone is negative. Ranking on the raw pressure edge, or on how much a batter rises, would reward noise. The score therefore estimates pressure level with empirical Bayes: overall level plus the share of the edge the data show to be real." : "For bowlers the opposition-adjusted rating is the strongest single block, and wicket rate alone does not predict. The blend is as good as its best component."}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Reliability by number of HIGH balls" desc="Regression slope of the final score by how many HIGH balls the player had before the cut-off">
          {!ev ? <Loading h={260} /> : <ResponsiveContainer width="100%" height={260}><BarChart data={thin} margin={{ left: -6, right: 8, top: 8 }}><CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} /><ReferenceLine y={0} stroke="#0d1a3f" /><Tooltip formatter={(v: any) => (+v).toFixed(1)} />
            <Bar isAnimationActive={false} dataKey="runs" fill={C.blue} radius={[4, 4, 0, 0]}><ErrorBar dataKey="err" stroke="#0d1a3f" width={5} /></Bar></BarChart></ResponsiveContainer>}
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{kind === "bowl" ? "Bowler ratings carry no signal below 50 HIGH balls and a clear one from 50, hence the 50-ball floor." : "Batter ratings are too noisy to read at any sample size; the same 50-ball floor is used for both lists."}</p>
        </Panel>
        <Panel title="Is doing better under pressure a repeatable skill?" desc="Split-half correlation across odd and even matches (players with at least 40 HIGH balls in each half)">
          {!ev ? <Loading h={260} /> : <ResponsiveContainer width="100%" height={260}><BarChart data={(["bat", "bowl"] as const).map((k) => ({ name: k === "bat" ? "Batters" : "Bowlers", "General ability": sk(k)?.general, "Skill on HIGH balls": sk(k)?.when_high, "Pressure edge": sk(k)?.edge }))} margin={{ left: -10, right: 8, top: 8 }}>
            <CartesianGrid stroke="#e8ecf6" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} domain={[0, 0.7]} /><Tooltip formatter={(v: any) => (+v).toFixed(2)} /><RLegend wrapperStyle={{ fontSize: 11 }} />
            <Bar isAnimationActive={false} dataKey="General ability" fill={C.sky} radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey="Skill on HIGH balls" fill={C.gold} radius={[4, 4, 0, 0]} /><Bar isAnimationActive={false} dataKey="Pressure edge" fill={C.pink} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}
          {s && <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">Permutation test: batters p = {s.perm.bat.p.toFixed(2)} (no distinct pressure skill), bowlers p = {s.perm.bowl.p.toFixed(3)}.</p>}
        </Panel>
      </div>
      <Panel title="Final score against alternative weightings" desc="Blend A: overall level, pressure level, resilience and consistency (.40 / .30 / .15 / .15 for batters) with plain baselines. Blend B: the same components with less weight on resilience and the final baselines. Difference in later value per 100 pressure-weighted balls, top 10 against the rest; p = share of match resamples in which the final score is better." className="overflow-x-auto">
        {!ev ? <Loading h={200} /> : <table className="w-full min-w-[620px] text-[13px]"><thead><tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Compared with</th><th className="px-3 py-2">Test balls</th><th className="px-3 py-2 text-right">Runs lens</th><th className="px-3 py-2 text-right">Win lens</th></tr></thead>
          <tbody>{rep.filter((r) => r.kind === kind).map((r, i) => <tr key={i} className="border-t border-border/60"><td className="py-2 pr-3">{r.against}</td><td className="px-3 py-2 text-muted-foreground">{r.subset}</td><td className="num px-3 py-2 text-right">{f(r["PI-wtd runs|d"])} <span className="text-[11px] text-muted-foreground">p {r["PI-wtd runs|p"].toFixed(2)}</span></td><td className="num px-3 py-2 text-right">{f(r["PI-wtd win%|d"])} <span className="text-[11px] text-muted-foreground">p {r["PI-wtd win%|p"].toFixed(2)}</span></td></tr>)}</tbody></table>}
      </Panel>
      <div className="space-y-5">
        <Panel title="Walk-forward selection" desc="Settings chosen at each cut-off from earlier windows only, then scored on the next window. Choosing settings by the test gives no reliable improvement on the final settings.">
          {!ev ? <Loading h={160} /> : <table className="w-full text-[13px]"><thead><tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><th className="py-2">Method</th><th className="px-3 py-2 text-right">Whole pool (runs)</th><th className="px-3 py-2 text-right">Top 10 (runs)</th></tr></thead>
            <tbody>{["Walk-forward selection", "Final settings (fixed)", "Blend A settings (fixed)"].map((m) => <tr key={m} className="border-t border-border/60"><td className="py-2">{m}</td><td className="num px-3 py-2 text-right">{f(wf.find((w) => w.method === m && w.scope === "whole pool")?.["PI-wtd runs"], 1)}</td><td className="num px-3 py-2 text-right">{f(wf.find((w) => w.method === m && w.scope === "top 10")?.["PI-wtd runs"], 1)}</td></tr>)}</tbody></table>}
        </Panel>
        <Panel title="Design decisions tested" desc="Alternative minus final, runs lens (negative = the alternative predicts worse)" className="overflow-x-auto">
          {!ev ? <Loading h={160} /> : <div className="grid gap-x-10 md:grid-cols-2">{alt.map((a, i) => <div key={i} className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 text-[13px]"><span>{a.variant}</span><span className="num shrink-0 whitespace-nowrap">{f(a["PI-wtd runs|d"])} <span className="text-[11px] text-muted-foreground">p {a["PI-wtd runs|p"].toFixed(2)}</span></span></div>)}</div>}
        </Panel>
      </div>
    </div>
  )
}
