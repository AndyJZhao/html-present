"use strict";
const D = JSON.parse(document.getElementById("report-data").textContent);
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const pct = (n) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—");
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const sd = (a) =>
  a.length > 1
    ? Math.sqrt(a.reduce((s, v) => s + (v - mean(a)) ** 2, 0) / (a.length - 1))
    : NaN;
const corr = (rows, x, y) => {
  const a = mean(rows.map((r) => r[x])),
    b = mean(rows.map((r) => r[y]));
  let n = 0,
    dx = 0,
    dy = 0;
  for (const r of rows) {
    n += (r[x] - a) * (r[y] - b);
    dx += (r[x] - a) ** 2;
    dy += (r[y] - b) ** 2;
  }
  return dx && dy ? n / Math.sqrt(dx * dy) : NaN;
};
let state = {
  scope: 0,
  view: 0,
  categories: new Set(D.categories.map((c) => c.id)),
  target: D.target,
  cutoff: null,
  sort: "id",
  direction: 1,
  theme: "auto",
  slide: 0,
  present: false,
};
const feature = (key) => D.columns.find((c) => c.key === key);
const category = (id) => D.categories.find((c) => c.id === id);
const scopeRows = () =>
  D.rows.filter((r) => D.scopes[state.scope].categories.includes(r.category));
const rows = () => scopeRows().filter((r) => state.categories.has(r.category));
const currentView = () => D.views[state.view];
const label = (key) =>
  `${feature(key).label}${feature(key).unit ? " (" + feature(key).unit + ")" : ""}`;
