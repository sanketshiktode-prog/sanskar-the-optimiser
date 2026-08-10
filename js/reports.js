/* Reports — one-click CSV extracts + data definitions */
(function () {
  'use strict';
  const D = window.PP;

  function csvFrom(header, rows, filename) {
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [header.map(esc).join(',')].concat(rows.map(r => r.map(esc).join(',')));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
    toast(filename + ' downloaded');
  }

  const EXPORTS = [
    {
      name: 'ROI Summary \u2014 Region Wise', desc: 'All 12 regions + Total, every ROI column',
      run: () => csvFrom(
        ['Region','Gross Unit','Total Gross Sales','Net Unit','Total Net Sales','Total Sales+AOP','Projected Cost','Total Cost','MTD Leads','Total Leads','MTD CPL','Total QL','CPQL','SV Done','Cost/NBR','Cost/NBR+AOP','AV','Cost','Leads','Deficit'],
        D.regionSummary.map(r => [r.region, r.gu, r.gs, r.nu, r.ns, r.aop, r.pc, r.tc, r.ml, r.tl,
          r.ml ? (r.tc / r.ml).toFixed(0) : 0, r.ql, r.ql ? (r.tc / r.ql).toFixed(0) : 0, r.sv,
          r.ns ? (r.tc / r.ns).toFixed(3) : 0, r.aop ? (r.tc / r.aop).toFixed(3) : 0, r.av, r.cost, r.leads, r.deficit]),
        'pp_roi_region_wise.csv')
    },
    {
      name: 'Manager Summary \u2014 Bangalore', desc: 'SM budgets, spends, QL and CPQL',
      run: () => csvFrom(
        ['Manager','Total Budget','Budget Spent','Target Revenue','MTD QL','Total MTD QL','Target CPQL','MTD CPQL'],
        D.managerSummaryBangalore.map(m => [m.manager, m.budget, m.spent, m.targetRev, m.mtdQL, m.totMtdQL, m.targetCPQL, m.mtdCPQL]),
        'pp_manager_summary_bangalore.csv')
    },
    {
      name: 'Bangalore Projects \u2014 Full Portfolio', desc: 'Planned, Un-Planned and Builtup rows with SM ownership',
      run: () => csvFrom(
        ['Section','Project','SM','Status','Budget Assigned','Total Budget','Budget Spent','Target Revenue / EOI','QL Aligned','MTD QL','MTD DQL','Total MTD QL','Target CPQL'],
        [].concat(
          D.bangalore.planned.map(p => ['Launch+Sustenance - Planned', p.project, p.sm, p.status, p.budgetAssigned, p.totalBudget, p.spent, p.targetRev, p.qlAligned, p.mtdQL, p.mtdDQL, p.totMtdQL, p.targetCPQL]),
          D.bangalore.unplanned.map(p => ['Launch+Sustenance - Un-Planned', p.project, p.sm, p.status, p.budgetAssigned, p.totalBudget, p.spent, p.targetRev, p.qlAligned, p.mtdQL, p.mtdDQL, p.totMtdQL, p.targetCPQL]),
          D.bangalore.builtup.map(p => ['Builtup', p.project, p.sm, p.status, p.budgetAssigned, p.totalBudget, p.spent, (p.targetEOI || 0) + ' EOI', p.qlAligned, p.mtdQL, p.mtdDQL, p.totMtdQL, p.targetCPQL])
        ),
        'pp_bangalore_projects.csv')
    },
    {
      name: 'Campaign Register \u2014 Bangalore', desc: 'Live Campaign sheet + Aug MTD cost & leads',
      run: () => csvFrom(
        ['Campaign','Source','Project','Status','MTD Cost','MTD Leads'],
        D.campaigns.map(c => [c.campaign, c.source, c.project, c.status, c.cost, c.leads]),
        'pp_campaigns_bangalore.csv')
    },
    {
      name: 'Source Wise Report \u2014 All Regions + Per City', desc: 'Cost, leads, CPL (full period + Aug MTD), QL, SV per source',
      run: () => {
        const rows = [];
        Object.keys(D.sourceWise).forEach(city => D.sourceWise[city].forEach(r =>
          rows.push([city, r.src, r.cost, r.leads, r.leads ? (r.cost / r.leads).toFixed(0) : 0,
                     r.augCost, r.augLeads, r.augLeads ? (r.augCost / r.augLeads).toFixed(0) : 0, r.ql, r.sv])));
        csvFrom(['City','Source','Total Cost','Total Leads','CPL','Aug MTD Cost','Aug MTD Leads','Aug CPL','QL','SV Done'], rows, 'pp_source_wise_report.csv');
      }
    },
    {
      name: 'Budget vs Actual \u2014 All Sections', desc: 'City budgets for L+S, Un-Planned and Builtup',
      run: () => csvFrom(
        ['Section','City','Total Budget','Budget Spent','Target Revenue / EOI','QL Aligned','MTD QL','MTD DQL','Total MTD QL'],
        [].concat(
          D.budget.ls.map(r => ['Launch+Sustenance', r.city, r.budget, r.spent, r.targetRev, r.qlAligned, r.mtdQL, r.mtdDQL, r.totMtdQL]),
          D.budget.unplanned.map(r => ['Un-Planned', r.city, r.budget, r.spent, r.targetRev, r.qlAligned, r.mtdQL, r.mtdDQL, r.totMtdQL]),
          D.budget.builtup.map(r => ['Builtup', r.city, r.budget, r.spent, r.targetRev + ' EOI', r.qlAligned, r.mtdQL, r.mtdDQL, r.totMtdQL])
        ),
        'pp_budget_vs_actual.csv')
    },
    {
      name: 'Monthly Trend \u2014 Mar\u2013Aug 2026', desc: 'Cost, leads, net sales, gross units by month',
      run: () => csvFrom(
        ['Month','Marketing Cost','Leads','Net Sales','Gross Units'],
        D.trend.map(t => [t.m, t.cost, t.leads, t.ns, t.gu]),
        'pp_monthly_trend.csv')
    }
  ];

  function renderList() {
    const el = document.getElementById('reportList');
    el.innerHTML = EXPORTS.map((e, i) => `
      <div style="display:flex;align-items:center;gap:14px;padding:13px 4px;border-bottom:1px solid var(--line)">
        <div style="width:38px;height:38px;border-radius:12px;background:var(--orange-soft);display:flex;align-items:center;justify-content:center;color:var(--orange);font-weight:800">${i + 1}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px">${e.name}</div>
          <div style="font-size:11.5px;color:var(--muted)">${e.desc}</div>
        </div>
        <button class="btn accent" data-i="${i}">Download CSV</button>
      </div>`).join('') +
      `<div style="display:flex;gap:10px;padding-top:16px;flex-wrap:wrap">
        <button class="btn primary" id="printAll">Print Full Dashboard (PDF)</button>
      </div>`;
    el.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => EXPORTS[+b.dataset.i].run());
    document.getElementById('printAll').onclick = () => window.print();
  }

  function renderNotes() {
    document.getElementById('sourceNotes').innerHTML = `
      <p style="margin:0 0 10px"><b>Sources.</b> ${D.meta.source}. Region ROI figures are aggregated from the MIS flat table with
      Write-Off marketing cost rows excluded, so every region ties back to the MIS pivot exactly. QL and SV come from the
      Spend Tracker QL LEADS DATA sheet mapped project-to-city.</p>
      <p style="margin:0 0 10px"><b>Definitions.</b> MTD CPL = Total Cost \u00f7 MTD (presales) Leads. CPQL = Total Cost \u00f7 Qualified Leads.
      Cost/NBR = Total Cost \u00f7 Total Net Sales. Cost/NBR+AOP = Total Cost \u00f7 (Net Sales + AOP revenue). Target CPQL = Budget \u00f7 QL Aligned.
      MTD CPQL = Budget Spent \u00f7 Total MTD QL. NBR % = Net Sales \u00f7 Gross Sales.</p>
      <p style="margin:0"><b>Snapshot.</b> Aug 2026 figures are month-to-date as of ${D.meta.snapshot}. Bangalore SM-to-project ownership is arithmetic-verified: every SM's Launch+Sustenance and Builtup
      spends reconcile to the paisa against SM Wise Spends (this places Assetz Meru &amp; You under Rupali). Zero-spend rows
      (Sumadhura Panorama, Prestige Avon Nagavara) cannot be attributed from spend data and are shown unassigned.</p>`;
  }

  PPshell('reports', 'Reports');
  renderList();
  renderNotes();
})();
