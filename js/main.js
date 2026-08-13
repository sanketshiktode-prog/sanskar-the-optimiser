/* Main dashboard page: ROI Summary / SM-Manager / Project Performance */
(function () {
  'use strict';
  const D = window.PP, S = window.PPState;

  /* ---------------- tabs ---------------- */
  const panels = ['roi', 'sm', 'project', 'project_summary', 'focus_project', 'aop_project'];

  window.PPsetTab = function (tab) {
    S.tab = panels.includes(tab) ? tab : 'roi';

    document.querySelectorAll('.tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === S.tab)
    );

    panels.forEach(p => {
      const el = document.getElementById('panel-' + p);
      if (el) el.classList.toggle('active', p === S.tab);
    });

    history.replaceState(
      null,
      '',
      location.pathname + '?' + PPqs() + '&tab=' + S.tab
    );

    document.dispatchEvent(new CustomEvent('pp:filters'));
  };

  document.querySelectorAll('.tab').forEach(
    b => b.onclick = () => PPsetTab(b.dataset.tab)
  );

  /* ---------------- helpers ---------------- */
  const regionRow = name => D.regionSummary.find(r => r.region === name);

  const activeRegion = () => {
    if (!S.city || S.city.length === 0)
      return regionRow('Total');

    if (S.city.length === 1)
      return regionRow(S.city[0]) || regionRow('Total');

    return S.city.reduce((acc, city) => {
      const r = regionRow(city) || {
        ns: 0,
        gs: 0,
        gu: 0,
        nu: 0,
        av: 0,
        ml: 0,
        ql: 0,
        sv: 0
      };

      acc.ns += (r.ns || 0);
      acc.gs += (r.gs || 0);
      acc.gu += (r.gu || 0);
      acc.nu += (r.nu || 0);
      acc.av += (r.av || 0);
      acc.ml += (r.ml || 0);
      acc.ql += (r.ql || 0);
      acc.sv += (r.sv || 0);

      return acc;
    }, {
      ns: 0,
      gs: 0,
      gu: 0,
      nu: 0,
      av: 0,
      ml: 0,
      ql: 0,
      sv: 0
    });
  };

  /* ---------------- KPI band ---------------- */
  function renderKPIs() {
    const r = activeRegion();
    const scope =
      (!S.city || S.city.length === 0)
        ? 'All regions'
        : S.city.join(', ');

    const cards = [
      ['rupee', 'Total Revenue', fmtCr(r.ns), 'MTD net booking value'],
      ['rupee', 'Total Revenue', fmtCr(r.gs), 'MTD gross booking value'],
      ['home', 'Total Unit Sold', fmtN(r.gu), scope + ' · gross units'],
      ['home', 'Total Unit Sold', fmtN(r.nu), scope + ' · net units'],
      ['tag', 'AV Sold', fmtCr(r.av, 0), 'Agreement value'],
      ['users', 'Total Leads', fmtN(r.ml), 'Presales leads · all sources'],
      ['check', 'Total QL', fmtN(r.ql), 'Qualified leads'],
      ['pin', 'Total SV', fmtN(r.sv), 'Site visits done'],
      ['pct', 'NBR %', fmtPct(ratio(r.ns, r.gs) * 100), 'Net booking ratio']
    ];

    document.getElementById('kpis').innerHTML = cards.map(c =>
      `<div class="kpi">
         <div class="top">
           <span class="tile">${PPicon(c[0], '')}</span>
           <span class="lbl">${c[1]}</span>
         </div>
         <div class="val">${c[2]}</div>
         <div class="sub">${c[3]}</div>
       </div>`
    ).join('');
  }

  /* ---------------- ROI Summary table ---------------- */
  const REG_COLS = [
    'Region',
    'Gross Unit',
    'Total Gross Sales',
    'Net Unit',
    'Total Net Sales',
    'Total Sales+AOP',
    'Projected Cost',
    'Total Cost',
    'MTD Leads',
    'Total Leads',
    'MTD CPL',
    'Total QL',
    'CPQL',
    'SV Done',
    'Cost/NBR',
    'Cost/NBR+AOP',
    'AV',
    'Yst Cost',
    'Yst Leads',
    'Deficit',
    'Focus Project',
    'AOP Project',
    'YTD Spend',
    'YTD Revenue',
    'YTD ROI',
    'Expected YTD Revenue'
  ];

  function regionCells(r) {
    return [
      r.region,
      fmtN(r.gu),
      fmtR(r.gs),
      fmtN(r.nu),
      fmtR(r.ns),
      fmtR(r.aop),
      fmtR(r.pc),
      fmtR(r.tc),
      fmtN(r.ml),
      fmtN(r.tl),
      fmtR(ratio(r.tc, r.ml)),
      fmtN(r.ql),
      fmtR(ratio(r.tc, r.ql)),
      fmtN(r.sv),
      ratio(r.tc, r.ns).toLocaleString('en-IN', {
        maximumFractionDigits: 2
      }),
      ratio(r.tc, r.aop).toLocaleString('en-IN', {
        maximumFractionDigits: 2
      }),
      fmtR(r.av),
      fmtR(r.cost),
      fmtN(r.leads),
      `<span class="${r.deficit < 0 ? 'neg' : 'pos'}">${fmtR(r.deficit)}</span>`
    ];
  }

  function renderRegionTable() {
    const all = D.regionSummary;

    const rows =
      (!S.city || S.city.length === 0)
        ? all
        : all.filter(
            r => S.city.includes(r.region) || r.region === 'Total'
          );

    const thead =
      '<thead><tr>' +
      REG_COLS.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead>';

    const tbody =
      '<tbody>' +
      rows.map(r => {
        const cls =
          r.region === 'Total'
            ? 'total'
            : (r.region === S.city ? 'hl' : '');

        return `<tr class="${cls}">` +
          regionCells(r)
            .map(v => `<td>${v}</td>`)
            .join('') +
          '</tr>';
      }).join('') +
      '</tbody>';

    document.getElementById('tblRegion').innerHTML =
      thead + tbody;
  }

  /* ---------------- SM / Manager View ---------------- */
  const MGR_COLS = [
    'Manager',
    'Gross Unit',
    'Total Gross Sales',
    'Net Unit',
    'Total Net Sales',
    'Total Sales+AOP',
    'Projected Cost',
    'Total Cost',
    'MTD Leads',
    'Total Leads',
    'MTD CPL',
    'Total QL',
    'CPQL',
    'SV Done',
    'Cost/NBR',
    'Cost/NBR+AOP',
    'AV',
    'Yst Cost',
    'Yst Leads',
    'Deficit',
    'Focus Project',
    'AOP Project',
    'YTD Spend',
    'YTD Revenue',
    'YTD ROI',
    'Expected YTD Revenue'
  ];

  /* Project → SM lookup, built from the arithmetic-verified Bangalore portfolio */
  const normKey = s =>
    String(s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]/g, '');

  const BLR_PROJECT_SM = [
    ...D.bangalore.planned,
    ...D.bangalore.unplanned,
    ...D.bangalore.builtup
  ]
    .filter(p => p.sm && p.sm !== '—')
    .map(p => ({
      key: normKey(p.project),
      sm: p.sm
    }))
    .sort((a, b) => b.key.length - a.key.length);

  const smForCampaign = project => {
    const ck = normKey(project);

    const hit =
      BLR_PROJECT_SM.find(p => ck.startsWith(p.key)) ||
      BLR_PROJECT_SM.find(p => ck.includes(p.key));

    return hit ? hit.sm : null;
  };

  function sourceStatsForSM(smName) {
    const rows = D.campaigns.filter(
      c =>
        smForCampaign(c.project) === smName &&
        (
          S.source === 'All Sources' ||
          sourceMatch(c.source, S.source)
        )
    );

    return rows.reduce(
      (a, c) => ({
        cost: a.cost + (c.cost || 0),
        leads: a.leads + (c.leads || 0)
      }),
      {
        cost: 0,
        leads: 0
      }
    );
  }

  function renderManagerTable() {
    const srcActive =
      S.source && S.source.length > 0;

    const blrScope =
      S.city &&
      S.city.length === 1 &&
      S.city[0] === 'Bangalore';

    const cols =
      MGR_COLS.concat(srcActive ? SRC_COLS : []);

    const thead =
      '<thead><tr>' +
      cols.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead>';

    let rows = [];
    let note = '';
    let rawSm = m => m;

    if (!S.city || S.city.length === 0) {

      rows =
        D.smWise
          .filter(
            m =>
              !S.sm ||
              S.sm.length === 0 ||
              S.sm.includes(m.sm)
          )
          .map(m => ({
            manager: m.sm + ' · ' + m.city,
            sm: m.sm,
            budget: m.budget,
            spent: m.spend,
            targetRev: m.targetRev,
            mtdQL: null,
            totMtdQL: null,
            targetCPQL: null,
            mtdCPQL: null
          }));

      note =
        'Full SM roster with live budgets & targets. SM totals reconcile to the paisa.';

      rawSm = m => m.sm;

    } else if (blrScope) {

      rows =
        D.managerSummaryBangalore.filter(
          m =>
            !S.sm ||
            S.sm.length === 0 ||
            S.sm.includes(m.manager)
        );

      note =
        'Each SM’s Launch + Sustenance and Builtup spends reconcile to the paisa against their mapped project rows.';

      rawSm = m => m.manager;

    } else {

      rows =
        D.smWise
          .filter(
            m =>
              S.city.includes(m.city) &&
              (
                !S.sm ||
                S.sm.length === 0 ||
                S.sm.includes(m.sm)
              )
          )
          .map(m => ({
            manager: m.sm,
            sm: m.sm,
            budget: m.budget,
            spent: m.spend,
            targetRev: m.targetRev,
            mtdQL: null,
            totMtdQL: null,
            targetCPQL: null,
            mtdCPQL: null
          }));

      note =
        'Budgets, spends and revenue targets are live from Spend Tracker Aug-26.';

      rawSm = m => m.sm;
    }

    if (srcActive) {

      rows = rows.map(m => {

        const s =
          blrScope
            ? sourceStatsForSM(rawSm(m))
            : {
                cost: 0,
                leads: 0
              };

        return {
          ...m,
          srcCost: s.cost,
          srcLeads: s.leads
        };
      });

      if (blrScope) {

        rows =
          rows.filter(
            m => m.srcCost > 0 || m.srcLeads > 0
          );

        note =
          `Filtered to <b>${S.source}</b> — cost &amp; leads matched from the MIS Live Campaign register against the arithmetic-verified SM→project mapping (project-name matching is approximate, so figures may slightly under-count spend on unmapped/renamed campaigns). Budget, Target Revenue and QL columns are unaffected by the source filter.`;

      } else {

        const cityKey =
          S.city === 'All Regions'
            ? 'All Regions'
            : S.city;

        const srcRow =
          (D.sourceWise[cityKey] || [])
            .find(
              r => sourceMatch(r.src, S.source)
            );

        const ctx =
          srcRow
            ? `${cityKey} spent ${fmtR(srcRow.cost)} on ${fmtN(srcRow.leads)} leads from <b>${S.source}</b> (Source Wise Report).`
            : `No <b>${S.source}</b> rows for ${cityKey}.`;

        note =
          `Source-level SM attribution is only available for Bangalore’s mapped campaign register in this snapshot, so Source Cost/Leads show as — here. ${ctx} Switch to Bangalore to see the per-manager breakdown for this source.`;
      }
    }

    const tot =
      rows.reduce(
        (a, m) => ({
          budget: a.budget + (m.budget || 0),
          spent: a.spent + (m.spent || 0),
          targetRev: a.targetRev + (m.targetRev || 0),
          mtdQL: a.mtdQL + (m.mtdQL || 0),
          totMtdQL: a.totMtdQL + (m.totMtdQL || 0),
          srcCost: a.srcCost + (m.srcCost || 0),
          srcLeads: a.srcLeads + (m.srcLeads || 0)
        }),
        {
          budget: 0,
          spent: 0,
          targetRev: 0,
          mtdQL: 0,
          totMtdQL: 0,
          srcCost: 0,
          srcLeads: 0
        }
      );

    const body =
      rows.map(m => {

        const srcCells =
          !srcActive
            ? ''
            : blrScope
              ? `<td>${fmtR(m.srcCost)}</td>
                 <td>${fmtN(m.srcLeads)}</td>
                 <td>${m.srcLeads ? fmtR(m.srcCost / m.srcLeads) : '—'}</td>`
              : `<td>—</td><td>—</td><td>—</td>`;

        return `<tr>
          <td>${m.manager}</td>
          <td>${fmtR(m.budget)}</td>
          <td>${fmtR(m.targetRev)}</td>
          <td>${m.mtdQL == null ? '—' : fmtN(m.mtdQL)}</td>
          <td>${m.totMtdQL == null ? '—' : fmtN(m.totMtdQL)}</td>
          <td>${m.targetCPQL ? fmtR(m.targetCPQL) : '—'}</td>
          <td>${m.mtdCPQL ? fmtR(m.mtdCPQL) : '—'}</td>
          ${srcCells}
        </tr>`;
      }).join('');

    const isBlr =
      S.city === 'Bangalore';

    const srcTotalCells =
      !srcActive
        ? ''
        : blrScope
          ? `<td>${fmtR(tot.srcCost)}</td>
             <td>${fmtN(tot.srcLeads)}</td>
             <td>${tot.srcLeads ? fmtR(tot.srcCost / tot.srcLeads) : '—'}</td>`
          : `<td>—</td><td>—</td><td>—</td>`;

    const totalRow =
      rows.length > 1
        ? `<tr class="total">
            <td>Total</td>
            <td>${fmtR(tot.budget)}</td>
            <td>${fmtR(tot.spent)}</td>
            <td>${fmtR(tot.targetRev)}</td>
            <td>${isBlr ? fmtN(tot.mtdQL) : '—'}</td>
            <td>${isBlr ? fmtN(tot.totMtdQL) : '—'}</td>
            <td>—</td>
            <td>${isBlr && tot.totMtdQL ? fmtR(tot.spent / tot.totMtdQL) : '—'}</td>
            ${srcTotalCells}
          </tr>`
        : '';

    document.getElementById('tblManager').innerHTML =
      thead +
      '<tbody>' +
      (body || emptyRow(cols.length)) +
      totalRow +
      '</tbody>';

    document.getElementById('smvTitle').textContent =
      (S.city === 'All Regions'
        ? 'All Regions'
        : S.city) +
      ' – SM / Manager Summary' +
      (srcActive ? ' · ' + S.source : '');

    document.getElementById('smvNote').innerHTML =
      note;
  }

  /* ---------------- Project Performance ---------------- */
  const SM_COLS = [
    'Project Name',
    'SM',
    'Campaign Status',
    'Budget Assigned',
    'Total Budget',
    'Budget Spent',
    'Target Revenue',
    'QL Aligned',
    'MTD QL',
    'MTD DQL',
    'Total MTD QL',
    'Target CPQL',
    'MTD CPQL'
  ];

  function projRow(
    p,
    revIsEOI,
    isBuiltup,
    isPlannedOrUnplanned
  ) {

    const rev =
      revIsEOI
        ? fmtN(p.targetEOI) + ' EOI'
        : fmtR(p.targetRev);

    const mtdCPQL =
      p.totMtdQL
        ? p.spent / p.totMtdQL
        : 0;

    const dim =
      p.sm === '—'
        ? ' class="dim"'
        : '';

    let extraCols = '';

    if (isBuiltup) {

      extraCols = `
        <td>15</td>
        <td>5</td>
        <td>Bankable</td>
        <td>₹1.5 Cr</td>
        <td>₹1.2 Cr</td>
        <td>₹30 L</td>
        <td>12%</td>
        <td>10%</td>
      `;

    } else if (isPlannedOrUnplanned) {

      extraCols = `
        <td>12</td>
        <td>3</td>
      `;
    }

    return `<tr${dim}>
      <td>${p.project}</td>
      <td style="text-align:left">${p.sm}</td>
      <td>${pill(p.status)}</td>
      <td>${fmtR(p.budgetAssigned)}</td>
      <td>${fmtR(p.totalBudget)}</td>
      <td>${fmtR(p.spent)}</td>
      <td>${rev}</td>
      <td>${fmtN(p.qlAligned)}</td>
      <td>${fmtN(p.mtdQL)}</td>
      <td>${fmtN(p.mtdDQL)}</td>
      <td>${p.totMtdQL == null ? '—' : fmtN(p.totMtdQL)}</td>
      <td>${p.targetCPQL ? fmtR(p.targetCPQL) : '—'}</td>
      <td>${mtdCPQL ? fmtR(mtdCPQL) : '—'}</td>
      ${extraCols}
    </tr>`;
  }

  function smFiltered(list) {
    return list.filter(p =>
      (!S.sm ||
        S.sm.length === 0 ||
        S.sm.includes(p.sm)) &&
      statusMatch(p.status, S.status) &&
      projectMatch(p.project, S.project)
    );
  }

  function sectionTable(
    elId,
    list,
    revIsEOI,
    hintId,
    badgeId
  ) {

    const isBuiltup =
      elId === 'tblBuiltup';

    const isPlannedOrUnplanned =
      elId === 'tblPlanned' ||
      elId === 'tblUnplanned';

    const cols =
      SM_COLS.slice();

    if (revIsEOI)
      cols[6] = 'Target EOI';

    if (isBuiltup) {

      cols.push(
        'SV Done',
        'EOI Done',
        'EOI Status',
        'Projected Revenue',
        'Actual Revenue',
        'Revenue Gap',
        '% Projected NBR',
        '% Actual NBR'
      );

    } else if (isPlannedOrUnplanned) {

      cols.push(
        'Site Visit',
        'Booking Done'
      );
    }

    const rows =
      smFiltered(list);

    const t =
      rows.reduce(
        (a, p) => ({
          ba: a.ba + (p.budgetAssigned || 0),
          tb: a.tb + (p.totalBudget || 0),
          sp: a.sp + (p.spent || 0),
          tr: a.tr +
            (
              revIsEOI
                ? (p.targetEOI || 0)
                : (p.targetRev || 0)
            ),
          qa: a.qa + (p.qlAligned || 0),
          mq: a.mq + (p.mtdQL || 0),
          dq: a.dq + (p.mtdDQL || 0),
          tq: a.tq + (p.totMtdQL || 0)
        }),
        {
          ba: 0,
          tb: 0,
          sp: 0,
          tr: 0,
          qa: 0,
          mq: 0,
          dq: 0,
          tq: 0
        }
      );

    let extraTotals = '';

    if (isBuiltup) {

      extraTotals =
        `<td>150</td>
         <td>40</td>
         <td>-</td>
         <td>₹10 Cr</td>
         <td>₹8 Cr</td>
         <td>₹2 Cr</td>
         <td>-</td>
         <td>-</td>`;

    } else if (isPlannedOrUnplanned) {

      extraTotals =
        `<td>120</td>
         <td>35</td>`;
    }

    const totals =
      `<tr class="total">
        <td>Totals</td>
        <td></td>
        <td></td>
        <td>${fmtR(t.ba)}</td>
        <td>${fmtR(t.tb)}</td>
        <td>${fmtR(t.sp)}</td>
        <td>${revIsEOI ? fmtN(t.tr) + ' EOI' : fmtR(t.tr)}</td>
        <td>${fmtN(t.qa)}</td>
        <td>${fmtN(t.mq)}</td>
        <td>${fmtN(t.dq)}</td>
        <td>${fmtN(t.tq)}</td>
        <td>${t.qa ? fmtR(t.tb / t.qa) : '—'}</td>
        <td>${t.tq ? fmtR(t.sp / t.tq) : '—'}</td>
        ${extraTotals}
      </tr>`;

    document.getElementById(elId).innerHTML =
      '<thead><tr>' +
      cols.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead>' +
      '<tbody>' +
      totals +
      (
        rows.map(
          p =>
            projRow(
              p,
              revIsEOI,
              isBuiltup,
              isPlannedOrUnplanned
            )
        ).join('') ||
        emptyRow(cols.length)
      ) +
      '</tbody>';

    document.getElementById(hintId).textContent =
      rows.length +
      ' project' +
      (rows.length === 1 ? '' : 's');

    const anyLive =
      rows.some(p => /live/i.test(p.status));

    const anyHold =
      rows.some(p => /hold/i.test(p.status));

    const badge =
      document.getElementById(badgeId);

    badge.textContent =
      anyLive
        ? 'Live'
        : anyHold
          ? 'On Hold'
          : rows.length
            ? 'Paused'
            : 'No rows';
  }

  function renderProjectPerf() {

    sectionTable(
      'tblPlanned',
      D.bangalore.planned,
      false,
      'hintPlanned',
      'badgePlanned'
    );

    sectionTable(
      'tblUnplanned',
      D.bangalore.unplanned,
      false,
      'hintUnplanned',
      'badgeUnplanned'
    );

    sectionTable(
      'tblBuiltup',
      D.bangalore.builtup,
      true,
      'hintBuiltup',
      'badgeBuiltup'
    );

    document.getElementById('projNote').innerHTML =
      'Bangalore portfolio from the Spend Tracker <b>Dashboard</b> sheet. SM ownership is arithmetic-verified against SM Wise Spends — every SM’s section spends reconcile to the paisa. Rows marked <b>—</b> (Sumadhura Panorama, Prestige Avon Nagavara) carry zero spend, so no SM can be attributed from the data. Builtup targets are EOI counts, as in the tracker.';
  }

  /* ---------------- Project Summary ---------------- */

  const PROJ_SUM_COLS = [
    'Focus Project',
    'AOP Project',
    'Project Name',
    'Gross Unit',
    'Total Gross Sales',
    'Net Unit',
    'Total Net Sales',
    'Total Sales+AOP',
    'Projected Cost',
    'Total Cost',
    'MTD Leads',
    'Total Leads',
    'MTD CPL',
    'Total QL',
    'CPQL',
    'SV Done',
    'Cost/NBR',
    'Cost/NBR+AOP',
    'AV',
    'Yst Cost',
    'Yst Leads',
    'Deficit',
    'YTD Spend',
    'YTD Revenue',
    'YTD ROI',
    'Expected YTD Revenue'
  ];

  /* Project Summary data */
  const dummyProjects = [
    {
      name: 'Sobha Hoskote',
      focus: true,
      aop: false,
      ytdSpend: 2500000,
      ytdRev: 12000000,
      expectedRev: 15000000
    },
    {
      name: 'Provident Sunworth',
      focus: false,
      aop: true,
      ytdSpend: 1500000,
      ytdRev: 9500000,
      expectedRev: 10000000
    },
    {
      name: 'Godrej Vanantara',
      focus: true,
      aop: true,
      ytdSpend: 4000000,
      ytdRev: 22000000,
      expectedRev: 25000000
    },
    {
      name: 'Mana The Right Life',
      focus: false,
      aop: false,
      ytdSpend: 800000,
      ytdRev: 3000000,
      expectedRev: 4000000
    },
    {
      name: 'Prestige Evergreen',
      focus: true,
      aop: false,
      ytdSpend: 6000000,
      ytdRev: 35000000,
      expectedRev: 38000000
    }
  ];

  /* Store selected projects */
  if (!S.focusProjects) {
    S.focusProjects =
      dummyProjects
        .filter(p => p.focus)
        .map(p => p.name);
  }

  if (!S.aopProjects) {
    S.aopProjects =
      dummyProjects
        .filter(p => p.aop)
        .map(p => p.name);
  }

  function renderProjectSummary() {

    const thead =
      '<thead><tr>' +
      PROJ_SUM_COLS.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead>';

    const tbody =
      '<tbody>' +
      (
        dummyProjects.map(p => {

          const focusChecked =
            S.focusProjects.includes(p.name);

          const aopChecked =
            S.aopProjects.includes(p.name);

          const roiCells = [
            p.name,
            '25',
            '₹15 Cr',
            '22',
            '₹13 Cr',
            '₹13.5 Cr',
            '₹2 Cr',
            '₹1.8 Cr',
            '1,500',
            '15,000',
            '₹1,200',
            '350',
            '₹5,142',
            '120',
            '8.5%',
            '8.1%',
            '₹14 Cr',
            '₹1.8 Cr',
            '15,000',
            '<span class="neg">-₹20 L</span>'
          ];

          const markCells = [
            `<input
              type="checkbox"
              class="project-focus-checkbox"
              data-project="${p.name}"
              ${focusChecked ? 'checked' : ''}
            >`,

            `<input
              type="checkbox"
              class="project-aop-checkbox"
              data-project="${p.name}"
              ${aopChecked ? 'checked' : ''}
            >`
          ];

          const ytdCells = [
            fmtR(p.ytdSpend),
            fmtR(p.ytdRev),
            fmtPct(
              (p.ytdRev / p.ytdSpend) * 100
            ),
            fmtR(p.expectedRev)
          ];

          return '<tr>' +
            [
              ...markCells,
              ...roiCells,
              ...ytdCells
            ]
              .map(v => `<td>${v}</td>`)
              .join('') +
            '</tr>';

        }).join('') ||
        emptyRow(PROJ_SUM_COLS.length)
      ) +
      '</tbody>';

    document.getElementById(
      'tblProjectSummary'
    ).innerHTML =
      thead + tbody;

    bindProjectCheckboxes();
  }

  /* ---------------- Focus Project tab ---------------- */

  function renderFocusProject() {

    const projects =
      dummyProjects.filter(
        p => S.focusProjects.includes(p.name)
      );

    const thead =
      '<thead><tr>' +
      PROJ_SUM_COLS.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead>';

    const tbody =
      '<tbody>' +
      (
        projects.map(p => {

          const roiCells = [
            p.name,
            '25',
            '₹15 Cr',
            '22',
            '₹13 Cr',
            '₹13.5 Cr',
            '₹2 Cr',
            '₹1.8 Cr',
            '1,500',
            '15,000',
            '₹1,200',
            '350',
            '₹5,142',
            '120',
            '8.5%',
            '8.1%',
            '₹14 Cr',
            '₹1.8 Cr',
            '15,000',
            '<span class="neg">-₹20 L</span>'
          ];

          const markCells = [
            p.focus ? pill('Live') : '—',
            p.aop ? pill('Live') : '—'
          ];

          const ytdCells = [
            fmtR(p.ytdSpend),
            fmtR(p.ytdRev),
            fmtPct(
              (p.ytdRev / p.ytdSpend) * 100
            ),
            fmtR(p.expectedRev)
          ];

          return '<tr>' +
            [
              ...markCells,
              ...roiCells,
              ...ytdCells
            ]
              .map(v => `<td>${v}</td>`)
              .join('') +
            '</tr>';

        }).join('') ||
        emptyRow(PROJ_SUM_COLS.length)
      ) +
      '</tbody>';

    const table =
      document.getElementById(
        'tblFocusProject'
      );

    if (table)
      table.innerHTML =
        thead + tbody;
  }

  /* ---------------- AOP Project tab ---------------- */

  function renderAOPProject() {

    const projects =
      dummyProjects.filter(
        p => S.aopProjects.includes(p.name)
      );

    const thead =
      '<thead><tr>' +
      PROJ_SUM_COLS.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead>';

    const tbody =
      '<tbody>' +
      (
        projects.map(p => {

          const roiCells = [
            p.name,
            '25',
            '₹15 Cr',
            '22',
            '₹13 Cr',
            '₹13.5 Cr',
            '₹2 Cr',
            '₹1.8 Cr',
            '1,500',
            '15,000',
            '₹1,200',
            '350',
            '₹5,142',
            '120',
            '8.5%',
            '8.1%',
            '₹14 Cr',
            '₹1.8 Cr',
            '15,000',
            '<span class="neg">-₹20 L</span>'
          ];

          const markCells = [
            p.focus ? pill('Live') : '—',
            p.aop ? pill('Live') : '—'
          ];

          const ytdCells = [
            fmtR(p.ytdSpend),
            fmtR(p.ytdRev),
            fmtPct(
              (p.ytdRev / p.ytdSpend) * 100
            ),
            fmtR(p.expectedRev)
          ];

          return '<tr>' +
            [
              ...markCells,
              ...roiCells,
              ...ytdCells
            ]
              .map(v => `<td>${v}</td>`)
              .join('') +
            '</tr>';

        }).join('') ||
        emptyRow(PROJ_SUM_COLS.length)
      ) +
      '</tbody>';

    const table =
      document.getElementById(
        'tblAOPProject'
      );

    if (table)
      table.innerHTML =
        thead + tbody;
  }

  /* ---------------- Checkbox handling ---------------- */

  function bindProjectCheckboxes() {

    document
      .querySelectorAll('.project-focus-checkbox')
      .forEach(cb => {

        cb.onchange = function () {

          const project =
            this.dataset.project;

          if (this.checked) {

            if (
              !S.focusProjects.includes(project)
            ) {
              S.focusProjects.push(project);
            }

          } else {

            S.focusProjects =
              S.focusProjects.filter(
                p => p !== project
              );
          }

          renderFocusProject();
        };
      });

    document
      .querySelectorAll('.project-aop-checkbox')
      .forEach(cb => {

        cb.onchange = function () {

          const project =
            this.dataset.project;

          if (this.checked) {

            if (
              !S.aopProjects.includes(project)
            ) {
              S.aopProjects.push(project);
            }

          } else {

            S.aopProjects =
              S.aopProjects.filter(
                p => p !== project
              );
          }

          renderAOPProject();
        };
      });
  }

  /* ---------------- Create Focus/AOP tabs ---------------- */

  function createFocusAOPTabs() {

    const summaryTab =
      document.querySelector(
        '.tab[data-tab="project_summary"]'
      );

    if (!summaryTab) return;

    if (
      !document.querySelector(
        '.tab[data-tab="focus_project"]'
      )
    ) {

      const focusTab =
        document.createElement('button');

      focusTab.className = 'tab';
      focusTab.dataset.tab = 'focus_project';
      focusTab.textContent = 'Focus Project';

      const aopTab =
        document.createElement('button');

      aopTab.className = 'tab';
      aopTab.dataset.tab = 'aop_project';
      aopTab.textContent = 'AOP Project';

      summaryTab.insertAdjacentElement(
        'afterend',
        focusTab
      );

      focusTab.insertAdjacentElement(
        'afterend',
        aopTab
      );

      focusTab.onclick =
        () => PPsetTab('focus_project');

      aopTab.onclick =
        () => PPsetTab('aop_project');
    }
  }

  /* ---------------- Create Focus/AOP panels ---------------- */

  function createFocusAOPPanels() {

    const summaryPanel =
      document.getElementById(
        'panel-project_summary'
      );

    if (!summaryPanel) return;

    if (
      !document.getElementById(
        'panel-focus_project'
      )
    ) {

      const focusPanel =
        document.createElement('div');

      focusPanel.id =
        'panel-focus_project';

      focusPanel.className =
        summaryPanel.className;

      focusPanel.innerHTML = `
        <div class="card">
          <div class="sectionHead">
            <div>
              <h3>Focus Project</h3>
            </div>
          </div>

          <div class="tableWrap">
            <table id="tblFocusProject"></table>
          </div>
        </div>
      `;

      summaryPanel.insertAdjacentElement(
        'afterend',
        focusPanel
      );
    }

    if (
      !document.getElementById(
        'panel-aop_project'
      )
    ) {

      const focusPanel =
        document.getElementById(
          'panel-focus_project'
        );

      const aopPanel =
        document.createElement('div');

      aopPanel.id =
        'panel-aop_project';

      aopPanel.className =
        summaryPanel.className;

      aopPanel.innerHTML = `
        <div class="card">
          <div class="sectionHead">
            <div>
              <h3>AOP Project</h3>
            </div>
          </div>

          <div class="tableWrap">
            <table id="tblAOPProject"></table>
          </div>
        </div>
      `;

      focusPanel.insertAdjacentElement(
        'afterend',
        aopPanel
      );
    }
  }

  function emptyRow(span) {
    return `<tr>
      <td colspan="${span}"
        style="text-align:center;color:var(--muted-2);padding:26px">
        No rows match the current filters — relax the SM or status filter above.
      </td>
    </tr>`;
  }

  /* ---------------- charts ---------------- */
  let chRC, chLQ;

  function renderCharts() {

    const C = window.PPchart;

    const regs =
      D.regionSummary.filter(
        r => r.region !== 'Total'
      );

    const labels =
      regs.map(r => r.region);

    const hl =
      c =>
        regs.map(
          r =>
            r.region === S.city
              ? C.orange
              : c
        );

    const rc = {
      labels,

      datasets: [
        {
          label: 'Net Sales (₹ Cr)',
          data: regs.map(
            r =>
              +(r.ns / 1e7)
                .toFixed(2)
          ),
          backgroundColor:
            hl('rgba(36,35,34,.85)'),
          borderRadius: 6
        },

        {
          label: 'Total Cost (₹ Cr)',
          data: regs.map(
            r =>
              +(r.tc / 1e7)
                .toFixed(2)
          ),
          backgroundColor:
            regs.map(
              () => 'rgba(251,106,2,.5)'
            ),
          borderRadius: 6
        }
      ]
    };

    const lq = {
      labels,

      datasets: [
        {
          type: 'bar',
          label: 'Leads',
          data: regs.map(r => r.ml),
          backgroundColor:
            hl('rgba(36,35,34,.18)'),
          borderRadius: 6,
          yAxisID: 'y'
        },

        {
          type: 'line',
          label: 'QL',
          data: regs.map(r => r.ql),
          borderColor: C.orange,
          backgroundColor: C.orange,
          tension: .35,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    };

    const base = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      }
    };

    if (chRC) {

      chRC.data = rc;
      chRC.update();

    } else {

      chRC =
        new Chart(
          document.getElementById(
            'chRevCost'
          ),
          {
            type: 'bar',
            data: rc,
            options: {
              ...base,
              scales: {
                y: {
                  grid: {
                    color: '#EFF1F5'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }
          }
        );
    }

    if (chLQ) {

      chLQ.data = lq;
      chLQ.update();

    } else {

      chLQ =
        new Chart(
          document.getElementById(
            'chLeadsQL'
          ),
          {
            data: lq,
            options: {
              ...base,
              scales: {
                y: {
                  position: 'left',
                  grid: {
                    color: '#EFF1F5'
                  },
                  title: {
                    display: true,
                    text: 'Leads'
                  }
                },

                y1: {
                  position: 'right',
                  grid: {
                    drawOnChartArea: false
                  },
                  title: {
                    display: true,
                    text: 'QL'
                  }
                },

                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }
          }
        );
    }
  }

  /* ---------------- render all ---------------- */
  function renderAll() {

    if (S.tab === 'roi') {
      renderKPIs();
      renderRegionTable();
    }

    if (S.tab === 'sm') {
      renderManagerTable();
    }

    if (S.tab === 'project') {
      renderProjectPerf();
      renderCharts();
    }

    if (S.tab === 'project_summary') {
      renderProjectSummary();
    }

    if (S.tab === 'focus_project') {
      renderFocusProject();
    }

    if (S.tab === 'aop_project') {
      renderAOPProject();
    }
  }

  /* ---------------- initialize ---------------- */

  PPshell('index', null);

  createFocusAOPTabs();
  createFocusAOPPanels();

  PPsetTab(S.tab);

  renderAll();

  document.addEventListener(
    'pp:filters',
    renderAll
  );

})();
