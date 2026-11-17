"use client"
import Link from "next/link"
import { Database, LineChart, Flame, Scale, Sigma, Trophy, Shuffle, ShieldCheck, type LucideIcon } from "lucide-react"
import { PageHeader, Panel, Pill, Kpi } from "@/components/ui-bits"
import { useSummary } from "@/lib/data"
import { pct } from "@/lib/format"

const ICONS: LucideIcon[] = [Database, LineChart, Flame, Scale, Sigma, Trophy, Shuffle, ShieldCheck]
const STEPS = [
  ["1", "Clean the pack", "Legal balls only (no wides or no-balls), reduced matches and super overs removed, three tiers kept apart (IPL, T20I, A-team), players keyed by id."],
  ["2", "Win probability", "LightGBM and an exactly solved dynamic program, both fitted out-of-fold by match, averaged for chases. No player identity enters."],
  ["3", "Pressure", "Leverage and a rule-based closeness × scarcity index; HIGH = top 25% of live balls within each innings and phase."],
  ["4", "Baselines", "Each ball against the league in the same tier, year, phase and opposition class; batters also by balls already faced (new batter) and by batting position, bowlers by innings and settledness."],
  ["5", "Expected pressure level", "Overall level plus the pressure edge, shrunk by B = τ² / (τ² + se²), with τ² estimated from the data. Thin pressure samples count for less automatically."],
  ["6", "Score", "Batters: 2/3 expected pressure level, 1/3 consistency. Bowlers: 1/3 expected pressure level, 1/3 opposition-adjusted rating, 1/3 consistency."],
  ["7", "Order and stability", "Final definition re-ranked under Bayesian resamples of the matches, aggregated by Borda, Copeland and MC4; alternative definitions reported separately. The ordering rule is below."],
  ["8", "Validation", "Every model refitted on earlier matches only at 13 cut-offs; ratings scored on every later ball; walk-forward selection."],
]
function Mix({ title, parts }: { title: string; parts: [string, number, string][] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="flex h-9 overflow-hidden rounded-lg text-[11px] font-semibold text-white">
        {parts.map(([l, w, c]) => <div key={l} className={`grid place-items-center ${c}`} style={{ width: `${w * 100}%` }}>{Math.round(w * 100)}%</div>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {parts.map(([l, , c]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${c}`} />{l}</span>)}
      </div>
    </div>
  )
}
export default function Method() {
  const { data: s } = useSummary()
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Method" title="From ball-by-ball data to a ranking" desc="The full description, with every table and figure, is in the methodology report." right={<Link href="/report" className="rounded-lg bg-rr-blue px-3 py-2 text-xs font-semibold text-white">Open the report</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="HIGH pressure" value="Top 25%" sub="of live balls, within each innings and phase" />
        <Kpi label="Eligibility" value={s ? `${s.params.min_high}+ balls` : "–"} sub="HIGH-pressure balls faced or bowled" accent="pink" />
        <Kpi label="Match resamples" value={s ? s.n_resamples.toLocaleString() : "–"} sub="build the final order" />
        <Kpi label="Alternative definitions" value={s ? s.n_definitions.toLocaleString() : "–"} sub="reported as sensitivity" accent="gold" />
      </div>
      <Panel title="Eight steps" desc="Every step uses the supplied data only">
        <ol className="relative space-y-1 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-border">
          {STEPS.map(([n, t, d], i) => { const Icon = ICONS[i]; return (
            <li key={n} className="relative flex gap-4 rounded-xl p-2 transition hover:bg-secondary/60">
              <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rr-blue to-[#3a63c9] text-white shadow-md shadow-rr-blue/25"><Icon className="size-[18px]" /></span>
              <div className="min-w-0 pt-0.5"><div className="flex items-baseline gap-2"><span className="num text-[11px] font-semibold text-rr-pink">STEP {n}</span><span className="text-[14.5px] font-semibold">{t}</span></div><p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{d}</p></div>
            </li>) })}
        </ol>
      </Panel>
      <Panel title="How the score is built" desc="Weights of each component in the final score">
        <div className="grid gap-6 md:grid-cols-2">
          <Mix title="Batters" parts={[["Expected pressure level", 2 / 3, "bg-rr-blue"], ["Consistency", 1 / 3, "bg-rr-pink"]]} />
          <Mix title="Bowlers" parts={[["Expected pressure level", 1 / 3, "bg-rr-blue"], ["Opposition-adjusted rating", 1 / 3, "bg-[#56b4e9]"], ["Consistency", 1 / 3, "bg-rr-pink"]]} />
        </div>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Settings" desc="Parameters of the final ranking" bodyClassName="flex flex-col"><dl className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 text-[13px]">
          {([["Recency half-life", s ? `${s.params.hl_bat} days (batters), ${s.params.hl_bowl} days (bowlers)` : "–"], ["Non-IPL evidence (bowlers)", s ? `weighted ${s.params.gamma_bowl}` : "–"], ["Pressure edge treated as real (typical)", s ? `${pct(s.shrink.bat.median)} batters, ${pct(s.shrink.bowl.median)} bowlers` : "–"], ["Tiers kept apart", "IPL, T20I, A-team"]] as [string, string][]).map(([k, v]) => <div key={k} className="flex flex-col justify-center rounded-lg bg-secondary/50 px-3.5 py-3"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}
        </dl></Panel>
        <Panel title="Sensitivity to the sample floor" desc="Effect on the final lists of requiring 75 HIGH balls instead of 50" bodyClassName="flex flex-col">
          {s && <div className="grid flex-1 gap-3 text-[13px]">{(["bat", "bowl"] as const).map((k) => <div key={k} className="grid content-center gap-2 rounded-lg bg-secondary/50 px-3.5 py-3">
            <div className="flex items-center justify-between"><span className="font-semibold">{k === "bat" ? "Batters" : "Bowlers"}</span><span className="text-[11px] text-muted-foreground">{s.floor75[k].eligible} eligible</span></div>
            <div className="flex items-center gap-2"><span className="w-8 shrink-0 rounded bg-rr-pink/10 px-1.5 py-0.5 text-center text-[10.5px] font-semibold uppercase text-rr-pink">Out</span><span className="font-medium">{s.floor75[k].out.length ? s.floor75[k].out.join(", ") : "none"}</span></div>
            <div className="flex items-center gap-2"><span className="w-8 shrink-0 rounded bg-rr-blue/10 px-1.5 py-0.5 text-center text-[10.5px] font-semibold uppercase text-rr-blue">In</span><span className="font-medium">{s.floor75[k].into.length ? s.floor75[k].into.join(", ") : "none"}</span></div>
          </div>)}</div>}
        </Panel>
      </div>
      <Panel title="Ordering rule" desc="How the final order is decided"><ol className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
        {["Each place is decided by the consensus score: the mean of the player's Borda, Copeland and MC4 ranks over the match resamples (lower is better).", "Equal scores are broken by Borda points, then by the share of resamples in the top 10, then by the number of HIGH balls (more evidence).", "No two players in either top 10 share a consensus score, so the tie-breaks never decide a place. Close calls are named, not re-ordered; the alternative-definition run is reported next to each player and is not used to order."].map((t, i) => <li key={i} className="flex gap-3"><span className="num grid size-6 shrink-0 place-items-center rounded-full bg-rr-pink/10 text-[12px] font-bold text-rr-pink">{i + 1}</span><span className="pt-0.5">{t}</span></li>)}</ol></Panel>
      <Panel title="What the data cannot support"><ul className="grid gap-3 text-[13px] leading-relaxed text-muted-foreground md:grid-cols-2">
        {["A batter's pressure-specific edge is barely repeatable: the batter list identifies who delivers most in high-stakes moments, mostly general ability, not a distinct pressure skill.", "The tenth place in each list is a statistical tie; places just before it are only partly stable.", "First-innings pressure rests on a weaker win-probability model; pressure is observed, not randomised.", "No venue names, ages, roles, injuries or fielding are in the data; none is used."].map((t) => <li key={t} className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5">{t}</li>)}</ul>
        <div className="mt-4 flex gap-2"><span className="rounded-full bg-rr-blue px-3 py-1 text-[11px] font-semibold text-white">Supplied data only</span><span className="rounded-full bg-rr-pink px-3 py-1 text-[11px] font-semibold text-white">No external data</span></div></Panel>
    </div>
  )
}
