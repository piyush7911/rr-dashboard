"""Parameter-driven pressure + rating engine (nothing about the pressure definition or the scoring is hard-coded).
Shared by the dashboard and the backtests. Every user-changeable setting is a field of PressureParams / RateParams.
Data: derived per-ball table (work/build_dash_table.py), built from the organisers' pack only."""
import numpy as np, pandas as pd, scipy.sparse as sp
from dataclasses import dataclass, field
from sklearn.linear_model import Ridge

PHASES = ('PP', 'Mid', 'Death')


@dataclass
class PressureParams:
    mode: str = 'consensus'            # leverage | rule | consensus | custom
    wp_lo: float = 0.10; wp_hi: float = 0.90           # live-match gate on batting-side win probability
    sigma: float = 0.30; cmin: float = 0.30            # rule: closeness bandwidth (log-ratio); min closeness to count as live
    wkt_w: float = 0.60; urg_cap: float = 5.0          # rule: resource = balls_left/120*((1-wkt_w)+wkt_w*wkts_left/10); urgency=min(1/resource, cap)
    high_pct: float = 0.75                             # HIGH = pressure index >= this percentile
    group: str = 'innings_phase'                       # percentile within innings_phase | innings | global
    innings: tuple = (1, 2); phases: tuple = PHASES; tiers: tuple = ('IPL', 'T20I', 'A')
    ko_mult: float = 1.0                               # pressure multiplier in knockout matches (capped at 1)
    cw: dict = field(default_factory=lambda: {'leverage': 1.0, 'closeness': 1.0, 'urgency': 1.0, 'wickets': 0.0, 'late': 0.0})   # custom-mode weights


@dataclass
class RateParams:
    hl_bat: float = 365; hl_bowl: float = 730          # recency half-life in days (0 = none)
    k_all: float = 60; k_hi: float = 40                # shrinkage (balls), batters
    kb_all: float = 60; kb_hi: float = 40              # shrinkage (balls), bowlers
    opp_adjust: bool = True                            # baselines per opposition class
    role_adjust: bool = False                          # baselines also by batting-order group (batters) / pace-spin (bowlers)
    w_bat: dict = field(default_factory=lambda: {'SRoA': 0.40, 'SRhA': 0.30, 'res': 0.15, 'cons': 0.15})   # level (all / pressure) + resilience vs own usual + consistency
    w_bowl: dict = field(default_factory=lambda: {'Pz': 0.50, 'res': 0.20, 'relz': 0.20, 'cz': 0.10})
    gamma_bat: float = 1.0; gamma_bowl: float = 1.0    # weight of non-IPL evidence (1 = no IPL discount; measured cross-tier transfer: bat 0.39, bowl 0.28)
    eb_k: float = 0.0                                  # empirical-Bayes shrink of the final z by n_w/(n_w+eb_k); 0 = off
    min_w: dict = field(default_factory=lambda: {'bat': 45.0, 'bowl': 40.0}); min_high: dict = field(default_factory=lambda: {'bat': 30, 'bowl': 24}); min_app: int = 10
    alpha: float = 900; mult: float = 3                # ridge settings of the opposition-adjusted bowler/batter model


BAT_METRICS = {'SRoA': 'Context-adj. strike rate (all balls)', 'SRhA': 'Context-adj. strike rate (under pressure)', 'cons': 'Consistency (share of pressure innings above par)',
               'res': 'Resilience: pressure level vs own usual (shrunk)', 'Pz': 'Model pressure rating (opposition-adjusted)', 'bnd_hi': 'Boundary % (pressure)', 'dot_hi_n': 'Low dot-ball % (pressure)', 'out_hi_n': 'Low dismissal rate (pressure)'}
BOWL_METRICS = {'res': 'Resilience: pressure level vs own usual (shrunk)', 'Pz': 'Model pressure rating (opposition-adjusted)', 'relz': 'Consistency (share of pressure spells positive)', 'cz': 'Pressure-specific deviation',
                'ECOa': 'Context-adj. economy (all)', 'WKa': 'Wicket rate above average (all)', 'ECOh': 'Context-adj. economy (pressure)', 'WKh': 'Wicket rate above average (pressure)',
                'dot_hi': 'Dot-ball % (pressure)', 'wd_n': 'Low wides/no-ball % (pressure)', 'york': 'Yorker % (death overs, pace)'}


