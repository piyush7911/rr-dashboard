"""SupeRR Selector S2: dashboard API. Thin FastAPI layer over app/engine.py (the same parameter-driven engine the report uses).
Run:  conda run -n superr uvicorn api.main:app --port 8000   (from the project root).  Data: only the supplied pack (work/dash_balls.parquet is derived from it)."""
import json, os, sys, threading
from dataclasses import asdict
from functools import lru_cache
ROOT = os.environ.get('RR_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, ROOT + '/app')
import numpy as np, pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
import pymupdf
from fastapi.middleware.cors import CORSMiddleware
from engine import *

DATA = os.environ.get('DATA_DIR') or ROOT + '/data'
def first(*ps):
    for q in ps:
        if q and os.path.exists(q): return q
    raise FileNotFoundError(f'none of {ps} exists (set DATA_DIR or place the data files in data/)')
RES = ROOT + '/results'                                                   # committed outputs (rankings, evidence, report); dev layout falls back to work/ and analysis/
PARQUET = first(DATA + '/dash_balls.parquet', ROOT + '/work/dash_balls.parquet')
REF = DATA + '/ref' if os.path.isdir(DATA + '/ref') else ROOT + '/Data Pack'
RD = RES + '/report_data/' if os.path.isdir(RES + '/report_data') else ROOT + '/work/report_data/'
E = load(PARQUET); DF = E.df; DEF_P, DEF_R = PressureParams(), RateParams(); LOCK = threading.Lock()
app = FastAPI(title='SupeRR Selector: Pressure Lab API'); app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:3000'], allow_methods=['GET', 'POST'], allow_headers=['*'])   # production is same-origin; this only serves `pnpm dev`

import ctypes, gc
try: _libc = ctypes.CDLL('libc.so.6'); _trim = lambda: _libc.malloc_trim(0)
except OSError: _trim = lambda: None
import asyncio
_SEM = asyncio.Semaphore(1)
@app.middleware('http')
async def one_computation_at_a_time(request, call_next):   # recomputations run one by one (bounded memory), then freed memory is handed back to the OS
    if request.method == 'POST' and request.url.path.startswith('/api/'):
        async with _SEM:
            resp = await call_next(request); gc.collect(); _trim(); return resp
    return await call_next(request)

# ------------------------------------------------------------------ reference tables (pack only)
teams = pd.read_csv(REF + '/teams.csv').drop_duplicates('team_id').set_index('team_id').team_name
_m = pd.read_csv(REF + '/matches.csv'); _c = pd.read_csv(REF + '/competitions.csv').set_index('comp_id').comp_name
MATCH = _m.set_index('match_id'); MATCH['comp'] = MATCH.comp_id.map(_c)
CONS = {k: pd.read_csv(first(RES + f'/robust_{k}.csv', ROOT + f'/work/robust_{k}.csv'), index_col=0) for k in ('bat', 'bowl')}
FINAL = {k: pd.read_csv(first(RES + f'/final_order_{k}.csv', ROOT + f'/work/final_order_{k}.csv'), index_col=0) for k in ('bat', 'bowl')}

def clean(o):
    if isinstance(o, pd.DataFrame): return json.loads(o.to_json(orient='records'))
    return json.loads(pd.Series(o).to_json())
def P_from(d):
    b = asdict(DEF_P); b.update({k: v for k, v in (d or {}).items() if k in b}); b['innings'] = tuple(b['innings']); b['phases'] = tuple(b['phases']); b['tiers'] = tuple(b['tiers']); return PressureParams(**b)
def R_from(d):
    b = asdict(DEF_R); b.update({k: v for k, v in (d or {}).items() if k in b}); return RateParams(**b)
key = lambda o: json.dumps(asdict(o), sort_keys=True)

@lru_cache(maxsize=12)
def _pi(pj): 
    with LOCK: return E.pressure(P_from(json.loads(pj)))
def pi_of(pd_): return _pi(key(P_from(pd_)))
@lru_cache(maxsize=24)
def _rank(kind, pj, rj, sit):
    p, rp = P_from(json.loads(pj)), R_from(json.loads(rj)); pi = _pi(pj); s = json.loads(sit); rm = E.mask_situation(**s) if s else None
    with LOCK: return E.rank(kind, p, rp, pi=pi, rowmask=rm)
def rank_of(kind, body):
    p, rp = P_from(body.get('pressure')), R_from(body.get('rate')); sit = {k: v for k, v in (body.get('situation') or {}).items() if v not in (None, [], '')}
    if 'bat_order' in sit: sit['bat_order'] = tuple(sit['bat_order'])
    return _rank(kind, key(p), key(rp), json.dumps(sit, sort_keys=True, default=list)), p, rp

# ------------------------------------------------------------------ meta
@app.get('/api/meta')
def meta():
    facts = json.load(open(RD + 'facts.json')) if os.path.exists(RD + 'facts.json') else {}
    return dict(pressure=asdict(DEF_P), rate=asdict(DEF_R), facts=facts, balls=int(len(DF)), matches=int(DF.match_id.nunique()), batters=int(DF.striker_id.nunique()), bowlers=int(DF.bowler_id.nunique()),
                date_min=str(DF.date.min())[:10], date_max=str(DF.date.max())[:10])

# ------------------------------------------------------------------ pressure lab
@app.post('/api/pressure')
def pressure(body: dict):
    p = P_from(body.get('pressure')); pi = pi_of(body.get('pressure')); d = DF; arr = pi.values; hi = (arr >= p.high_pct) & (arr > 0); live = arr > 0
    cls = np.where(hi, 'HIGH', np.where(live, 'ordinary', 'decided')); absd = np.abs(d.delta.values) * 100; leg = d.legal.values == 1
    x = pd.DataFrame({'inn': d.innings.values, 'cls': cls, 'absd': absd, 'leg': leg, 'tot': d.tot.values, 'wk': d.wicket.values, 'dotp': (d.tot.values == 0), 'over': d.over.values, 'ph': d.phase.astype(str).values})
    sep = []
    for (inn, c), g in x.groupby(['inn', 'cls']):
        gl = g[g.leg]; sep.append(dict(innings=int(inn), cls=c, balls=int(len(g)), swing=float(g.absd.mean()), wkts_per_100=float(gl.wk.mean() * 100), runs_per_over=float(gl.tot.sum() / max(len(gl), 1) * 6), dot_pct=float(gl.dotp.mean() * 100)))
    xl = x[x.leg]; byo = xl.groupby(['inn', 'over']).agg(high=('cls', lambda v: (v == 'HIGH').mean() * 100), live=('cls', lambda v: (v != 'decided').mean() * 100)).reset_index()
    ph = x[x.cls == 'HIGH'].groupby(['inn', 'ph']).size().unstack(fill_value=0)
    s2 = d[(d.innings == 2) & d.target.notna() & (d.legal == 1)].copy(); s2['hi'] = hi[s2.index]; s2['rrr'] = (s2.target - s2.runs_before) / (s2.balls_left.clip(lower=1) / 6); s2 = s2[(s2.rrr > 0) & (s2.rrr <= 20)]
    s2['bx'] = (np.minimum(s2.balls_left - 1, 119) // 12).astype(int); s2['by'] = np.minimum(s2.rrr // 2, 9).astype(int); cm = s2.groupby(['by', 'bx']).agg(n=('hi', 'size'), high=('hi', 'mean')).reset_index(); cm = cm[cm.n >= 80]
    dp = pi_of(None); dh = (dp.values >= .75) & (dp.values > 0); jac = float((hi & dh).sum() / max((hi | dh).sum(), 1))
    return dict(live=float(live.mean() * 100), high=float(hi.mean() * 100), decided=float((~live).mean() * 100), high_balls=int(hi.sum()), overlap_default=jac * 100, separation=sep, by_over=clean(byo), phase_mix={str(k): v for k, v in ph.to_dict('index').items()}, chase_map=clean(cm))

# ------------------------------------------------------------------ rankings
BAT_COLS = ['SRoA', 'SRhA', 'res', 'cons', 'sr_hi', 'sr_all', 'bnd_hi', 'out_hi_n', 'dot_hi_n']; BOWL_COLS = ['Pz', 'res', 'relz', 'cz', 'ECOa', 'WKa', 'ECOh', 'WKh', 'dot_hi', 'york']
@app.post('/api/rank')
def rank(body: dict):
    kind = body.get('kind', 'bat'); T, p, rp = rank_of(kind, body); limit = int(body.get('limit', 40)); w = dict(body.get('weights') or (rp.w_bat if kind == 'bat' else rp.w_bowl))
    dflt = rank_of(kind, {})[0]['rank']; cons = CONS[kind]['consensus_rank']; fin = FINAL[kind]
    cols = BAT_COLS if kind == 'bat' else BOWL_COLS; z = lambda s: (s - s.mean()) / s.std(); tot = sum(abs(v) for v in w.values()) or 1.0
    out = T.head(limit).copy(); out['id'] = out.index
    rows = []
    for pid, r in out.iterrows():
        row = dict(id=int(pid), name=r['name'], rank=int(r['rank']), score=float(r.score), n_high=int(r.n_high) if pd.notna(r.n_high) else None, n_app=int(r.n_app) if pd.notna(r.n_app) else None, ipl_share=float(r.ipl_share), default_rank=int(dflt.get(pid)) if pid in dflt.index else None,
                   consensus_rank=int(cons.get(pid)) if pid in cons.index and pd.notna(cons.get(pid)) else None, in_final=bool(pid in fin.index[:10]))
        for c in cols:
            if c in T.columns and pd.notna(r.get(c)): row[c] = float(r[c])
        row['contrib'] = {k: float(v * z(T[k].fillna(T[k].median())).loc[pid] / tot) for k, v in w.items() if k in T.columns}; rows.append(row)
    return dict(kind=kind, n_eligible=int(len(T)), rows=rows, weights=w)

@app.get('/api/consensus/{kind}')
def consensus(kind: str):
    if kind not in CONS: raise HTTPException(404)
    t = CONS[kind].sort_values('consensus_rank').head(25).copy(); t['id'] = t.index; fin = FINAL[kind]; t['final'] = t.index.isin(fin.index[:10]); return dict(rows=clean(t))

@app.get('/api/players')
def players(kind: str = 'bat', q: str = ''):
    col = 'striker_id' if kind == 'bat' else 'bowler_id'; n = DF.groupby(col).size(); names = E.names.reindex(n.index); t = pd.DataFrame({'id': n.index, 'name': names.values, 'balls': n.values})
    if q: t = t[t.name.str.contains(q, case=False, na=False)]
    t = t.sort_values('balls', ascending=False).head(40); return clean(t)

# ------------------------------------------------------------------ player card
@app.post('/api/player')
def player(body: dict):
    kind = body.get('kind', 'bat'); pid = int(body['id']); p = P_from(body.get('pressure')); pi = pi_of(body.get('pressure')); T, _, rp = rank_of(kind, body)
    d = DF[['striker_id', 'bowler_id', 'legal', 'extras_type', 'tier', 'year', 'phase', 'bat_oppc', 'bowl_oppc', 'runs', 'tot', 'four', 'six', 'out_striker', 'bwk', 'match_id', 'innings', 'date', 'batting_team_id', 'bowling_team_id']].assign(PI=pi.values); hi_m = (d.PI >= p.high_pct) & (d.PI > 0)
    if kind == 'bat': s = d[(d.striker_id == pid) & (d.legal == 1)]; col = 'runs'
    else: s = d[(d.bowler_id == pid) & ~d.extras_type.isin(['byes', 'legbyes'])]; col = 'tot'
    if s.empty: raise HTTPException(404, 'no balls')
    hm = hi_m.loc[s.index]; h, u = s[hm], s[~hm]
    def stat(g):
        if len(g) == 0: return None
        if kind == 'bat': return dict(balls=int(len(g)), sr=float(g.runs.mean() * 100), boundary=float((g.four + g.six).clip(upper=1).mean() * 100), dot=float((g.runs == 0).mean() * 100), out=float(g.out_striker.mean() * 100))
        gl = g[g.legal == 1]; return dict(balls=int(len(gl)), econ=float(g.tot.sum() / max(len(gl), 1) * 6), dot=float((g.tot == 0).mean() * 100), wkts=float(g.bwk.mean() * 100), wides=float(g.extras_type.isin(['wide', 'Overstep', 'other']).mean() * 100))
    keys = ['tier', 'year', 'phase', 'bat_oppc' if kind == 'bat' else 'bowl_oppc']; base = d.loc[s.index].assign(x=s[col]); lg = d[(d.legal == 1) if kind == 'bat' else ~d.extras_type.isin(['byes', 'legbyes'])]; ba = lg.groupby(keys, observed=True)[col].mean().rename('ba')
    s2 = s.join(ba, on=keys); s2['v'] = (1 if kind == 'bat' else -1) * s2.PI * (s2[col] - s2.ba)
    inn = s2.groupby(['match_id', 'innings']).agg(v=('v', 'sum'), w=('PI', 'sum'), date=('date', 'first'), team=('batting_team_id' if kind == 'bat' else 'bowling_team_id', 'first'), opp=('bowling_team_id' if kind == 'bat' else 'batting_team_id', 'first'), tier=('tier', 'first')).reset_index(); inn = inn[inn.w >= 1.5].sort_values('date')
    inn['opp_name'] = inn.opp.map(teams); inn['date'] = inn.date.astype(str).str[:10]
    byy = []
    for yr, g in s.groupby('year'):
        hh, uu = g[hi_m.loc[g.index]], g[~hi_m.loc[g.index]]; byy.append(dict(year=int(yr), usual=stat(uu), high=stat(hh)))
    byp = []
    for ph, g in s.groupby(s.phase.astype(str)):
        hh, uu = g[hi_m.loc[g.index]], g[~hi_m.loc[g.index]]; byp.append(dict(phase=ph, usual=stat(uu), high=stat(hh)))
    ipl = float((s.tier == 'IPL').mean()); r = T.loc[pid] if pid in T.index else None; comp = {}
    if r is not None: comp = {k: (None if pd.isna(r.get(k)) else float(r.get(k))) for k in (BAT_COLS if kind == 'bat' else BOWL_COLS) if k in T.columns}
    cons = CONS[kind]
    return dict(id=pid, name=E.names.get(pid), kind=kind, rank=int(r['rank']) if r is not None else None, score=float(r.score) if r is not None else None, n_eligible=int(len(T)), eligible=r is not None, components=comp,
                consensus_rank=int(cons.loc[pid, 'consensus_rank']) if pid in cons.index and pd.notna(cons.loc[pid, 'consensus_rank']) else None, top10_share=float(cons.loc[pid, 'in_top10']) if pid in cons.index else None,
                p10=float(cons.loc[pid, 'p10_rank']) if pid in cons.index else None, p90=float(cons.loc[pid, 'p90_rank']) if pid in cons.index else None, high=stat(h), usual=stat(u), by_year=byy, by_phase=byp,
                innings=clean(inn[['date', 'opp_name', 'v', 'w', 'tier']]), ipl_share=ipl, matches=int(s.match_id.nunique()), teams_played=[str(teams.get(t, t)) for t in s.groupby('batting_team_id' if kind == 'bat' else 'bowling_team_id').size().sort_values(ascending=False).index[:3]])

# ------------------------------------------------------------------ match replay
@app.get('/api/matches')
def matches(q: str = ''):
    g = DF.groupby('match_id').agg(date=('date', 'first'), tier=('tier', 'first'), t1=('batting_team_id', 'first'), t2=('bowling_team_id', 'first')).reset_index(); g['teams'] = g.t1.map(teams) + ' v ' + g.t2.map(teams)
    _dp = pi_of(None); _hs = pd.Series(((_dp.values >= .75) & (_dp.values > 0)), index=DF.index).groupby(DF.match_id.values).mean(); g['hi_share'] = g.match_id.map(_hs).round(3); g['comp'] = g.match_id.map(MATCH.comp); g['stage'] = g.match_id.map(MATCH.stage); g['ko'] = g.match_id.map(MATCH.knock_out).fillna(0).astype(int); g['result'] = g.match_id.map(MATCH.result); g['date'] = g.date.astype(str).str[:10]
    if q: g = g[g.teams.str.contains(q, case=False) | g.comp.str.contains(q, case=False, na=False) | g.stage.astype(str).str.contains(q, case=False)]
    return clean(g.sort_values('date', ascending=False).head(160)[['match_id', 'date', 'teams', 'comp', 'stage', 'ko', 'result', 'tier', 'hi_share']])
@app.post('/api/match')
def match(body: dict):
    mid = int(body['id']); p = P_from(body.get('pressure')); pi = pi_of(body.get('pressure')); m = DF[DF.match_id == mid]
    if m.empty: raise HTTPException(404)
    out = []
    for inn, g in m.groupby('innings'):
        g = g.sort_values('innings_ball_num'); lg = g.legal.cumsum()
        out.append(dict(innings=int(inn), team=str(teams.get(g.batting_team_id.iloc[0])), target=None if pd.isna(g.target.iloc[0]) else float(g.target.iloc[0]),
                        balls=clean(pd.DataFrame({'n': np.arange(1, len(g) + 1), 'over': g.over.values, 'wp': g.wp_before.values * 100, 'pi': pi.loc[g.index].values, 'hi': ((pi.loc[g.index] >= p.high_pct) & (pi.loc[g.index] > 0)).values, 'runs_before': g.runs_before.values,
                                                  'wkts': g.wkts_before.values, 'runs': g.tot.values, 'wicket': g.wicket.values, 'bat': g.striker_name.values, 'bowl': g.bowler_name.values, 'delta': g.delta.values * 100, 'legal': g.legal.values}))))
    return dict(id=mid, innings=out, info=clean(pd.DataFrame([dict(date=str(m.date.iloc[0])[:10], comp=MATCH.comp.get(mid), result=MATCH.result.get(mid), stage=MATCH.stage.get(mid))]))[0])

# ------------------------------------------------------------------ evidence (computed by work/report_data.py from the pack)
@app.get('/api/evidence')
def evidence():
    rd = lambda f: clean(pd.read_csv(RD + f)) if os.path.exists(RD + f) else []
    facts = json.load(open(RD + 'facts.json')) if os.path.exists(RD + 'facts.json') else {}
    return dict(facts=facts, separation=rd('separation.csv'), tax=rd('fig4_pressure_tax.csv'), skill=rd('skill.csv'), paired=rd('paired.csv'), backtest=rd('backtest.csv'), t1=rd('t1.csv'), t2=rd('t2.csv'))


# ------------------------------------------------------------------ report viewer (view-only: pages are served as images; the PDF itself is never exposed)
REPORT = first(RES + '/report.pdf', ROOT + '/analysis/SupeRR_Round1_Methodology_Report.pdf'); _pg = {}
@app.get('/api/report/info')
def report_info():
    if not os.path.exists(REPORT): raise HTTPException(404, 'report not found')
    d = pymupdf.open(REPORT); return dict(pages=len(d), sizes=[[float(p.rect.width), float(p.rect.height)] for p in d])
@app.get('/api/report/page/{n}')
def report_page(n: int):
    if not os.path.exists(REPORT): raise HTTPException(404)
    mt = os.path.getmtime(REPORT); k = (mt, n)
    if k not in _pg:
        d = pymupdf.open(REPORT)
        if not 1 <= n <= len(d): raise HTTPException(404)
        _pg.clear() if len(_pg) > 40 else None; _pg[k] = d[n - 1].get_pixmap(matrix=pymupdf.Matrix(2.2, 2.2), alpha=False).tobytes('png')
    return Response(_pg[k], media_type='image/png', headers={'Cache-Control': 'no-store', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff'})


# ------------------------------------------------------------------ single service: serve the built dashboard (web/out) from the same process
from fastapi.staticfiles import StaticFiles
WEB = os.environ.get('WEB_DIR') or ROOT + '/web/out'
if os.path.isdir(WEB): app.mount('/', StaticFiles(directory=WEB, html=True), name='web')
