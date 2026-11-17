# Interactive evaluation inventory

The reference's analytical interaction patterns are implemented in independent HTML/JS/SVG. The demo changes the domain to CIFAR-10, with actual lightweight models and precomputed held-out results. Visual primitives are adapted where useful rather than copying the original source.

| Reference module | Implementation | Scope |
| --- | --- | --- |
| Summary / definitions / class mix | Derived cards, narrative, glossary and proportions | All global controls |
| AUROC / AUPRC / fixed-spec / fixed-sens | Four-column dot-and-CI plot, sorted AUROC, random baselines | All models, current cohort |
| ROC + own markers | Curves and markers; point tooltip, keyboard focus | Shared selected models |
| Capacity + top-k table | Random/perfect baselines, fractional ties, 5/10/20% | Shared selected models |
| Decision curves | Risk threshold vs fixed own; all/none strategies | Shared selected models |
| Operating point | Four rules, values, per-1000 consequences | Local rule; global cohort |
| Own comparison / confusion matrices | CI metrics; separate model chips; row-normalized cells | Global cohort |
| Calibration / probability distributions | Brier, BSS, slope/intercept, class-conditioned distributions, bins | A/B selectors; global cohort |
| Overconfidence | max class probability > 99% | Global cohort |
| Paired comparison | Six paired differences and CI; validation-selected reference | Global cohort |
| Multiclass | Four CI panels, ten-metric table | Full 10-class predictions |
| Per class | Recall, precision, F1, AUROC chart and six-metric table | Local class |
| Feature-count study | PCA 16/32/64, two algorithms | Fixed clean full test; labelled |
| Direct binary appendix | Independently trained binary model metrics / matrices | Local task, global evaluation/features |
| Prior adjustment | Dividing by training prior before argmax | Global main cohort |
| Output QC | Probability validity/repetition/confidence/ties | Global cohort; LLM fields N/A |
| Methods | Splits, assumptions, sources, uncertainty, limitations | Static provenance |

Added image-classification interactions: Precision–Recall curves; confusion-cell → image filtering; A/B disagreement and correct/incorrect filters; per-image full probability dialog; original/corrupted image pairs; coverage/accuracy curve; paired-ID corruption comparison; runtime costs; CSV; themes; presentation; print.

Differences are explicit: summary, calibration and paired plots follow the current global cohort here, while the reference freezes some panels to its common subset/top-100. The image gallery is a preselected subset, never the metric denominator. Curves can be thinned to 250 coordinates for file size; metrics/CI use full predictions. This study does not produce LLM token evidence, clinical recommendations, segmentation or detection results. No fake placeholders stand in for those tasks.

Metric-table shading is columnwise (direction inverted for loss/Brier/ECE), not a shared scale across incompatible metrics. The per-class chart is a recall/precision butterfly; the operating chart stacks captured targets, false alarms and missed targets per 1,000. Undefined precision remains missing. Print preserves matrix values and rendered image cards even though ordinary controls are hidden.