class Engine:
    def __init__(self, df):
        self.df = df.reset_index(drop=True)
        n = pd.concat([self.df[['striker_id', 'striker_name']].set_axis(['id', 'n'], axis=1), self.df[['bowler_id', 'bowler_name']].set_axis(['id', 'n'], axis=1)])
        self.names = n.drop_duplicates('id').set_index('id').n
        self.maxdate = self.df.date.max()
        if 'ord_grp' not in self.df: self.df['ord_grp'] = pd.cut(self.df.batting_order, [0, 2, 4, 6, 20], labels=['1-2', '3-4', '5-6', '7+']).astype(str)

    # ------------------------------------------------------------------ pressure
    def _pct(self, score, live, group):
        keys = {'innings_phase': ['innings', 'phase'], 'innings': ['innings'], 'global': None}[group]
        s = score.where(live)
        r = s.rank(pct=True) if keys is None else self.df[keys].assign(s=s).groupby(keys, observed=True).s.rank(pct=True)
        return r.fillna(0.0)

    def components(self, p):
        d = self.df; bl = d.balls_left.clip(lower=1).astype('float64')
        chase = (d.target - d.runs_before) / (bl / 6) / d.exp_rate
        inn1 = d.venue_par / (d.runs_before + d.exp_rem).clip(lower=1)
        ratio = np.where(d.innings == 2, chase, inn1)
        ratio = pd.Series(np.where(np.isfinite(ratio) & (ratio > 0), ratio, np.nan), index=d.index)
        clos = np.exp(-(np.log(ratio) ** 2) / (2 * p.sigma ** 2))
        res = (d.balls_left / 120) * ((1 - p.wkt_w) + p.wkt_w * d.wkts_left.clip(1, 10) / 10)
        urg = np.minimum(1 / res.clip(lower=0.05), p.urg_cap)
        open_chase = (d.innings == 1) | ((d.target - d.runs_before) > 0)
        return pd.DataFrame({'clos': clos, 'urg': urg, 'live_rule': (clos >= p.cmin) & open_chase, 'live_wp': d.wp_before.between(p.wp_lo, p.wp_hi)})

    def pressure(self, p: PressureParams):
        d = self.df; c = self.components(p); g = p.group
        if p.mode == 'leverage':
            pi = self._pct(d.leverage, c.live_wp, g)
        elif p.mode == 'rule':
            pi = self._pct(c.clos * c.urg, c.live_rule, g)
        elif p.mode == 'consensus':
            a = self._pct(d.leverage, c.live_wp, g); b = self._pct(c.clos * c.urg, c.live_rule, g)
            pi = ((a + b) / 2).where(c.live_wp & c.live_rule, 0.0)
        elif p.mode == 'custom':
            cw = p.cw; live = c.live_wp
            comp = {'leverage': self._pct(d.leverage, live, g), 'closeness': c.clos.fillna(0), 'urgency': self._pct(c.urg, live, g), 'wickets': 1 - d.wkts_left / 10, 'late': d.over / 20}
            tot = sum(abs(v) for v in cw.values()) or 1.0
            pi = self._pct(sum(cw[k] * comp[k] for k in cw) / tot, live, g)
        else:
            raise ValueError(p.mode)
        keep = d.innings.isin(p.innings) & d.phase.isin(p.phases) & d.tier.isin(p.tiers)
        pi = pi.where(keep, 0.0)
        if p.ko_mult != 1.0: pi = (pi * np.where(d.knock_out == 1, p.ko_mult, 1.0)).clip(upper=1.0)
        return pi

    # ------------------------------------------------------------------ rating helpers
    @staticmethod
    def _w(dates, hl, cut):
        return np.ones(len(dates)) if not hl else 0.5 ** (((cut - dates).dt.days.clip(lower=0)) / hl).values

    def _eligible(self, kind, pi, high, mask, rp):
        d = self.df[mask]; idc = 'striker_id' if kind == 'bat' else 'bowler_id'; pm = pi[mask]
        n_w = pm.groupby(d[idc]).sum(); n_hi = (d.legal.eq(1) & (pm >= high) & (pm > 0)).groupby(d[idc]).sum()
        sgn = 1 if kind == 'bat' else -1
        a = pd.DataFrame({'idc': d[idc], 'm': d.match_id, 'i': d.innings, 'v': sgn * d.drun * pm, 'w': pm}).groupby(['idc', 'm', 'i']).sum().reset_index()
        a = a[a.w >= 1.5]; c = a.groupby('idc').v.agg(n_app='size', pos=lambda s: (s > 0).sum())
        out = pd.DataFrame({'n_w': n_w, 'n_high': n_hi}).join(c).fillna({'n_app': 0, 'pos': 0}); out['reliab'] = (out.pos + 2.5) / (out.n_app + 5)
        out['ok'] = (out.n_w >= rp.min_w[kind]) & (out.n_high >= rp.min_high[kind]) & (out.n_app >= rp.min_app)
        return out

    def _ipl_share(self, kind, pi, mask):
        d = self.df[mask]; idc = 'striker_id' if kind == 'bat' else 'bowler_id'; ipl = (d.tier == 'IPL').values
        tot = pi[mask].groupby(d[idc]).sum(); ip = (pi[mask] * ipl).groupby(d[idc]).sum()
        return (ip / tot.replace(0, np.nan)).fillna(0.0)

    def bat_table(self, pi, p, rp, cut=None, model=False, rowmask=None):
        cut = cut or self.maxdate + pd.Timedelta(days=1); mask = self.df.date < cut; high = p.high_pct
        if rowmask is not None: mask = mask & rowmask
        d = self.df[mask & (self.df.legal == 1)].copy(); d['pi'] = pi[d.index]
        keys = ['tier', 'year', 'phase'] + (['bat_oppc'] if rp.opp_adjust else []) + (['ord_grp'] if rp.role_adjust else [])
        d['w'] = self._w(d.date, rp.hl_bat, cut); hi = (d.pi >= high) & (d.pi > 0)
        d['ba'] = d.groupby(keys, observed=True).runs.transform('mean'); d['bh'] = d[hi].groupby(keys, observed=True).runs.transform('mean')
        d['bl'] = d[~hi].groupby(keys, observed=True).runs.transform('mean')
        d['rae'] = (d.runs - d.ba) * d.w; d['raeh'] = ((d.runs - d.bh) * d.w).where(hi, 0.0); d['wh'] = d.w.where(hi, 0.0)
        d['raeL'] = ((d.runs - d.bl) * d.w).where(~hi, 0.0); d['wL'] = d.w.where(~hi, 0.0)
        g = d.groupby('striker_id').agg(n=('w', 'sum'), r=('rae', 'sum'), rh=('raeh', 'sum'), nh=('wh', 'sum'), rl=('raeL', 'sum'), nl=('wL', 'sum'), balls=('runs', 'size'), sr_all=('runs', 'mean'))
        T = pd.DataFrame(index=g.index); T['SRoA'] = g.r / (g.n + rp.k_all) * 100; T['SRhA'] = g.rh / (g.nh + rp.k_hi) * 100; T['balls'] = g.balls
        nh_, nl_ = g.nh.replace(0, np.nan), g.nl.replace(0, np.nan); neff = 1 / (1 / nh_ + 1 / nl_)
        T['res'] = ((g.rh / nh_ - g.rl / nl_) * neff / (neff + rp.k_hi) * 100).fillna(0.0)   # RESILIENCE: own pressure level minus own usual level (each vs the league in the same condition). The DIFFERENCE is shrunk toward 0 (not each level separately, which would make every strong player look like he dips)
        h = d[hi].assign(dotp=lambda x: (x.runs == 0).astype(float), bd=lambda x: (x.four + x.six).astype(float))
        gh = h.groupby('striker_id').agg(sr_hi=('runs', 'mean'), bd=('bd', 'mean'), dotp=('dotp', 'mean'), outp=('out_striker', 'mean'))
        T['sr_hi'] = gh.sr_hi * 100; T['bnd_hi'] = gh.bd * 100; T['dot_hi_n'] = -gh.dotp * 100; T['out_hi_n'] = -gh.outp * 100; T['sr_all'] = g.sr_all * 100
        T['hi_minus_usual'] = T.sr_hi - T.sr_all; T['edge'] = (g.rh / g.nh.replace(0, np.nan) - g.r / g.n) * 100   # context-adjusted runs/100 balls: pressure minus usual (unshrunk)
        el = self._eligible('bat', pi, high, mask, rp)
        a = pd.DataFrame({'id': d.striker_id, 'm': d.match_id, 'i': d.innings, 'v': d.pi * (d.runs - d.ba), 'w': d.pi}).groupby(['id', 'm', 'i']).sum().reset_index()
        a = a[a.w >= 1.5]; c = a.groupby('id').v.agg(n='size', pos=lambda s: (s > 0).sum())
        T['cons'] = ((c.pos + 2.5) / (c.n + 5)).reindex(T.index); T['n_inn_p'] = c.n.reindex(T.index)
        T = T.join(el[['n_w', 'n_high', 'n_app', 'ok']]); T['ipl_share'] = self._ipl_share('bat', pi, mask).reindex(T.index)
        if model: T = T.join(self._model(pi, 'bat', rp, cut, mask)[['Pz', 'cz']])
        return T

    def bowl_table(self, pi, p, rp, cut=None, model=True, rowmask=None):
        cut = cut or self.maxdate + pd.Timedelta(days=1); mask = (self.df.date < cut) & ~self.df.extras_type.isin(['byes', 'legbyes']); high = p.high_pct
        if rowmask is not None: mask = mask & rowmask
        d = self.df[mask].copy(); d['pi'] = pi[d.index]; keys = ['tier', 'year', 'phase'] + (['bowl_oppc'] if rp.opp_adjust else []) + (['pace_or_spin'] if rp.role_adjust else [])
        d['w'] = self._w(d.date, rp.hl_bowl, cut); hi = (d.pi >= high) & (d.pi > 0)
        d['bt'] = d.groupby(keys, observed=True).tot.transform('mean'); d['bw'] = d.groupby(keys, observed=True).bwk.transform('mean')
        d['bth'] = d[hi].groupby(keys, observed=True).tot.transform('mean'); d['bwh'] = d[hi].groupby(keys, observed=True).bwk.transform('mean'); d['btl'] = d[~hi].groupby(keys, observed=True).tot.transform('mean')
        d['rL'] = ((d.tot - d.btl) * d.w).where(~hi, 0.0); d['wL'] = d.w.where(~hi, 0.0)
        d['r'] = (d.tot - d.bt) * d.w; d['wk'] = (d.bwk - d.bw) * d.w
        d['rh'] = ((d.tot - d.bth) * d.w).where(hi, 0.0); d['wkh'] = ((d.bwk - d.bwh) * d.w).where(hi, 0.0); d['wh'] = d.w.where(hi, 0.0)
        g = d.groupby('bowler_id').agg(n=('w', 'sum'), r=('r', 'sum'), wk=('wk', 'sum'), rh=('rh', 'sum'), wkh=('wkh', 'sum'), nh=('wh', 'sum'), rL=('rL', 'sum'), nL=('wL', 'sum'), balls=('legal', 'sum'))
        T = pd.DataFrame(index=g.index)
        nh_, nl_ = g.nh.replace(0, np.nan), g.nL.replace(0, np.nan); neff = 1 / (1 / nh_ + 1 / nl_)
        T['res'] = (-(g.rh / nh_ - g.rL / nl_) * neff / (neff + rp.kb_hi) * 6).fillna(0.0)   # RESILIENCE (runs per over saved under pressure relative to own usual); the difference is shrunk toward 0
        T['edge'] = -(g.rh / g.nh.replace(0, np.nan) - g.r / g.n) * 6   # economy edge (runs/over saved): pressure minus usual (unshrunk)
        T['ECOa'] = -g.r / (g.n + rp.kb_all) * 6; T['WKa'] = g.wk / (g.n + rp.kb_all) * 100; T['ECOh'] = -g.rh / (g.nh + rp.kb_hi) * 6; T['WKh'] = g.wkh / (g.nh + rp.kb_hi) * 100; T['balls'] = g.balls
        h = d[hi].assign(dotp=lambda x: (x.tot == 0).astype(float), wd=lambda x: x.extras_type.isin(['wide', 'Overstep', 'other']).astype(float))
        T['dot_hi'] = h.groupby('bowler_id').dotp.mean() * 100; T['wd_n'] = -h.groupby('bowler_id').wd.mean() * 100
        dd = d[(d.phase == 'Death') & (d.pace_or_spin == 'Pace')].assign(y=lambda x: x.delivery_style.isin(['Yorker', 'Wide Yorker']).astype(float))
        T['york'] = dd.groupby('bowler_id').y.mean() * 100
        el = self._eligible('bowl', pi, high, mask, rp); T = T.join(el[['n_w', 'n_high', 'n_app', 'ok', 'reliab']]); T['ipl_share'] = self._ipl_share('bowl', pi, mask).reindex(T.index)
        if model: T = T.join(self._model(pi, 'bowl', rp, cut, mask)[['Pz', 'cz']])
        return T

    def _model(self, pi, kind, rp, cut, mask):
        d = self.df[mask]
        if kind == 'bat': d = d[~d.extras_type.isin(['wide', 'byes', 'legbyes'])]
        idc, oth, optm = ('striker_id', 'bowler_id', 'bowling_team_id') if kind == 'bat' else ('bowler_id', 'striker_id', 'batting_team_id')
        n = len(d); pm = pi[d.index].values; sw = self._w(d.date, rp.hl_bat if kind == 'bat' else rp.hl_bowl, cut); cs = 1 / np.sqrt(rp.mult)
        oi, uo = pd.factorize(d[idc]); pj, up = pd.factorize(d[oth]); ti = pd.factorize(d[optm])[0]; r = np.arange(n); k = len(uo)
        X = sp.hstack([sp.csr_matrix((np.ones(n), (r, oi)), shape=(n, k)), sp.csr_matrix((cs * pm, (r, oi)), shape=(n, k)),
                       sp.csr_matrix((-np.ones(n), (r, pj)), shape=(n, len(up))), sp.csr_matrix((-cs * pm, (r, pj)), shape=(n, len(up))),
                       sp.csr_matrix((-6.0 * np.ones(n), (r, ti)), shape=(n, ti.max() + 1))]).tocsr()
        sgn = 1 if kind == 'bat' else -1; ref = float(pm[pm >= 0.75].mean()) if (pm >= 0.75).any() else 0.84; Ps, Cs = [], []
        for col in ('delta', 'drun'):
            y = sgn * d[col].values
            m = Ridge(alpha=rp.alpha, fit_intercept=False, solver='sparse_cg', tol=1e-6, max_iter=600).fit(X, y, sample_weight=sw)
            a, c = m.coef_[:k], m.coef_[k:2 * k] * cs; Ps.append(a + c * ref); Cs.append(c)
        z = lambda s: (s - s.mean()) / s.std()
        T = pd.DataFrame({'Pw': Ps[0], 'Pr': Ps[1], 'cw': Cs[0], 'cr': Cs[1]}, index=uo)
        T['Pz'] = (z(T.Pw) + z(T.Pr)) / 2; T['cz'] = (z(T.cw) + z(T.cr)) / 2
        return T

    # ------------------------------------------------------------------ scoring
    def rank(self, kind, p: PressureParams, rp: RateParams, weights=None, cut=None, pi=None, extra_filter=None, rowmask=None):
        pi = self.pressure(p) if pi is None else pi
        w = dict(weights or (rp.w_bat if kind == 'bat' else rp.w_bowl))
        need_model = any(abs(w.get(k, 0)) > 0 for k in ('Pz', 'cz'))
        T = self.bat_table(pi, p, rp, cut, model=need_model, rowmask=rowmask) if kind == 'bat' else self.bowl_table(pi, p, rp, cut, model=need_model, rowmask=rowmask)
        T = T[T.ok.fillna(False).astype(bool)].copy()
        if extra_filter is not None: T = T[extra_filter(T)]
        z = lambda s: (s - s.mean()) / s.std()
        if kind == 'bowl': T['relz'] = z(T.reliab)
        for k in w:
            if k not in T.columns: T[k] = 0.0
        tot = sum(abs(v) for v in w.values()) or 1.0
        T['score0'] = sum(v * z(T[k].fillna(T[k].median())) for k, v in w.items()) / tot
        gam = rp.gamma_bat if kind == 'bat' else rp.gamma_bowl
        T['score'] = T.score0 * (T.ipl_share + gam * (1 - T.ipl_share))
        if rp.eb_k > 0: T['score'] = T.score * T.n_w / (T.n_w + rp.eb_k)
        T['name'] = T.index.map(self.names); T = T.sort_values('score', ascending=False); T['rank'] = range(1, len(T) + 1)
        return T

    # ------------------------------------------------------------------ situations and replay
    def mask_situation(self, phases=None, innings=None, pace=None, arm=None, bowl_types=None, bat_order=None):
        d = self.df; m = pd.Series(True, index=d.index)
        if phases: m &= d.phase.isin(phases)
        if innings: m &= d.innings.isin(innings)
        if pace: m &= d.pace_or_spin.isin(pace)
        bt = d.bowling_type.astype(str)
        if arm == 'Left': m &= bt.str.startswith('Left')
        elif arm == 'Right': m &= bt.str.startswith('Right')
        if bowl_types: m &= bt.str.contains('|'.join(bowl_types))
        if bat_order: m &= d.batting_order.between(bat_order[0], bat_order[1])
        return m

    def replay_rates(self, kind, pi, rowmask, team_id=3, years=(2025, 2026), k=60.0, opp=('IPL', 'FM')):
        """Pressure-weighted win-probability added per weighted ball in a situation, shrunk toward the pool mean, plus RR's own exposure per season."""
        d = self.df[rowmask]; idc = 'striker_id' if kind == 'bat' else 'bowler_id'; s = 1 if kind == 'bat' else -1
        if opp: d = d[d['bat_oppc' if kind == 'bat' else 'bowl_oppc'].isin(opp)]      # only IPL / full-member opposition: associate-nation matches inflate rates
        d = d[~d.extras_type.isin(['wide', 'byes', 'legbyes'])] if kind == 'bat' else d[~d.extras_type.isin(['byes', 'legbyes'])]
        w = pi[d.index]; g = pd.DataFrame({'id': d[idc], 'w': w, 'v': s * d.delta * w}).groupby('id').sum(); mu = g.v.sum() / max(g.w.sum(), 1e-9)
        rate = (g.v + k * mu) / (g.w + k); n_w = g.w
        ours = d[(d.batting_team_id if kind == 'bat' else d.bowling_team_id).eq(team_id) & d.year.isin(years)]
        exp_by = pd.DataFrame({'id': ours[idc], 'w': pi[ours.index]}).groupby('id').w.sum() / len(years)
        return pd.DataFrame({'rate': rate, 'n_w': n_w, 'rr_exposure': exp_by}).fillna({'rr_exposure': 0.0})


