"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, Gauge, Layers, LineChart, Scale, ShieldCheck, Sigma, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui-bits"
import { DEFAULT_RATE } from "@/lib/params"
import { useGet } from "@/lib/use-api"
import type { Meta } from "@/lib/types"

const Eyebrow = ({ children }: { children: ReactNode }) => <div className="mb-3 mt-9 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-rr-pink">{children}<span className="h-px flex-1 bg-border" /></div>
function Formula({ children }: { children: ReactNode }) { return <div className="mt-auto rounded-lg bg-rr-navy px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-[#cfe0ff]">{children}</div> }
function WeightBars({ title, accent, items }: { title: string; accent: string; items: [string, number, string][] }) {
  return (
    <Card className="gap-0 p-5 shadow-none ring-1 ring-border">
      <div className="mb-4 text-sm font-semibold">{title}</div>
      <div className="space-y-3.5">{items.map(([l, w, d]) => (
        <div key={l}><div className="mb-1 flex items-baseline justify-between"><span className="text-[13px] font-medium">{l}</span><span className="num text-xs font-semibold" style={{ color: accent }}>{w.toFixed(2)}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${w * 200}%`, maxWidth: "100%", background: accent }} /></div>
          <div className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{d}</div></div>
      ))}</div>
    </Card>
  )
}
function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Database; title: string; children: ReactNode }) {
  return (
    <Card className="relative gap-0 p-4 shadow-none ring-1 ring-border">
      <div className="mb-3 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-secondary text-rr-blue"><Icon className="size-[18px]" /></span><span className="num text-2xl font-semibold text-border">{String(n).padStart(2, "0")}</span></div>
      <div className="text-[13.5px] font-semibold">{title}</div><p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{children}</p>
    </Card>
  )
}
function Point({ icon: Icon, tone, children }: { icon: typeof CheckCircle2; tone: string; children: ReactNode }) {
  return <li className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground"><Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} /><span>{children}</span></li>
}

export default function Method() {
  const { data: meta } = useGet<Meta>("/meta"); const auc = meta?.facts?.wp_chase?.Average?.auc; const wb = DEFAULT_RATE.w_bat, ww = DEFAULT_RATE.w_bowl
  return (
    <div className="space-y-2">
      <PageHeader eyebrow="Method" title="How pressure is defined and rated" desc="A concise walk-through of the approach. The full methodology report (PDF) documents every choice and the tests behind it." />
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rr-navy via-[#13307f] to-rr-blue px-6 py-5 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-rr-pink/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-xl text-[14.5px] leading-relaxed text-white/85">Pressure is a property of the <b className="text-white">match situation</b>, never of the player. Every ball is compared with the league in the same condition and with the player’s own usual level, and the final order does not depend on any single definition.</p>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {[[meta ? String(meta.matches) : "809", "matches"], ["200", "definitions"], ["3", "aggregation methods"], [auc ? auc.toFixed(3) : "0.901", "chase AUC"]].map(([v, l]) => <div key={l} className="min-w-[128px] rounded-lg bg-white/10 px-3 py-2"><div className="num text-lg font-semibold leading-tight">{v}</div><div className="text-[11px] text-white/70">{l}</div></div>)}
          </div>
        </div>
      </section>

      <Eyebrow>Pipeline</Eyebrow>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Step n={1} icon={Database} title="Clean match state">Legal balls, score, wickets, target and venue par rebuilt from the six files. Reduced, tied and no-result matches are excluded.</Step>
        <Step n={2} icon={LineChart} title="Win probability">LightGBM averaged with an exactly solved dynamic program for chases. Out-of-fold, with no player identity.</Step>
        <Step n={3} icon={Gauge} title="Pressure">Two independent definitions that must agree. HIGH is the most pressured quarter of live balls.</Step>
        <Step n={4} icon={Scale} title="Ratings">Level, resilience and consistency against league baselines, shrunk for small samples.</Step>
        <Step n={5} icon={Trophy} title="Consensus">200 definitions re-ranked and combined by three methods that agree on the same ten players.</Step>
      </div>

      <Eyebrow>Defining pressure</Eyebrow>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-full gap-0 p-5 shadow-none ring-1 ring-border"><div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-rr-blue" />A · Leverage</div>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">How much the next ball can move the result. Counted only while the match is live.</p>
          <Formula>Σ P(outcome | state) × |ΔWP|<br />live: 10% ≤ WP ≤ 90%</Formula></Card>
        <Card className="h-full gap-0 p-5 shadow-none ring-1 ring-border"><div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-rr-pink" />B · Rule-based</div>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">How far the required rate (or venue par) is from normal, and how scarce the remaining balls and wickets are.</p>
          <Formula>closeness = exp(−ln(ratio)² / 2σ²)<br />score = closeness × scarcity</Formula></Card>
        <Card className="h-full gap-0 p-5 shadow-none ring-1 ring-border"><div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-rr-gold" />Consensus</div>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">Average of both percentiles, counted only when both agree the match is live.</p>
          <Formula>HIGH = top 25% of live balls<br />per innings × phase</Formula></Card>
      </div>

      <Eyebrow>Rating components and default weights</Eyebrow>
      <div className="grid gap-4 lg:grid-cols-2">
        <WeightBars title="Batters" accent="#254aa5" items={[["Overall level", wb.SRoA, "Context-adjusted strike rate on all balls"], ["Pressure level", wb.SRhA, "The same on HIGH-pressure balls, against the league’s HIGH balls"], ["Resilience", wb.res, "Own pressure level minus own usual level; the difference is shrunk"], ["Consistency", wb.cons, "Share of pressure innings above the league"]]} />
        <WeightBars title="Bowlers" accent="#ea1a85" items={[["Pressure rating", ww.Pz, "Opposition-adjusted ridge rating (batter, bowler and team effects, with a pressure slope)"], ["Resilience", ww.res, "Runs per over saved under pressure relative to own usual level"], ["Consistency", ww.relz, "Share of pressure spells above the league"], ["Pressure-specific deviation", ww.cz, "Bowler-specific pressure slope from the ridge model"]]} />
      </div>

      <Eyebrow>Fair comparison</Eyebrow>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[[Layers, "Like with like", "Baselines per competition tier, year, phase and opposition class."], [Sigma, "Small samples", "Shrinkage toward the league mean, explicit eligibility rules and recency weighting."], [Scale, "IPL, T20I, A-teams", "Kept as separate baselines, with an option to down-weight non-IPL evidence."], [ShieldCheck, "Opposition strength", "Opposition-class adjustment, so weak opposition cannot inflate a rating."]].map(([I, t, d]) => { const Ic = I as typeof Layers; return (
          <Card key={t as string} className="gap-0 p-4 shadow-none ring-1 ring-border"><Ic className="mb-2.5 size-[18px] text-rr-blue" /><div className="text-[13.5px] font-semibold">{t as string}</div><p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{d as string}</p></Card>) })}
      </div>

      <Eyebrow>What the data supports, and what it does not</Eyebrow>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 border-l-[3px] border-l-[#009e73] p-5 shadow-none ring-1 ring-border"><div className="mb-3 text-sm font-semibold">Supported</div>
          <ul className="space-y-2.5"><Point icon={CheckCircle2} tone="text-[#009e73]">HIGH balls carry markedly more win-probability swing than ordinary live balls, especially in chases.</Point><Point icon={CheckCircle2} tone="text-[#009e73]">General ability is repeatable across independent halves of the data for batters and bowlers.</Point><Point icon={CheckCircle2} tone="text-[#009e73]">Bowlers show a small, repeatable pressure-specific edge.</Point><Point icon={CheckCircle2} tone="text-[#009e73]">Bowler places 1–4 are stable across all 200 definitions; the top-10 sets agree across the three aggregation methods.</Point></ul></Card>
        <Card className="gap-0 border-l-[3px] border-l-rr-pink p-5 shadow-none ring-1 ring-border"><div className="mb-3 text-sm font-semibold">Limits</div>
          <ul className="space-y-2.5"><Point icon={AlertTriangle} tone="text-rr-pink">Batters show no detectable pressure-specific skill; their rankings reflect general ability in high-leverage moments.</Point><Point icon={AlertTriangle} tone="text-rr-pink">First-innings win probability is comparatively weak (AUC 0.69).</Point><Point icon={AlertTriangle} tone="text-rr-pink">Players with fewer than 70 HIGH balls (Sooryavanshi, Ferreira, Malinga) occupy the least certain places.</Point><Point icon={AlertTriangle} tone="text-rr-pink">Venue names, ages, roles and injuries are not in the data and are not used.</Point></ul></Card>
      </div>

      <Eyebrow>Data</Eyebrow>
      <Card className="gap-0 p-5 shadow-none ring-1 ring-border">
        <p className="text-[13px] leading-relaxed text-muted-foreground">Only the supplied data is used: {meta ? meta.matches : 809} of 883 listed matches are analysed (reduced, tied and no-result matches excluded), covering IPL, T20I and two A-team events from 2022 to 2026.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/evidence" className="inline-flex items-center gap-1.5 rounded-lg bg-rr-blue px-3.5 py-2 text-[13px] font-semibold text-white transition hover:brightness-110">View the evidence <ArrowRight className="size-3.5" /></Link>
          <Link href="/lab" className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 text-[13px] font-semibold text-secondary-foreground transition hover:bg-secondary/70">Open the Pressure Lab</Link>
        </div>
      </Card>
    </div>
  )
}
