# Model-evaluation artifact contract

## Pipeline

1. Train models in the authorized compute environment, preserving split IDs.
2. Write `html-present-predictions/v1` JSON as below.
3. Run `scripts/evaluate_predictions.py predictions.json report.json --bootstrap 500` in an environment with NumPy, SciPy and scikit-learn.
4. Run `scripts/build_report.py report.json report.html` (standard library only).

The repository's `scripts/train_cifar_models.py` is a complete input producer; `examples/cifar/report.json` is an evaluated output. The public report embeds only bounded gallery probabilities; raw full prediction arrays can remain private.

## Prediction schema

Top-level keys:

- `schema`: `html-present-predictions/v1`.
- `title`, `intro`, `date`: text.
- `source`: `url` (HTTP/S), `citation`, `license`, `note`.
- `tasks`, `eval_sets`, `feature_sets`: arrays of `{id, label}` with stable IDs.
- `methods`: array of factual strings describing splits, training, evaluation and limitations.
- `feature_sweep`: `{model, label, family, k, eval_set, macro_auroc}` rows. `sweep_label` states its fixed scope.
- `images`: `{eval_set_id: {sample_id: "data:image/png;base64,..."}}`; PNG/JPEG/WebP only. `gallery_note` states how examples were selected and denominators.
- `cohorts`: a complete grid of task × evaluation set × features × kind (`main` or `binary`) for the bundled full template. Adapt the template/builder when a project has a sparse grid, no direct-binary models or no images.

Each cohort:

```json
{
  "id": "main/animal/test/hog",
  "kind": "main",
  "task": "animal",
  "eval_set": "test",
  "feature_set": "hog",
  "classes": ["negative", "positive"],
  "sample_ids": ["test-1", "test-2"],
  "y": [0, 1],
  "positive_classes": [1],
  "train_prior": [0.5, 0.5],
  "gallery_ids": ["test-1", "test-2"],
  "models": [{
    "id": "logistic", "label": "Logistic regression", "family": "Linear",
    "probabilities": [[0.8, 0.2], [0.3, 0.7]],
    "validation_y": [0, 1],
    "validation_probabilities": [[0.7, 0.3], [0.2, 0.8]],
    "train_seconds": 1.2, "inference_ms": 0.01
  }]
}
```

This tiny record illustrates shape, not adequate data for a study. Probability columns follow `classes`; rows align with labels and unique sample IDs. Every class must be present in each cohort for the bundled metric suite. Validation probabilities come from a disjoint validation set, with identical validation sample order across models. `positive_classes` is a nonempty proper subset. Priors are positive and sum to one. Use `family: "Baseline"` to exclude a prior-only model from validation reference selection.

Keep model IDs consistent across cohorts. The current UI uses the first cohort's model/class order for selectors; heterogeneous model availability or changing class vocabularies requires adapting those selectors. Use common `test`, `noise`, `blur` evaluation IDs for the built-in robustness table and original-image comparison, or adapt that mapping for other conditions.

## Evaluated schema

The evaluator emits `html-present-evaluation/v1` plus bootstrap count and seed. Each cohort adds `n`, prevalence, class counts, validation-selected `reference`, and `paired` differences. Model outputs include binary metrics/CI, ROC and PR coordinates, four operating-point rules, capacity curves/tables, two decision-curve modes, calibration bins/regression, class-conditioned histograms, multiclass metrics/matrix/per-class metrics, prior-adjusted matrices, output QC, selective accuracy and bounded gallery records. `null` means undefined/unavailable.

CI is percentile 95%, stratified by true class, conditional on fixed trained models. All models within a cohort share bootstrap indices. Curves can be thinned for rendering; metrics always use full predictions. Reference is lowest validation multiclass log-loss excluding baselines. Calibration fit is descriptive. QC token fields are optional and should be populated only from actual LLM output records when extending the evaluator; ordinary classifiers leave them null.

## Control scopes

Task, evaluation and features update all main results including narrative. Curve chips share state across ROC/PR, capacity, net benefit and selective classification; empty selections remain empty. Confusion matrices have separate chips. A/B selectors share probability panels, image gallery and appendix matrix choices. Binary task is local; prior-adjustment can use the main multiclass model or the current binary appendix (useful when main priors are uniform). Feature sweep and robustness table explicitly state their fixed evaluation scopes. CSV exports include current cohort identifiers; gallery export includes the entire filtered gallery, not only the visible page.

Gallery records preserve the exact pre-rounding `prediction` and `confidence`; probability bars use six-decimal display probabilities. Error filters must use the exact prediction, so quantization cannot change a near-tie decision.
