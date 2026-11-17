"use client"
import type { Player } from "@/lib/types"
import { pct } from "@/lib/format"

/** Knockout record of one player: supporting evidence, not part of the rating. */
export function koRecord(p: Player) {
  const k = p.knockout; const h = k?.high; const bat = p.kind === "bat"
  if (!k || k.high_balls === 0 || !h) return "–"
  return bat ? `strike rate ${(h.sr ?? 0).toFixed(0)}, ${(h.out ?? 0).toFixed(1)} out per 100` : `economy ${(h.econ ?? 0).toFixed(2)}, ${(h.wkts ?? 0).toFixed(1)} wickets per 100`
}
export function KnockoutTable({ players }: { players: Player[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="num w-full text-[12.5px]">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <th className="pb-2 pr-3 font-medium">#</th><th className="pb-2 pr-3 font-medium">Player</th><th className="pb-2 pr-3 text-right font-medium">Knockout matches</th>
          <th className="pb-2 pr-3 text-right font-medium">Pressure balls in knockouts</th><th className="pb-2 pr-3 text-right font-medium">Share of his pressure balls</th><th className="pb-2 font-medium">Record on those balls</th></tr></thead>
        <tbody>
          {players.map((p) => { const k = p.knockout; const thin = k && k.high_balls > 0 && k.high_balls < 15
            return (
              <tr key={p.id} className="border-t border-border/60">
                <td className="py-1.5 pr-3 font-semibold text-muted-foreground">{p.final_rank}</td><td className="pr-3 font-medium">{p.name}</td>
                <td className="pr-3 text-right">{k?.matches ?? 0}</td><td className="pr-3 text-right">{k?.high_balls ?? 0}</td>
                <td className="pr-3 text-right text-muted-foreground">{k && k.high_balls > 0 ? pct(k.high_share ?? 0) : "–"}</td>
                <td className={thin ? "text-muted-foreground" : ""}>{koRecord(p)}{thin ? " (few balls)" : ""}</td>
              </tr>) })}
        </tbody>
      </table>
    </div>
  )
}
