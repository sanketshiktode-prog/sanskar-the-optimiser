/* Main dashboard page: ROI Summary / SM-Manager / Project Performance */
(function () {
  'use strict';
  const D = window.PP, S = window.PPState;

  /* ---------------- tabs ---------------- */
  const panels = ['roi', 'sm', 'project'];
  window.PPsetTab = function (tab) {
    S.tab = panels.includes(tab) ? tab : 'roi';
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === S.tab));
    panels.forEach(p => document.getElementById('panel-' + p).classList.toggle('active', p === S.tab));
    history.replaceState(null, '', location.pathname + '?' + PPqs() + '&tab=' + S.tab);
    document.dispatchEvent(new CustomEvent('pp:filters'));
  };
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => PPsetTab(b.dataset.tab));

  /* ---------------- helpers ---------------- */
  const regionRow = name => D.regionSummary.find(r => r.region === name);
  const activeRegion = () => S.city === 'All Regions' ? regionRow('Total') : (regionRow(S.city) || regionRow('Total'));

  /* ---------------- KPI band ---------------- */
  function renderKPIs() {
    const r = activeRegion();
    const scope = S.city === 'All Regions' ? 'All regions' : S.city;
    const cards = [
      ['rupee', 'Total Revenue', fmtCr(r.ns), 'MTD net booking value'],
      ['home',  'Total Unit Sold', fmtN(r.gu), scope + ' \u00b7 gross units'],
      ['tag',   'AV Sold', fmtCr(r.av, 0), 'Agreement value'],
      ['users', 'Total Leads', fmtN(r.ml), 'Presales leads \u00b7 all sources'],
      ['check', 'Total QL', fmtN(r.ql), 'Qualified leads'],
      ['pin',   'Total SV', fmtN(r.sv), 'Site visits done'],
      ['pct',   'NBR %', fmtPct(ratio(r.ns, r.gs) * 100), 'Net booking ratio']
    ];
    document.getElementById('kpis').innerHTML = cards.map(c =>
      `<div class="kpi">
         <div class="top"><span class="tile">${PPicon(c[0], '')}</span><span class="lbl">${c[1]}</span></div>
         <div class="val">${c[2]}</div><div class="sub">${c[3]}</div>
       </div>`).join('');
  }

  /* ---------------- ROI Summary table ---------------- */
  const REG_COLS = ['Region','Gross Unit','Total Gross Sales','Net Unit','Total Net Sales','Total Sales+AOP',
    'Projected Cost','Total Cost','MTD Leads','Total Leads','MTD CPL','Total QL','CPQL','SV Done',
    'Cost/NBR','Cost/NBR+AOP','AV','Cost','Leads','Deficit'];

  function regionCells(r) {
    return [
      r.region, fmtN(r.gu), fmtR(r.gs), fmtN(r.nu), fmtR(r.ns), fmtR(r.aop),
      fmtR(r.pc), fmtR(r.tc), fmtN(r.ml), fmtN(r.tl),
      fmtR(ratio(r.tc, r.ml)), fmtN(r.ql), fmtR(ratio(r.tc, r.ql)), fmtN(r.sv),
      ratio(r.tc, r.ns).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      ratio(r.tc, r.aop).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      fmtR(r.av), fmtR(r.cost), fmtN(r.leads),
      `<span class="${r.deficit < 0 ? 'neg' : 'pos'}">${fmtR(r.deficit)}</span>`
    ];
  }

  function renderRegionTable() {
    const all = D.regionSummary;
    const rows = S.city === 'All Regions' ? all : all.filter(r => r.region === S.city || r.region === 'Total');
    const thead = '<thead><tr>' + REG_COLS.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
    const tbody = '<tbody>' + rows.map(r => {
      const cls = r.region === 'Total' ? 'total' : (r.region === S.city ? 'hl' : '');
      return `<tr class="${cls}">` + regionCells(r).map(v => `<td>${v}</td>`).join('') + '</tr>';
    }).join('') + '</tbody>';
    document.getElementById('tblRegion').innerHTML = thead + tbody;
  }

  /* ---------------- SM / Manager View ---------------- */
  const MGR_COLS = ['Manager','Total Budget','Budget Spent','Target Revenue','MTD QL','Total MTD QL','Target CPQL','MTD CPQL'];
  const SRC_COLS = ['Source Cost','Source Leads','Source CPL'];

  /* Project \u2192 SM lookup, built from the arithmetic-verified Bangalore portfolio
     (planned + unplanned + builtup). Campaign register project names carry extra
     words/typos ("L and T..." vs "L&T...", trailing dates, "Road"/"Hebbal" etc.), so
     names are normalised and matched by prefix/substring rather than exact equality. */
  const normKey = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  const BLR_PROJECT_SM = [...D.bangalore.planned, ...D.bangalore.unplanned, ...D.bangalore.builtup]
    .filter(p => p.sm && p.sm !== '\u2014')
    .map(p => ({ key: normKey(p.project), sm: p.sm }))
    .sort((a, b) => b.key.length - a.key.length);
  const smForCampaign = project => {
    const ck = normKey(project);
    const hit = BLR_PROJECT_SM.find(p => ck.startsWith(p.key)) || BLR_PROJECT_SM.find(p => ck.includes(p.key));
    return hit ? hit.sm : null;
  };
  /* Cost/leads for one SM, filtered to the selected Source, from the MIS Live
     Campaign register (D.campaigns \u2014 mapped for Bangalore in this snapshot). */
  function sourceStatsForSM(smName) {
    const rows = D.campaigns.filter(c => smForCampaign(c.project) === smName &&
      (S.source === 'All Sources' || sourceMatch(c.source, S.source)));
    return rows.reduce((a, c) => ({ cost: a.cost + (c.cost || 0), leads: a.leads + (c.leads || 0) }), { cost: 0, leads: 0 });
  }

  function renderManagerTable() {
    const srcActive = S.source !== 'All Sources';
    const blrScope = S.city === 'Bangalore';
    const cols = MGR_COLS.concat(srcActive ? SRC_COLS : []);
    const thead = '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
    let rows = [], note = '', rawSm = m => m;
    if (S.city === 'Bangalore') {
      rows = D.managerSummaryBangalore.filter(m => S.sm === 'All SM' || m.manager === S.sm);
      note = 'Each SM\u2019s Launch + Sustenance and Builtup spends reconcile to the paisa against their mapped project rows (SM Wise Spends, Spend Tracker Aug-26). QL roll-ups come from the same mapped rows.';
      rawSm = m => m.manager;
    } else if (S.city === 'All Regions') {
      rows = D.smWise.filter(m => S.sm === 'All SM' || m.sm === S.sm)
        .map(m => ({ manager: m.sm + ' \u00b7 ' + m.city, sm: m.sm, budget: m.budget, spent: m.spend, targetRev: m.targetRev, mtdQL: null, totMtdQL: null, targetCPQL: null, mtdCPQL: null }));
      note = 'Full SM roster with live budgets, spends and revenue targets from Spend Tracker Aug-26. SM-to-project QL mapping is maintained for Bangalore in this snapshot \u2014 select Bangalore for CPQL columns.';
      rawSm = m => m.sm;
    } else {
      rows = D.smWise.filter(m => m.city === S.city && (S.sm === 'All SM' || m.sm === S.sm))
        .map(m => ({ manager: m.sm, sm: m.sm, budget: m.budget, spent: m.spend, targetRev: m.targetRev, mtdQL: null, totMtdQL: null, targetCPQL: null, mtdCPQL: null }));
      note = 'Budgets, spends and revenue targets are live from Spend Tracker Aug-26. SM-to-project QL mapping is maintained for Bangalore in this snapshot.';
      rawSm = m => m.sm;
    }

    if (srcActive) {
      rows = rows.map(m => {
        const s = blrScope ? sourceStatsForSM(rawSm(m)) : { cost: 0, leads: 0 };
        return { ...m, srcCost: s.cost, srcLeads: s.leads };
      });
      if (blrScope) {
        // A real filter: only keep managers with campaigns under the selected source.
        rows = rows.filter(m => m.srcCost > 0 || m.srcLeads > 0);
        note = `Filtered to <b>${S.source}</b> \u2014 cost &amp; leads matched from the MIS Live Campaign register against the arithmetic-verified SM\u2192project mapping (project-name matching is approximate, so figures may slightly under-count spend on unmapped/renamed campaigns). Budget, Target Revenue and QL columns are unaffected by the source filter.`;
      } else {
        const cityKey = S.city === 'All Regions' ? 'All Regions' : S.city;
        const srcRow = (D.sourceWise[cityKey] || []).find(r => sourceMatch(r.src, S.source));
        const ctx = srcRow ? `${cityKey} spent ${fmtR(srcRow.cost)} on ${fmtN(srcRow.leads)} leads from <b>${S.source}</b> (Source Wise Report).` : `No <b>${S.source}</b> rows for ${cityKey}.`;
        note = `Source-level SM attribution is only available for Bangalore\u2019s mapped campaign register in this snapshot, so Source Cost/Leads show as \u2014 here. ${ctx} Switch to Bangalore to see the per-manager breakdown for this source.`;
      }
    }

    const tot = rows.reduce((a, m) => ({
      budget: a.budget + (m.budget || 0), spent: a.spent + (m.spent || 0), targetRev: a.targetRev + (m.targetRev || 0),
      mtdQL: a.mtdQL + (m.mtdQL || 0), totMtdQL: a.totMtdQL + (m.totMtdQL || 0),
      srcCost: a.srcCost + (m.srcCost || 0), srcLeads: a.srcLeads + (m.srcLeads || 0)
    }), { budget: 0, spent: 0, targetRev: 0, mtdQL: 0, totMtdQL: 0, srcCost: 0, srcLeads: 0 });

    const body = rows.map(m => {
      const pct = m.budget ? Math.min(100, m.spent / m.budget * 100) : 0;
      const srcCells = !srcActive ? '' : blrScope
        ? `<td>${fmtR(m.srcCost)}</td><td>${fmtN(m.srcLeads)}</td><td>${m.srcLeads ? fmtR(m.srcCost / m.srcLeads) : '\u2014'}</td>`
        : `<td>\u2014</td><td>\u2014</td><td>\u2014</td>`;
      return `<tr>
        <td>${m.manager}</td>
        <td>${fmtR(m.budget)}</td>
        <td><span class="prog"><i style="width:${pct}%" class="${m.spent > m.budget ? 'over' : ''}"></i></span>${fmtR(m.spent)}</td>
        <td>${fmtR(m.targetRev)}</td>
        <td>${m.mtdQL == null ? '\u2014' : fmtN(m.mtdQL)}</td>
        <td>${m.totMtdQL == null ? '\u2014' : fmtN(m.totMtdQL)}</td>
        <td>${m.targetCPQL ? fmtR(m.targetCPQL) : '\u2014'}</td>
        <td>${m.mtdCPQL ? fmtR(m.mtdCPQL) : '\u2014'}</td>${srcCells}</tr>`;
    }).join('');
    const isBlr = S.city === 'Bangalore';
    const srcTotalCells = !srcActive ? '' : blrScope
      ? `<td>${fmtR(tot.srcCost)}</td><td>${fmtN(tot.srcLeads)}</td><td>${tot.srcLeads ? fmtR(tot.srcCost / tot.srcLeads) : '\u2014'}</td>`
      : `<td>\u2014</td><td>\u2014</td><td>\u2014</td>`;
    const totalRow = rows.length > 1 ? `<tr class="total"><td>Total</td><td>${fmtR(tot.budget)}</td><td>${fmtR(tot.spent)}</td><td>${fmtR(tot.targetRev)}</td><td>${isBlr ? fmtN(tot.mtdQL) : '\u2014'}</td><td>${isBlr ? fmtN(tot.totMtdQL) : '\u2014'}</td><td>\u2014</td><td>${isBlr && tot.totMtdQL ? fmtR(tot.spent / tot.totMtdQL) : '\u2014'}</td>${srcTotalCells}</tr>` : '';
    document.getElementById('tblManager').innerHTML = thead + '<tbody>' + (body || emptyRow(cols.length)) + totalRow + '</tbody>';
    document.getElementById('smvTitle').textContent = (S.city === 'All Regions' ? 'All Regions' : S.city) + ' \u2013 SM / Manager Summary' + (srcActive ? ' \u00b7 ' + S.source : '');
    document.getElementById('smvNote').innerHTML = note;
  }

  /* ---------------- Project Performance ---------------- */
  const SM_COLS = ['Project Name','SM','Campaign Status','Budget Assigned','Total Budget','Budget Spent','Target Revenue',
    'QL Aligned','MTD QL','MTD DQL','Total MTD QL','Target CPQL','MTD CPQL'];

  function projRow(p, revIsEOI) {
    const rev = revIsEOI ? fmtN(p.targetEOI) + ' EOI' : fmtR(p.targetRev);
    const mtdCPQL = p.totMtdQL ? p.spent / p.totMtdQL : 0;
    const dim = p.sm === '\u2014' ? ' class="dim"' : '';
    return `<tr${dim}>
      <td>${p.project}</td><td style="text-align:left">${p.sm}</td><td>${pill(p.status)}</td>
      <td>${fmtR(p.budgetAssigned)}</td><td>${fmtR(p.totalBudget)}</td><td>${fmtR(p.spent)}</td>
      <td>${rev}</td><td>${fmtN(p.qlAligned)}</td><td>${fmtN(p.mtdQL)}</td><td>${fmtN(p.mtdDQL)}</td>
      <td>${p.totMtdQL == null ? '\u2014' : fmtN(p.totMtdQL)}</td>
      <td>${p.targetCPQL ? fmtR(p.targetCPQL) : '\u2014'}</td>
      <td>${mtdCPQL ? fmtR(mtdCPQL) : '\u2014'}</td></tr>`;
  }

  function smFiltered(list) {
    return list.filter(p => (S.sm === 'All SM' || p.sm === S.sm) && statusMatch(p.status, S.status));
  }

  function sectionTable(elId, list, revIsEOI, hintId, badgeId) {
    const cols = SM_COLS.slice();
    if (revIsEOI) cols[6] = 'Target EOI';
    const rows = smFiltered(list);
    const t = rows.reduce((a, p) => ({
      ba: a.ba + (p.budgetAssigned || 0), tb: a.tb + (p.totalBudget || 0), sp: a.sp + (p.spent || 0),
      tr: a.tr + (revIsEOI ? (p.targetEOI || 0) : (p.targetRev || 0)),
      qa: a.qa + (p.qlAligned || 0), mq: a.mq + (p.mtdQL || 0), dq: a.dq + (p.mtdDQL || 0), tq: a.tq + (p.totMtdQL || 0)
    }), { ba: 0, tb: 0, sp: 0, tr: 0, qa: 0, mq: 0, dq: 0, tq: 0 });
    const totals = `<tr class="total"><td>Totals</td><td></td><td></td>
      <td>${fmtR(t.ba)}</td><td>${fmtR(t.tb)}</td><td>${fmtR(t.sp)}</td>
      <td>${revIsEOI ? fmtN(t.tr) + ' EOI' : fmtR(t.tr)}</td>
      <td>${fmtN(t.qa)}</td><td>${fmtN(t.mq)}</td><td>${fmtN(t.dq)}</td><td>${fmtN(t.tq)}</td>
      <td>${t.qa ? fmtR(t.tb / t.qa) : '\u2014'}</td><td>${t.tq ? fmtR(t.sp / t.tq) : '\u2014'}</td></tr>`;
    document.getElementById(elId).innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' +
      '<tbody>' + totals + (rows.map(p => projRow(p, revIsEOI)).join('') || emptyRow(13)) + '</tbody>';
    document.getElementById(hintId).textContent = rows.length + ' project' + (rows.length === 1 ? '' : 's');
    const anyLive = rows.some(p => /live/i.test(p.status));
    const anyHold = rows.some(p => /hold/i.test(p.status));
    const badge = document.getElementById(badgeId);
    badge.textContent = anyLive ? 'Live' : anyHold ? 'On Hold' : rows.length ? 'Paused' : 'No rows';
  }

  function renderProjectPerf() {
    sectionTable('tblPlanned',  D.bangalore.planned,  false, 'hintPlanned',  'badgePlanned');
    sectionTable('tblUnplanned',D.bangalore.unplanned,false, 'hintUnplanned','badgeUnplanned');
    sectionTable('tblBuiltup',  D.bangalore.builtup,  true,  'hintBuiltup',  'badgeBuiltup');
    document.getElementById('projNote').innerHTML =
      'Bangalore portfolio from the Spend Tracker <b>Dashboard</b> sheet. SM ownership is arithmetic-verified against SM Wise Spends \u2014 every SM\u2019s section spends reconcile to the paisa. Rows marked <b>\u2014</b> (Sumadhura Panorama, Prestige Avon Nagavara) carry zero spend, so no SM can be attributed from the data. Builtup targets are EOI counts, as in the tracker.';
  }

  function emptyRow(span) {
    return `<tr><td colspan="${span}" style="text-align:center;color:var(--muted-2);padding:26px">No rows match the current filters \u2014 relax the SM or status filter above.</td></tr>`;
  }

  /* ---------------- charts ---------------- */
  let chRC, chLQ;
  function renderCharts() {
    const C = window.PPchart;
    const regs = D.regionSummary.filter(r => r.region !== 'Total');
    const labels = regs.map(r => r.region);
    const hl = c => regs.map(r => r.region === S.city ? C.orange : c);
    const rc = {
      labels,
      datasets: [
        { label: 'Net Sales (\u20B9 Cr)', data: regs.map(r => +(r.ns / 1e7).toFixed(2)), backgroundColor: hl('rgba(36,35,34,.85)'), borderRadius: 6 },
        { label: 'Total Cost (\u20B9 Cr)', data: regs.map(r => +(r.tc / 1e7).toFixed(2)), backgroundColor: regs.map(() => 'rgba(251,106,2,.5)'), borderRadius: 6 }
      ]
    };
    const lq = {
      labels,
      datasets: [
        { type: 'bar', label: 'Leads', data: regs.map(r => r.ml), backgroundColor: hl('rgba(36,35,34,.18)'), borderRadius: 6, yAxisID: 'y' },
        { type: 'line', label: 'QL', data: regs.map(r => r.ql), borderColor: C.orange, backgroundColor: C.orange, tension: .35, pointRadius: 4, yAxisID: 'y1' }
      ]
    };
    const base = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false } };
    if (chRC) { chRC.data = rc; chRC.update(); } else {
      chRC = new Chart(document.getElementById('chRevCost'), { type: 'bar', data: rc, options: { ...base, scales: { y: { grid: { color: '#EFF1F5' } }, x: { grid: { display: false } } } } });
    }
    if (chLQ) { chLQ.data = lq; chLQ.update(); } else {
      chLQ = new Chart(document.getElementById('chLeadsQL'), { data: lq, options: { ...base, scales: { y: { position: 'left', grid: { color: '#EFF1F5' }, title: { display: true, text: 'Leads' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'QL' } }, x: { grid: { display: false } } } } });
    }
  }

  /* ---------------- render all ---------------- */
  function renderAll() {
    renderKPIs();
    renderRegionTable();
    renderManagerTable();
    renderProjectPerf();
    renderCharts();
  }

  PPshell('index', null);
  PPsetTab(S.tab);
  renderAll();
  document.addEventListener('pp:filters', renderAll);
})();