function groupButtons(id, items, selected) {
  $(id).innerHTML = items
    .map(
      (v, i) =>
        `<button data-value="${i}" aria-pressed="${i === selected}">${esc(v.label)}</button>`,
    )
    .join("");
}
function card(label, value, note) {
  return `<div class="card"><span class="label">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;
}
function axes(w, h, xLabel, yLabel, xMin, xMax, yMin, yMax) {
  const l = 62,
    r = w - 26,
    t = 25,
    b = h - 50;
  let s = "";
  for (let i = 0; i <= 5; i++) {
    let x = l + ((r - l) * i) / 5,
      y = b - ((b - t) * i) / 5;
    s += `<line class="grid" x1="${x}" x2="${x}" y1="${t}" y2="${b}"/><line class="grid" x1="${l}" x2="${r}" y1="${y}" y2="${y}"/><text x="${x}" y="${b + 21}" text-anchor="middle">${fmt(xMin + ((xMax - xMin) * i) / 5, 1)}</text><text x="${l - 10}" y="${y + 4}" text-anchor="end">${fmt(yMin + ((yMax - yMin) * i) / 5, 1)}</text>`;
  }
  return (
    s +
    `<text x="${(l + r) / 2}" y="${h - 7}" text-anchor="middle">${esc(xLabel)}</text><text transform="translate(16 ${(t + b) / 2}) rotate(-90)" text-anchor="middle">${esc(yLabel)}</text>`
  );
}
function bounds(values) {
  const a = Math.min(...values),
    b = Math.max(...values),
    p = (b - a) * 0.08 || 0.5;
  return [a - p, b + p];
}
function scatter(rs) {
  const v = currentView(),
    base = scopeRows(),
    w = Math.max(320, $("scatter").clientWidth || 900),
    h = w < 500 ? 330 : 400;
  const [xmin, xmax] = bounds(base.map((r) => r[v.x])),
    [ymin, ymax] = bounds(base.map((r) => r[v.y]));
  let s = axes(w, h, label(v.x), label(v.y), xmin, xmax, ymin, ymax);
  for (const r of rs) {
    const x = 62 + ((r[v.x] - xmin) / (xmax - xmin)) * (w - 88),
      y = h - 50 - ((r[v.y] - ymin) / (ymax - ymin)) * (h - 75);
    s += `<circle class="point" tabindex="0" role="button" data-id="${r.id}" aria-label="记录 ${r.id}, ${esc(category(r.category).label)}, ${esc(label(v.x))} ${r[v.x]}, ${esc(label(v.y))} ${r[v.y]}" cx="${x}" cy="${y}" r="5.4" fill="${esc(category(r.category).color)}"><title>${esc(category(r.category).label)} · #${r.id} · ${r[v.x]} / ${r[v.y]}</title></circle>`;
  }
  if (!rs.length)
    s += `<text x="${w / 2}" y="${h / 2}" text-anchor="middle">未选择类别</text>`;
  $("scatter").innerHTML =
    `<svg viewBox="0 0 ${w} ${h}" aria-label="${esc(label(v.x))}与${esc(label(v.y))}散点图">${s}</svg>`;
  $("scatter-title").textContent =
    `${feature(v.x).label} × ${feature(v.y).label}`;
  $("scatter-count").textContent =
    `n = ${rs.length} · r = ${fmt(corr(rs, v.x, v.y), 3)}`;
  $("point-detail").textContent = "悬停或选择一个点，查看原始测量值。";
}
function distributions(rs) {
  let body = "";
  $("distributions").innerHTML = [currentView().x, currentView().y]
    .map((key) => {
      const all = scopeRows().map((r) => r[key]);
      const [lo, hi] = bounds(all),
        w = 510,
        h = 230,
        x = (v) => 145 + ((v - lo) / (hi - lo)) * 325;
      let s = "";
      for (let i = 0; i <= 4; i++) {
        let v = lo + ((hi - lo) * i) / 4;
        s += `<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="15" y2="180"/><text x="${x(v)}" y="203" text-anchor="middle">${fmt(v, 1)}</text>`;
      }
      D.categories.forEach((c, i) => {
        const a = rs.filter((r) => r.category === c.id).map((r) => r[key]);
        const m = mean(a),
          d = sd(a),
          y = 42 + i * 55;
        s += `<text x="130" y="${y + 4}" text-anchor="end">${esc(c.label)} (${a.length})</text>`;
        if (a.length) {
          if (Number.isFinite(d))
            s += `<line x1="${x(m - d)}" x2="${x(m + d)}" y1="${y}" y2="${y}" stroke="${c.color}" stroke-width="3"/>`;
          s += `<circle cx="${x(m)}" cy="${y}" r="5" fill="${c.color}"/>`;
        }
        body += `<tr><td>${esc(c.label)}</td><td>${esc(feature(key).label)}</td><td>${a.length}</td><td>${fmt(m)}</td><td>${fmt(d)}</td><td>${a.length ? fmt(Math.min(...a)) : "—"}</td><td>${a.length ? fmt(Math.max(...a)) : "—"}</td></tr>`;
      });
      return `<div class="panel"><h3>${esc(label(key))}</h3><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label(key))}分组均值与标准差">${s}</svg></div>`;
    })
    .join("");
  $("stats-table").innerHTML =
    "<caption>当前样本的分组描述统计（测量单位见图标题）</caption><thead><tr><th>类别</th><th>特征</th><th>n</th><th>均值</th><th>标准差</th><th>最小值</th><th>最大值</th></tr></thead><tbody>" +
    body +
    "</tbody>";
}
function threshold(rs) {
  const key = currentView().x,
    a = scopeRows().map((r) => r[key]),
    lo = Math.floor(Math.min(...a) * 10) / 10,
    hi = Math.ceil(Math.max(...a) * 10) / 10;
  state.cutoff =
    state.cutoff === null
      ? Math.round((lo + hi) * 5) / 10
      : Math.min(hi, Math.max(lo, state.cutoff));
  $("cutoff").min = lo;
  $("cutoff").max = hi;
  $("cutoff").value = state.cutoff;
  $("cutoff-output").textContent =
    `${fmt(state.cutoff, 1)} ${feature(key).unit || ""}`;
  $("threshold-label").textContent = `规则：${feature(key).label} ≥ 阈值`;
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (const r of rs) {
    const p = r[key] >= state.cutoff,
      t = r.category === state.target;
    if (t && p) tp++;
    else if (t) fn++;
    else if (p) fp++;
    else tn++;
  }
  const recall = tp + fn ? tp / (tp + fn) : NaN,
    spec = tn + fp ? tn / (tn + fp) : NaN,
    precision = tp + fp ? tp / (tp + fp) : NaN;
  $("matrix").innerHTML =
    `<div class="matrix"><div class="matrix-label"></div><div class="matrix-label">预测目标类</div><div class="matrix-label">预测其他</div><div class="matrix-label">真实目标类</div><div><strong>${tp}</strong>正确标记 TP</div><div><strong>${fn}</strong>漏报 FN</div><div class="matrix-label">真实其他</div><div><strong>${fp}</strong>误报 FP</div><div><strong>${tn}</strong>正确排除 TN</div></div>`;
  $("threshold-metrics").innerHTML = [
    ["召回率 · TP / (TP + FN)", pct(recall)],
    ["特异度 · TN / (TN + FP)", pct(spec)],
    ["精确率 · TP / (TP + FP)", pct(precision)],
    ["标记数量", `${tp + fp} / ${rs.length}`],
  ]
    .map(
      ([k, v]) =>
        `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`,
    )
    .join("");
  $("threshold-note").textContent =
    `目标：${category(state.target).label}。当前真实目标 ${tp + fn} 条，其他 ${tn + fp} 条。分母为零的指标显示为 —。`;
}
function filteredTableRows() {
  const q = $("search").value.trim().toLowerCase();
  return rows()
    .filter(
      (r) =>
        !q ||
        String(r.id).includes(q) ||
        category(r.category).label.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const x =
          state.sort === "category"
            ? category(a.category).label
            : a[state.sort],
        y =
          state.sort === "category"
            ? category(b.category).label
            : b[state.sort];
      return (
        (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) *
        state.direction
      );
    });
}
function table() {
  const rs = filteredTableRows(),
    cols = [
      { key: "id", label: "编号" },
      ...D.columns,
      { key: "category", label: "类别" },
    ];
  $("raw-table").querySelector("thead").innerHTML =
    "<tr>" +
    cols
      .map(
        (c) =>
          `<th aria-sort="${state.sort === c.key ? (state.direction === 1 ? "ascending" : "descending") : "none"}"><button data-sort="${c.key}">${esc(c.label)}${state.sort === c.key ? (state.direction === 1 ? " ↑" : " ↓") : ""}</button></th>`,
      )
      .join("") +
    "</tr>";
  $("raw-table").querySelector("tbody").innerHTML = rs.length
    ? rs
        .map(
          (r) =>
            "<tr>" +
            cols
              .map(
                (c) =>
                  `<td>${esc(c.key === "category" ? category(r.category).label : r[c.key])}</td>`,
              )
              .join("") +
            "</tr>",
        )
        .join("")
    : `<tr><td colspan="${cols.length}">没有符合条件的记录。清除搜索或重置筛选。</td></tr>`;
  $("row-count").textContent = `${rs.length} 条记录`;
}
function render() {
  const rs = rows(),
    v = currentView();
  groupButtons("scope", D.scopes, state.scope);
  groupButtons("view", D.views, state.view);
  $("category-chips").innerHTML = D.categories
    .map(
      (c) =>
        `<button data-category="${esc(c.id)}" aria-pressed="${state.categories.has(c.id)}" style="--category:${c.color}"><span class="dot"></span>${esc(c.label)} · ${scopeRows().filter((r) => r.category === c.id).length}</button>`,
    )
    .join("");
  const groups = new Set(rs.map((r) => r.category)).size,
    r = corr(rs, v.x, v.y);
  $("cards").innerHTML =
    card(
      "当前样本",
      String(rs.length),
      `${D.scopes[state.scope].label} · 数据集共 ${D.rows.length} 条`,
    ) +
    card("显示类别", String(groups), "类别选择在整页共享") +
    card(
      feature(v.x).label + " · 均值",
      fmt(mean(rs.map((r) => r[v.x]))),
      feature(v.x).unit || "无单位",
    ) +
    card("两项特征的相关 r", fmt(r, 3), "Pearson · 当前样本");
  $("findings").innerHTML = rs.length
    ? `<p><b>当前视图。</b>${esc(D.scopes[state.scope].label)}，${rs.length} 条记录，${groups} 个类别；横轴为${esc(feature(v.x).label)}，纵轴为${esc(feature(v.y).label)}。</p><p><b>观察。</b>${esc(v.observation)} 这条解释针对完整数据集；筛选后请结合当前图表重新判断。</p><p><b>下一步。</b>切换特征，比较分组均值与离散程度，再移动阈值观察误报和漏报。</p>`
    : "<p>当前没有选中任何类别。点击类别标签或“重置筛选”恢复数据。</p>";
  scatter(rs);
  distributions(rs);
  threshold(rs);
  table();
  $("footer-context").textContent =
    `${D.scopes[state.scope].label} · ${v.label} · n=${rs.length}`;
  resizeToolbar();
}
function resizeToolbar() {
  document.documentElement.style.setProperty(
    "--sticky",
    `${$("toolbar").getBoundingClientRect().height}px`,
  );
}
function setTheme(t) {
  state.theme = t;
  document.documentElement.dataset.theme =
    t === "auto"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : t;
  for (const b of $("theme").children)
    b.setAttribute("aria-pressed", String(b.dataset.value === t));
  try {
    localStorage.setItem("html-present-theme", t);
  } catch {}
}
function setSlide(index) {
  const sections = [...document.querySelectorAll("main>section")];
  state.slide = Math.max(0, Math.min(sections.length - 1, index));
  sections.forEach((s, i) =>
    s.classList.toggle("active-slide", i === state.slide),
  );
  $("page-number").textContent = `${state.slide + 1} / ${sections.length}`;
  $("prev").disabled = state.slide === 0;
  $("next").disabled = state.slide === sections.length - 1;
  if (state.present) window.scrollTo({ top: 0, behavior: "instant" });
}
function present(on) {
  state.present = on;
  document.body.classList.toggle("present", on);
  document.querySelector(".present-nav").hidden = !on;
  $("present").setAttribute("aria-pressed", String(on));
  setSlide(state.slide);
  resizeToolbar();
}
$("eyebrow").textContent = D.eyebrow;
$("title").textContent = D.title;
$("intro").textContent = D.intro;
$("question").textContent = D.question;
$("meta").innerHTML =
  `<span>${D.rows.length} 条记录 · ${D.columns.length} 项测量 · ${D.categories.length} 个类别</span><span>${esc(D.datasetName)}</span><span>报告日期 ${esc(D.date)}</span>`;
