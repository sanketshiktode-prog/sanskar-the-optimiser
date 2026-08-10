/* Main dashboard page: ROI Summary / SM-Manager / Project Performance */
(function () {
  'use strict';
  const D = window.PP, S = window.PPState;

  /* ---------------- tabs ---------------- */
  const panels = ['roi', 'sm', 'psummary', 'project', 'cross'];
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
    const q = PPq(), res = PPquery(q), t = res.total;
    const scope = PPcityLabel();
    const per = PPperiod(S.period);
    // QL / SV only aggregate cleanly at region level, so they follow the region filter alone.
    const regions = (PPscope() || S.cities || D.regionSummary.filter(r => r.region !== 'Total').map(r => r.region));
    const qlsv = D.regionSummary.filter(r => r.region !== 'Total' && regions.includes(r.region))
      .reduce((a, r) => ({ ql: a.ql + r.ql, sv: a.sv + r.sv }), { ql: 0, sv: 0 });
    const noRegionFilter = !S.cities && !PPscope();
    const ql = noRegionFilter ? regionRow('Total').ql : qlsv.ql;
    const sv = noRegionFilter ? regionRow('Total').sv : qlsv.sv;
    const wide = res.wide;

    const cards = [
      ['rupee', 'Net Revenue',      fmtCr(t.ns),  per.label + ' \u00b7 MTD net booking value'],
      ['tag',   'Gross Booking Value', wide ? fmtCr(t.gs) : '\u2014', wide ? 'MTD gross sales' : 'All-time period only'],
      ['home',  'Gross Units',      fmtN(t.gu),   scope + ' \u00b7 gross units sold'],
      ['check', 'Net Units',        wide ? fmtN(t.nu) : '\u2014', wide ? 'Net units booked' : 'All-time period only'],
      ['users', 'Total Leads',      fmtN(t.leads), 'Presales leads \u00b7 all sources'],
      ['pin',   'Total QL / SV',    fmtN(ql) + ' / ' + fmtN(sv), 'Qualified leads / site visits'],
      ['pct',   'NBR %',            wide ? fmtPct(ratio(t.ns, t.gs) * 100) : '\u2014', 'Net booking ratio'],
      ['target','Marketing Cost',   fmtCr(t.cost), per.label + ' \u00b7 CPL ' + (t.leads ? fmtR(t.cost / t.leads) : '\u2014')]
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
    'Cost/NBR','Cost/NBR+AOP','AV','Deficit','YTD Spend','YTD Revenue','YTD ROI','Exp YTD Revenue'];

  // Expected YTD revenue comes from the Master Sheet, rolled up per region.
  const expYtdByCity = (() => {
    const m = {};
    D.projects.forEach(p => { if (p.expYtdRev) m[p.city] = (m[p.city] || 0) + p.expYtdRev; });
    return m;
  })();

  function regionCells(r, f) {
    const ytdROI = r.ytdSpend ? r.ytdRev / r.ytdSpend : 0;
    const exp = expYtdByCity[r.region] || (r.region === 'Total' ? Object.values(expYtdByCity).reduce((a, b) => a + b, 0) : 0);
    return [
      r.region, fmtN(f.gu), fmtR(f.gs), fmtN(f.nu), fmtR(f.ns), fmtR(f.aop),
      fmtR(r.pc), fmtR(f.cost), fmtN(f.leads), fmtN(f.totLeads),
      fmtR(ratio(f.cost, f.leads)), fmtN(r.ql), fmtR(ratio(f.cost, r.ql)), fmtN(r.sv),
      ratio(f.cost, f.ns).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      ratio(f.cost, f.aop).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      fmtR(f.av), `<span class="${r.deficit < 0 ? 'neg' : 'pos'}">${fmtR(r.deficit)}</span>`,
      fmtR(r.ytdSpend), fmtR(r.ytdRev),
      `<span class="${ytdROI >= 1 ? 'pos' : 'neg'}">${ytdROI.toLocaleString('en-IN', { maximumFractionDigits: 2 })}x</span>`,
      fmtR(exp)
    ];
  }

  function renderRegionTable() {
    const q = PPq();
    const res = PPquery(q, 'CITY');
    const scope = PPscope();
    const shown = scope || S.cities || D.regionSummary.filter(r => r.region !== 'Total').map(r => r.region);
    const rows = [];
    D.regionSummary.filter(r => r.region !== 'Total').forEach(r => {
      if (!shown.includes(r.region)) return;
      const f = res.groups.get(r.region);
      if (f) rows.push([r, f]);
    });
    const thead = '<thead><tr>' + REG_COLS.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
    const totR = { region: 'Total', pc: 0, ql: 0, sv: 0, deficit: 0, ytdSpend: 0, ytdRev: 0 };
    rows.forEach(([r]) => { totR.pc += r.pc; totR.ql += r.ql; totR.sv += r.sv; totR.deficit += r.deficit; totR.ytdSpend += r.ytdSpend; totR.ytdRev += r.ytdRev; });
    const body = rows.map(([r, f]) =>
      `<tr>` + regionCells(r, f).map(v => `<td>${v}</td>`).join('') + '</tr>').join('');
    const totalRow = rows.length > 1
      ? `<tr class="total">` + regionCells(totR, res.total).map(v => `<td>${v}</td>`).join('') + '</tr>'
      : '';
    document.getElementById('tblRegion').innerHTML = thead + '<tbody>' + (body || emptyRow(REG_COLS.length)) + totalRow + '</tbody>';
  }

  /* ---------------- SM / Manager View ---------------- */
  const MGR_COLS = ['Manager','Total Budget','Budget Spent','Target Revenue','MTD QL','Total MTD QL','Target CPQL','MTD CPQL'];

  function renderManagerTable() {
    const thead = '<thead><tr>' + MGR_COLS.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
    let rows = [], note = '';
    if (PPcityLabel() === 'Bangalore') {
      rows = D.managerSummaryBangalore.filter(m => S.sm === 'All SM' || m.manager === S.sm);
      note = 'Each SM\u2019s Launch + Sustenance and Builtup spends reconcile to the paisa against their mapped project rows (SM Wise Spends, Spend Tracker Aug-26). QL roll-ups come from the same mapped rows.';
    } else if (PPcityLabel() === 'All Regions') {
      rows = D.smWise.filter(m => S.sm === 'All SM' || m.sm === S.sm)
        .map(m => ({ manager: m.sm + ' \u00b7 ' + m.city, budget: m.budget, spent: m.spend, targetRev: m.targetRev, mtdQL: null, totMtdQL: null, targetCPQL: null, mtdCPQL: null }));
      note = 'Full SM roster with live budgets, spends and revenue targets from Spend Tracker Aug-26. SM-to-project QL mapping is maintained for Bangalore in this snapshot \u2014 select Bangalore for CPQL columns.';
    } else {
      rows = D.smWise.filter(m => m.city === PPcityLabel() && (S.sm === 'All SM' || m.sm === S.sm))
        .map(m => ({ manager: m.sm, budget: m.budget, spent: m.spend, targetRev: m.targetRev, mtdQL: null, totMtdQL: null, targetCPQL: null, mtdCPQL: null }));
      note = 'Budgets, spends and revenue targets are live from Spend Tracker Aug-26. SM-to-project QL mapping is maintained for Bangalore in this snapshot.';
    }
    const tot = rows.reduce((a, m) => ({ budget: a.budget + (m.budget || 0), spent: a.spent + (m.spent || 0), targetRev: a.targetRev + (m.targetRev || 0), mtdQL: a.mtdQL + (m.mtdQL || 0), totMtdQL: a.totMtdQL + (m.totMtdQL || 0) }), { budget: 0, spent: 0, targetRev: 0, mtdQL: 0, totMtdQL: 0 });
    const body = rows.map(m => {
      const pct = m.budget ? Math.min(100, m.spent / m.budget * 100) : 0;
      return `<tr>
        <td>${m.manager}</td>
        <td>${fmtR(m.budget)}</td>
        <td><span class="prog"><i style="width:${pct}%" class="${m.spent > m.budget ? 'over' : ''}"></i></span>${fmtR(m.spent)}</td>
        <td>${fmtR(m.targetRev)}</td>
        <td>${m.mtdQL == null ? '\u2014' : fmtN(m.mtdQL)}</td>
        <td>${m.totMtdQL == null ? '\u2014' : fmtN(m.totMtdQL)}</td>
        <td>${m.targetCPQL ? fmtR(m.targetCPQL) : '\u2014'}</td>
        <td>${m.mtdCPQL ? fmtR(m.mtdCPQL) : '\u2014'}</td></tr>`;
    }).join('');
    const isBlr = PPcityLabel() === 'Bangalore';
    const totalRow = rows.length > 1 ? `<tr class="total"><td>Total</td><td>${fmtR(tot.budget)}</td><td>${fmtR(tot.spent)}</td><td>${fmtR(tot.targetRev)}</td><td>${isBlr ? fmtN(tot.mtdQL) : '\u2014'}</td><td>${isBlr ? fmtN(tot.totMtdQL) : '\u2014'}</td><td>\u2014</td><td>${isBlr && tot.totMtdQL ? fmtR(tot.spent / tot.totMtdQL) : '\u2014'}</td></tr>` : '';
    document.getElementById('tblManager').innerHTML = thead + '<tbody>' + (body || emptyRow(8)) + totalRow + '</tbody>';
    document.getElementById('smvTitle').textContent = PPcityLabel() + ' \u2013 SM / Manager Summary';
    document.getElementById('smvNote').innerHTML = note;
  }

  /* ---------------- Project Performance ---------------- */
  const SM_COLS = ['Project Name','SM','Campaign Status','Budget Assigned','Total Budget','Budget Spent','Target Revenue',
    'QL Aligned','MTD QL','MTD DQL','Total MTD QL','Total Leads','SV Done','Booking Done','Target CPQL','MTD CPQL'];
  const BU_EXTRA = ['EOI Target','EOI Done','EOI Status','Projected Revenue','Actual Revenue','Revenue Gap','% Projected NBR','% Actual NBR'];

  // MIS figures for a Bangalore portfolio project, matched on name.
  const misByProject = (() => {
    const norm = x => String(x || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
    const m = {};
    D.projects.forEach(p => { m[norm(p.project)] = p; });
    return name => {
      const k = norm(name);
      if (m[k]) return m[k];
      const hit = Object.keys(m).find(x => x.startsWith(k) || k.startsWith(x));
      return hit ? m[hit] : null;
    };
  })();

  function projRow(p, revIsEOI) {
    const rev = revIsEOI ? fmtN(p.targetEOI) + ' EOI' : fmtR(p.targetRev);
    const mtdCPQL = p.totMtdQL ? p.spent / p.totMtdQL : 0;
    const dim = p.sm === '\u2014' ? ' class="dim"' : '';
    const mis = misByProject(p.project);
    const leads = mis ? fmtN(mis.ml) : '\u2014';
    const sv = mis && mis.sv != null ? fmtN(mis.sv) : '\u2014';
    const booking = mis ? fmtN(mis.gu) : '\u2014';
    let extra = '';
    if (revIsEOI) {
      // Projected revenue = EOI target x average AV from the Master Sheet; actual = MIS net sales.
      const avgAV = mis && mis.avgAV ? mis.avgAV : 0;
      const projRev = (p.targetEOI || 0) * avgAV;
      const actRev = mis ? mis.ns : 0;
      const gap = projRev - actRev;
      extra = `<td>${p.targetEOI ? fmtN(p.targetEOI) : '\u2014'}</td>
        <td title="No EOI-delivered column exists in the source files">\u2014</td>
        <td title="Bankable / Non-Bankable is blank throughout the Master Sheet">\u2014</td>
        <td>${projRev ? fmtR(projRev) : '\u2014'}</td>
        <td>${actRev ? fmtR(actRev) : fmtR(0)}</td>
        <td>${projRev ? `<span class="${gap > 0 ? 'neg' : 'pos'}">${fmtR(gap)}</span>` : '\u2014'}</td>
        <td>${projRev ? fmtPct(p.spent / projRev * 100) : '\u2014'}</td>
        <td>${actRev ? fmtPct(p.spent / actRev * 100) : '\u2014'}</td>`;
    }
    return `<tr${dim}>
      <td>${p.project}</td><td style="text-align:left">${p.sm}</td><td>${pill(p.status)}</td>
      <td>${fmtR(p.budgetAssigned)}</td><td>${fmtR(p.totalBudget)}</td><td>${fmtR(p.spent)}</td>
      <td>${rev}</td><td>${fmtN(p.qlAligned)}</td><td>${fmtN(p.mtdQL)}</td><td>${fmtN(p.mtdDQL)}</td>
      <td>${p.totMtdQL == null ? '\u2014' : fmtN(p.totMtdQL)}</td>
      <td>${leads}</td><td>${sv}</td><td>${booking}</td>
      <td>${p.targetCPQL ? fmtR(p.targetCPQL) : '\u2014'}</td>
      <td>${mtdCPQL ? fmtR(mtdCPQL) : '\u2014'}</td>${extra}</tr>`;
  }

  function smFiltered(list) {
    return list.filter(p => (S.sm === 'All SM' || p.sm === S.sm) && statusMatch(p.status, S.status));
  }

  function sectionTable(elId, list, revIsEOI, hintId, badgeId) {
    const cols = SM_COLS.slice();
    if (revIsEOI) { cols[6] = 'Target EOI'; cols.push(...BU_EXTRA); }
    const rows = smFiltered(list);
    const t = rows.reduce((a, p) => {
      const mis = misByProject(p.project);
      return {
        ba: a.ba + (p.budgetAssigned || 0), tb: a.tb + (p.totalBudget || 0), sp: a.sp + (p.spent || 0),
        tr: a.tr + (revIsEOI ? (p.targetEOI || 0) : (p.targetRev || 0)),
        qa: a.qa + (p.qlAligned || 0), mq: a.mq + (p.mtdQL || 0), dq: a.dq + (p.mtdDQL || 0), tq: a.tq + (p.totMtdQL || 0),
        ld: a.ld + (mis ? mis.ml : 0), sv: a.sv + (mis && mis.sv ? mis.sv : 0), bk: a.bk + (mis ? mis.gu : 0),
        eoi: a.eoi + (p.targetEOI || 0),
        pr: a.pr + ((p.targetEOI || 0) * (mis && mis.avgAV ? mis.avgAV : 0)),
        ar: a.ar + (mis ? mis.ns : 0)
      };
    }, { ba:0,tb:0,sp:0,tr:0,qa:0,mq:0,dq:0,tq:0,ld:0,sv:0,bk:0,eoi:0,pr:0,ar:0 });
    const extraTot = !revIsEOI ? '' :
      `<td>${fmtN(t.eoi)}</td><td>\u2014</td><td>\u2014</td><td>${fmtR(t.pr)}</td><td>${fmtR(t.ar)}</td>
       <td><span class="${t.pr - t.ar > 0 ? 'neg' : 'pos'}">${fmtR(t.pr - t.ar)}</span></td>
       <td>${t.pr ? fmtPct(t.sp / t.pr * 100) : '\u2014'}</td><td>${t.ar ? fmtPct(t.sp / t.ar * 100) : '\u2014'}</td>`;
    const totals = `<tr class="total"><td>Totals</td><td></td><td></td>
      <td>${fmtR(t.ba)}</td><td>${fmtR(t.tb)}</td><td>${fmtR(t.sp)}</td>
      <td>${revIsEOI ? fmtN(t.tr) + ' EOI' : fmtR(t.tr)}</td>
      <td>${fmtN(t.qa)}</td><td>${fmtN(t.mq)}</td><td>${fmtN(t.dq)}</td><td>${fmtN(t.tq)}</td>
      <td>${fmtN(t.ld)}</td><td>${fmtN(t.sv)}</td><td>${fmtN(t.bk)}</td>
      <td>${t.qa ? fmtR(t.tb / t.qa) : '\u2014'}</td><td>${t.tq ? fmtR(t.sp / t.tq) : '\u2014'}</td>${extraTot}</tr>`;
    document.getElementById(elId).innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' +
      '<tbody>' + totals + (rows.map(p => projRow(p, revIsEOI)).join('') || emptyRow(cols.length)) + '</tbody>';
    document.getElementById(hintId).textContent = rows.length + ' project' + (rows.length === 1 ? '' : 's');
    const anyLive = rows.some(p => /live/i.test(p.status));
    const anyHold = rows.some(p => /hold/i.test(p.status));
    document.getElementById(badgeId).textContent = anyLive ? 'Live' : anyHold ? 'On Hold' : rows.length ? 'Paused' : 'No rows';
  }

  function renderProjectPerf() {
    sectionTable('tblPlanned',  D.bangalore.planned,  false, 'hintPlanned',  'badgePlanned');
    sectionTable('tblUnplanned',D.bangalore.unplanned,false, 'hintUnplanned','badgeUnplanned');
    sectionTable('tblBuiltup',  D.bangalore.builtup,  true,  'hintBuiltup',  'badgeBuiltup');
    document.getElementById('projNote').innerHTML =
      'Bangalore portfolio from the Spend Tracker <b>Dashboard</b> sheet. SM ownership is arithmetic-verified against SM Wise Spends \u2014 every SM\u2019s section spends reconcile to the paisa. Rows marked <b>\u2014</b> (Sumadhura Panorama, Prestige Avon Nagavara) carry zero spend, so no SM can be attributed from the data. Builtup targets are EOI counts, as in the tracker. <b>Total Leads, SV Done and Booking Done</b> are joined from the MIS by project name. <b>EOI Done and EOI Status (Bankable / Non-Bankable) are blank because no such data exists in either uploaded file</b> \u2014 the Master Sheet\u2019s EOI Status, MTD EOI, Total EOI count and Take rate columns are empty for all 139 rows. Projected Revenue = EOI Target \u00d7 Average AV (Master Sheet); Actual Revenue is MIS net sales. Send an EOI dump with a Bankable flag and these columns fill themselves.';
  }

  function emptyRow(span) {
    return `<tr><td colspan="${span}" style="text-align:center;color:var(--muted-2);padding:26px">No rows match the current filters \u2014 relax the SM or status filter above.</td></tr>`;
  }


  /* ---------------- Project Summary (replicates ROI Summary at project grain) ---------------- */
  const PROJ_COLS = ['Project','Region','Developer','SM','Status','Gross Unit','Total Gross Sales','Net Unit',
    'Total Net Sales','Total Sales+AOP','Total Cost','MTD Leads','Total Leads','MTD CPL','QL','CPQL','SV Done',
    'Cost/NBR','AV','YTD Spend','YTD Revenue','YTD ROI','Exp YTD Revenue'];

  function renderProjectSummary() {
    const rows = PPprojects(PPq());
    const thead = '<thead><tr>' + PROJ_COLS.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
    const capped = rows.slice(0, 400);
    const body = capped.map(p => {
      const roi = p.ytdSpend ? p.ytdRev / p.ytdSpend : 0;
      const star = p.star === 'Y' ? ' <span class="pill live" style="background:var(--orange-soft);color:#9A4300">Focus</span>' : '';
      return `<tr>
        <td style="white-space:normal;min-width:230px">${p.project}${star}</td>
        <td style="text-align:left">${p.city}</td>
        <td style="text-align:left">${p.dev}</td>
        <td style="text-align:left">${p.sm || p.mgr || '\u2014'}</td>
        <td>${p.projStatus || p.bs || '\u2014'}</td>
        <td>${fmtN(p.gu)}</td><td>${fmtR(p.gs)}</td><td>${fmtN(p.nu)}</td><td>${fmtR(p.ns)}</td><td>${fmtR(p.aop)}</td>
        <td>${fmtR(p.tc)}</td><td>${fmtN(p.ml)}</td><td>${fmtN(p.tl)}</td>
        <td>${p.ml ? fmtR(p.tc / p.ml) : '\u2014'}</td>
        <td>${p.ql == null ? '\u2014' : fmtN(p.ql)}</td>
        <td>${p.ql ? fmtR(p.tc / p.ql) : '\u2014'}</td>
        <td>${p.sv == null ? '\u2014' : fmtN(p.sv)}</td>
        <td>${ratio(p.tc, p.ns).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        <td>${fmtR(p.av)}</td>
        <td>${fmtR(p.ytdSpend)}</td><td>${fmtR(p.ytdRev)}</td>
        <td><span class="${roi >= 1 ? 'pos' : 'neg'}">${roi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}x</span></td>
        <td>${p.expYtdRev ? fmtR(p.expYtdRev) : '\u2014'}</td></tr>`;
    }).join('');
    const t = rows.reduce((a, p) => ({
      gu: a.gu + p.gu, gs: a.gs + p.gs, nu: a.nu + p.nu, ns: a.ns + p.ns, aop: a.aop + p.aop, tc: a.tc + p.tc,
      ml: a.ml + p.ml, tl: a.tl + p.tl, ql: a.ql + (p.ql || 0), sv: a.sv + (p.sv || 0), av: a.av + p.av,
      ys: a.ys + p.ytdSpend, yr: a.yr + p.ytdRev, ey: a.ey + p.expYtdRev
    }), { gu:0,gs:0,nu:0,ns:0,aop:0,tc:0,ml:0,tl:0,ql:0,sv:0,av:0,ys:0,yr:0,ey:0 });
    const totalRow = rows.length ? `<tr class="total"><td>Total (${fmtN(rows.length)} projects)</td><td></td><td></td><td></td><td></td>
        <td>${fmtN(t.gu)}</td><td>${fmtR(t.gs)}</td><td>${fmtN(t.nu)}</td><td>${fmtR(t.ns)}</td><td>${fmtR(t.aop)}</td>
        <td>${fmtR(t.tc)}</td><td>${fmtN(t.ml)}</td><td>${fmtN(t.tl)}</td><td>${t.ml ? fmtR(t.tc / t.ml) : '\u2014'}</td>
        <td>${fmtN(t.ql)}</td><td>${t.ql ? fmtR(t.tc / t.ql) : '\u2014'}</td><td>${fmtN(t.sv)}</td>
        <td>${ratio(t.tc, t.ns).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>${fmtR(t.av)}</td>
        <td>${fmtR(t.ys)}</td><td>${fmtR(t.yr)}</td>
        <td>${(t.ys ? t.yr / t.ys : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}x</td>
        <td>${fmtR(t.ey)}</td></tr>` : '';
    document.getElementById('tblProjects').innerHTML = thead + '<tbody>' + totalRow + (body || emptyRow(PROJ_COLS.length)) + '</tbody>';
    document.getElementById('psTitle').textContent = PPcityLabel() + ' \u2013 All Project List';
    document.getElementById('psHint').textContent = fmtN(rows.length) + ' projects' + (rows.length > 400 ? ' \u00b7 showing top 400 by cost' : '');
    document.getElementById('psNote').innerHTML =
      'Same measure set as the ROI Summary, at project grain, straight from the MIS Table. <b>YTD = FY Apr\u2013Aug 2026</b>; ' +
      'YTD ROI is YTD revenue \u00f7 YTD spend. <b>Exp YTD Revenue</b>, SM, project status and Focus/Star flags come from the Spend Tracker ' +
      '<b>Master Sheet</b> (139 tracked projects) \u2014 projects outside that sheet show \u2014 for those columns. QL/SV are matched by project ' +
      'name and cover 86.9% of the QL sheet; unmatched projects show \u2014 rather than a guessed number.';
  }

  /* ---------------- Cross Report: project x source ---------------- */
  let xMode = 'incl';
  function renderCross() {
    const q = PPq();
    const bySrc = PPquery(q, 'SRC');
    const NOCOST = ['(blank)', 'website', 'incoming call', 'referral', 'mandate crm', 'walk in', 'walkin'];
    const isOrganic = src => NOCOST.includes(String(src).toLowerCase());
    let entries = [...bySrc.groups.entries()];
    if (xMode === 'excl') entries = entries.filter(([src, g]) => !isOrganic(src) && g.cost > 0);
    entries.sort((a, b) => b[1].cost - a[1].cost);

    const cols = ['Source', 'Type', 'Cost', 'Leads', 'CPL', 'Gross Units (Bookings)', 'Net Sales', 'Cost / Booking', 'Cost / NBR'];
    const body = entries.map(([src, g]) => {
      const organic = isOrganic(src);
      return `<tr${organic ? ' class="dim"' : ''}>
        <td>${src}</td>
        <td>${organic ? '<span class="pill hold">Referral / Organic</span>' : '<span class="pill live">Paid media</span>'}</td>
        <td>${fmtR(g.cost)}</td><td>${fmtN(g.leads)}</td>
        <td>${g.leads ? fmtR(g.cost / g.leads) : '\u2014'}</td>
        <td>${fmtN(g.gu)}</td><td>${fmtR(g.ns)}</td>
        <td>${g.gu ? fmtR(g.cost / g.gu) : '\u2014'}</td>
        <td>${g.ns ? (g.cost / g.ns).toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '\u2014'}</td></tr>`;
    }).join('');
    const t = entries.reduce((a, [, g]) => ({ cost: a.cost + g.cost, leads: a.leads + g.leads, gu: a.gu + g.gu, ns: a.ns + g.ns }), { cost:0, leads:0, gu:0, ns:0 });
    const totalRow = entries.length ? `<tr class="total"><td>Total</td><td></td><td>${fmtR(t.cost)}</td><td>${fmtN(t.leads)}</td>
      <td>${t.leads ? fmtR(t.cost / t.leads) : '\u2014'}</td><td>${fmtN(t.gu)}</td><td>${fmtR(t.ns)}</td>
      <td>${t.gu ? fmtR(t.cost / t.gu) : '\u2014'}</td>
      <td>${t.ns ? (t.cost / t.ns).toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '\u2014'}</td></tr>` : '';
    document.getElementById('tblCross').innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' +
      '<tbody>' + totalRow + (body || emptyRow(cols.length)) + '</tbody>';
    document.getElementById('xTitle').textContent = PPcityLabel() + ' \u2013 Cross Report \u00b7 Source \u00d7 Cost \u00d7 Bookings';
    document.getElementById('xNote').innerHTML =
      'Cost and bookings cross-tabbed by source for whatever project / region / developer set is filtered above. ' +
      '<b>Paid media only</b> drops sources that carry leads or bookings with no media cost \u2014 referral, website, incoming call, mandate CRM, walk-ins and unattributed rows \u2014 ' +
      'so cost-per-booking reflects money actually spent. Including them shows the full funnel and the true booking count. ' +
      'Bookings are gross units from the MIS; a booking is credited to the source of the lead that produced it.';
    document.querySelectorAll('#xCtl .per').forEach(b => b.classList.toggle('active', b.dataset.x === xMode));
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#xCtl .per');
    if (b) { xMode = b.dataset.x; renderCross(); }
  });

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
    renderProjectSummary();
    renderCross();
    renderProjectPerf();
    renderCharts();
  }

  PPshell('index', null);
  PPsetTab(S.tab);
  renderAll();
  document.addEventListener('pp:filters', renderAll);
})();
