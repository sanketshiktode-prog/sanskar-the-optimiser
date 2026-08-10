/* ============================================================
   PropertyPistol ROI Dashboard — shared shell & helpers (v2)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- filter state (URL-backed) ---------- */
  const q = new URLSearchParams(location.search);
  const L = v => window.PPparseList(v);
  const S = window.PPState = {
    scope:  q.get('scope')  || 'All Regions',       // login-level region scope
    cities: L(q.get('city')),
    managers: L(q.get('sm')),
    sources: L(q.get('src')),
    devs:   L(q.get('dev')),
    projStatus: L(q.get('pstatus')),
    realisation: L(q.get('real')),
    projects: L(q.get('proj')),
    status: q.get('status') || 'All Status',        // campaign status (single)
    star:   q.get('star') === '1',
    period: q.get('period') || 'all',
    from:   q.get('from')   || '2026-08-01',
    to:     q.get('to')     || '2026-08-31',
    tab:    q.get('tab')    || 'roi'
  };
  const SER = window.PPserialise;
  const qs = () => {
    const p = new URLSearchParams();
    p.set('scope', S.scope);
    p.set('city', SER(S.cities)); p.set('sm', SER(S.managers)); p.set('src', SER(S.sources));
    p.set('dev', SER(S.devs));    p.set('pstatus', SER(S.projStatus)); p.set('real', SER(S.realisation));
    p.set('proj', SER(S.projects));
    p.set('status', S.status); p.set('star', S.star ? '1' : '0'); p.set('period', S.period);
    p.set('from', S.from); p.set('to', S.to);
    return p.toString();
  };
  window.PPqs = qs;
  // Query object consumed by PPquery / PPprojects / PPoptions.
  window.PPq = () => ({
    cities: S.cities, managers: S.managers, sources: S.sources, devs: S.devs,
    status: S.projStatus, realisation: S.realisation, projects: S.projects,
    star: S.star, campStatus: S.status, period: S.period
  });
  // Human label for whatever region set is active.
  window.PPcityLabel = () => {
    const sc = window.PPscope();
    if (S.cities && S.cities.length === 1) return S.cities[0];
    if (S.cities && S.cities.length) return S.cities.length + ' regions';
    return sc ? sc[0] : 'All Regions';
  };

  const CITIES = ['All Regions','Chennai','Coimbatore','Gurgaon','Noida','Kerala','Pune',
                  'Mumbai','Bangalore','Hyderabad','Lucknow','Ahmedabad','Dubai'];
  const BLR_SMS = ['All SM','Sumit','Kishore/Sumit','Rupali','Kishore','Kishore/Rupali'];

  function smsFor(city) {
    if (city === 'Bangalore') return BLR_SMS.slice();
    if (city === 'All Regions') return ['All SM'].concat([...new Set(window.PP.smWise.map(r => r.sm))]);
    return ['All SM'].concat([...new Set(window.PP.smWise.filter(r => r.city === city).map(r => r.sm))]);
  }
  window.PPsmsFor = smsFor;
  // Legacy single-value accessors so the Bangalore-scoped pages keep working.
  Object.defineProperty(S, 'city', { get: () => (S.cities && S.cities.length === 1) ? S.cities[0] : 'All Regions' });
  Object.defineProperty(S, 'sm',   { get: () => (S.managers && S.managers.length === 1) ? S.managers[0] : 'All SM' });
  Object.defineProperty(S, 'source', { get: () => (S.sources && S.sources.length === 1) ? S.sources[0] : 'All Sources' });

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
  window.statusMatch = (rowStatus, filter) => {
    if (filter === 'All Status') return true;
    const s = String(rowStatus || '').toLowerCase();
    if (filter === 'Live')  return s.startsWith('live');
    if (filter === 'Hold')  return s.includes('hold');
    if (filter === 'Pause') return !s.startsWith('live') && !s.includes('hold');
    return true;
  };

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
    a.download = filename || 'roi_export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Excel (CSV) downloaded');
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
        <button class="btn" id="btnPDF">Export PDF</button>
        <button class="btn accent" id="btnXLS">Export Excel</button>
      </div>`;
    document.getElementById('menuBtn').onclick = () =>
      document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('btnPDF').onclick = () => window.print();
    document.getElementById('btnXLS').onclick = () =>
      exportVisibleTable(('pp_roi_' + (S.city || 'all') + '_' + page + '.csv').replace(/\s+/g, '_').toLowerCase());
    updateHeadings(page, title);
  }

  function updateHeadings(page, title) {
    const secByTab = { roi: 'ROI Summary', sm: 'SM / Manager View', project: 'Project Performance' };
    const section = page === 'index' ? secByTab[S.tab] || 'ROI Summary' : (title || '');
    const cityLbl = window.PPcityLabel();
    const smLbl = (S.managers && S.managers.length === 1) ? S.managers[0]
                : (S.managers && S.managers.length) ? S.managers.length + ' SMs' : 'All SM';
    document.getElementById('crumbs').innerHTML =
      `<span class="sec">${section}</span> / <b>${cityLbl}</b> / ${smLbl} / ${window.PPperiod(S.period).label}`;
    const prefix = page === 'index' ? (smLbl !== 'All SM' ? smLbl : cityLbl) : cityLbl;
    document.getElementById('pageTitle').textContent = prefix + ' \u2013 ' + (title || section);
  }
  window.PPupdateHeadings = updateHeadings;

  /* ---------- multi-select control ---------- */
  let msSeq = 0;
  function multiSelect(host, cfg) {
    const id = 'ms' + (++msSeq);
    const sel = new Set(cfg.value || []);
    const opts = cfg.options;
    host.innerHTML = `
      <label>${cfg.label}</label>
      <div class="ms" id="${id}">
        <button type="button" class="ms-btn"></button>
        <div class="ms-pop">
          ${opts.length > 8 ? `<input class="ms-search" placeholder="Search ${cfg.label.toLowerCase()}...">` : ''}
          <div class="ms-acts"><button data-a="all">Select all</button><button data-a="none">Clear</button></div>
          <div class="ms-list"></div>
        </div>
      </div>`;
    const root = host.querySelector('#' + id);
    const btn = root.querySelector('.ms-btn');
    const list = root.querySelector('.ms-list');
    const search = root.querySelector('.ms-search');

    function label() {
      if (!sel.size) return cfg.allLabel;
      if (sel.size === 1) return [...sel][0];
      return `${cfg.allLabel.replace(/^All /, '')} <span class="cnt">${sel.size}</span>`;
    }
    function paint() {
      btn.innerHTML = label();
      const term = (search && search.value || '').toLowerCase();
      const shown = opts.filter(o => !term || o.toLowerCase().includes(term));
      list.innerHTML = shown.length
        ? shown.slice(0, 300).map(o =>
            `<label class="ms-opt"><input type="checkbox" value="${o.replace(/"/g, '&quot;')}" ${sel.has(o) ? 'checked' : ''}><span title="${o.replace(/"/g, '&quot;')}">${o}</span></label>`).join('')
        : '<div class="ms-empty">No matches</div>';
    }
    function commit() { cfg.onChange(sel.size ? [...sel] : null); }

    btn.onclick = e => {
      e.stopPropagation();
      document.querySelectorAll('.ms.open').forEach(m => { if (m !== root) m.classList.remove('open'); });
      root.classList.toggle('open');
      if (root.classList.contains('open') && search) search.focus();
    };
    root.querySelector('.ms-pop').onclick = e => e.stopPropagation();
    if (search) search.oninput = paint;
    list.onchange = e => {
      if (e.target.type !== 'checkbox') return;
      e.target.checked ? sel.add(e.target.value) : sel.delete(e.target.value);
      btn.innerHTML = label();
      commit();
    };
    root.querySelectorAll('.ms-acts button').forEach(b => b.onclick = () => {
      sel.clear();
      if (b.dataset.a === 'all') opts.forEach(o => sel.add(o));
      paint(); commit();
    });
    paint();
  }
  document.addEventListener('click', () => document.querySelectorAll('.ms.open').forEach(m => m.classList.remove('open')));

  /* ---------- filter bar ---------- */
  function renderFilters() {
    const el = document.getElementById('filters');
    if (!el) return;
    el.innerHTML = `
      <div class="f-group" id="fgCity"></div>
      <div class="f-group" id="fgSM"></div>
      <div class="f-group" id="fgSource"></div>
      <div class="f-group" id="fgDev"></div>
      <div class="f-group" id="fgPStatus"></div>
      <div class="f-group" id="fgReal"></div>
      <div class="f-group" id="fgProj"></div>
      <div class="f-group"><label for="fStatus">Campaign Status</label>
        <select id="fStatus">${['All Status','Live','Pause','Hold'].map(x => `<option ${x === S.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="f-group" style="grid-column:1/-1">
        <label>Period</label>
        <div class="periods" id="fPeriods">
          ${window.PPperiods.map(p => `<button class="per ${p.id === S.period ? 'active' : ''}" data-p="${p.id}">${p.label}</button>`).join('')}
          <span class="per-note" id="perNote"></span>
          <span style="flex:1"></span>
          <label class="toggle ${S.star ? 'on' : ''}" id="starTog">
            <input type="checkbox" id="fStar" ${S.star ? 'checked' : ''}> Focus / Star projects only</label>
          <span class="daterange">
            <input type="date" id="fFrom" value="${S.from}"><span>&ndash;</span><input type="date" id="fTo" value="${S.to}">
          </span>
        </div>
      </div>
      <div class="f-group" style="grid-column:1/-1"><div class="chips" id="fChips"></div></div>`;

    multiSelect(document.getElementById('fgCity'),    { label: 'Region', allLabel: 'All Regions', options: PPoptions('cities'), value: S.cities, onChange: v => { S.cities = v; emit(); } });
    multiSelect(document.getElementById('fgSM'),      { label: 'SM / Manager', allLabel: 'All SM', options: PPoptions('managers'), value: S.managers, onChange: v => { S.managers = v; emit(); } });
    multiSelect(document.getElementById('fgSource'),  { label: 'Source', allLabel: 'All Sources', options: PPoptions('sources'), value: S.sources, onChange: v => { S.sources = v; emit(); } });
    multiSelect(document.getElementById('fgDev'),     { label: 'Developer', allLabel: 'All Developers', options: PPoptions('developers'), value: S.devs, onChange: v => { S.devs = v; emit(); } });
    multiSelect(document.getElementById('fgPStatus'), { label: 'Project Status', allLabel: 'All Project Status', options: PPoptions('status'), value: S.projStatus, onChange: v => { S.projStatus = v; emit(); } });
    multiSelect(document.getElementById('fgReal'),    { label: 'Realisation', allLabel: 'All Realisation', options: PPoptions('realisation'), value: S.realisation, onChange: v => { S.realisation = v; emit(); } });
    multiSelect(document.getElementById('fgProj'),    { label: 'Project', allLabel: 'All Projects', options: PPoptions('projects'), value: S.projects, onChange: v => { S.projects = v; emit(); } });

    el.querySelector('#fStatus').onchange = e => { S.status = e.target.value; emit(); };
    el.querySelector('#fStar').onchange = e => { S.star = e.target.checked; emit(); };
    el.querySelectorAll('.per').forEach(b => b.onclick = () => { S.period = b.dataset.p; emit(); });
    el.querySelector('#perNote').textContent = window.PPperiod(S.period).note;
    el.querySelector('#fFrom').onchange = e => { S.from = e.target.value; emit(); };
    el.querySelector('#fTo').onchange = e => { S.to = e.target.value; emit(); };
    renderChips();
  }

  function renderChips() {
    const box = document.getElementById('fChips');
    if (!box) return;
    const groups = [
      ['Region', S.cities, v => S.cities = v], ['SM', S.managers, v => S.managers = v],
      ['Source', S.sources, v => S.sources = v], ['Developer', S.devs, v => S.devs = v],
      ['Status', S.projStatus, v => S.projStatus = v], ['Realisation', S.realisation, v => S.realisation = v],
      ['Project', S.projects, v => S.projects = v]
    ];
    let html = '';
    groups.forEach(([name, list], gi) => {
      if (!list) return;
      list.slice(0, 4).forEach((v, i) => {
        html += `<span class="chip"><b>${name}:</b> ${v}<button data-g="${gi}" data-i="${i}" title="Remove">&times;</button></span>`;
      });
      if (list.length > 4) html += `<span class="chip">+${list.length - 4} more ${name.toLowerCase()}</span>`;
    });
    if (S.star) html += `<span class="chip"><b>Focus / Star only</b><button data-star="1">&times;</button></span>`;
    if (html) html += `<span class="chip clear" id="clearAll">Clear all filters</span>`;
    box.innerHTML = html;
    box.querySelectorAll('button[data-g]').forEach(b => b.onclick = () => {
      const [name, list, setter] = groups[+b.dataset.g];
      const next = list.filter((_, i) => i !== +b.dataset.i);
      setter(next.length ? next : null); emit();
    });
    const st = box.querySelector('button[data-star]');
    if (st) st.onclick = () => { S.star = false; emit(); };
    const ca = box.querySelector('#clearAll');
    if (ca) ca.onclick = () => {
      S.cities = S.managers = S.sources = S.devs = S.projStatus = S.realisation = S.projects = null;
      S.star = false; S.status = 'All Status'; emit();
    };
  }

  /* ---------- region (login) scope bar ---------- */
  function renderScope() {
    const el = document.getElementById('scopebar');
    if (!el) return;
    const regions = ['All Regions'].concat(window.PP.dims.cities);
    el.innerHTML = `
      <span class="lbl">Viewing as</span>
      <select id="fScope">${regions.map(r => `<option ${r === S.scope ? 'selected' : ''}>${r === 'All Regions' ? 'National (all regions)' : r + ' - regional sales'}</option>`).join('')}</select>
      <span class="warn">Regional view hides other regions everywhere. View shaping only &mdash; not a security boundary.</span>`;
    el.querySelector('#fScope').onchange = e => {
      const v = e.target.value;
      S.scope = v.startsWith('National') ? 'All Regions' : v.split(' - ')[0];
      S.cities = S.managers = S.projects = null;
      emit(); renderFilters();
    };
  }
  window.PPrenderScope = renderScope;

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
    renderScope();
    renderFilters();
    document.addEventListener('pp:filters', () => {
      renderSidebar(page);
      updateHeadings(page, title);
      renderChips();
      const pn = document.getElementById('perNote');
      if (pn) pn.textContent = window.PPperiod(S.period).note;
      document.querySelectorAll('.per').forEach(b => b.classList.toggle('active', b.dataset.p === S.period));
      const stg = document.getElementById('starTog');
      if (stg) stg.classList.toggle('on', S.star);
    });
  };
})();
