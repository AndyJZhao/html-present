(() => {
  "use strict";
  const D = JSON.parse(document.getElementById("report-data").textContent);
  const $ = (id) => document.getElementById(id);
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const fmt = (v, n = 3) =>
    v == null || !Number.isFinite(v) ? "—" : v.toFixed(n);
  const pct = (v) => (v == null ? "—" : `${(100 * v).toFixed(1)}%`);
  const label = (list, id) => list.find((x) => x.id === id)?.label ?? id;
  const first = D.cohorts.find((c) => c.kind === "main");
  const S = {
    task: first.task,
    ev: first.eval_set,
    feat: first.feature_set,
    selected: new Set(
      first.models.filter((m) => m.family !== "Baseline").map((m) => m.id),
    ),
    cm: new Set(first.models.slice(0, 2).map((m) => m.id)),
    a: first.models[0].id,
    b: first.models[1].id,
    op: "spec",
    benefit: "risk",
    cls: 0,
    binary: first.task,
    mode: "all",
    truth: "all",
    cell: null,
    limit: 24,
    slide: 0,
    present: false,
  };
  const palette = [
    "#16869a",
    "#c26921",
    "#8062b3",
    "#398a59",
    "#8a98a2",
    "#cb5475",
    "#4b73ad",
  ];
  const ids = [...new Set(D.cohorts.flatMap((c) => c.models.map((m) => m.id)))];
  const color = (id) => palette[Math.max(0, ids.indexOf(id)) % palette.length];
  const dash = (id) =>
    ["", "6 3", "2 3", "8 3 2 3", "3 5"][Math.max(0, ids.indexOf(id)) % 5];
  const cohort = (kind = "main", task = S.task, ev = S.ev, feat = S.feat) =>
    D.cohorts.find(
      (c) =>
        c.kind === kind &&
        c.task === task &&
        c.eval_set === ev &&
        c.feature_set === feat,
    );
  const options = (id, items, value) => {
    $(id).innerHTML = items
      .map((x) => `<option value="${esc(x.id)}">${esc(x.label)}</option>`)
      .join("");
    $(id).value = value;
  };
  function table(id, caption, heads, rows, heat = false) {
    $(id).innerHTML =
      `<table><caption>${esc(caption)}</caption><thead><tr>${heads.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v, j) => `<${j ? "td" : 'th scope="row"'}>${esc(v)}</${j ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const tx = (x, y, text, anchor = "start", extra = "") =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" ${extra}>${esc(text)}</text>`;
  const tip = (text) => `tabindex="0" data-tip="${esc(text)}"`;
  const line = (x1, y1, x2, y2, stroke = "var(--line)", extra = "") =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" ${extra}/>`;
  function svg(id, w, h, body, title) {
    $(id).innerHTML =
      `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
  }
  function dots(
    id,
    rows,
    metrics,
    { domain = [0, 1], baseline = [], ci = true } = {},
  ) {
    const w = Math.max(1000, metrics.length * 185 + 200),
      left = 210,
      top = 70,
      rh = 38,
      bottom = 42,
      h = top + rh * rows.length + bottom,
      pw = (w - left - 25) / metrics.length;
    let s = "";
    rows.forEach((r, i) => {
      const y = top + i * rh + rh / 2;
      s +=
        `<rect x="0" y="${y - rh / 2}" width="${w - 15}" height="${rh}" fill="${i % 2 ? "transparent" : "var(--soft)"}" opacity=".55"/>` +
        tx(left - 18, y + 4, r.label, "end");
    });
    metrics.forEach(([key, name], j) => {
      const x0 = left + j * pw,
        x1 = x0 + pw - 27,
        x = (v) => x0 + ((v - domain[0]) / (domain[1] - domain[0])) * (x1 - x0);
      s +=
        tx(x0, 24, name) +
        tx(x0, 43, baseline[j] == null ? "" : `random ${fmt(baseline[j], 2)}`);
      for (let a = 0; a <= 4; a++) {
        const v = domain[0] + (a * (domain[1] - domain[0])) / 4;
        s +=
          line(x(v), top, x(v), h - bottom) +
          tx(x(v), h - 17, fmt(v, 2), "middle");
      }
      if (baseline[j] != null)
        s += line(
          x(baseline[j]),
          top,
          x(baseline[j]),
          h - bottom,
          "var(--muted)",
          'stroke-dasharray="3 4"',
        );
      rows.forEach((r, i) => {
        const v = r[key],
          interval = ci ? r.ci?.[key] : null,
          y = top + i * rh + rh / 2;
        if (v == null) return;
        const t = `${r.label} · ${name}: ${fmt(v)}${interval?.[0] != null ? ` [95% CI ${fmt(interval[0])}, ${fmt(interval[1])}]` : ""}`;
        if (interval?.[0] != null)
          s += line(
            x(interval[0]),
            y,
            x(interval[1]),
            y,
            color(r.id),
            'stroke-width="2"',
          );
        s += `<circle cx="${x(v)}" cy="${y}" r="5" fill="${color(r.id)}" stroke="var(--panel)" stroke-width="1.5" ${tip(t)}><title>${esc(t)}</title></circle>`;
      });
    });
    svg(id, w, h, s, metrics.map((m) => m[1]).join(" / "));
  }
  function curvePlot(
    id,
    series,
    {
      title = "",
      xlabel = "",
      ylabel = "",
      xd = [0, 1],
      yd = [0, 1],
      diagonal = false,
      vertical = null,
      markers = [],
      percent = false,
    } = {},
  ) {
    const w = 540,
      h = 430,
      l = 64,
      r = 22,
      t = 40,
      b = 62,
      x = (v) => l + ((v - xd[0]) / (xd[1] - xd[0])) * (w - l - r),
      y = (v) => h - b - ((v - yd[0]) / (yd[1] - yd[0])) * (h - t - b);
    const clip = `clip-${id}`;
    let s =
      `<defs><clipPath id="${clip}"><rect x="${l}" y="${t}" width="${w - l - r}" height="${h - t - b}"/></clipPath></defs>` +
      tx(l, 19, title);
    for (let j = 0; j <= 5; j++) {
      let a = xd[0] + (j * (xd[1] - xd[0])) / 5,
        q = yd[0] + (j * (yd[1] - yd[0])) / 5;
      s +=
        line(x(a), t, x(a), h - b) +
        tx(x(a), h - b + 22, percent ? pct(a) : fmt(a, 2), "middle") +
        line(l, y(q), w - r, y(q)) +
        tx(l - 10, y(q) + 4, fmt(q, 2), "end");
    }
    s +=
      tx((l + w - r) / 2, h - 12, xlabel, "middle") +
      `<text transform="translate(15 ${(t + h - b) / 2}) rotate(-90)" text-anchor="middle">${esc(ylabel)}</text>`;
    if (diagonal)
      s += line(
        x(0),
        y(0),
        x(1),
        y(1),
        "var(--muted)",
        'stroke-dasharray="4 5"',
      );
    if (vertical != null)
      s +=
        line(
          x(vertical),
          t,
          x(vertical),
          h - b,
          "var(--muted)",
          'stroke-dasharray="2 4"',
        ) + tx(x(vertical) + 4, t + 14, "90% specificity");
    s += `<g clip-path="url(#${clip})">`;
    series.forEach((r) => {
      const points = r.points.filter((p) => p[0] != null && p[1] != null);
      if (!points.length) return;
      const c = r.color ?? color(r.id),
        d = r.dash ?? dash(r.id);
      s += `<polyline points="${points.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")}" fill="none" stroke="${c}" stroke-width="2.1" stroke-dasharray="${d}" ${tip(r.label)}><title>${esc(r.label)}</title></polyline>`;
      points.forEach((p) => {
        const desc = `${r.label} · ${xlabel}: ${fmt(p[0])} · ${ylabel}: ${fmt(p[1])}${p[2] != null ? ` · n=${p[2]}` : ""}`;
        s += `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="${r.bins ? Math.min(10, 3 + Math.sqrt(p[2] || 0) / 4) : 4}" fill="${r.bins ? c : "transparent"}" ${tip(desc)}><title>${esc(desc)}</title></circle>`;
      });
    });
    markers.forEach((m) => {
      s += `<circle cx="${x(m.x)}" cy="${y(m.y)}" r="6" fill="var(--panel)" stroke="${color(m.id)}" stroke-width="2" ${tip(m.label)}/>`;
    });
    s += "</g>";
    svg(id, w, h, s, title);
    $(id).insertAdjacentHTML(
      "beforeend",
      `<div class="legend">${series.map((r) => `<span style="--series:${r.color ?? color(r.id)}"><i></i>${esc(r.label)}</span>`).join("")}</div>`,
    );
  }
  function chips(el, models, set, kind) {
    el.innerHTML = models
      .map(
        (m) =>
          `<button data-chip="${kind}" data-id="${esc(m.id)}" aria-pressed="${set.has(m.id)}" style="--series:${color(m.id)}">${esc(m.label)}</button>`,
      )
      .join("");
  }
  function matrix(m, c, adjusted = false, clickable = true) {
    const cm = adjusted ? m.multiclass.adjusted.cm : m.multiclass.cm,
      k = c.classes.length;
    return `<div class="panel"><h3>${esc(m.label)}</h3><p class="cm-label">真实类别 ↓ · 预测类别 → · n=${c.n}</p><div class="cm-wrap"><table class="cm-table ${k === 2 ? "binary" : ""}"><thead><tr><th>True / Pred</th>${c.classes.map((v) => `<th scope="col">${esc(v)}</th>`).join("")}</tr></thead><tbody>${cm.map((row, i) => `<tr><th scope="row">${esc(c.classes[i])}</th>${row.map((n, j) => `<td><button ${clickable ? `data-cell="${i},${j}" data-model="${esc(m.id)}"` : "disabled"} style="--heat:${row.reduce((a, b) => a + b, 0) ? (n / row.reduce((a, b) => a + b, 0)) * 45 : 0}%" aria-label="${esc(`${m.label}: true ${c.classes[i]}, predicted ${c.classes[j]}, ${n} samples`)}"><strong>${n}</strong>${pct(n / row.reduce((a, b) => a + b, 0))}</button></td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  }
  function renderCurves(c) {
    const ms = c.models.filter((m) => S.selected.has(m.id));
    document
      .querySelectorAll(".curve-chips")
      .forEach((el) => chips(el, c.models, S.selected, "curve"));
    curvePlot(
      "roc",
      ms.map((m) => ({ ...m, points: m.roc })),
      {
        title: "ROC curves",
        xlabel: "1 − specificity (false-positive rate)",
        ylabel: "Sensitivity",
        diagonal: true,
        vertical: 0.1,
        markers: ms.map((m) => ({
          id: m.id,
          x: 1 - m.ops.own.specificity,
          y: m.ops.own.sensitivity,
          label: `${m.label} · own decision: sensitivity ${pct(m.ops.own.sensitivity)}, specificity ${pct(m.ops.own.specificity)}`,
        })),
      },
    );
    curvePlot(
      "pr",
      [
        ...ms.map((m) => ({ ...m, points: m.pr })),
        {
          id: "random",
          label: `Random (${pct(c.prevalence)})`,
          color: "var(--muted)",
          dash: "4 5",
          points: [
            [0, c.prevalence],
            [1, c.prevalence],
          ],
        },
      ],
      { title: "Precision–Recall", xlabel: "Recall", ylabel: "Precision" },
    );
    curvePlot(
      "capacity-plot",
      [
        ...ms.map((m) => ({ ...m, points: m.capacity })),
        {
          id: "random",
          label: "Random",
          color: "var(--muted)",
          dash: "4 5",
          points: [
            [0, 0],
            [1, 1],
          ],
        },
        {
          id: "perfect",
          label: "Perfect ranking",
          color: "var(--muted)",
          dash: "2 3",
          points: [
            [0, 0],
            [c.prevalence, 1],
            [1, 1],
          ],
        },
      ],
      {
        title: "Target capture at limited capacity",
        xlabel: "Fraction inspected",
        ylabel: "Fraction of targets captured",
        percent: true,
      },
    );
    table(
      "capacity-table",
      "同分边界按比例分配；模型选择与曲线共享",
      [
        "Model",
        "Top 5% capture",
        "Top 5% PPV",
        "Top 10% capture",
        "Top 10% PPV",
        "Top 20% capture",
        "Top 20% PPV",
      ],
      ms.map((m) => [
        m.label,
        ...m.capacity_table.flatMap((v) => [pct(v.capture), pct(v.ppv)]),
      ]),
    );
    const all = Array.from({ length: 80 }, (_, i) => {
      const t = 0.01 + (i * 0.79) / 79;
      return [t, c.prevalence - ((1 - c.prevalence) * t) / (1 - t)];
    });
    curvePlot(
      "benefit-plot",
      [
        ...ms.map((m) => ({
          ...m,
          points: S.benefit === "risk" ? m.dca : m.dca_own,
        })),
        {
          id: "all",
          label: "Inspect all",
          color: "var(--muted)",
          dash: "4 4",
          points: all,
        },
        {
          id: "none",
          label: "Inspect none",
          color: "var(--muted)",
          dash: "2 3",
          points: [
            [0.01, 0],
            [0.8, 0],
          ],
        },
      ],
      {
        title: "Decision curve",
        xlabel: "Threshold probability / cost ratio",
        ylabel: "Net benefit",
        xd: [0, 0.8],
        yd: [-0.15, Math.max(0.15, c.prevalence + 0.05)],
      },
    );
    $("benefit-note").textContent =
      "净收益 = TP/n − FP/n × pt/(1−pt)。纵轴低于 −0.15 的曲线截断；点击可见点读取数值。本例仅为图像审核效用演示。";
    curvePlot(
      "selective-plot",
      ms.map((m) => ({
        ...m,
        points: m.selective.map((v) => [v.coverage, v.accuracy]),
      })),
      {
        title: "Selective classification",
        xlabel: "Coverage (fraction answered)",
        ylabel: "Accuracy among answered",
        percent: true,
      },
    );
  }
  function renderOperating(c) {
    const notes = {
      spec: "探索性：在当前测试集选取 specificity ≥ 90% 时最高 sensitivity 的阈值。",
      sens: "探索性：在当前测试集选取 sensitivity ≥ 80% 时最高 specificity 的阈值。",
      own: "模型原始 argmax 决策；合并目标类后统计，不重设阈值。",
      validation:
        "阈值只在干净验证集按 specificity ≥ 90% 确定，再固定应用于当前评估集。测试集 specificity 不保证为 90%。",
    };
    $("op-note").textContent = notes[S.op];
    document
      .querySelectorAll("#op-controls button")
      .forEach((b) => b.setAttribute("aria-pressed", b.dataset.value === S.op));
    const rs = c.models.map((m) => ({
      id: m.id,
      label: m.label,
      ...m.ops[S.op],
    }));
    consequences(rs);
    table(
      "op-table",
      notes[S.op],
      [
        "Model",
        "Threshold",
        "Sensitivity",
        "Specificity",
        "PPV",
        "NPV",
        "NNE",
        "Caught / 1000",
        "False alarms / 1000",
        "Missed / 1000",
      ],
      rs.map((m) => [
        m.label,
        S.op === "own"
          ? "argmax"
          : m.flags_none && m.threshold == null
            ? "∞ (none flagged)"
            : fmt(m.threshold),
        pct(m.sensitivity),
        pct(m.specificity),
        pct(m.ppv),
        pct(m.npv),
        fmt(m.nne, 2),
        fmt(m.caught1000, 1),
        fmt(m.false1000, 1),
        fmt(m.missed1000, 1),
      ]),
    );
  }
  function consequences(rows) {
    const w = 1100,
      h = 65 + rows.length * 48,
      left = 215,
      span = 820,
      colors = ["#19869a", "#c36f32", "#b8c3cc"];
    let out = tx(left, 22, "每 1,000 张：捕获目标 / 误报 / 漏检");
    rows.forEach((m, i) => {
      const y = 48 + i * 48;
      out += tx(left - 15, y + 17, m.label, "end");
      let x = left;
      ["caught1000", "false1000", "missed1000"].forEach((key, j) => {
        const v = m[key],
          width = (v / 1000) * span;
        out += `<rect x="${x}" y="${y}" width="${width}" height="25" fill="${colors[j]}" ${tip(`${m.label} · ${["捕获目标", "误报", "漏检"][j]}: ${fmt(v, 1)} / 1000`)}/>`;
        if (width > 35)
          out += tx(
            x + width / 2,
            y + 17,
            fmt(v, 0),
            "middle",
            'style="fill:white"',
          );
        x += width;
      });
    });
    svg("op-bars", w, h, out, "捕获 / 误报 / 漏检 per 1000");
    $("op-bars").insertAdjacentHTML(
      "beforeend",
      '<div class="legend"><span style="--series:#19869a"><i></i>捕获目标</span><span style="--series:#c36f32"><i></i>误报</span><span style="--series:#b8c3cc"><i></i>漏检</span></div>',
    );
  }
  function butterfly(rows) {
    const w = 1050,
      h = 85 + rows.length * 45,
      mid = 580,
      span = 320;
    let out =
      tx(mid - span / 2, 24, "Recall ←", "middle") +
      tx(mid + span / 2, 24, "→ Precision", "middle");
    for (let j = 0; j <= 4; j++) {
      const d = (j / 4) * span;
      out +=
        line(mid - d, 45, mid - d, h - 35) +
        line(mid + d, 45, mid + d, h - 35) +
        tx(mid - d, h - 12, pct(j / 4), "middle") +
        (j ? tx(mid + d, h - 12, pct(j / 4), "middle") : "");
    }
    rows.forEach((m, i) => {
      const y = 55 + i * 45;
      out += tx(220, y + 13, m.label, "end");
      for (const [value, dir] of [
        [m.sensitivity, -1],
        [m.ppv, 1],
      ]) {
        if (value == null) continue;
        const width = value * span;
        out += `<rect x="${dir < 0 ? mid - width : mid}" y="${y}" width="${width}" height="20" fill="${color(m.id)}" opacity="${dir < 0 ? 1 : 0.65}" ${tip(`${m.label}: recall ${pct(m.sensitivity)}, precision ${pct(m.ppv)}`)}/>`;
      }
    });
    svg("class-bars", w, h, out, "Per-class recall and precision");
  }
  function metricHeatmap(c) {
    const keys = [
      "macro_auroc",
      "macro_auprc",
      "macro_f1",
      "balanced_accuracy",
      "accuracy",
      "log_loss",
      "brier_multiclass",
      "kappa",
      "qwk",
      "ece",
    ];
    const rows = [...$("multi-table").querySelectorAll("tbody tr")];
    keys.forEach((key, j) => {
      const values = c.models
          .map((m) => m.multiclass[key])
          .filter((v) => v != null),
        lo = Math.min(...values),
        hi = Math.max(...values);
      rows.forEach((row, i) => {
        const v = c.models[i].multiclass[key];
        if (v == null) return;
        const f = hi === lo ? 0.5 : (v - lo) / (hi - lo),
          good = ["log_loss", "brier_multiclass", "ece"].includes(key)
            ? 1 - f
            : f;
        row.children[j + 1].style.background =
          `color-mix(in srgb, var(--accent) ${8 + good * 24}%, var(--panel))`;
      });
    });
  }
  function renderAB(c) {
    const ms = [S.a, S.b].map((id) => c.models.find((m) => m.id === id));
    $("prob-panels").innerHTML = ms
      .map(
        (m, i) =>
          `<div class="panel"><h3>${i ? "B" : "A"} · ${esc(m.label)}</h3><div id="hist-${i}" class="chart curve-chart"></div><div id="cal-${i}" class="chart curve-chart"></div></div>`,
      )
      .join("");
    ms.forEach((m, i) => {
      curvePlot(
        `hist-${i}`,
        m.hist.map((counts, j) => ({
          id: `class-${j}`,
          label: c.classes[j],
          color: palette[j % palette.length],
          dash: ["", "4 3", "1 3"][Math.floor(j / palette.length)],
          points: counts.flatMap((v, k) => [
            [k / 20, v / c.class_counts[j]],
            [(k + 1) / 20, v / c.class_counts[j]],
          ]),
        })),
        {
          title: "Risk distribution by true class",
          xlabel: "Target probability",
          ylabel: "Fraction within class",
        },
      );
      curvePlot(
        `cal-${i}`,
        [{ ...m, points: m.calibration.bins, bins: true }],
        {
          title: `Calibration · Brier ${fmt(m.brier)}`,
          xlabel: "Mean predicted probability",
          ylabel: "Observed target frequency",
          diagonal: true,
        },
      );
    });
  }
  function renderClass(c) {
    $("class-chips").innerHTML = c.classes
      .map(
        (v, i) =>
          `<button data-class="${i}" aria-pressed="${S.cls === i}">${esc(v)}</button>`,
      )
      .join("");
    const rs = c.models.map((m) => ({
      id: m.id,
      label: m.label,
      ...m.multiclass.per_class[S.cls],
    }));
    butterfly(rs);
    table(
      "class-table",
      `真实类别：${c.classes[S.cls]} · n=${c.class_counts[S.cls]}`,
      ["Model", "Recall", "Specificity", "Precision", "F1", "AUROC", "AUPRC"],
      rs.map((m) => [
        m.label,
        pct(m.sensitivity),
        pct(m.specificity),
        pct(m.ppv),
        fmt(m.f1),
        fmt(m.auroc),
        fmt(m.auprc),
      ]),
    );
  }
  function galleryRows(c) {
    const a = c.models.find((m) => m.id === S.a),
      b = c.models.find((m) => m.id === S.b),
      bm = new Map(b.gallery.map((r) => [r.id, r]));
    return a.gallery
      .map((r) => {
        const rb = bm.get(r.id);
        if (!rb) return null;
        const pa = r.probabilities.indexOf(Math.max(...r.probabilities)),
          pb = rb.probabilities.indexOf(Math.max(...rb.probabilities));
        return {
          ...r,
          b: rb.probabilities,
          pa,
          pb,
          ca: Math.max(...r.probabilities),
          cb: Math.max(...rb.probabilities),
        };
      })
      .filter(
        (r) =>
          r &&
          (S.truth === "all" || r.y === +S.truth) &&
          (!S.cell || (r.y === S.cell[0] && r.pa === S.cell[1])) &&
          {
            all: true,
            wrong: r.pa !== r.y,
            confident: r.pa !== r.y && r.ca >= 0.8,
            disagree: r.pa !== r.pb,
            "a-wins": r.pa === r.y && r.pb !== r.y,
            "b-wins": r.pb === r.y && r.pa !== r.y,
          }[S.mode],
      );
  }
  function renderGallery(c) {
    const rows = galleryRows(c),
      a = c.models.find((m) => m.id === S.a),
      b = c.models.find((m) => m.id === S.b),
      bank = D.images[S.ev] ?? {};
    $("gallery-note").textContent = D.gallery_note;
    $("gallery-status").textContent =
      `A: ${a.label} · B: ${b.label} · 匹配 ${rows.length} / 图库 ${a.gallery.length} 张；当前完整评估集 ${c.n} 张${S.cell ? ` · 矩阵筛选：真实 ${c.classes[S.cell[0]]} → A 预测 ${c.classes[S.cell[1]]}` : ""}。`;
    $("image-grid").innerHTML = rows.length
      ? rows
          .slice(0, S.limit)
          .map(
            (r) =>
              `<button class="image-card" data-image="${esc(r.id)}"><img loading="lazy" src="${esc(bank[r.id])}" alt="${esc(c.classes[r.y])} · ${esc(r.id)}">${["noise", "blur"].includes(S.ev) ? `<img class="original" loading="lazy" src="${esc(D.images.test?.[r.id])}" alt="原图"><span class="prediction">上：当前条件 / 下：原图</span>` : ""}<strong>${esc(r.id)} · 真值 ${esc(c.classes[r.y])}</strong><span class="prediction ${r.pa === r.y ? "correct" : "wrong"}">A → ${esc(c.classes[r.pa])} · ${pct(r.ca)}</span><span class="prediction ${r.pb === r.y ? "correct" : "wrong"}">B → ${esc(c.classes[r.pb])} · ${pct(r.cb)}</span></button>`,
          )
          .join("")
      : '<p class="empty">没有匹配的图库图片。矩阵计数基于完整评估集，图库仅展示预先抽取的样本。</p>';
    $("gallery-more").disabled = rows.length <= S.limit;
    $("clear-cell").disabled = !S.cell;
  }
  function imageDetail(id) {
    const c = cohort(),
      r = galleryRows(c).find((r) => r.id === id);
    if (!r) return;
    const m = [S.a, S.b].map((id) => c.models.find((m) => m.id === id));
    $("image-detail").innerHTML =
      `<h2>${esc(id)} · ${esc(c.classes[r.y])}</h2><img src="${esc(D.images[S.ev][id])}" alt="当前图片">${["noise", "blur"].includes(S.ev) ? `<img src="${esc(D.images.test[id])}" alt="原始图片">` : ""}<div class="two-col">${[r.probabilities, r.b].map((p, i) => `<div><h3>${i ? "B" : "A"} · ${esc(m[i].label)}</h3><div class="prob-bars">${p.map((v, j) => `<div class="prob-row"><span>${esc(c.classes[j])}</span><div class="prob-track"><div class="prob-fill" style="width:${v * 100}%"></div></div><span>${pct(v)}</span></div>`).join("")}</div></div>`).join("")}</div>`;
    $("image-dialog").showModal();
  }
  function renderAppendices(c) {
    const bc = cohort("binary", S.binary);
    if (bc) {
      table(
        "binary-table",
        "独立训练的二分类模型",
        [
          "Model",
          "AUROC",
          "AUPRC",
          "Accuracy",
          "F1 macro",
          "Brier",
          "Validation log-loss",
        ],
        bc.models.map((m) => [
          m.label,
          fmt(m.auroc),
          fmt(m.auprc),
          pct(m.multiclass.accuracy),
          fmt(m.multiclass.macro_f1),
          fmt(m.brier),
          fmt(m.validation_loss),
        ]),
      );
      $("binary-cm").innerHTML = bc.models
        .filter((m) => [S.a, S.b].includes(m.id))
        .map((m) => matrix(m, bc, false, false))
        .join("");
    }
    table(
      "adjusted-table",
      "先验调整只改变 argmax 决策",
      [
        "Model",
        "Original accuracy",
        "Adjusted accuracy",
        "Adjusted macro F1",
        "Adjusted BA",
      ],
      c.models.map((m) => [
        m.label,
        pct(m.multiclass.accuracy),
        pct(m.multiclass.adjusted.accuracy),
        fmt(m.multiclass.adjusted.macro_f1),
        pct(m.multiclass.adjusted.balanced_accuracy),
      ]),
    );
    $("adjusted-cm").innerHTML = c.models
      .filter((m) => [S.a, S.b].includes(m.id))
      .map((m) => matrix(m, c, true, false))
      .join("");
    table(
      "qc-table",
      "无 LLM 输出时，专用字段不适用",
      [
        "Model",
        "Method",
        "n",
        "Valid probability",
        "Distinct vectors",
        "Most common",
        "max p > 0.99",
        "Argmax tie",
        "Non-digit token",
        "Digit mass < .5",
        "Token / argmax match",
        "JSON valid",
      ],
      c.models.map((m) => [
        m.label,
        m.qc.method,
        m.qc.n,
        pct(m.qc.valid),
        m.qc.distinct,
        pct(m.qc.most_common),
        pct(m.qc.extreme),
        pct(m.qc.ties),
        ...[
          "top_token_not_digit",
          "digit_mass_lt_05",
          "argmax_matches_top_token",
          "json_valid",
        ].map((k) => (m.qc[k] == null ? "不适用" : pct(m.qc[k]))),
      ]),
    );
  }
  function render() {
    const c = cohort();
    if (!c) throw new Error("Missing cohort for current controls");
    const ranked = [...c.models].sort((a, b) => b.auroc - a.auroc),
      best = ranked[0],
      ref = c.models.find((m) => m.id === c.reference);
    $("scope-note").textContent =
      `${label(D.tasks, S.task)} · ${label(D.eval_sets, S.ev)} · ${label(D.feature_sets, S.feat)} · n=${c.n} · positive=${c.positives} (${pct(c.prevalence)})`;
    $("cards").innerHTML = [
      ["评估图片", c.n, `${c.classes.length} 个原始类别`],
      ["目标 AUROC 最高", fmt(best.auroc), best.label],
      ["最高模型 AUPRC", fmt(best.auprc), `随机基线 ${fmt(c.prevalence)}`],
      [
        "配对比较基准",
        fmt(ref.validation_loss),
        "验证 log-loss · " + ref.label,
      ],
    ]
      .map(
        ([h, v, n]) =>
          `<div class="card"><div class="label">${esc(h)}</div><strong>${esc(v)}</strong><small>${esc(n)}</small></div>`,
      )
      .join("");
    $("findings").innerHTML =
      `<p>在当前条件下，${esc(best.label)} 的目标 AUROC 为 ${fmt(best.auroc)}（95% CI ${best.ci.auroc.map((v) => fmt(v)).join("–")}）。同一模型的完整多分类准确率为 ${pct(best.multiclass.accuracy)}。</p><p>点估计排名不等于差异可靠。下方配对 CI 使用相同测试样本；基准 ${esc(ref.label)} 按验证集选定。切换任务会改变目标概率定义，不会重新训练主模型。</p>`;
    dots(
      "class-mix",
      c.classes.map((v, i) => ({
        id: `c${i}`,
        label: v,
        fraction: c.class_counts[i] / c.n,
      })),
      [["fraction", "Fraction of evaluation set"]],
      { ci: false },
    );
    $("family-legend").innerHTML = c.models
      .map(
        (m) =>
          `<span style="--series:${color(m.id)}"><i></i>${esc(m.label)} · ${esc(m.family)}</span>`,
      )
      .join("");
    dots(
      "rank-plot",
      ranked,
      [
        ["auroc", "AUROC"],
        ["auprc", "AUPRC"],
        ["sens_at_spec", "Sens @ 90% spec"],
        ["spec_at_sens", "Spec @ 80% sens"],
      ],
      { baseline: [0.5, c.prevalence, 0.1, 0.2] },
    );
    renderCurves(c);
    renderOperating(c);
    dots("own-bars", ranked, [
      ["own_sens", "Own sensitivity"],
      ["own_spec", "Own specificity"],
      ["own_ppv", "Own PPV"],
      ["own_npv", "Own NPV"],
    ]);
    chips($("cm-chips"), c.models, S.cm, "cm");
    $("cm-grid").innerHTML =
      c.models
        .filter((m) => S.cm.has(m.id))
        .map((m) => matrix(m, c))
        .join("") || '<p class="empty">选择模型查看混淆矩阵。</p>';
    table(
      "cal-table",
      "BSS 相对训练先验；斜率 / 截距为描述性回归",
      [
        "Model",
        "Brier ↓",
        "BSS ↑",
        "Slope (ideal 1)",
        "Intercept (ideal 0)",
        "Mean risk",
        "Observed rate",
      ],
      c.models.map((m) => [
        m.label,
        fmt(m.brier),
        fmt(m.bss),
        fmt(m.calibration.slope),
        fmt(m.calibration.intercept),
        pct(m.mean_risk),
        pct(c.prevalence),
      ]),
    );
    renderAB(c);
    dots(
      "confidence-plot",
      c.models.map((m) => ({ ...m, extreme: m.qc.extreme })),
      [["extreme", "Max class probability > 99%"]],
      { ci: false },
    );
    $("paired-note").textContent =
      `基准：${ref.label}；验证 log-loss=${fmt(ref.validation_loss)}。图为各模型减基准的差值，正值表示该指标更高；95% CI 来自 ${D.bootstrap} 次配对分层 bootstrap，未做多重比较校正。`;
    const maxDelta =
      Math.max(
        0.05,
        ...c.paired.flatMap((m) =>
          Object.values(m.ci)
            .flat()
            .filter((v) => v != null)
            .map(Math.abs),
        ),
      ) * 1.1;
    dots(
      "paired-plot",
      c.paired,
      [
        ["auroc", "Δ AUROC"],
        ["auprc", "Δ AUPRC"],
        ["sens_at_spec", "Δ Sens@90spec"],
        ["own_sens", "Δ Own sens"],
        ["own_spec", "Δ Own spec"],
        ["cap10", "Δ Top10 capture"],
      ],
      { domain: [-maxDelta, maxDelta], baseline: [0, 0, 0, 0, 0, 0] },
    );
    dots(
      "multi-plot",
      c.models.map((m) => ({ ...m, ...m.multiclass })),
      [
        ["macro_auroc", "Macro AUROC"],
        ["macro_f1", "Macro F1"],
        ["balanced_accuracy", "Balanced accuracy"],
        ["accuracy", "Accuracy"],
      ],
    );
    const metricKeys = [
      "macro_auroc",
      "macro_auprc",
      "macro_f1",
      "balanced_accuracy",
      "accuracy",
      "log_loss",
      "brier_multiclass",
      "kappa",
      "qwk",
      "ece",
    ];
    table(
      "multi-table",
      "10 项多分类指标；QWK 依赖任意类序，仅演示接口，不作结论",
      [
        "Model",
        "Macro AUROC",
        "Macro AP",
        "Macro F1",
        "BA",
        "Accuracy",
        "Log-loss ↓",
        "Brier sum ↓",
        "Kappa",
        "QWK*",
        "ECE ↓",
      ],
      c.models.map((m) => [
        m.label,
        ...metricKeys.map((k) => fmt(m.multiclass[k])),
      ]),
    );
    metricHeatmap(c);
    renderClass(c);
    $("sweep-note").textContent =
      D.sweep_label + " · 独立固定范围，不受顶部任务、特征和评估集筛选影响。";
    const fs = [...new Set(D.feature_sweep.map((r) => r.model))].map((id) => ({
      id,
      label: D.feature_sweep.find((r) => r.model === id).label,
      points: D.feature_sweep
        .filter((r) => r.model === id)
        .map((r) => [r.k, r.macro_auroc]),
    }));
    const xs = D.feature_sweep.map((r) => r.k);
    curvePlot("feature-plot", fs, {
      title: "Feature-count study",
      xlabel: "PCA components",
      ylabel: "Macro AUROC",
      xd: [Math.min(...xs) - 2, Math.max(...xs) + 2],
    });
    renderGallery(c);
    const rob = [];
    for (const ev of ["test", "noise", "blur"]) {
      const rc = cohort("main", S.task, ev);
      if (!rc) continue;
      const clean = cohort("main", S.task, "test");
      for (const m of rc.models) {
        const base = clean.models.find((x) => x.id === m.id);
        rob.push([
          label(D.eval_sets, ev),
          m.label,
          pct(m.multiclass.accuracy),
          fmt(m.multiclass.accuracy - base.multiclass.accuracy),
          fmt(m.multiclass.macro_auroc),
          fmt(m.multiclass.log_loss),
        ]);
      }
    }
    table(
      "robustness-table",
      "固定对齐的完整 clean / noise / blur 测试集；不使用 500 张子集",
      [
        "Condition",
        "Model",
        "Accuracy",
        "Δ accuracy vs clean",
        "Macro AUROC",
        "Log-loss",
      ],
      rob,
    );
    table(
      "cost-table",
      "当前特征；训练时间 / 当前批次推理均值，不含特征提取",
      ["Model", "Training seconds", "Inference ms / image"],
      c.models.map((m) => [
        m.label,
        fmt(m.train_seconds, 2),
        fmt(m.inference_ms, 4),
      ]),
    );
    renderAppendices(c);
    $("footer-context").textContent =
      `${D.date} · ${D.bootstrap} bootstrap draws · n=${c.n}`;
  }
  function download(name, rows) {
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((v) => {
              const s = String(v ?? "");
              return (
                '"' +
                (/^[=+@\-\t\r]/.test(s) ? "'" : "") +
                s.replace(/"/g, '""') +
                '"'
              );
            })
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme =
      theme === "auto"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document
      .querySelectorAll("#theme button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.theme === theme),
      );
    try {
      localStorage.setItem("html-present-theme", theme);
    } catch {}
  }
  const sections = [...document.querySelectorAll("main > section")];
  function presentation(on, slide = S.slide) {
    S.present = on;
    S.slide = Math.max(0, Math.min(sections.length - 1, slide));
    document.body.classList.toggle("present", on);
    document.querySelector(".present-nav").hidden = !on;
    $("present").setAttribute("aria-pressed", on);
    sections.forEach((s, i) =>
      s.classList.toggle("active-slide", i === S.slide),
    );
    $("page-number").textContent = `${S.slide + 1} / ${sections.length}`;
    $("prev").disabled = S.slide === 0;
    $("next").disabled = S.slide === sections.length - 1;
    if (on) window.scrollTo(0, 0);
  }
  $("title").textContent = D.title;
  $("intro").textContent = D.intro;
  $("meta").textContent =
    `ML EVALUATION · ${D.date} · Offline / vanilla JavaScript + SVG · ${D.bootstrap} bootstrap draws`;
  options("task", D.tasks, S.task);
  options("eval", D.eval_sets, S.ev);
  options("features", D.feature_sets, S.feat);
  options("binary-task", D.tasks, S.binary);
  options("model-a", first.models, S.a);
  options("model-b", first.models, S.b);
  options(
    "gallery-class",
    [
      { id: "all", label: "全部类别" },
      ...first.classes.map((label, id) => ({ id: String(id), label })),
    ],
    S.truth,
  );
  $("source").innerHTML =
    `<p><a href="${esc(D.source.url)}">${esc(D.source.citation)}</a></p><p>${esc(D.source.note)}</p><p>${esc(D.source.license)}</p>`;
  $("methods-list").innerHTML = [
    ...D.methods,
    `本报告使用 ${D.bootstrap} 次 bootstrap，随机种子 ${D.seed}。`,
  ]
    .map((v) => `<li>${esc(v)}</li>`)
    .join("");
  for (const [id, key] of [
    ["task", "task"],
    ["eval", "ev"],
    ["features", "feat"],
  ])
    $(id).addEventListener("change", (e) => {
      S[key] = e.target.value;
      S.cell = null;
      S.limit = 24;
      render();
    });
  for (const [id, key] of [
    ["model-a", "a"],
    ["model-b", "b"],
  ])
    $(id).addEventListener("change", (e) => {
      S[key] = e.target.value;
      S.cell = null;
      S.limit = 24;
      renderAB(cohort());
      renderGallery(cohort());
      renderAppendices(cohort());
    });
  for (const [id, key] of [
    ["gallery-mode", "mode"],
    ["gallery-class", "truth"],
  ])
    $(id).addEventListener("change", (e) => {
      S[key] = e.target.value;
      S.limit = 24;
      renderGallery(cohort());
    });
  $("binary-task").onchange = (e) => {
    S.binary = e.target.value;
    renderAppendices(cohort());
  };
  $("gallery-more").onclick = () => {
    S.limit += 24;
    renderGallery(cohort());
  };
  $("clear-cell").onclick = () => {
    S.cell = null;
    S.limit = 24;
    renderGallery(cohort());
  };
  $("close-image").onclick = () => $("image-dialog").close();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.chip) {
      const set = b.dataset.chip === "curve" ? S.selected : S.cm;
      set.has(b.dataset.id) ? set.delete(b.dataset.id) : set.add(b.dataset.id);
      if (b.dataset.chip === "curve") renderCurves(cohort());
      else {
        chips($("cm-chips"), cohort().models, S.cm, "cm");
        $("cm-grid").innerHTML =
          cohort()
            .models.filter((m) => S.cm.has(m.id))
            .map((m) => matrix(m, cohort()))
            .join("") || '<p class="empty">选择模型查看混淆矩阵。</p>';
      }
    }
    if (b.dataset.class != null) {
      S.cls = +b.dataset.class;
      renderClass(cohort());
    }
    if (b.dataset.cell) {
      S.a = b.dataset.model;
      $("model-a").value = S.a;
      S.cell = b.dataset.cell.split(",").map(Number);
      S.mode = "all";
      S.truth = "all";
      S.limit = 24;
      $("gallery-mode").value = "all";
      $("gallery-class").value = "all";
      renderAB(cohort());
      renderGallery(cohort());
      renderAppendices(cohort());
      if (S.present)
        presentation(
          true,
          sections.findIndex((s) => s.id === "gallery"),
        );
      else $("gallery").scrollIntoView();
    }
    if (b.dataset.image) imageDetail(b.dataset.image);
    if (b.dataset.theme) setTheme(b.dataset.theme);
    if (b.closest("#op-controls")) {
      S.op = b.dataset.value;
      renderOperating(cohort());
    }
    if (b.closest("#benefit-controls")) {
      S.benefit = b.dataset.value;
      document
        .querySelectorAll("#benefit-controls button")
        .forEach((x) =>
          x.setAttribute("aria-pressed", x.dataset.value === S.benefit),
        );
      renderCurves(cohort());
    }
  });
  for (const ev of ["pointerover", "focusin", "click"])
    document.addEventListener(ev, (e) => {
      const p = e.target.closest("[data-tip]");
      if (p) {
        $("chart-tooltip").textContent = p.dataset.tip;
        $("chart-tooltip").hidden = false;
      }
    });
  for (const ev of ["pointerout", "focusout"])
    document.addEventListener(ev, (e) => {
      if (e.target.closest("[data-tip]")) $("chart-tooltip").hidden = true;
    });
  $("gallery-csv").onclick = () => {
    const c = cohort();
    download(`gallery-${S.task}-${S.ev}-${S.feat}.csv`, [
      [
        "sample_id",
        "true_class",
        "model_A",
        "pred_A",
        "confidence_A",
        "model_B",
        "pred_B",
        "confidence_B",
      ],
      ...galleryRows(c).map((r) => [
        r.id,
        c.classes[r.y],
        S.a,
        c.classes[r.pa],
        r.ca,
        S.b,
        c.classes[r.pb],
        r.cb,
      ]),
    ]);
  };
  $("export-metrics").onclick = () => {
    const c = cohort();
    download(`metrics-${S.task}-${S.ev}-${S.feat}.csv`, [
      [
        "task",
        "eval_set",
        "features",
        "model",
        "n",
        "AUROC",
        "AUROC_lo",
        "AUROC_hi",
        "AUPRC",
        "macro_AUROC",
        "accuracy",
        "log_loss",
        "Brier",
      ],
      ...c.models.map((m) => [
        S.task,
        S.ev,
        S.feat,
        m.label,
        c.n,
        m.auroc,
        ...m.ci.auroc,
        m.auprc,
        m.multiclass.macro_auroc,
        m.multiclass.accuracy,
        m.multiclass.log_loss,
        m.brier,
      ]),
    ]);
  };
  $("present").onclick = () => presentation(!S.present);
  $("exit").onclick = () => presentation(false);
  $("prev").onclick = () => presentation(true, S.slide - 1);
  $("next").onclick = () => presentation(true, S.slide + 1);
  $("print").onclick = () => window.print();
  document.querySelectorAll("nav a").forEach((a) =>
    a.addEventListener("click", (e) => {
      if (S.present) {
        e.preventDefault();
        presentation(
          true,
          sections.findIndex((s) => "#" + s.id === a.getAttribute("href")),
        );
      }
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("chart-tooltip").hidden = true;
      if (!$("image-dialog").open) presentation(false);
    }
    if (
      !S.present ||
      e.target.closest("input,select,textarea,button") ||
      $("image-dialog").open
    )
      return;
    if (["ArrowRight", "PageDown", "ArrowLeft", "PageUp"].includes(e.key)) {
      e.preventDefault();
      presentation(
        true,
        S.slide + (["ArrowRight", "PageDown"].includes(e.key) ? 1 : -1),
      );
    }
  });
  let theme = "auto";
  try {
    theme = localStorage.getItem("html-present-theme") || "auto";
  } catch {}
  setTheme(theme);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (
      document
        .querySelector('#theme [data-theme="auto"]')
        .getAttribute("aria-pressed") === "true"
    )
      setTheme("auto");
  });
  new ResizeObserver(() =>
    document.documentElement.style.setProperty(
      "--sticky",
      `${$("toolbar").getBoundingClientRect().height}px`,
    ),
  ).observe($("toolbar"));
  render();
})();