def _draw(rng, DEF):
    """One random, plausible pressure definition + rating setting (used by the robustness grid)."""
    mode = str(rng.choice(['consensus', 'leverage', 'rule', 'custom'], p=[.4, .2, .2, .2])); cw = dict(zip(['leverage', 'closeness', 'urgency', 'wickets', 'late'], rng.dirichlet(np.ones(5)) * 2))
    p = PressureParams(mode=mode, wp_lo=rng.uniform(.05, .20), wp_hi=rng.uniform(.80, .95), sigma=rng.uniform(.2, .5), cmin=rng.uniform(.2, .5), wkt_w=rng.uniform(.3, .9), urg_cap=float(rng.choice([3, 5, 8])),
                       high_pct=rng.uniform(.65, .90), group=str(rng.choice(['innings_phase', 'innings', 'global'])), ko_mult=float(rng.choice([1.0, 1.5])), cw=cw)
    jit = lambda w: {k: v * rng.uniform(.7, 1.3) for k, v in w.items()}
    rp = RateParams(hl_bat=float(rng.choice([0, 365, 730])), hl_bowl=float(rng.choice([365, 730, 1100])), k_all=float(rng.choice([40, 60, 100])), k_hi=float(rng.choice([40, 100, 217])),
                    opp_adjust=bool(rng.rand() < .7), w_bat=jit(DEF.w_bat), w_bowl=jit(DEF.w_bowl), gamma_bat=float(rng.choice([1.0, 0.6, 0.4])), gamma_bowl=float(rng.choice([1.0, 0.6, 0.3])),
                    kb_hi=float(rng.choice([40, 150, 371])), role_adjust=bool(rng.rand() < .4))
    return p, rp


