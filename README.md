# PropertyPistol ROI Dashboard (v2)

Multi-page HTML/CSS/JS dashboard built from the **Daily ROI Report – 5 Aug 2026 (.xlsb)** and **Spend Tracker Aug-26 (.xlsx)**. No build step, no server — open `index.html`, or drop the folder on any static host (Cloudflare Pages / GitHub Pages).

## Pages
- **index.html** — KPI band + three tabs: ROI Summary (region-wise), SM / Manager View, Project Performance (charts + Bangalore portfolio)
- **campaign.html** — **Source Wise Report** (full period + Aug MTD, QL & SV per source), source charts, campaign register
- **budget.html** — Budget vs Actual for L+S / Un-Planned / Builtup
- **trends.html** — Mar–Aug 26 trend, insights, MoM table
- **reports.html** — 7 one-click CSV extracts + methodology

## Defaults
City **All Regions**, SM **All SM** — every view opens on the full company picture; drill down with the filters.

## Data guarantees (verified in-build)
- Region table ties **exactly** to the MIS Summary Head pivot: cost ₹82,09,41,086.58 · MTD leads 5,55,667 · total leads 6,54,154 (Write-Off rows excluded).
- Source Wise totals tie to the same figures — per city **and** All Regions (cost, leads, QL, SV all asserted). `(blank)` = rows with no Source in the MIS, same as the Excel pivot.
- Bangalore Dashboard-sheet section totals reproduced to the paisa (planned ₹8,22,129.96 · builtup ₹5,14,293.51).
- **SM→project mapping is arithmetic-verified**: every SM's L+S and Builtup spends reconcile to the paisa against SM Wise Spends. This places **Assetz Meru & You under Rupali**. Zero-spend rows (Sumadhura Panorama, Prestige Avon Nagavara) can't be attributed from spend data → shown unassigned (—).

## Branding
Sidebar loads the official wordmark from propertypistol.com; sandboxed previews that block external images fall back to an inline brand wordmark automatically. Update `LOGO_URL` in `js/app.js` to point at a locally hosted copy if you want zero external requests.

## Refreshing data
All figures live in `js/data.js` (`window.PP`). Re-run the extraction against a newer MIS/Spend Tracker and replace that one file.
