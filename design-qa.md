# HTML Present acceptance — CIFAR-10

Result: passed for the tested interactive-report scope, 2026-11-17.

The original Iris prototype did not cover predictive evaluation. The current default report implements the reference's evaluation modules and extends them to image classification. See [interaction inventory](docs/interaction-map.md) for explicit scope and substitutions. Iris remains a separate descriptive starter.

## Evidence and compute

- Reference: https://www.guopeiqi.com/projects/202611-ADRD_LLM/20261115_Progress_Report
- Independent implementation: vanilla JS, SVG, embedded JSON/CSS/images; no copied reference scripts or research data.
- Real training/evaluation: Mila `long-cpu`, job **11744133**, 2 CPUs / 4 GB, successful completion. Source revision, versions, split sizes and timestamps are in `examples/cifar/run.json`.
- Five independent numerical tests passed on Mila: AUROC/AP/Brier against scikit-learn with tied scores; prior baseline and tie-invariant capacity; operating-point constraints/confusion counts; invalid probability rejection; identical-model paired bootstrap differences.
- All 32 cohorts completed with 500 bootstrap draws. JSON structure, class/matrix totals, gallery IDs and train/validation separation checked after transfer. Clean/noise/blur share identical test IDs.
- Main result: HOG MLP accuracy 50.45%, macro AUROC 0.8829; PCA MLP accuracy 40.20%, macro AUROC 0.8260. These are the 2,000-image sampled study, not full benchmark results.

## Browser acceptance with real results

Tested through the in-app browser at `http://127.0.0.1:4173/`, desktop viewport 1280 × 712 and mobile override 390 × 844. Mobile document client/scroll width both 375 CSS px (scrollbar excluded); dense figures and matrices scroll internally. Temporary viewport overrides were reset.

- Task / evaluation / features: cat + HOG + subset yields n=500, positives=50 and gallery n=142; switching to noise restores n=2,000 / positives=200 and gallery n=500.
- Ranking: model order and CI tooltips update. Cat/HOG/clean Logistic AUROC tooltip: 0.803, CI [0.774, 0.833]. AUROC and AUPRC axes use suitable ranges while retaining random baselines and all observed intervals.
- Empty shared curve selection gives zero ROC curves, capacity rows and selective curves; all four chip groups agree. Restoring models restores the same selection across views.
- Operating-point selection changes explanatory scope and values, including validation-fixed thresholds. Binary prior adjustment at 90%/10% changes Logistic accuracy from 90.4% to 73.8% and exposes the balanced-accuracy tradeoff.
- Per-class cat table has n=200; undefined prior precision renders as a dash.
- HOG/clean MLP confusion cell true cat → predicted dog has 29 full-cohort cases. Clicking it selects MLP as A and displays exactly 8 matching gallery records. CSV sample IDs match those 8 source records exactly.
- Image dialog displays the true label and both models' full class probability vectors. Example `test-187`: true cat; MLP predicts dog at about 37.0%, forest predicts frog at about 18.9%.
- Gallery A/B selectors synchronize with the probability/calibration selectors. MLP vs forest on noisy HOG inputs yields 221 disagreements among 500 gallery images; original/corrupted pairs render, with zero broken loaded images.
- Metric CSV contains all five current models, correct cohort identifiers and numeric values matching the JSON.
- Dark/light/auto theme and mobile layout inspected. Presentation mode shows only its active section; navigation advances ranking → operating, with correct 4/14 indicator.
- Browser console: no warnings or errors during tested interactions. JavaScript syntax and skill metadata validation passed.

## Visual corrections

- Narrowed an unnecessarily broad ranking axis and reduced dot size so actual confidence intervals remain visible.
- Removed desktop matrix overflow (570px minimum reduced to 530px; observed content/client width both 532px).
- Added A/B model controls directly to the gallery, preserving shared state with calibration panels.
- Preserved matrix values and image cards in print CSS despite hiding ordinary controls.

Screenshots, excluded from Git: `docs/cifar-ranking-preview.jpg`, `docs/cifar-gallery-preview.jpg`, `docs/cifar-mobile-preview.jpg`. Screenshots are visual evidence, not a pixel-identical comparison claim.

## Explicit limits

- Direct `file://` browser navigation was rejected by the browser protocol policy (HTTP/S only); no workaround was attempted. Runtime acceptance used the local HTTP preview. The artifact itself contains all scripts, styles, data and images and makes no runtime fetch/CDN calls.
- Print styling is implemented; an exported/printed PDF was not visually inspected.
- CIFAR images are 32×32 and intentionally enlarged without invented detail. Synthetic noise/blur are stress tests, not independently sampled external domains.
- CI is conditional on fixed trained models; no retraining uncertainty. QWK has no natural ordinal meaning here. LLM token/JSON fields are N/A.
- These checks describe this build, not future template changes.
