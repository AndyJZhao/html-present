# Starter data contract

All prose is plain text, not HTML. Use UTF-8 JSON. The builder embeds it safely in a JSON script and renders prose as text. No remote JavaScript is loaded. Browser storage stores only the theme preference, and works without storage permission.

Required metadata strings: `title`, `eyebrow`, `intro`, `question`, `datasetName`, `date`.

| Field | Shape |
| --- | --- |
| columns | Nonempty list of `{key, label, unit}`. Keys are lowercase identifiers, excluding `id` and `category`. |
| categories | 1–3 `{id, label, color}` objects. IDs are safe lowercase identifiers; colors are six-digit hex. |
| scopes | Nonempty list of `{label, categories: [category IDs]}`; each contains records. |
| views | Nonempty list of `{label, x, y, observation}`; x/y reference numeric keys. Observation describes the complete scope and is labelled accordingly in the UI. |
| target | Category ID for the initial one-vs-rest threshold example. |
| rows | `{id: unique integer, category: category ID, ...numeric column values}`. Finite numbers only. |
| source | `{url, citation, license, note}`. URL uses HTTP(S). Include dataset version, retrieval date, transformations and checksum where available. |
| methods / limitations | Nonempty lists of plain-text strings. |

Use the repository's `examples/iris/report.json` as a complete example. Do not relabel an Iris dataset as another study. If starting from another task, replace rows, labels, scopes, target, observations and provenance together.

Missing numeric values are rejected rather than silently dropped. Clean them in a documented preparation step, or extend the renderer to represent them explicitly. The starter calculates mean, sample SD, Pearson r and a raw-measurement threshold confusion matrix. It does not fit any ML model or estimate confidence intervals.

An empty category selection is allowed. It must show zero rows and undefined metrics as a dash; it must not silently restore all data. Search affects only table and CSV. Feature changes reset the threshold to the midpoint of the active scope's observed range. Group filters preserve the threshold, so readers can compare the same rule.