$("target").innerHTML = D.categories
  .map((c) => `<option value="${esc(c.id)}">${esc(c.label)}</option>`)
  .join("");
$("target").value = state.target;
$("method-content").innerHTML =
  `<p><b>数据：</b><a href="${esc(D.source.url)}" target="_blank" rel="noopener">${esc(D.source.citation)}</a> · ${esc(D.source.license)}。</p><p>${esc(D.source.note)}</p><ul>${D.methods.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p><b>口径：</b>均值为算术平均，标准差分母为 n−1，相关系数按当前筛选后的成对数值计算。没有训练模型，没有样本外评估。CSV 导出包含当前明细表的排序和搜索结果。</p>`;
$("limitations").innerHTML = D.limitations
  .map((x) => `<li>${esc(x)}</li>`)
  .join("");
for (const id of ["scope", "view"])
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state[id] = Number(b.dataset.value);
    state.cutoff = null;
    render();
  });
$("category-chips").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const c = b.dataset.category;
  state.categories.has(c)
    ? state.categories.delete(c)
    : state.categories.add(c);
  render();
});
$("theme").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setTheme(b.dataset.value);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.theme === "auto") setTheme("auto");
});
function detail(e) {
  const p = e.target.closest("[data-id]");
  if (!p) return;
  const r = D.rows.find((r) => r.id === Number(p.dataset.id));
  $("point-detail").textContent =
    `#${r.id} · ${category(r.category).label} · ` +
    D.columns.map((c) => `${c.label} ${r[c.key]} ${c.unit || ""}`).join(" · ");
}
for (const type of ["mouseover", "focusin", "click"])
  $("scatter").addEventListener(type, detail);
