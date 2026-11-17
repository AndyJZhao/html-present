# Reference → reusable interaction pattern

Reference inspected in a browser on 2026-11-17:
https://www.guopeiqi.com/projects/202611-ADRD_LLM/20261115_Progress_Report

| Observed reference behavior | Iris adaptation |
| --- | --- |
| Question-led opening and metadata | Research question, dataset size, provenance, report date |
| Sticky task / test set / feature controls | Sticky cohort / feature-pair controls |
| Summary changes when task changes | Counts, means and correlation follow shared state |
| Model chips shared between analytical charts | Category chips shared by plots, statistics, rule and records |
| Estimate plots beside explicit definitions | Mean ± sample SD with definition and numeric table |
| Operating-point comparisons | Measurement threshold slider and live confusion matrix |
| Anchor navigation, light / dark / auto | Same patterns, implemented independently |
| Detailed methods and appendices | Expandable methods, limitations and attribution |

Added for reusable delivery: a dependency-free single-file builder, searchable/sortable CSV evidence, mobile chart layout, print styles and section presentation mode.

This reproduces an interaction format, not the original clinical analysis. It does not implement the original model-specific ROC, calibration, decision-curve or bootstrap analyses, because the Iris example contains measurements rather than prediction artifacts. Those can be added when actual evidence is supplied.
