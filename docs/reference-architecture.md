# How the reference actually works

Inspected source on 2026-11-17: [NHATS Progress Report](https://www.guopeiqi.com/projects/202611-ADRD_LLM/20261115_Progress_Report).

The downloaded page is approximately 1.56 MB. It contains inline CSS, three embedded JSON datasets, a small theme-initialization script and approximately 49 KB of vanilla JavaScript. No external JavaScript library, client framework, API fetch or server computation is used by this page.

The JSON script IDs are `screen` (screening summaries, intervals, ROC/capacity/decision-curve coordinates and paired comparisons), `data` (multiclass metrics, confusion matrices, calibration and feature-count results), and `qc` (LLM output checks). The browser parses these data blocks once. The page credits offline Python builders for the data; those builder implementations are not present in the HTML, so their internals cannot be verified from this page alone.

## Rendering and state

SVG elements are created with `document.createElementNS`. Circles represent estimates, horizontal lines represent bootstrap intervals, polylines represent curves, rectangles represent bars and matrix cells, and SVG titles provide hover details. The four-column panel is a reusable dot-plot function, not four static image files. Its model order is AUROC descending.

A shared state object holds task, evaluation set, feature set, operating point, decision-curve mode, curve-model selection, confusion-matrix selection, per-class selection, two probability-comparison models and the binary appendix task. Button event handlers update a field then redraw the affected views. The curve-model selection is shared across ROC, capacity and net benefit.

The report does not train a model, recalculate predictions or run bootstrap in the browser. It selects already-computed results and rebuilds SVG/table DOM. Theme changes use CSS variables and localStorage.

## Exact scope matters

| Controls / content | Observed reference scope |
| --- | --- |
| Main task / evaluation / features | Re-render main analytical panels |
| Summary / prose findings | Follow task, but explicitly fix evaluation to common subset and features to top-100 |
| ROC / capacity / decision curves | Share model selection |
| Confusion matrices | Separate model selection |
| Fixed operating point | 90% specificity / 80% sensitivity / argmax / validation-fixed threshold |
| Decision curves | Risk threshold vs fixed own decision |
| Probability panels | Two independent model selectors; common subset / top-100 |
| Paired forest | Common subset / top-100; reference chosen by validation log-loss |
| Per-class butterfly | Separate class selector |
| Binary appendix | Independent task selector, shared evaluation / features |
| QC | Full static output-quality table |

## Full presentation inventory

Question and metadata; summary cards and narrative; label/metric glossary; class mix; four-column AUROC/AUPRC/sensitivity/specificity dot-and-CI panel; selectable ROC and own-decision markers; operating-point stacked bars and table; own sensitivity/specificity comparison; selected multiclass confusion matrices; capacity curves and top-k table; decision curves and default strategies; calibration metrics, two-model probability distributions and reliability plots; overconfidence plot; paired-difference forest; multiclass metric panels and heatmap table; per-class butterfly and table; feature-count curves; directly trained binary appendix; prior-adjusted decision appendix; LLM output quality; methods.

The initial Iris implementation covered only the report structure and descriptive interactions. It did **not** have functional parity with this inventory. The current evaluation implementation is assessed against this inventory and state scope in `docs/interaction-map.md` and `design-qa.md`, not only visual resemblance.

For the general demo, explicit per-panel scope labels are preferable to silently freezing panels. Image examples, confusion-cell filtering, paired model predictions, robustness and selective classification extend the original format to image-classification presentation. Domain-specific LLM fields remain optional and must never be populated with fabricated model output.
