# HTML Present

把研究结果做成可以探索的 HTML 汇报：改变条件，让摘要、图表、统计和明细同步响应。

本项目受 [Peiqi Guo 的 NHATS Progress Report](https://www.guopeiqi.com/projects/202611-ADRD_LLM/20261115_Progress_Report) 启发，独立实现其交互展示思路。示例使用公开 Iris 数据，不包含原报告的代码、图像、研究数据或文案。

## 直接看示例

下载仓库后，双击 [`index.html`](index.html)。它是完整离线文件，不需要服务器、安装依赖或访问 CDN。

- 顶部切换全部三类 / 相近两类、花瓣 / 花萼，整页联动。
- 类别标签共享筛选；散点支持悬停、点击和键盘聚焦。
- 分组均值 ± 标准差，与明细统计表交叉检查。
- 移动阈值，实时查看混淆矩阵、召回率、特异度和精确率。
- 搜索、排序、导出当前 CSV；空状态与零分母有明确显示。
- 自动 / 浅色 / 深色主题、移动端、打印 / PDF、逐节演示。

演示模式：点击“演示模式”，使用底部按钮或 ← / → / PageUp / PageDown 换节，Esc 退出。表单聚焦时保留其原有键盘行为。

## 安装 Codex skill

把 `skills/html-present` 复制到 `~/.codex/skills/html-present`。如果该目录已存在，请先比较，避免覆盖自定义内容。开启新会话后使用：

```text
用 $html-present 把这份实验结果制作成可交互研究报告。
保留任务、数据范围和模型选择的全局联动，并标明数据来源与指标定义。
```

## 复现与定制

仅需 Python 3.10+，全部使用标准库：

```sh
python3 scripts/prepare_iris.py
python3 skills/html-present/scripts/build_report.py examples/iris/report.json index.html
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173`。离线使用不需要最后一步。`report.json` 是内容和数据，`skills/html-present/assets` 是可编辑模板。其他任务遵循 [数据契约](skills/html-present/references/data-contract.md)，或在 skill 指导下修改模板以适配真实研究结果。

本示例是描述性分析，不训练模型；滑动阈值的指标来自当前样本，不是样本外性能。

## 来源与许可

- 代码与原创文案：MIT，见 [LICENSE](LICENSE)。
- 数据：Fisher, R. (1936). Iris [Dataset]. UCI Machine Learning Repository. [DOI: 10.24432/C56C76](https://doi.org/10.24432/C56C76)，CC BY 4.0。数据许可不被 MIT 覆盖。
- 源文件：UCI [Iris 下载包](https://archive.ics.uci.edu/static/public/53/iris.zip) 的 `iris.data`，下载于 2026-11-17，原始值保留。UCI 指出第 35、38 条记录与 Fisher 原文存在差异；本项目不静默修正。
- 展示灵感属于上述原报告；本项目不声称由原作者背书。

## 公开托管

根目录 `index.html` 可用于任何静态托管。GitHub Pages 可在仓库 Settings → Pages 中选择从 `main` 的根目录发布。创建 public repo 与发布网站是两项不同操作，应在分别获得授权后进行。仓库不包含自动部署工作流。
