"use client"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

export function PageHeader({ eyebrow, title, desc, right }: { eyebrow?: string; title: string; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-rr-pink">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
        {desc && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      {right}
    </div>
  )
}
export function Kpi({ label, value, sub, accent, className }: { label: string; value: ReactNode; sub?: ReactNode; accent?: "blue" | "pink" | "gold"; className?: string }) {
  const bar = accent === "pink" ? "bg-rr-pink" : accent === "gold" ? "bg-rr-gold" : "bg-rr-blue"
  return (
    <Card className={cn("relative content-start gap-0 overflow-hidden px-4 py-3.5 shadow-none ring-1 ring-border", className)}>
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", bar)} />
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</div>}
    </Card>
  )
}
export function Panel({ title, desc, right, children, className }: { title?: string; desc?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-0 overflow-hidden p-0 shadow-none ring-1 ring-border", className)}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {desc && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </Card>
  )
}
export function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "pink" | "grey" | "green" | "gold" }) {
  const t = { blue: "bg-secondary text-secondary-foreground", pink: "bg-accent text-accent-foreground", grey: "bg-muted text-muted-foreground", green: "bg-[#dcf3ea] text-[#00694c]", gold: "bg-[#fdf0d3] text-[#8a5a00]" }[tone]
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", t)}>{children}</span>
}
export function Loading({ h = 220 }: { h?: number }) { return <div className="animate-pulse rounded-lg bg-muted/70" style={{ height: h }} /> }
export function Seg<T extends string | number>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[]; className?: string }) {
  return (
    <div className={cn("inline-flex w-full rounded-lg bg-muted p-0.5", className)}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)}
          className={cn("flex-1 rounded-md px-2 py-1 text-xs font-medium transition", value === o.v ? "bg-white text-rr-blue shadow-sm" : "text-muted-foreground hover:text-foreground")}>{o.l}</button>
      ))}
    </div>
  )
}
export function Chips<T extends string | number>({ value, onChange, options }: { value: T[]; onChange: (v: T[]) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.v)
        return (
          <button key={String(o.v)} type="button" onClick={() => { const n = on ? value.filter((x) => x !== o.v) : [...value, o.v]; if (n.length) onChange(n) }}
            className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium transition", on ? "border-rr-blue bg-rr-blue text-white" : "border-border bg-white text-muted-foreground hover:border-rr-blue/50")}>{o.l}</button>
        )
      })}
    </div>
  )
}

export function StatStrip({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <Card className="grid grid-cols-2 gap-0 overflow-hidden px-0 py-0 shadow-none ring-1 ring-border lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={it.label} className={cn("px-5 py-3", i > 0 && "lg:border-l lg:border-border/70", i % 2 === 1 && "border-l border-border/70 lg:border-l", i >= 2 && "border-t border-border/70 lg:border-t-0")}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{it.label}</div>
          <div className="num mt-0.5 flex items-baseline gap-2"><span className="text-xl font-semibold tracking-tight">{it.value}</span>{it.sub && <span className="truncate text-xs text-muted-foreground">{it.sub}</span>}</div>
        </div>
      ))}
    </Card>
  )
}
