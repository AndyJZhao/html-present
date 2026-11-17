---
name: html-present
description: Create interactive HTML research reports with linked model evaluation plots, confidence intervals, data tables and image comparisons. Use for HTML Present, interactive ML progress reports or explorable research presentations; not general web apps or slide decks.
---

# HTML Present

Build a research narrative whose evidence readers can explore. Use one shared state for task, evaluation cohort, features and model selections; name local exceptions and each panel's denominator. Reference pages are interaction specifications, not screenshots to flatten into static images.

## Select the artifact route

- **Model evaluation:** read [evaluation contract](references/evaluation-contract.md). The bundled evaluator converts aligned held-out probabilities into ROC/PR, bootstrap intervals, operating points, capacity, decision curves, calibration, paired differences, multiclass/per-class results and optional image examples. The evaluation template adds linked model choices, image A/B comparison, confusion-cell filtering, corruption and selective-prediction views. Adapt task-specific panels when evidence is unavailable; don't require unrelated datasets just to populate every section.
- **Descriptive numeric data:** read [table contract](references/data-contract.md). The simpler starter supports up to three categories, scatter/distributions, exploratory measurement thresholds, searchable/sortable rows and CSV export. It does not substitute for a predictive evaluation report.

Both use the same build command, with automatic routing by schema:

```sh
python3 <skill-dir>/scripts/build_report.py report.json report.html
```

The result is one offline HTML containing data, CSS, vanilla JavaScript and SVG; no CDN or runtime server. Copy/edit template assets in the project for other layouts. Preserve the original skill when task-specific changes should not affect future reports.

## Evidence and comparison rules

Use real supplied results first. Training and analysis follow the user's compute boundary; the builder itself is standard-library artifact rendering. Never synthesize performance claims to fill a chart. Preserve train/validation/test separation and aligned sample IDs across models. Distinguish multiclass probabilities merged into a binary task from models directly trained for that task.

State the bootstrap unit, pairing, strata, number of draws, and whether training uncertainty is included. Test-selected operating points are exploratory; validation-fixed thresholds are a separate view. Do not silently label average precision as trapezoidal PR area. Undefined PPV, unstable calibration fits and unavailable metrics display as missing, not zero. Paired comparisons need paired predictions and a documented reference-selection rule.

Preselect bounded image examples independently of model outcomes, then expose error/disagreement filters. Show gallery size separately from the full metric cohort. Keep class order and image IDs consistent; label synthetic corruptions as synthetic. Only embed images authorized for the artifact's audience. LLM token/JSON QC applies only when real output evidence exists.

## Verify and package

Exercise the rendered report in a browser: all global controls, shared model chips, empty selection, local A/B and class controls, matrix-to-image navigation, gallery filters/dialog, exports, theme, keyboard, narrow screen, presentation and print. Check displayed counts and numeric values against the source artifact. Pure HTTP success is not acceptance.

Include scope labels, source provenance, methods, limits, build commands and a useful preview. Inspect file size and bound detail views. Do not claim complete reference parity based on similar styling: compare each source interaction and record any deliberate substitutions. Skill invocation does not authorize public repository writes or website deployment; use the user's actual repository/action authorization.
