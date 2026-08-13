# PropertyPistol ROI Dashboard (v2)

Multi-page HTML/CSS/JS dashboard built from the **Daily ROI Report – 5 Aug 2026 (.xlsb)** and **Spend Tracker Aug-26 (.xlsx)**. No build step, no server — open `index.html`, or drop the folder on any static host (Cloudflare Pages / GitHub Pages).

## What's new in v3
Multi-select on every dimension, a real fact cube behind the filters, and project-grain reporting.

- **Filters (all multi-select, searchable, chip-summarised):** Region, SM/Manager, Source, Developer, Project Status (Builtup/Sustenance/Launch), Realisation, Project. Plus Campaign Status and a **Focus/Star projects only** toggle.
- **Period presets:** This month / FYTD / All time. The MIS carries *month-level* granularity only — there is no daily date column anywhere in either file — so 7/14/30-day presets would be invented. These are the honest equivalents; the calendar range is retained as a label.
- **Login-level region scope:** "Viewing as" bar. Picking a region hides every other region across all pages. View shaping only, not a security boundary — a client-side dashboard cannot enforce access control.
- **New tabs:** Project Summary (ROI Summary replicated at project grain, 2,262 projects) and Cross Report (project × source, cost & bookings, with/without referral).
- **New KPI cards:** Gross Booking Value and Net Units alongside Net Revenue.
- **YTD columns** (YTD Spend, YTD Revenue, YTD ROI, Exp YTD Revenue) on ROI Summary and Project Summary.
- **Project Performance:** Total Leads, SV Done, Booking Done on all sections; Builtup adds EOI Target, EOI Done, EOI Status, Projected/Actual Revenue, Revenue Gap, % Projected NBR, % Actual NBR.

## Known data gaps (columns render as — rather than guesses)
| Ask | Why it's blank |
|---|---|
| EOI Done / Total EOI / Take rate | Master Sheet columns exist but are **empty for all 140 rows** |
| EOI Status (Bankable / Non-Bankable) | Column exists, **no values anywhere** in either file |
| AOP flag | `AoP` column empty; `AOP Revenue` non-zero on just 9 of 44,505 MIS rows |
| Day-level presets (7d/14d/30d) | No daily date column — MIS is month-level, spend sheets are MTD totals |

Send an EOI dump carrying a Bankable flag and an AOP project list and these fill themselves — the columns and totals are already wired.

## Pages
- **index.html** — KPI band + three tabs: ROI Summary (region-wise), SM / Manager View, Project Performance (charts + Bangalore portfolio)
- **campaign.html** — **Source Wise Report** (source multi-select applies)
- **campaign.html** — Source Wise Report (full period + Aug MTD, QL & SV per source), source charts, campaign register
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
