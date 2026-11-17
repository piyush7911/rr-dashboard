export type Kind = "bat" | "bowl"
export type ListRow = { id: number; name: string; rank: number; top10_r: number; top10_d: number | null; p10: number; p90: number; median: number; def_p10: number | null; def_p90: number | null; def_median: number | null; n_high: number }
export type Summary = {
  lists: Record<Kind, { rows: ListRow[]; close_in: string[]; close_out: string[]; next5: string[] }>
  matches: number; balls: number; legal: number; date_min: string; date_max: string; n_bat: number; n_bowl: number; high_balls: number; high_share: number; decided_share: number
  wp_chase: Record<string, { auc: number; brier: number }>; wp_first: { auc: number; brier: number }; chase_auc_forward: number
  shrink: Record<Kind, { median: number; q25: number; q75: number }>; floor75: Record<Kind, { out: string[]; into: string[]; eligible: number }>
  perm: Record<Kind, { n: number; p: number; true_sd: number; obs_sd: number }>
  n_resamples: number; n_definitions: number; cuts: string[]; test_balls: Record<Kind, number>; test_matches: number; pool: Record<Kind, number>
  weights: Record<Kind, Record<string, string>>; params: Record<string, number>
}
export type Stat = { balls: number; sr?: number; boundary?: number; dot?: number; out?: number; econ?: number; wkts?: number; wides?: number } | null
export type Player = {
  id: number; name: string; kind: Kind; final_rank: number | null; pool_rank: number; score: number; n_high: number; n_app: number | null; ipl_share: number; matches: number; last_match: string
  comp: Record<string, number | null>; high: Stat; usual: Stat; by_year: { year: number; usual: Stat; high: Stat }[]; by_phase: { phase: string; usual: Stat; high: Stat }[]
  innings: { date: string; opp: string; val: number; tier: string }[]
  stab: { top10_r: number; median: number; p10: number; p90: number; top10_d: number | null; def_p10: number | null; def_p90: number | null; eligible_share: number } | null
  type: string | null; pos: number | null; phase_share_high: Record<string, number> | null; chase_share_high: number | null
}
export type Players = Record<Kind, Player[]>
export type Row = Record<string, any>
export type Evidence = {
  separation: Row[]; tax: Row[]; skill: Row[]; components: Row[]; replication: Row[]; walkforward: Row[]; picks: Row[]; decisions: Row[]; consensus: Row[]; thin: Row[]; floor: Row[]; factors: Row[]; grouping: Row[]
  role_mix: Row[]; settledness: Row[]; dots: Row[]; transfer: Record<Kind, Row>; stability: Record<Kind, Row>
}
export type PressureData = { chase_map: { by: string; bx: string; n: number; high: number }[]; by_over: { innings: number; over: number; high: number; decided: number }[]; phase_mix_high: Record<string, Record<string, number>>; phase_mix_all: Record<string, Record<string, number>> }
export type Ball = { o: number; wp: number; pi: number; hi: boolean; r: number; w: number; bat: string; bowl: string }
