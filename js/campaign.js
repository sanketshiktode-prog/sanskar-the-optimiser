/* Campaign Performance — Source Wise Report + source charts + campaign register */
(function () {
  'use strict';
  const D = window.PP, S = window.PPState, C = window.PPchart;

  const cityKey = () => S.city === 'All Regions' ? 'All Regions' : S.city;
  const srcRows = () => (D.sourceWise[cityKey()] || []);

  /* ---------------- Source Wise Report ---------------- */
  function renderSource() {
    const cols = ['Source', 'Total Cost', 'Total Leads', 'CPL', 'Aug MTD Cost', 'Aug MTD Leads', 'Aug CPL', 'QL', 'CPQL', 'SV Done'];
    const rows = srcRows();
    const body = rows.map(r => {
      const qlOnly = !r.cost && !r.leads && (r.ql || r.sv);
      return `<tr${qlOnly ? ' class="dim"' : ''}>
        <td>${r.src}</td>
        <td>${fmtR(r.cost)}</td><td>${fmtN(r.leads)}</td>
        <td>${r.leads ? fmtR(r.cost / r.leads) : '\u2014'}</td>
        <td>${fmtR(r.augCost)}</td><td>${fmtN(r.augLeads)}</td>
        <td>${r.augLeads ? fmtR(r.augCost / r.augLeads) : '\u2014'}</td>
        <td>${fmtN(r.ql)}</td>
        <td>${r.ql && r.cost ? fmtR(r.cost / r.ql) : '\u2014'}</td>
        <td>${fmtN(r.sv)}</td></tr>`;
    }).join('');
    const t = rows.reduce((a, r) => ({ cost: a.cost + r.cost, leads: a.leads + r.leads, ac: a.ac + r.augCost, al: a.al + r.augLeads, ql: a.ql + r.ql, sv: a.sv + r.sv }), { cost: 0, leads: 0, ac: 0, al: 0, ql: 0, sv: 0 });
    const totals = rows.length ? `<tr class="total"><td>Total</td>
      <td>${fmtR(t.cost)}</td><td>${fmtN(t.leads)}</td><td>${t.leads ? fmtR(t.cost / t.leads) : '\u2014'}</td>
      <td>${fmtR(t.ac)}</td><td>${fmtN(t.al)}</td><td>${t.al ? fmtR(t.ac / t.al) : '\u2014'}</td>
      <td>${fmtN(t.ql)}</td><td>${t.ql ? fmtR(t.cost / t.ql) : '\u2014'}</td><td>${fmtN(t.sv)}</td></tr>` : '';
    document.getElementById('tblSource').innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' +
      '<tbody>' + (body || `<tr><td colspan="10" style="text-align:center;color:var(--muted-2);padding:26px">No source rows for this selection.</td></tr>`) + totals + '</tbody>';
    document.getElementById('srcTitle').textContent = cityKey() + ' \u2013 Source Wise Report';
    document.getElementById('srcNote').innerHTML =
      'Cost and leads per source come from the MIS <b>Table</b> (write-off rows excluded), so the Total row ties exactly to the ' +
      (S.city === 'All Regions' ? 'all-region' : S.city) + ' figures on the ROI Summary. QL and SV per source come from the Spend Tracker <b>QL LEADS DATA</b> sheet. ' +
      '<b>(blank)</b> groups rows with no Source recorded in the MIS (organic / CRM entries) \u2014 exactly as the Excel pivot shows them. Greyed rows carry QL/SV without mapped media cost; both are kept so the totals tie and no lead or QL is dropped.';
  }

  /* ---------------- charts ---------------- */
  let chMix, chLeads;
  function renderCharts() {
    const data = srcRows().filter(r => r.cost > 0).slice(0, 8);
    const labels = data.map(r => r.src);
    document.getElementById('mixSub').textContent = cityKey() + ' \u00b7 share of full-period spend (top 8)';
    document.getElementById('leadSub').textContent = cityKey() + ' \u00b7 full-period leads by source (top 8 by spend)';
    const mix = { labels, datasets: [{ data: data.map(r => +r.cost.toFixed(0)), backgroundColor: C.palette, borderWidth: 2, borderColor: '#fff' }] };
    const leads = { labels, datasets: [{ label: 'Leads', data: data.map(r => r.leads), backgroundColor: labels.map((_, i) => i === 0 ? C.orange : 'rgba(36,35,34,.78)'), borderRadius: 8 }] };
    const opt = { responsive: true, maintainAspectRatio: false };
    if (chMix) { chMix.data = mix; chMix.update(); }
    else chMix = new Chart(document.getElementById('chMix'), { type: 'doughnut', data: mix, options: { ...opt, cutout: '58%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtR(c.parsed) } } } } });
    if (chLeads) { chLeads.data = leads; chLeads.update(); }
    else chLeads = new Chart(document.getElementById('chLeads'), { type: 'bar', data: leads, options: { ...opt, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#EFF1F5' } }, y: { grid: { display: false } } } } });
  }

  /* ---------------- campaign register ---------------- */
  function renderTable() {
    const cols = ['Campaign', 'Source', 'Project', 'Status', 'Aug MTD Cost', 'Aug MTD Leads', 'Aug CPL'];
    const isBlr = S.city === 'Bangalore' || S.city === 'All Regions';
    const rows = isBlr ? D.campaigns.filter(c => statusMatch(c.status, S.status) && sourceMatch(c.source, S.source)) : [];
    const body = rows.map(c => `<tr>
        <td style="white-space:normal;min-width:260px">${c.campaign}</td>
        <td style="text-align:left">${c.source}</td>
        <td style="text-align:left">${c.project.replace(' Bangalore', '')}</td>
        <td>${pill(c.status)}</td>
        <td>${fmtR(c.cost)}</td><td>${fmtN(c.leads)}</td>
        <td>${c.leads ? fmtR(c.cost / c.leads) : '\u2014'}</td></tr>`).join('');
    const t = rows.reduce((a, c) => ({ cost: a.cost + c.cost, leads: a.leads + c.leads }), { cost: 0, leads: 0 });
    const totals = rows.length ? `<tr class="total"><td>Total</td><td></td><td></td><td></td><td>${fmtR(t.cost)}</td><td>${fmtN(t.leads)}</td><td>${t.leads ? fmtR(t.cost / t.leads) : '\u2014'}</td></tr>` : '';
    document.getElementById('tblCamp').innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' +
      '<tbody>' + (body || `<tr><td colspan="7" style="text-align:center;color:var(--muted-2);padding:26px">The campaign register is mapped for Bangalore in this snapshot \u2014 switch city to Bangalore or All Regions.</td></tr>`) + totals + '</tbody>';
    document.getElementById('campTitle').textContent = (isBlr ? 'Bangalore' : S.city) + ' \u2013 Campaign Register';
    document.getElementById('campNote').innerHTML = 'Register from the MIS <b>Live Campaign</b> sheet; Aug MTD cost &amp; leads joined per project + source from the Daily ROI Report (snapshot 5 Aug 2026).';
  }

  function renderAll() { renderSource(); renderCharts(); renderTable(); }
  PPshell('campaign', 'Campaign Performance');
  renderAll();
  document.addEventListener('pp:filters', renderAll);
})();
