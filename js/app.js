/* ============================================================
   PropertyPistol ROI Dashboard — shared shell & helpers (v2)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- filter state (URL-backed) ---------- */
  const q = new URLSearchParams(location.search);
  const getArr = k => { const v = q.getAll(k); return v.length ? v : []; };
  const S = window.PPState = {
    city:   getArr('city'),
    sm:     getArr('sm'),
    status: getArr('status'),
    projectStatus: getArr('projectStatus'),
    source: getArr('source'),
    developer: getArr('developer'),
    project: getArr('project'),
    subProject: getArr('subProject'),
    projectMarks: getArr('projectMarks'),
    from:   q.get('from')   || '2026-08-01',
    to:     q.get('to')     || '2026-08-31',
    tab:    q.get('tab')    || 'roi'
  };
  const qs = () => {
    const p = new URLSearchParams();
    ['city','sm','status','projectStatus','source','developer','project','subProject','projectMarks'].forEach(k => {
      if (S[k]) S[k].forEach(v => p.append(k, v));
    });
    p.set('from', S.from); p.set('to', S.to);
    return p.toString();
  };
  window.PPqs = qs;

  const CITIES = ['Chennai','Coimbatore','Gurgaon','Noida','Kerala','Pune','Mumbai','Bangalore','Hyderabad','Lucknow','Ahmedabad','Dubai'];
  const BLR_SMS = ['Sumit','Kishore/Sumit','Rupali','Kishore','Kishore/Rupali'];
  const PROJECT_STATUSES = ['Builtup','Sustenance','Realised','EOI Bankable','Non Bankable'];
  const SOURCES = (window.PP.sourceWise['All Regions'] || [])
      .filter(r => r.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .map(r => r.src);
  const DEVELOPERS = ['Lodha','Godrej','Prestige','Sobha'];
  const PROJECTS = ['Project Alpha', 'Project Beta', 'Project Gamma'];
  const SUB_PROJECTS = [
    'Sobha Hoskote', 'Provident Sunworth', 'Godrej Vanantara', 
    'Mana The Right Life', 'Godrej Aveline', 'Nikko Homes 8', 
    'Brigade Orchards', 'Ramky Fortuna', 'Brigade Eternia', 
    'B&M Solecrest', 'Assetz Meru & You', 'L&T Elara Celestia', 
    'Prestige Evergreen'
  ];

  function smsFor(cities) {
    let list = [];
    if (!cities || cities.length === 0) {
      list = window.PP.smWise.map(r => r.sm);
    } else {
      list = window.PP.smWise.filter(r => cities.includes(r.city)).map(r => r.sm);
      if (cities.includes('Bangalore')) list = list.concat(BLR_SMS);
    }
    return [...new Set(list)];
  }
  window.PPsmsFor = smsFor;

  /* ---------- formatting ---------- */
  const nfIN = new Intl.NumberFormat('en-IN');
  window.fmtN  = v => v == null ? '\u2014' : nfIN.format(Math.round(v || 0));
  window.fmtR  = v => '\u20B9' + nfIN.format(Math.round(v || 0));
  window.fmtCr = (v, d) => '\u20B9' + ((v || 0) / 1e7).toLocaleString('en-IN',
                   { maximumFractionDigits: d === undefined ? 2 : d }) + ' Cr';
  window.fmtL  = v => '\u20B9' + ((v || 0) / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' L';
  window.fmtPct = v => (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '%';
  window.ratio = (a, b) => b ? a / b : 0;

  window.pill = st => {
    const s = String(st || '').toLowerCase();
    if (s.startsWith('live'))  return '<span class="pill live">Live</span>';
    if (s.includes('hold'))    return '<span class="pill hold">Hold</span>';
    return '<span class="pill pause">Pause</span>';
  };
  const arrMatch = (val, arr) => {
    if (!arr || arr.length === 0) return true;
    const v = String(val || '').trim().toLowerCase();
    return arr.some(a => v === String(a).toLowerCase());
  };

  window.statusMatch = (rowStatus, filters) => {
    if (!filters || filters.length === 0) return true;
    const s = String(rowStatus || '').toLowerCase();
    return filters.some(f => {
      if (f === 'Live')  return s.startsWith('live');
      if (f === 'Hold')  return s.includes('hold');
      if (f === 'Pause') return !s.startsWith('live') && !s.includes('hold');
      return s === String(f).toLowerCase();
    });
  };

  window.projectStatusMatch = (rowValue, filters) => arrMatch(rowValue, filters);
  window.sourceMatch = (rowValue, filters) => arrMatch(rowValue, filters);
  window.developerMatch = (rowValue, filters) => arrMatch(rowValue, filters);
  window.projectMatch = (rowValue, filters) => arrMatch(rowValue, filters);
  window.subProjectMatch = (rowValue, filters) => arrMatch(rowValue, filters);

  /* ---------- icons ---------- */
  const IC = {
    grid:   '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    mega:   '<path d="m3 11 18-7-4 15-6.5-4.5L3 11z"/><path d="M10.5 14.5 9 20l3-2.5"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h4M2 10h20"/>',
    trend:  '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    file:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
    rupee:  '<path d="M6 3h12M6 8h12M6 3c6 0 8 2 8 5s-2 5-8 5l8 8"/>',
    home:   '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z"/><path d="M9 22V12h6v10"/>',
    tag:    '<path d="M12 2H2v10l9.3 9.3a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8L12 2z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    check:  '<circle cx="12" cy="12" r="10"/><path d="m8 12.5 3 3 5-6"/>',
    pin:    '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    pct:    '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'
  };
  window.PPicon = (name, cls) =>
    `<svg class="${cls || 'ic'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[name] || IC.grid}</svg>`;

  /* ---------- toast ---------- */
  let toastEl;
  window.toast = msg => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  };

  /* ---------- exports ---------- */
  window.exportTableCSV = (tableEl, filename) => {
    if (!tableEl) { toast('Nothing to export on this view'); return; }
    const rows = [...tableEl.querySelectorAll('tr')].map(tr =>
      [...tr.querySelectorAll('th,td')].map(c => {
        let t = c.innerText.replace(/\s+/g, ' ').trim().replace(/"/g, '""');
        return '"' + t + '"';
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    
  };
  window.exportVisibleTable = filename => {
    const panel = document.querySelector('.tab-panel.active') || document;
    exportTableCSV(panel.querySelector('table.tbl'), filename);
  };

  /* ---------- brand logo ----------
     Official asset hotlinked from propertypistol.com (renders on any
     hosted deployment / normal browser). Sandboxed previews block
     external images, so an inline brand-accurate wordmark takes over. */
  const LOGO_URL = 'https://www.propertypistol.com/_ipx/s_248x58/images/pp-light-logo-updated.svg';
  const FALLBACK_WORDMARK =
    '<svg class="brand-fallback" viewBox="0 0 248 58" xmlns="http://www.w3.org/2000/svg" aria-label="PropertyPistol">' +
      '<g fill="none" stroke="#FB6A02" stroke-width="3">' +
        '<circle cx="26" cy="29" r="17"/>' +
        '<circle cx="26" cy="29" r="8"/>' +
        '<path d="M26 5v7M26 46v7M2 29h7M43 29h7" stroke-linecap="round"/>' +
      '</g>' +
      '<circle cx="26" cy="29" r="3" fill="#FB6A02"/>' +
      '<text x="58" y="37" font-family="Inter,system-ui,sans-serif" font-size="23" font-weight="800" letter-spacing="-0.5">' +
        '<tspan fill="#FFFFFF">Property</tspan><tspan fill="#FB6A02">Pistol</tspan>' +
      '</text>' +
    '</svg>';
  window.PPlogoFallback = img => { img.outerHTML = FALLBACK_WORDMARK; };

  /* ---------- shell templates ---------- */
  const NAV = [
    { label: 'ROI Summary',          href: 'index.html',    tab: 'roi',     icon: 'grid' },
    { label: 'SM / Manager View',    href: 'index.html',    tab: 'sm',      icon: 'users' },
    { label: 'Project Performance',  href: 'index.html',    tab: 'project', icon: 'layers' },
    { label: 'Campaign Performance', href: 'campaign.html',                 icon: 'mega' },
    { label: 'Budget vs Actual',     href: 'budget.html',                   icon: 'wallet' },
    { label: 'Trends & Insights',    href: 'trends.html',                   icon: 'trend' },
    { label: 'Reports',              href: 'reports.html',                  icon: 'file' }
  ];

  function renderSidebar(page) {
    const el = document.getElementById('sidebar');
    if (!el) return;
    const links = NAV.map(n => {
      const isIndex = n.href === 'index.html';
      const active = isIndex
        ? (page === 'index' && S.tab === n.tab)
        : page === n.href.replace('.html', '');
      const href = n.href + '?' + qs() + (n.tab ? '&tab=' + n.tab : '');
      return `<a href="${href}" class="${active ? 'active' : ''}" data-tab="${n.tab || ''}">
                ${PPicon(n.icon)}${n.label}</a>`;
    }).join('');
    el.innerHTML = `
      <div class="brand">
        <img class="brand-img" src="${LOGO_URL}" alt="PropertyPistol" onerror="PPlogoFallback(this)">
      </div>
      <div class="brand-sub">ROI DASHBOARD</div>
      <div class="brand-tag">Marketing performance & spends</div>
      <div class="side-div"></div>
      <nav class="nav">${links}</nav>
      <div class="side-foot"><b>Daily ROI Report (MIS)</b> + Spend Tracker<br>Snapshot: ${window.PP.meta.snapshot} \u00b7 Aug MTD</div>`;

    if (page === 'index') {
      el.querySelectorAll('.nav a').forEach(a => {
        if (a.dataset.tab) {
          a.addEventListener('click', ev => {
            ev.preventDefault();
            window.PPsetTab && window.PPsetTab(a.dataset.tab);
          });
        } else if (window.PPSINGLE) {
          a.addEventListener('click', ev => {
            ev.preventDefault();
            toast('This section lives in the multi-page build \u2014 open the full folder.');
          });
        }
      });
    }
  }

  function renderTopbar(page, title) {
    const el = document.getElementById('topbar');
    if (!el) return;
    el.innerHTML = `
      <button class="menu-btn" id="menuBtn" aria-label="Toggle menu">\u2630</button>
      <div>
        <div class="crumbs" id="crumbs"></div>
        <div class="page-title" id="pageTitle"></div>
      </div>
      <div class="top-actions">
               <button class="btn accent" id="btnXLS">Export Excel</button>
      </div>`;
        exportVisibleTable(('pp_roi_' + (S.city || 'all') + '_' + page + '.csv').replace(/\s+/g, '_').toLowerCase());
    updateHeadings(page, title);
  }

  function updateHeadings(page, title) {
    const secByTab = { roi: 'ROI Summary', sm: 'SM / Manager View', project: 'Project Performance' };
    const section = page === 'index' ? secByTab[S.tab] || 'ROI Summary' : (title || '');
    document.getElementById('crumbs').innerHTML =
      `<span class="sec">${section}</span> / <b>${S.city}</b> / ${S.sm}`;
    const prefix = page === 'index'
      ? (S.sm !== 'All SM' ? S.sm : S.city)
      : S.city;
    document.getElementById('pageTitle').textContent = prefix + ' \u2013 ' + (title || section);
  }
  window.PPupdateHeadings = updateHeadings;

  function renderFilters() {
    const el = document.getElementById('filters');
    if (!el) return;
    
    const mkOpts = (opts, selArr) => opts.map(o => `<option value="${o}" ${(selArr||[]).includes(o) ? 'selected' : ''}>${o}</option>`).join('');

    el.innerHTML = `
      <div class="f-group"><label>Date Range</label>
        <input type="text" id="fDateRange" class="form-control" style="width:100%; height:38px; border:1px solid #DDE1E8; border-radius:9px; background:#FBFCFD; padding:0 11px; font-size:12.8px; font-weight:600; color:#111; cursor:pointer;" readonly />
      </div>
      <div class="f-group"><label for="fCity">Select City</label>
        <select id="fCity" multiple="multiple">${mkOpts(CITIES, S.city)}</select></div>
      <div class="f-group"><label for="fSM">SM Name</label>
        <select id="fSM" multiple="multiple"></select></div>
      <div class="f-group"><label for="fStatus">Campaign Status</label>
        <select id="fStatus" multiple="multiple">${mkOpts(['Live','Pause','Hold'], S.status)}</select></div>
      <div class="f-group"><label for="fProjectStatus">Project Status</label>
        <select id="fProjectStatus" multiple="multiple">${mkOpts(PROJECT_STATUSES, S.projectStatus)}</select></div>
      <div class="f-group"><label for="fSource">Source</label>
        <select id="fSource" multiple="multiple">${mkOpts(SOURCES, S.source)}</select></div>
      <div class="f-group"><label for="fDeveloper">Developer</label>
        <select id="fDeveloper" multiple="multiple">${mkOpts(DEVELOPERS, S.developer)}</select></div>
      <div class="f-group"><label for="fProject">Project</label>
        <select id="fProject" multiple="multiple">${mkOpts(PROJECTS, S.project)}</select></div>
      <div class="f-group"><label for="fSubProject">Sub Project</label>
        <select id="fSubProject" multiple="multiple">${mkOpts(SUB_PROJECTS, S.subProject)}</select></div>
      <div class="f-group"><label for="fProjectMarks">Project Marks</label>
        <select id="fProjectMarks" multiple="multiple">${mkOpts(['Focus Project','AOP Project'], S.projectMarks)}</select></div>
    `;

    function fillSM() {
      const sel = el.querySelector('#fSM');
      const valid = smsFor(S.city);
      S.sm = (S.sm||[]).filter(sm => valid.includes(sm));
      sel.innerHTML = mkOpts(valid, S.sm);
      if ($(sel).hasClass('select2-hidden-accessible')) {
        $(sel).trigger('change.select2');
      }
    }
    fillSM();

    // Initialize Select2
    $('#fCity, #fSM, #fStatus, #fProjectStatus, #fSource, #fDeveloper, #fProject, #fSubProject, #fProjectMarks').select2({
      placeholder: "All",
      allowClear: true,
      width: '100%'
    }).on('change', function(e) {
      const id = e.target.id;
      const val = $(this).val() || [];
      if (id === 'fCity') { S.city = val; fillSM(); emit(); }
      if (id === 'fSM') { S.sm = val; emit(); }
      if (id === 'fStatus') { S.status = val; emit(); }
      if (id === 'fProjectStatus') { S.projectStatus = val; emit(); }
      if (id === 'fSource') { S.source = val; emit(); }
      if (id === 'fDeveloper') { S.developer = val; emit(); }
      if (id === 'fProject') { S.project = val; emit(); }
      if (id === 'fSubProject') { S.subProject = val; emit(); }
      if (id === 'fProjectMarks') { S.projectMarks = val; emit(); }
    });

    // Initialize Daterangepicker
    $('#fDateRange').daterangepicker({
      startDate: moment(S.from),
      endDate: moment(S.to),
      ranges: {
         'Today': [moment(), moment()],
         'Last 7 Days': [moment().subtract(6, 'days'), moment()],
         'Last 15 Days': [moment().subtract(14, 'days'), moment()],
         'Last 30 Days': [moment().subtract(29, 'days'), moment()],
         'This Month': [moment().startOf('month'), moment().endOf('month')]
      },
      locale: { format: 'YYYY-MM-DD' }
    }, function(start, end) {
      S.from = start.format('YYYY-MM-DD');
      S.to = end.format('YYYY-MM-DD');
      emit();
      toast('Period updated \u2014 figures reflect the 5 Aug 2026 MIS snapshot');
    });
  }

  function emit() {
    history.replaceState(null, '', location.pathname + '?' + qs() + (S.tab ? '&tab=' + S.tab : ''));
    document.dispatchEvent(new CustomEvent('pp:filters'));
  }

  /* ---------- chart defaults ---------- */
  window.PPchart = {
    orange: '#FB6A02', orangeSoft: 'rgba(251,106,2,.15)',
    ink: '#242322', inkSoft: 'rgba(36,35,34,.75)',
    green: '#0E8A4C', red: '#D92D20', gray: '#C6CBD4',
    palette: ['#FB6A02', '#242322', '#F5A25D', '#6B7280', '#0E8A4C', '#08224A', '#D92D20', '#B9BEC8']
  };
  if (window.Chart) {
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#667085';
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.boxHeight = 12;
  }

  /* ---------- boot ---------- */
  window.PPshell = function (page, title) {
    renderSidebar(page);
    renderTopbar(page, title);
    renderFilters();
    document.addEventListener('pp:filters', () => {
      renderSidebar(page);
      updateHeadings(page, title);
    });
  };
})();
