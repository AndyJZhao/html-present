---
name: html-present
description: Create interactive, narrative HTML research reports with linked controls, evidence plots, data tables, and methods. Use for HTML Present, interactive progress reports, or explorable analysis presentations; not for slide decks or general web apps.
---

# HTML Present

Turn research evidence into an explorable report: a clear question, a concise answer, linked views that let readers test the answer, and visible methods. The bundled example is a descriptive Iris study; its topic and section count are not requirements for every report.

## Choose the evidence and interactions

Use supplied results and data first. Identify what changes together (task, cohort, feature set, model selection, threshold), what stays fixed, and the denominator for each metric. Inspect a supplied reference in the browser to understand the actual interaction, not just its appearance. Reproduce general interaction patterns in original code; do not assume source code, fonts, images, or research data are licensed for redistribution.

Lead with the research question and data-backed findings. Prefer a compact sticky control bar, anchor navigation, summary cards, chart-plus-explanation sections, accessible tables, and methods near the results. Use restrained neutral backgrounds, high-contrast type, and consistent series colors. Preserve the user's existing design where appropriate. Dark/light themes and narrow-screen usability should work across charts and controls.

Define one shared report state and derive charts, tables, counts, and narrative from it. Explain any deliberately local controls. Distinguish sample dispersion from uncertainty, exploratory thresholds from held-out evaluation, measured results from illustrative data. Never invent model metrics to fill a template. Analysis or model training follows the user's execution environment rules; rendering an existing artifact does not require a training job.

## Use or adapt the starter

For a small numeric table with one categorical label, read [the data contract](references/data-contract.md). Prepare JSON and run:

```sh
python3 <skill-dir>/scripts/build_report.py report.json report.html
```

The builder validates records and produces one offline HTML with embedded CSS, JavaScript, and data. No CDN, network fetch, or package installation is needed. The starter supports up to three groups, paired feature views, global scope/group filtering, descriptive statistics, an exploratory binary measurement threshold, sortable/searchable records, CSV export, themes, print, and section-by-section presentation mode.

For different research tasks, adapt `assets/report.html`, `report.css`, and `report.js` in the project, rather than forcing results into the Iris sections. These are editable starting points, not a universal report schema. Add model selectors, ROC/calibration/capacity views or confidence intervals only when corresponding evidence exists. Preserve a single state model and visible metric definitions. For large datasets, use aggregates and bounded detail views; avoid embedding private or unnecessary raw records.

## Verify the experience

Open the generated report in an available browser, and verify real rendered behavior. Exercise every dimension at least once and check that counts, chart marks, tables and statements agree. Check an empty selection, missing/undefined metric behavior, keyboard focus, theme switching, desktop and approximately 390px mobile width. Check sort/search/export against the visible table. Verify presentation navigation and printable content when included. Report console errors or any verification limits honestly; HTTP success alone is not UI verification.

Maintain source provenance, units, scope, build commands, and interpretation limits alongside the artifact. Include a useful local preview or hosted link in the handoff. A public repository, push, or website deployment requires task-specific authorization; skill invocation is not publication permission. Review exact files before publishing and keep private records and credentials out of deliverables.
