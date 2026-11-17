# HTML Present

把 ML 研究结果做成可探索的离线 HTML：改变任务、测试条件或特征，让图表、摘要和图片对比同步响应。

展示思路参考 [Peiqi Guo 的 NHATS Progress Report](https://www.guopeiqi.com/projects/202611-ADRD_LLM/20261115_Progress_Report)，由本项目独立实现。原页的机制是 **离线计算结果 → 内嵌 JSON → JavaScript 共享状态 → SVG 重绘**，不是静态图拼接，也没有在浏览器训练模型。详见 [参考架构分析](docs/reference-architecture.md)。

## 看示例

下载后双击 [`index.html`](index.html)，无需服务器、CDN 或依赖。主示例是 CIFAR-10：10 类彩色图片，比较 Logistic Regression、校准 Linear SVM、Random Forest、轻量 MLP 和训练先验基线。提供 RGB/PCA 与 HOG 两套特征、原图／子集／噪声／模糊四种条件。

- 四指标点估计与 95% CI；交互 ROC、PR、容量与净收益曲线，共享模型选择。
- 测试集探索操作点、验证集预定阈值、own decision 和完整混淆矩阵。
- Brier/BSS、概率直方图、校准图、过度自信、配对差值、10 项多分类与逐类别指标。
- 点击混淆矩阵筛选图片；模型 A/B 分歧、谁对谁错、高置信度错误、全类别概率详情。
- 同一图片原图／损坏版对比、拒识覆盖率、训练／推理成本。
- 独立二分类、先验调整、输出质检、特征数量曲线。
- 深浅主题、移动端、当前筛选 CSV、打印、逐节演示（方向键 / PageUp / PageDown，Esc 退出）。

图库是预测前固定抽取的 500 张；统计基于完整当前评估集，界面标明不同分母。报告使用真实训练结果，不是模拟性能。Iris 描述性入门示例保留在 [`examples/iris/exploration.html`](examples/iris/exploration.html)。

## 安装 skill

将 `skills/html-present` 复制到 `~/.codex/skills/html-present`。已有同名目录时先比较自定义内容。新会话中使用：

```text
用 $html-present 把这些模型预测和图像做成可交互研究报告。
需要置信区间、共享模型选择、混淆矩阵到错误图片的联动，以及可追溯的方法说明。
```

Skill 同时提供 [模型评估契约](skills/html-present/references/evaluation-contract.md) 和 [描述性表格契约](skills/html-present/references/data-contract.md)。模板可修改，不要求每项研究都采用 CIFAR-10 或固定章节。

## 复现

只重新渲染现有结果（Python 标准库）：

```sh
python3 skills/html-present/scripts/build_report.py examples/cifar/report.json index.html
python3 skills/html-present/scripts/build_report.py examples/iris/report.json examples/iris/exploration.html
```

可选本地预览：`python3 -m http.server 4173 --bind 127.0.0.1`。

重跑模型和指标，使用已授权的 ML 计算环境：

```sh
python -m pip install -r requirements-analysis.txt
python -m unittest discover -s tests -v
python scripts/train_cifar_models.py
python skills/html-present/scripts/evaluate_predictions.py outputs/cifar/predictions.json outputs/cifar/report.json --bootstrap 500
```

本仓库的训练脚本要求 Slurm；作者在 Mila `long-cpu` 运行。`scripts/run_cifar_study.sh` 串联数值检查、训练、评估和构建，`configs/mila_harness.yaml` 提供 `mh` 配置；迁移时改项目路径。训练依赖与前端无关，浏览报告无需安装 Python ML 包。

训练 6,000、验证 2,000、测试 2,000，来自官方固定 train/test 边界；不是完整 CIFAR-10 benchmark。图库 ID 和划分见 `examples/cifar/splits.json`。所有模型配置固定；无测试集调参。500 次分层配对 bootstrap 只包含测试样本不确定性，不包含重复训练变异。

## 来源与范围

- 代码及原创文案：MIT，见 [LICENSE](LICENSE)。
- CIFAR-10：Alex Krizhevsky, *Learning Multiple Layers of Features from Tiny Images* (2009)，[原始发布页](https://www.cs.toronto.edu/~kriz/cifar.html)。下载 binary archive；图像版权与使用条件属于原始数据，不由本仓库 MIT 重新许可。
- Iris：Fisher, R. (1936), [UCI DOI: 10.24432/C56C76](https://doi.org/10.24432/C56C76)，CC BY 4.0。原始 `iris.data` 保留 UCI 数值，包括其说明的第 35、38 条与原文差异。
- 合成噪声／模糊只是压力测试；净收益是图像审核教学例子；无序类别的 QWK 仅展示指标接口。没有 LLM 输出，因此专属 token/JSON QC 标为不适用。
- [交互功能对应](docs/interaction-map.md) 记录与参考的范围及差别；[验收记录](design-qa.md) 记录实际测试。

根目录 HTML 可用于静态托管。仓库不包含自动部署工作流；网站发布与 public repository 推送分别授权。
