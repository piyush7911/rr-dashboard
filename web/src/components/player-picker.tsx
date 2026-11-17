"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import type { Player } from "@/lib/types"

/** Searchable, grouped player dropdown (used on small screens instead of the long list). */
export function PlayerPicker({ players, current, onPick }: { players: Player[]; current: Player | null; onPick: (id: number) => void }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const box = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown); document.addEventListener("touchstart", onDown); document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])
  const shown = useMemo(() => players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [players, q])
  const finalists = shown.filter((p) => p.final_rank), others = shown.filter((p) => !p.final_rank)
  const Row = ({ p }: { p: Player }) => {
    const on = p.id === current?.id
    return (
      <button type="button" onClick={() => { onPick(p.id); setOpen(false); setQ("") }} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[14px] transition ${on ? "bg-secondary text-secondary-foreground" : "hover:bg-muted active:bg-muted"}`}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-md text-[11.5px] font-bold ${p.final_rank ? "bg-rr-blue text-white" : "bg-muted text-muted-foreground"}`}>{p.final_rank ?? p.pool_rank}</span>
        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
        {on && <Check className="size-4 shrink-0 text-rr-blue" />}
      </button>
    )
  }
  return (
    <div ref={box} className="relative lg:hidden">
      <button type="button" onClick={() => { setOpen((o) => !o); setTimeout(() => input.current?.focus(), 50) }} aria-expanded={open}
        className={`flex h-12 w-full items-center gap-3 rounded-xl border bg-white px-3 text-left shadow-sm transition ${open ? "border-rr-blue ring-2 ring-rr-blue/20" : "border-border"}`}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-md text-[11.5px] font-bold ${current?.final_rank ? "bg-rr-blue text-white" : "bg-muted text-muted-foreground"}`}>{current ? (current.final_rank ?? current.pool_rank) : "–"}</span>
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{current?.name ?? "Choose a player"}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-border bg-white shadow-xl shadow-rr-navy/10">
          <div className="border-b border-border/70 p-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" className="h-9 w-full rounded-lg bg-muted/60 pl-8 pr-3 text-[14px] outline-none placeholder:text-muted-foreground focus:bg-muted" /></div></div>
          <div className="max-h-[58vh] overflow-y-auto p-1.5">
            {finalists.length > 0 && <><div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-rr-pink">Final ten</div>{finalists.map((p) => <Row key={p.id} p={p} />)}</>}
            {others.length > 0 && <><div className="px-2.5 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Other eligible players</div>{others.map((p) => <Row key={p.id} p={p} />)}</>}
            {shown.length === 0 && <div className="px-3 py-8 text-center text-[13px] text-muted-foreground">No player found</div>}
          </div>
        </div>
      )}
    </div>
  )
}
