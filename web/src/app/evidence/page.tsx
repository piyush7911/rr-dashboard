"use client"
import { ANIM, DUR } from "@/lib/anim"
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Loading, PageHeader, Panel, Pill } from "@/components/ui-bits"
import { SwingChart } from "@/components/charts/lab-charts"
import { useGet } from "@/lib/use-api"
import { f1 } from "@/lib/format"

const PAIR_LABEL: Record<string, string> = { "naive overall": "Plain overall SR / economy", "naive recency": "Plain recency-weighted SR / economy", "SRoA only": "Adjusted overall SR only", "SRhA only": "Adjusted pressure SR only", "Pz only": "Opposition-adjusted model only", "ECOa only": "Adjusted overall economy only", "ECOa+WKa (plain adj. overall)": "Adjusted economy + wickets", "res only": "Resilience only", "cons only": "Consistency only", "EST level": "Shrunk pressure level" }
function Range({ lo, hi, est, min, max, tone }: { lo: number; hi: number; est: number; min: number; max: number; tone: string }) {
  const p = (v: number) => `${((v - min) / (max - min)) * 100}%`
  return (<div className="relative h-5 w-full"><div className="absolute left-0 right-0 top-1/2 h-px bg-border" /><div className="absolute top-[calc(50%-1px)] h-0.5" style={{ left: p(0), width: "1px", background: "#0a1a4a" }} /><div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ left: p(lo), width: `${((hi - lo) / (max - min)) * 100}%`, background: tone, opacity: 0.55 }} /><div className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow" style={{ left: p(est), background: tone }} /></div>)
}
export default function Evidence() {
  const { data: ev } = useGet<any>("/evidence")
  const tax = (k: string) => ev?.tax?.filter((t: any) => t.kind === k) ?? []
  const skill = ev?.skill?.filter((s: any) => s.thr === 40) ?? []
  const skillData = ["bat", "bowl"].map((k) => { const s = skill.find((x: any) => x.kind === k); return { name: k === "bat" ? `Batters (n=${s?.n})` : `Bowlers (n=${s?.n})`, general: s?.general, high: s?.when_high, edge: s?.edge } })
  const bt = (k: string, v: string, c: string) => { const r = ev?.backtest?.filter((x: any) => x.kind === k && x.variant === v) ?? []; return r.length ? r.reduce((a: number, x: any) => a + x[c], 0) / r.length : null }
  const dropped = [["First-innings collapse index", "1st-inn collapse-hazard index", "t1", "default consensus (P0)"], ["Gate × urgency + collapse index", "gate (chase) + collapse (inn1)", "t1", "default consensus (P0)"], ["Learned pressure regimes (k-means)", "learned state clusters (KMeans 14)", "t1", "default consensus (P0)"], ["Death overs only", "death only", "t1", "default consensus (P0)"], ["Continuous pressure weights", "EST continuous weights g=1", "t2", "ENGINE DEFAULT"], ["Stricter eligibility 150/120 HIGH balls", "ENGINE min gate 150/120", "t2", "ENGINE DEFAULT"], ["Match-demeaning + effective-sample caps", "EST n_eff cap rho=.05 + LOO match demean", "t2", "ENGINE DEFAULT"], ["Lower-confidence-bound ranking", "EST level+.3d, LCB z=1.0", "t2", "ENGINE DEFAULT"]]
  const mean = (t: string, kind: string, v: string) => { const r = ev?.[t]?.filter((x: any) => x.kind === kind && x.variant === v) ?? []; return r.length ? r.reduce((a: number, x: any) => a + x.pct, 0) / r.length : null }
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Evidence" title="What the data supports, and what it does not" desc="All figures are computed from the supplied data by script: where pressure matters, whether performing under pressure is a repeatable skill, how well the ratings predict later matches, and which ideas were tested and dropped." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="1 · Win-probability swing by pressure class" desc="Default definition; mean change in win probability per ball (points)">{ev ? <SwingChart sep={ev.separation} /> : <Loading />}</Panel>
        <Panel title="2 · Effect of pressure on a typical player" desc="Relative to the league in the same condition; bar shows the 90% match-bootstrap interval">
          {!ev ? <Loading /> : (
            <div className="space-y-5">{(["bat", "bowl"] as const).map((k) => (
              <div key={k}><div className="mb-1.5 text-xs font-semibold">{k === "bat" ? "Batters: runs per 100 balls (positive: faster scoring on HIGH balls)" : "Bowlers: runs per over saved (negative: more runs conceded on HIGH balls)"}</div>
                {tax(k).map((t: any) => <div key={t.group} className="grid grid-cols-[88px_1fr_58px] items-center gap-3 text-xs"><span className="text-muted-foreground">{t.group}</span><Range lo={t.lo} hi={t.hi} est={t.est} min={k === "bat" ? -5 : -0.8} max={k === "bat" ? 12 : 0.3} tone={t.lo > 0 ? "#254aa5" : t.hi < 0 ? "#ea1a85" : "#8c97b5"} /><span className="num text-right font-semibold">{t.est > 0 ? "+" : ""}{f1(t.est, k === "bat" ? 1 : 2)}</span></div>)}</div>
            ))}</div>
          )}
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="3 · Is performing under pressure a repeatable skill?" desc="Split-half correlation, odd versus even matches (at least 40 HIGH balls per half)">
          {!ev ? <Loading /> : <ChartContainer config={{}} className="h-[250px] w-full"><BarChart data={skillData} barCategoryGap="28%" margin={{ left: -10, top: 8 }}><CartesianGrid vertical={false} stroke="#e8ecf5" /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 0.7]} /><ChartTooltip content={<ChartTooltipContent indicator="dot" />} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="general" name="General skill" fill="#56b4e9" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /><Bar dataKey="high" name="Skill on HIGH balls" fill="#254aa5" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /><Bar dataKey="edge" name="Pressure edge" fill="#ea1a85" radius={[5, 5, 0, 0]} isAnimationActive={ANIM} animationDuration={DUR} /></BarChart></ChartContainer>}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">General ability is repeatable for both groups. The pressure-specific edge is repeatable for bowlers but essentially not for batters. A permutation test is consistent with this: batters p = {f1(ev?.facts?.perm?.bat?.p, 2)}, bowlers p = {f1(ev?.facts?.perm?.bowl?.p, 3)}.</p>
        </Panel>
        <Panel title="4 · Forward backtest" desc="Players are rated on earlier matches and scored on later ones (mean of four cut-offs, same player pool)">
          {!ev ? <Loading /> : (
            <table className="num w-full text-[12.5px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th className="pb-2">Method</th><th className="pb-2 text-right">Bat lift</th><th className="pb-2 text-right">Bat pct</th><th className="pb-2 text-right">Bowl lift</th><th className="pb-2 text-right">Bowl pct</th></tr></thead>
              <tbody>{[["ENGINE", "Default score"], ["naive overall", "Plain overall SR / economy"], ["naive recency", "Plain recency-weighted"]].map(([v, l]) => <tr key={v} className="border-t border-border/60"><td className="py-2 font-medium">{l}</td><td className="text-right">{f1(bt("bat", v, "lift_runs"))}</td><td className="text-right">{f1(bt("bat", v, "pct"), 0)}</td><td className="text-right">{f1(bt("bowl", v, "lift_runs"))}</td><td className="text-right">{f1(bt("bowl", v, "pct"), 0)}</td></tr>)}</tbody></table>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Lift: runs per 100 later pressure balls above the pool average. Percentile: position among 400 random top-10 selections. The default score outperforms random selection but not clearly plain statistics; backtests of this kind are noisy (about ±10 runs per 100 balls).</p>
        </Panel>
      </div>
      <Panel title="5 · Components versus the full score" desc="Difference in out-of-sample rank correlation (90% bootstrap interval). Blue: better; pink: worse; grey: indistinguishable">
        {!ev ? <Loading h={300} /> : (
          <div className="grid gap-x-10 gap-y-1 md:grid-cols-2">{(["bat", "bowl"] as const).map((k) => (
            <div key={k}><div className="mb-2 text-xs font-semibold">{k === "bat" ? "Batters" : "Bowlers"}</div>
              {ev.paired.filter((p: any) => p.kind === k).map((p: any) => <div key={p.variant} className="grid grid-cols-[170px_1fr_50px] items-center gap-2 text-[11.5px]"><span className="truncate text-muted-foreground">{PAIR_LABEL[p.variant] ?? p.variant}</span><Range lo={p.wlo} hi={p.whi} est={p.wcorr_diff} min={-0.24} max={0.16} tone={p.wlo > 0 ? "#254aa5" : p.whi < 0 ? "#ea1a85" : "#8c97b5"} /><span className="num text-right font-semibold">{p.wcorr_diff > 0 ? "+" : ""}{f1(p.wcorr_diff, 2)}</span></div>)}</div>
          ))}</div>
        )}
      </Panel>
      <Panel title="6 · Ideas tested and dropped" desc="Top-10 percentile against random selection (change relative to the default in the same run). No alternative beat the default by more than the noise.">
        {!ev ? <Loading h={260} /> : (
          <table className="num w-full text-[12.5px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th className="pb-2">Idea</th><th className="pb-2 text-right">Batters</th><th className="pb-2 text-right">Bowlers</th><th className="pb-2 pl-6">Outcome</th></tr></thead>
            <tbody>{dropped.map(([l, v, t, d]) => { const a = mean(t, "bat", v), a0 = mean(t, "bat", d), b = mean(t, "bowl", v), b0 = mean(t, "bowl", d); const fmt = (x: number | null, x0: number | null) => (x == null || x0 == null ? "–" : `${x.toFixed(0)} (${x - x0 >= 0 ? "+" : ""}${(x - x0).toFixed(0)})`); const worse = (a != null && a0 != null && a - a0 < -8) || (b != null && b0 != null && b - b0 < -8)
              return <tr key={l} className="border-t border-border/60"><td className="py-2 font-medium">{l}</td><td className="text-right">{fmt(a, a0)}</td><td className="text-right">{fmt(b, b0)}</td><td className="pl-6">{worse ? <Pill tone="pink">Worse; dropped</Pill> : <Pill tone="grey">No gain; dropped</Pill>}</td></tr> })}</tbody></table>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Also tested and dropped: a dismissal-cost currency for batters (split-half reliability fell from 0.43 to 0.05), a joint model of usual and pressure level (it collapses to overall ability), isotonic recalibration of win probabilities, and blending with plain recency-weighted statistics.</p>
      </Panel>
    </div>
  )
}