def robust_grid(E, N=100, seed=2026, progress=None):
    """Re-rank under N plausible definitions; return per-player stability table (Borda: 20 points for rank 1 ... 1 for rank 20, 0 if outside top 20 or not eligible)."""
    rng = np.random.RandomState(seed); DEF = RateParams(); res = {'bat': [], 'bowl': []}
    for i in range(N):
        p, rp = _draw(rng, DEF); pi = E.pressure(p)
        for k in res: res[k].append(E.rank(k, p, rp, pi=pi)['rank'])
        if progress: progress((i + 1) / N)
    base = {k: E.rank(k, PressureParams(), DEF) for k in res}; out = {}
    for k in res:
        R = pd.concat(res[k], axis=1); n = R.shape[1]; pts = (21 - R).clip(lower=0).fillna(0)
        T = pd.DataFrame({'name': R.index.map(E.names), 'borda': pts.mean(axis=1), 'in_top10': (R <= 10).sum(axis=1) / n, 'in_top10_if_eligible': ((R <= 10).sum(axis=1) / R.notna().sum(axis=1)).where(R.notna().sum(axis=1) > 0),
                          'eligible_share': R.notna().mean(axis=1), 'median_rank': R.median(axis=1), 'p10_rank': R.quantile(.1, axis=1), 'p90_rank': R.quantile(.9, axis=1)}, index=R.index)
        T['default_rank'] = base[k]['rank'].reindex(T.index); T = T.sort_values(['borda', 'in_top10'], ascending=False); T['robust_rank'] = range(1, len(T) + 1)
        A = aggregate(R, T.borda); T = T.join(A[['copeland_rank', 'mc4_rank', 'consensus_rank']]); out[k] = (T, R)
    return out


