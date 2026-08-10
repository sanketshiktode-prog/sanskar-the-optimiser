/* Budget vs Actual — three-section city budgets from Spend Tracker Aug-26 */
(function () {
  'use strict';
  const D = window.PP, S = window.PPState, C = window.PPchart;

  function table(elId, rows, revLabel, revIsEOI) {
    const cols = ['City', 'Total Budget', 'Budget Spent', 'Utilisation', revLabel, 'QL Aligned', 'MTD QL', 'MTD DQL', 'Total MTD QL', 'Target CPQL', 'MTD CPQL'];
    const body = rows.map(r => {
      const isTotal = r.city === 'Total';
      const pct = r.budget ? r.spent / r.budget * 100 : 0;
      const cls = isTotal ? 'total' : (r.city === S.city ? 'hl' : '');
      return `<tr class="${cls}">
        <td>${r.city}</td>
        <td>${fmtR(r.budget)}</td><td>${fmtR(r.spent)}</td>
        <td><span class="prog"><i style="width:${Math.min(100, pct)}%" class="${pct > 100 ? 'over' : ''}"></i></span>${pct.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%</td>
        <td>${revIsEOI ? fmtN(r.targetRev) + ' EOI' : fmtR(r.targetRev)}</td>
        <td>${fmtN(r.qlAligned)}</td><td>${fmtN(r.mtdQL)}</td><td>${fmtN(r.mtdDQL)}</td><td>${fmtN(r.totMtdQL)}</td>
        <td>${r.qlAligned ? fmtR(r.budget / r.qlAligned) : '\u2014'}</td>
        <td>${r.totMtdQL ? fmtR(r.spent / r.totMtdQL) : '\u2014'}</td></tr>`;
    }).join('');
    document.getElementById(elId).innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' + body + '</tbody>';
  }

  let chBud, chUtil;
  function renderCharts() {
    const rows = D.budget.ls.filter(r => r.city !== 'Total');
    const labels = rows.map(r => r.city);
    const hi = base => rows.map(r => r.city === S.city ? C.orange : base);
    const bud = {
      labels,
      datasets: [
        { label: 'Budget', data: rows.map(r => r.budget), backgroundColor: 'rgba(36,35,34,.22)', borderRadius: 6 },
        { label: 'Spent', data: rows.map(r => r.spent), backgroundColor: hi('rgba(251,106,2,.8)'), borderRadius: 6 }
      ]
    };
    const util = {
      labels,
      datasets: [{ label: 'Utilisation %', data: rows.map(r => +(r.budget ? r.spent / r.budget * 100 : 0).toFixed(1)), backgroundColor: hi('rgba(36,35,34,.8)'), borderRadius: 8 }]
    };
    const opt = { responsive: true, maintainAspectRatio: false };
    if (chBud) { chBud.data = bud; chBud.update(); }
    else chBud = new Chart(document.getElementById('chBud'), { type: 'bar', data: bud, options: { ...opt, scales: { y: { grid: { color: '#EFF1F5' }, ticks: { callback: v => fmtL(v) } }, x: { grid: { display: false } } }, plugins: { tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmtR(c.parsed.y) } } } } });
    if (chUtil) { chUtil.data = util; chUtil.update(); }
    else chUtil = new Chart(document.getElementById('chUtil'), { type: 'bar', data: util, options: { ...opt, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#EFF1F5' }, ticks: { callback: v => v + '%' } }, y: { grid: { display: false } } } } });
  }

  function renderAll() {
    table('tblLS', D.budget.ls, 'Target Revenue', false);
    table('tblUP', D.budget.unplanned, 'Target Revenue', false);
    table('tblBU', D.budget.builtup, 'Target EOI', true);
    renderCharts();
  }
  PPshell('budget', 'Budget vs Actual');
  renderAll();
  document.addEventListener('pp:filters', renderAll);
})();
