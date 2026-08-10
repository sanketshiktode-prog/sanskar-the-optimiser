/* Trends & Insights — monthly trajectory + computed insight cards */
(function () {
  'use strict';
  const D = window.PP, C = window.PPchart;

  function renderInsights() {
    const regs = D.regionSummary.filter(r => r.region !== 'Total' && r.ml > 500);
    const byCPL = regs.slice().sort((a, b) => (a.tc / a.ml) - (b.tc / b.ml));
    const byNBR = regs.filter(r => r.ns > 0).slice().sort((a, b) => (a.tc / a.ns) - (b.tc / b.ns));
    const bySpend = regs.slice().sort((a, b) => b.tc - a.tc);
    const jul = D.trend.find(t => t.m === 'Jul 26'), aug = D.trend.find(t => t.m === 'Aug 26');
    const cards = [
      ['Most efficient CPL', byCPL[0].region + ' \u00b7 ' + fmtR(byCPL[0].tc / byCPL[0].ml), 'Lowest blended cost per lead across the period'],
      ['Best Cost/NBR', byNBR[0].region + ' \u00b7 ' + (byNBR[0].tc / byNBR[0].ns).toLocaleString('en-IN', { maximumFractionDigits: 2 }), 'Marketing rupees per rupee of net booking'],
      ['Highest spend region', bySpend[0].region + ' \u00b7 ' + fmtCr(bySpend[0].tc), fmtN(bySpend[0].ml) + ' presales leads generated'],
      ['Aug run-rate (5 days)', fmtCr(aug.cost), 'vs ' + fmtCr(jul.cost) + ' full July \u2014 pacing ' + Math.round(aug.cost / 5 * 31 / jul.cost * 100) + '% of July'],
      ['Lead momentum', fmtN(aug.leads) + ' leads MTD', 'July closed at ' + fmtN(jul.leads) + ' leads'],
      ['Net sales, Mar\u2013Aug', fmtCr(D.trend.reduce((a, t) => a + t.ns, 0)), fmtN(D.trend.reduce((a, t) => a + t.gu, 0)) + ' gross units booked']
    ];
    document.getElementById('insightCards').innerHTML = cards.map(c =>
      `<div class="insight"><div class="k">${c[0]}</div><div class="v">${c[1]}</div><div class="d">${c[2]}</div></div>`).join('');
  }

  function renderCharts() {
    const labels = D.trend.map(t => t.m);
    new Chart(document.getElementById('chCostLeads'), {
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Cost (\u20B9 Cr)', data: D.trend.map(t => +(t.cost / 1e7).toFixed(2)), backgroundColor: 'rgba(251,106,2,.75)', borderRadius: 8, yAxisID: 'y' },
          { type: 'line', label: 'Leads', data: D.trend.map(t => t.leads), borderColor: C.ink, backgroundColor: C.ink, tension: .35, pointRadius: 4, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        scales: {
          y: { position: 'left', grid: { color: '#EFF1F5' }, title: { display: true, text: '\u20B9 Cr' } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Leads' } },
          x: { grid: { display: false } }
        }
      }
    });
    new Chart(document.getElementById('chSales'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Net Sales (\u20B9 Cr)', data: D.trend.map(t => +(t.ns / 1e7).toFixed(2)), backgroundColor: labels.map(l => l === 'Aug 26' ? 'rgba(251,106,2,.85)' : 'rgba(36,35,34,.8)'), borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#EFF1F5' } }, x: { grid: { display: false } } } }
    });
  }

  function renderTable() {
    const cols = ['Month', 'Marketing Cost', 'Leads', 'CPL', 'Net Sales', 'Gross Units'];
    const body = D.trend.map(t => `<tr>
      <td>${t.m}${t.m === 'Aug 26' ? ' <span class="pill hold" style="margin-left:6px">MTD \u00b7 5 days</span>' : ''}</td>
      <td>${fmtR(t.cost)}</td><td>${fmtN(t.leads)}</td>
      <td>${t.leads ? fmtR(t.cost / t.leads) : '\u2014'}</td>
      <td>${fmtR(t.ns)}</td><td>${fmtN(t.gu)}</td></tr>`).join('');
    const tot = D.trend.reduce((a, t) => ({ cost: a.cost + t.cost, leads: a.leads + t.leads, ns: a.ns + t.ns, gu: a.gu + t.gu }), { cost: 0, leads: 0, ns: 0, gu: 0 });
    document.getElementById('tblTrend').innerHTML =
      '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead>' +
      `<tbody>${body}<tr class="total"><td>Total</td><td>${fmtR(tot.cost)}</td><td>${fmtN(tot.leads)}</td><td>${fmtR(tot.cost / tot.leads)}</td><td>${fmtR(tot.ns)}</td><td>${fmtN(tot.gu)}</td></tr></tbody>`;
  }

  PPshell('trends', 'Trends & Insights');
  renderInsights();
  renderCharts();
  renderTable();
  document.addEventListener('pp:filters', renderInsights);
})();
