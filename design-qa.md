# HTML Present acceptance

final result: passed

Scope: functional and visual adaptation of the reference's interactive report format, using different data and Chinese content. Not a pixel-identical clone or reproduction of the original clinical analysis.

## Evidence

- Source: https://www.guopeiqi.com/projects/202611-ADRD_LLM/20261115_Progress_Report
- Local source captures: `docs/source-desktop.jpg`, `docs/source-mobile.jpg` (excluded from public repository).
- Local implementation captures: `docs/desktop-preview.jpg`, `docs/mobile-preview.jpg`, `docs/dark-preview.jpg` (excluded from public repository).
- Desktop initially inspected at approximately 1265 × 712; mobile at a 390 × 844 override (375 CSS px content width with the browser scrollbar). Also checked a narrower desktop pane.
- The browser's native screenshot surface and DOM viewport changed with the app pane during later capture. Captures were compared together for composition and styling, not treated as a pixel-normalized overlay. Screenshot dimensions are not evidence of exact geometric fidelity.
- Full-view comparison: both use neutral report background, strong question heading, metadata, segmented sticky controls, section navigation and evidence cards. Different text lengths, Chinese system typography, four summary cards and shorter introduction are intentional.
- Focused checks: mobile scatter, threshold panel, control wrapping and internal table overflow were inspected directly.

## Findings and correction history

1. P2: mobile page overflowed to 569px due to an unbroken dataset checksum. Fixed by wrapping provenance text. Recheck: document scrollWidth and clientWidth both 375px.
2. P2: a desktop-sized scatter would shrink labels excessively on mobile. Fixed by computing the SVG viewBox from the available chart width; mobile viewBox 320 × 330. Rechecked readable labels and marks.
3. Interpretation fix: static observation explicitly refers to the complete dataset; current subset size, means and correlations are computed live.

No remaining P0/P1/P2 findings within this adaptation scope.

## Required surfaces

- Typography: system fonts support Chinese offline; the reference's IBM Plex font is deliberately not redistributed. Hierarchy and compact labels retained.
- Spacing: report width, generous section gaps, panel borders and compact controls follow the reference's document structure. Mobile controls wrap and navigation scrolls internally.
- Colors: neutral gray background, white/dark panels, blue selected controls, consistent category colors across views.
- Assets: no source image, logo or font copied; plots are generated from data. No decorative bitmap assets required.
- Content: original Chinese text; public UCI Iris source, version caveat, units and exploratory interpretation shown.

## Verified behavior

- Scope changes 150 → 100 points and records; group filter gives 50; summary and table agree.
- Feature switch changes scatter axes, means, correlation, distributions and threshold variable.
- Empty selection: zero points/rows and undefined metrics as dashes.
- Threshold 5.0cm for Virginica: TP 44, FN 6, FP 2, TN 98; recall 88.0%, specificity 98.0%, precision 95.7%. Independently recomputed from source CSV with Python standard library.
- Default petal mean 3.7586666667 and Pearson r 0.9627570971 independently recomputed.
- Target selector updates target counts and rule metrics.
- Search Virginica: 50 records. Sort sepal length: first row #107 at 4.9cm. Downloaded CSV verified to contain those 50 rows in sorted order.
- Point keyboard activation reveals sample #119 and all four values.
- Light/dark switch; section navigation; presentation next/exit (only intended section visible).
- Browser console: no warnings/errors observed during tested interactions.
- JavaScript syntax and skill validator passed. Builder rejects duplicate IDs, nonfinite measurements and non-HTTP(S) source URLs; embedded script delimiters are escaped safely.

## Limits

- Print stylesheet and before/after-print logic are implemented; an actual printed PDF was not visually inspected.
- Offline delivery has no fetches, external fonts or external scripts. A direct file:// open was not separately browser-tested.
- No model fitting, confidence intervals, inferential claims or held-out evaluation.
- Tests are observations from this build, not a perpetual guarantee for future template changes.