# ---------------------------------------------------------------- rank aggregation (Borda, Copeland, Markov-chain MC4) and rank-biased overlap
def rbo(a, b, p=0.9, depth=20):
    """Rank-biased overlap (Webber, Moffat, Zobel 2010): top-weighted similarity of two ranked lists."""
    sa, sb, score = set(), set(), 0.0
    for d in range(1, min(depth, len(a), len(b)) + 1):
        sa.add(a[d - 1]); sb.add(b[d - 1]); score += (1 - p) * p ** (d - 1) * len(sa & sb) / d
    return score


def pref_matrix(R, ids):
    """pref[i, j] = share of definitions in which player i is ranked above player j (not eligible = last)."""
    X = R.loc[ids].fillna(10_000).values; n = X.shape[1]; M = np.zeros((len(ids), len(ids)))
    for i in range(len(ids)): M[i] = ((X[i][None, :] < X).sum(axis=1) + 0.5 * (X[i][None, :] == X).sum(axis=1)) / n
    np.fill_diagonal(M, 0.5); return M


def copeland_scores(M): return (M > 0.5).sum(axis=1) + 0.5 * ((M == 0.5).sum(axis=1) - 1)


def mc4_scores(M, damp=0.15, iters=500):
    """Dwork et al. (2001) MC4: from i move to j if a majority of the rankings puts j above i; stationary mass = score."""
    n = len(M); T = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i != j and M[j, i] > 0.5: T[i, j] = 1.0 / n
        T[i, i] = 1 - T[i].sum()
    T = (1 - damp) * T + damp / n; v = np.ones(n) / n
    for _ in range(iters): v = v @ T
    return v


def aggregate(R, borda, min_top25=8):
    """Candidate set = players in the top 25 of at least min_top25 definitions. Returns per-player Borda / Copeland / MC4 ranks and the consensus order (mean of the three ranks)."""
    ids = list(R.index[(R <= 25).sum(axis=1) >= min_top25]); M = pref_matrix(R, ids)
    S = pd.DataFrame({'borda': borda.reindex(ids), 'copeland': copeland_scores(M), 'mc4': mc4_scores(M)}, index=ids)
    for c in ('borda', 'copeland', 'mc4'): S[c + '_rank'] = S[c].rank(ascending=False, method='min')
    S['consensus_score'] = S[['borda_rank', 'copeland_rank', 'mc4_rank']].mean(axis=1); S = S.sort_values(['consensus_score', 'borda_rank']); S['consensus_rank'] = range(1, len(S) + 1); return S


def load(path):
    return Engine(pd.read_parquet(path))
