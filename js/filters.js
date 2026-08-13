/* ============================================================
   PropertyPistol ROI Dashboard - filter engine (v3)
   Multi-select state, fact-cube querying, period presets, region scope.
   ============================================================ */
(function () {
  'use strict';
  const D = window.PP;
  const S = D.strs;

  /* ---------- fact column layout ---------- */
  const F = { CITY:0, PROJ:1, SRC:2, DEV:3, BS:4, RS:5, MGR:6, ALL:7, YTD:8, MTD:9 };
  const M = { cost:0, leads:1, totLeads:2, gu:3, gs:4, nu:5, ns:6, aop:7, av:8 };

  /* ---------- period presets ----------
     The MIS carries month-level granularity only (no daily date column), so day
     presets would be fiction. These are the honest month-level equivalents. */
  const PERIODS = [
    { id: 'mtd',  label: 'This month',  bucket: F.MTD, note: 'Aug 2026 MTD (to 5 Aug)' },
    { id: 'ytd',  label: 'FYTD',        bucket: F.YTD, note: 'Apr-Aug 2026' },
    { id: 'all',  label: 'All time',    bucket: F.ALL, note: 'Mar 2024 - Aug 2026' }
  ];
  window.PPperiods = PERIODS;
  window.PPperiod = id => PERIODS.find(p => p.id === id) || PERIODS[2];

  /* ---------- multi-select state ---------- */
  const ALL = '__all__';
  function parseList(v) {
    if (!v || v === ALL) return null;                 // null == no restriction
    const a = v.split('~').map(s => s.trim()).filter(Boolean);
    return a.length ? a : null;
  }
  window.PPparseList = parseList;
  window.PPserialise = arr => (!arr || !arr.length) ? ALL : arr.join('~');
  window.PPALL = ALL;

  /* ---------- region (login) scope ----------
     Client-side view scoping so a sales user lands on their own region.
     It shapes the view; it is NOT access control - anyone can edit the URL. */
  window.PPscope = () => {
    const r = window.PPState.scope;
    return (!r || r === 'All Regions') ? null : [r];
  };

  /* ---------- the query ---------- */
  function idsOf(list) {
    if (!list) return null;
    const set = new Set();
    list.forEach(v => { const i = S.indexOf(v); if (i >= 0) set.add(i); });
    return set;
  }

  const cache = new Map();
  function cacheKey(q) {
    return [q.cities, q.projects, q.sources, q.devs, q.status, q.realisation, q.managers, q.period]
      .map(v => Array.isArray(v) ? v.join('|') : (v || '')).join('#');
  }

  /* Returns aggregated measures for the current filter set, plus per-key rollups. */
  window.PPquery = function (q, groupBy) {
    const key = cacheKey(q) + '@@' + (groupBy || '');
    if (cache.has(key)) return cache.get(key);

    const scope = PPscope();
    const cityList = scope ? (q.cities ? q.cities.filter(c => scope.includes(c)) : scope) : q.cities;

    const cSet = idsOf(cityList), pSet = idsOf(q.projects), sSet = idsOf(q.sources),
          dSet = idsOf(q.devs), stSet = idsOf(q.status), rSet = idsOf(q.realisation),
          mSet = idsOf(q.managers);
    const b = PPperiod(q.period).bucket;
    const wide = b === F.ALL;

    const blank = () => ({ cost:0, leads:0, totLeads:0, gu:0, gs:0, nu:0, ns:0, aop:0, av:0, rows:0 });
    const tot = blank(); const groups = new Map();

    for (const f of D.facts) {
      if (cSet && !cSet.has(f[F.CITY])) continue;
      if (pSet && !pSet.has(f[F.PROJ])) continue;
      if (sSet && !sSet.has(f[F.SRC])) continue;
      if (dSet && !dSet.has(f[F.DEV])) continue;
      if (stSet && !stSet.has(f[F.BS])) continue;
      if (rSet && !rSet.has(f[F.RS])) continue;
      if (mSet && !mSet.has(f[F.MGR])) continue;
      const v = f[b];
      const cost = v[0], leads = v[1];
      const gu = wide ? v[M.gu] : v[2], ns = wide ? v[M.ns] : v[3];
      tot.cost += cost; tot.leads += leads; tot.gu += gu; tot.ns += ns; tot.rows++;
      if (wide) { tot.totLeads += v[M.totLeads]; tot.gs += v[M.gs]; tot.nu += v[M.nu]; tot.aop += v[M.aop]; tot.av += v[M.av]; }
      if (groupBy) {
        const gk = S[f[F[groupBy]]];
        let g = groups.get(gk); if (!g) { g = blank(); groups.set(gk, g); }
        g.cost += cost; g.leads += leads; g.gu += gu; g.ns += ns; g.rows++;
        if (wide) { g.totLeads += v[M.totLeads]; g.gs += v[M.gs]; g.nu += v[M.nu]; g.aop += v[M.aop]; g.av += v[M.av]; }
      }
    }
    const out = { total: tot, groups, wide };
    if (cache.size > 60) cache.clear();
    cache.set(key, out);
    return out;
  };

  /* ---------- project list under the current filters ---------- */
  window.PPprojects = function (q) {
    const scope = PPscope();
    const cityList = scope ? (q.cities ? q.cities.filter(c => scope.includes(c)) : scope) : q.cities;
    const has = (list, v) => !list || list.includes(v);
    return D.projects.filter(p =>
      has(cityList, p.city) && has(q.projects, p.project) && has(q.devs, p.dev) &&
      has(q.managers, p.mgr) &&
      (!q.status || q.status.includes(p.projStatus) || q.status.includes(p.bs)) &&
      (!q.realisation || q.realisation.includes(p.rs)) &&
      (!q.star || p.star === 'Y') &&
      (!q.campStatus || !p.campStatus || statusMatch(p.campStatus, q.campStatus))
    );
  };

  /* ---------- option lists (respect region scope) ---------- */
  window.PPoptions = function (kind) {
    const scope = PPscope();
    switch (kind) {
      case 'cities':      return scope || D.dims.cities;
      case 'developers':  return D.dims.developers;
      case 'status':      return D.dims.projStatus;
      case 'realisation': return D.dims.realisation;
      case 'sources':     return (D.sourceWise['All Regions'] || []).filter(r => r.cost > 0).map(r => r.src);
      case 'managers': {
        const set = new Set(D.projects.filter(p => !scope || scope.includes(p.city)).map(p => p.mgr).filter(Boolean));
        return [...set].sort();
      }
      case 'projects': {
        const list = D.projects.filter(p => !scope || scope.includes(p.city));
        return list.slice(0, 400).map(p => p.project).sort();
      }
      default: return [];
    }
  };
})();