$("scatter").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    detail(e);
  }
});
$("cutoff").addEventListener("input", (e) => {
  state.cutoff = Number(e.target.value);
  threshold(rows());
});
$("target").addEventListener("change", (e) => {
  state.target = e.target.value;
  threshold(rows());
});
$("search").addEventListener("input", table);
$("raw-table").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sort]");
  if (!b) return;
  state.direction = state.sort === b.dataset.sort ? -state.direction : 1;
  state.sort = b.dataset.sort;
  table();
});
$("reset").addEventListener("click", () => {
  state.scope = 0;
  state.view = 0;
  state.categories = new Set(D.categories.map((c) => c.id));
  state.target = D.target;
  $("target").value = state.target;
  state.cutoff = null;
  state.sort = "id";
  state.direction = 1;
  $("search").value = "";
  render();
});
$("download").addEventListener("click", () => {
  const cols = ["id", ...D.columns.map((c) => c.key), "category"];
  const cell = (v) =>
    '"' +
    String(v)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const csv = [
    cols.map(cell).join(","),
    ...filteredTableRows().map((r) => cols.map((c) => cell(r[c])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "report-filtered.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("present").addEventListener("click", () => present(!state.present));
$("exit").addEventListener("click", () => present(false));
$("prev").addEventListener("click", () => setSlide(state.slide - 1));
$("next").addEventListener("click", () => setSlide(state.slide + 1));
document.querySelector("nav").addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  const index = [...document.querySelectorAll("main>section")].findIndex(
    (s) => "#" + s.id === a.getAttribute("href"),
  );
  if (state.present) {
    e.preventDefault();
    setSlide(index);
  }
});
document.addEventListener("keydown", (e) => {
  if (!state.present || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))
    return;
  if (e.key === "Escape") present(false);
  if (e.key === "ArrowRight" || e.key === "PageDown") {
    e.preventDefault();
    setSlide(state.slide + 1);
  }
  if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    setSlide(state.slide - 1);
  }
});
let closedDetails = [];
window.addEventListener("beforeprint", () => {
  closedDetails = [...document.querySelectorAll("details:not([open])")];
  closedDetails.forEach((d) => (d.open = true));
});
window.addEventListener("afterprint", () =>
  closedDetails.forEach((d) => (d.open = false)),
);
$("print").addEventListener("click", () => window.print());
window.addEventListener("resize", () => {
  resizeToolbar();
  scatter(rows());
});
new ResizeObserver(resizeToolbar).observe($("toolbar"));
let saved = "auto";
try {
  saved = localStorage.getItem("html-present-theme") || "auto";
} catch {}
setTheme(["auto", "light", "dark"].includes(saved) ? saved : "auto");
render();
setSlide(0);
