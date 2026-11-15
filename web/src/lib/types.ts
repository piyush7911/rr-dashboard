export type Kind = "bat" | "bowl"
export type ConsRow = { id: number; name: string; borda: number; in_top10: number; eligible_share: number; median_rank: number; p10_rank: number; p90_rank: number; default_rank: number | null; robust_rank: number; copeland_rank: number; mc4_rank: number; consensus_rank: number; final: boolean }
export type RankRow = {
  id: number; name: string; rank: number; score: number; n_high: number | null; n_app: number | null; ipl_share: number; default_rank: number | null; consensus_rank: number | null; in_final: boolean
  contrib: Record<string, number>; [k: string]: unknown
}
export type RankOut = { kind: Kind; n_eligible: number; rows: RankRow[]; weights: Record<string, number> }
export type Sep = { innings: number; cls: "HIGH" | "ordinary" | "decided"; balls: number; swing: number; wkts_per_100: number; runs_per_over: number; dot_pct: number }
export type PressureOut = { live: number; high: number; decided: number; high_balls: number; overlap_default: number; separation: Sep[]; by_over: { inn: number; over: number; high: number; live: number }[]; phase_mix: Record<string, Record<string, number>>; chase_map: { by: number; bx: number; n: number; high: number }[] }
export type Meta = { pressure: unknown; rate: unknown; facts: Record<string, any>; balls: number; matches: number; batters: number; bowlers: number; date_min: string; date_max: string }
export type Stat = { balls: number; sr?: number; boundary?: number; dot?: number; out?: number; econ?: number; wkts?: number; wides?: number } | null
export type PlayerOut = {
  id: number; name: string; kind: Kind; rank: number | null; score: number | null; n_eligible: number; eligible: boolean; components: Record<string, number | null>; consensus_rank: number | null; top10_share: number | null; p10: number | null; p90: number | null
  high: Stat; usual: Stat; by_year: { year: number; usual: Stat; high: Stat }[]; by_phase: { phase: string; usual: Stat; high: Stat }[]; innings: { date: string; opp_name: string; v: number; w: number; tier: string }[]; ipl_share: number; matches: number; teams_played: string[]
}
export type MatchBall = { n: number; over: number; wp: number; pi: number; hi: boolean; runs_before: number; wkts: number; runs: number; wicket: number; bat: string; bowl: string; delta: number; legal: number }
export type MatchOut = { id: number; info: { date: string; comp: string; result: string; stage: string }; innings: { innings: number; team: string; target: number | null; balls: MatchBall[] }[] }
export type MatchRow = { match_id: number; date: string; teams: string; comp: string; stage: string; ko: number; result: string; tier: string; hi_share: number }
