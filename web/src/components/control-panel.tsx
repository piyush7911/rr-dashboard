"use client"
import type { ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Chips, Seg } from "@/components/ui-bits"
import { useParams } from "@/lib/params"

function Field({ label, value, hint, children }: { label: string; value?: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5" title={hint}>
      <div className="flex items-baseline justify-between text-xs"><span className="font-medium text-foreground/80">{label}</span>{value != null && <span className="num whitespace-nowrap font-semibold text-rr-blue">{value}</span>}</div>
      {children}
    </div>
  )
}
function Group({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-border/70 py-3 last:border-0">
      <summary className="mb-3 flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}<span className="text-base leading-none transition group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-4">{children}</div>
    </details>
  )
}
const one = (v: number | readonly number[]) => (Array.isArray(v) ? (v as number[])[0] : (v as number))

export function ControlPanel() {
  const { pressure: p, rate: r, setPressure, setRate, reset, dirty } = useParams()
  return (
    <div className="px-4 pb-6">
      <div className="sticky top-0 z-10 -mx-4 mb-1 flex items-center justify-between bg-card/95 px-4 py-3 backdrop-blur">
        <div><div className="text-sm font-semibold">Definition and scoring</div><div className="text-[11px] text-muted-foreground">Results update as you adjust</div></div>
        <Button size="sm" variant="outline" onClick={reset} disabled={!dirty} className="h-7 gap-1 text-xs"><RotateCcw className="size-3" />Reset</Button>
      </div>
      <Group title="Pressure definition">
        <Seg value={p.mode} onChange={(v) => setPressure({ mode: v })} options={[{ v: "consensus", l: "Consensus" }, { v: "leverage", l: "Leverage" }, { v: "rule", l: "Rule" }, { v: "custom", l: "Custom" }]} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {{ consensus: "Both definitions must agree the match is live; the two percentiles are averaged.", leverage: "Expected change in win probability from the next ball.", rule: "Distance of the required rate (or par) from normal, multiplied by the scarcity of balls and wickets.", custom: "A weighted combination of the components listed below." }[p.mode]}
        </p>
        <Field label="Live-match window" value={`${(p.wp_lo * 100).toFixed(0)}–${(p.wp_hi * 100).toFixed(0)}%`} hint="Batting-side win probability. Balls outside this window are treated as decided and carry no pressure.">
          <Slider min={0} max={1} step={0.01} value={[p.wp_lo, p.wp_hi]} onValueChange={(v) => { const a = v as number[]; setPressure({ wp_lo: a[0], wp_hi: a[1] }) }} />
        </Field>
        <Field label="HIGH threshold (share of live balls)" value={`top ${((1 - p.high_pct) * 100).toFixed(0)}%`}>
          <Slider min={0.5} max={0.95} step={0.01} value={[p.high_pct]} onValueChange={(v) => setPressure({ high_pct: one(v) })} />
        </Field>
        <Field label="Percentile reference group" hint="Each ball is ranked against balls from the same phase and innings, the same innings, or all balls."><Seg value={p.group} onChange={(v) => setPressure({ group: v })} options={[{ v: "innings_phase", l: "By phase" }, { v: "innings", l: "By innings" }, { v: "global", l: "Global" }]} /></Field>
      </Group>
      <Group title="Scope">
        <Field label="Innings"><Chips value={p.innings} onChange={(v) => setPressure({ innings: v })} options={[{ v: 1, l: "First innings" }, { v: 2, l: "Chase" }]} /></Field>
        <Field label="Phases"><Chips value={p.phases} onChange={(v) => setPressure({ phases: v })} options={[{ v: "PP", l: "Powerplay" }, { v: "Mid", l: "Overs 7–15" }, { v: "Death", l: "Death 16–20" }]} /></Field>
        <Field label="Competitions"><Chips value={p.tiers} onChange={(v) => setPressure({ tiers: v })} options={[{ v: "IPL", l: "IPL" }, { v: "T20I", l: "T20I" }, { v: "A", l: "A-teams" }]} /></Field>
        <Field label="Knockout multiplier" value={`×${p.ko_mult.toFixed(1)}`}><Slider min={1} max={2} step={0.1} value={[p.ko_mult]} onValueChange={(v) => setPressure({ ko_mult: one(v) })} /></Field>
      </Group>
      {p.mode === "custom" && (
        <Group title="Custom weights">
          {([["leverage", "Win-probability leverage"], ["closeness", "Closeness to par / required rate"], ["urgency", "Resource scarcity"], ["wickets", "Wickets lost"], ["late", "Late in the innings"]] as const).map(([k, l]) => (
            <Field key={k} label={l} value={p.cw[k].toFixed(1)}><Slider min={0} max={2} step={0.1} value={[p.cw[k]]} onValueChange={(v) => setPressure({ cw: { ...p.cw, [k]: one(v) } })} /></Field>
          ))}
        </Group>
      )}
      <Group title="Rule-based parameters" open={false}>
        <Field label="Closeness bandwidth (σ)" value={p.sigma.toFixed(2)}><Slider min={0.1} max={0.8} step={0.05} value={[p.sigma]} onValueChange={(v) => setPressure({ sigma: one(v) })} /></Field>
        <Field label="Minimum closeness to count as live" value={p.cmin.toFixed(2)}><Slider min={0} max={0.9} step={0.05} value={[p.cmin]} onValueChange={(v) => setPressure({ cmin: one(v) })} /></Field>
        <Field label="Wicket weight in resources" value={p.wkt_w.toFixed(2)}><Slider min={0} max={1} step={0.05} value={[p.wkt_w]} onValueChange={(v) => setPressure({ wkt_w: one(v) })} /></Field>
        <Field label="Scarcity cap" value={p.urg_cap.toFixed(1)}><Slider min={1} max={10} step={0.5} value={[p.urg_cap]} onValueChange={(v) => setPressure({ urg_cap: one(v) })} /></Field>
      </Group>
      <Group title="Rating parameters" open={false}>
        <Field label="Batter recency half-life" value={r.hl_bat ? `${r.hl_bat} d` : "off"}><Slider min={0} max={1500} step={30} value={[r.hl_bat]} onValueChange={(v) => setRate({ hl_bat: one(v) })} /></Field>
        <Field label="Bowler recency half-life" value={r.hl_bowl ? `${r.hl_bowl} d` : "off"}><Slider min={0} max={1500} step={30} value={[r.hl_bowl]} onValueChange={(v) => setRate({ hl_bowl: one(v) })} /></Field>
        <Field label="Shrinkage constant, all balls" value={`${r.k_all} balls`}><Slider min={0} max={300} step={10} value={[r.k_all]} onValueChange={(v) => setRate({ k_all: one(v), kb_all: one(v) })} /></Field>
        <Field label="Shrinkage constant, pressure balls" value={`${r.k_hi} balls`}><Slider min={0} max={400} step={10} value={[r.k_hi]} onValueChange={(v) => setRate({ k_hi: one(v), kb_hi: one(v) })} /></Field>
        <Field label="Non-IPL evidence weight, batters" value={r.gamma_bat.toFixed(2)}><Slider min={0} max={1} step={0.05} value={[r.gamma_bat]} onValueChange={(v) => setRate({ gamma_bat: one(v) })} /></Field>
        <Field label="Non-IPL evidence weight, bowlers" value={r.gamma_bowl.toFixed(2)}><Slider min={0} max={1} step={0.05} value={[r.gamma_bowl]} onValueChange={(v) => setRate({ gamma_bowl: one(v) })} /></Field>
        <div className="flex items-center justify-between text-xs"><span className="font-medium text-foreground/80">Opposition-class baselines</span><Switch checked={r.opp_adjust} onCheckedChange={(c) => setRate({ opp_adjust: !!c })} /></div>
        <div className="flex items-center justify-between text-xs"><span className="font-medium text-foreground/80">Role-aware baselines</span><Switch checked={r.role_adjust} onCheckedChange={(c) => setRate({ role_adjust: !!c })} /></div>
      </Group>
      <Group title="Eligibility" open={false}>
        <Field label="Batters: minimum HIGH balls" value={r.min_high.bat}><Slider min={0} max={150} step={5} value={[r.min_high.bat]} onValueChange={(v) => setRate({ min_high: { ...r.min_high, bat: one(v) } })} /></Field>
        <Field label="Bowlers: minimum HIGH balls" value={r.min_high.bowl}><Slider min={0} max={120} step={4} value={[r.min_high.bowl]} onValueChange={(v) => setRate({ min_high: { ...r.min_high, bowl: one(v) } })} /></Field>
        <Field label="Minimum pressure innings or spells" value={r.min_app}><Slider min={0} max={30} step={1} value={[r.min_app]} onValueChange={(v) => setRate({ min_app: one(v) })} /></Field>
      </Group>
    </div>
  )
}
