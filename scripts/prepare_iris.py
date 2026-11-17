#!/usr/bin/env python3
"""Convert the vendored UCI iris.data to the report contract; no model training."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
raw = ROOT/'data/iris.data'
keys = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width']
rows = []
for parts in csv.reader(raw.read_text().splitlines()):
    if not parts:
        continue
    rows.append({'id': len(rows)+1, **dict(zip(keys, map(float, parts[:4]))), 'category': parts[4].removeprefix('Iris-')})
assert len(rows) == 150
report = {
    'title': '四项测量，能把三种鸢尾花分开吗？',
    'eyebrow': 'IRIS STUDY · INTERACTIVE RESEARCH REPORT · HTML PRESENT',
    'intro': '从 150 朵鸢尾花出发，比较花萼与花瓣的长度和宽度。先看数据中自然出现的分组，再改变观察范围、筛选物种，最后用一个可移动的阈值理解分类中的误报与漏报。每一个结论，都可以回到图表和原始记录中检查。',
    'question': '花瓣和花萼，哪一组测量更容易区分物种？当只观察外形更接近的 versicolor 与 virginica 时，重叠会怎样变化？一条简单的测量阈值，又会遗漏哪些样本？',
    'datasetName': 'UCI Iris · 公开数据 · 描述性探索', 'date': '2026-11-17',
    'columns': [{'key':k,'label':l,'unit':'cm'} for k,l in zip(keys,['花萼长度','花萼宽度','花瓣长度','花瓣宽度'])],
    'categories': [{'id':'setosa','label':'Setosa','color':'#287f8a'},{'id':'versicolor','label':'Versicolor','color':'#bb702b'},{'id':'virginica','label':'Virginica','color':'#7c6db0'}],
    'scopes': [{'label':'全部三类','categories':['setosa','versicolor','virginica']},{'label':'相近两类','categories':['versicolor','virginica']}],
    'views': [{'label':'花瓣','x':'petal_length','y':'petal_width','observation':'花瓣视图中，Setosa 在较短、较窄的一端形成独立簇；Versicolor 与 Virginica 在边界附近仍有重叠。'},{'label':'花萼','x':'sepal_length','y':'sepal_width','observation':'花萼视图中，多类样本的测量范围发生重叠；单看两项花萼测量，很难找到完全无误的分界。'}],
    'target': 'virginica',
    'source': {'url':'https://archive.ics.uci.edu/dataset/53/iris','citation':'Fisher, R. (1936). Iris [Dataset]. UCI Machine Learning Repository. DOI: 10.24432/C56C76','license':'CC BY 4.0','note':'使用 UCI 下载包中的 iris.data 原始版本；未采用 Kaggle 镜像。UCI 指出该版本第 35、38 条记录与 Fisher 原文有差异，本示例保留下载值，不静默修正。原始文件 SHA-256: '+hashlib.sha256(raw.read_bytes()).hexdigest()},
    'methods': ['150 条记录，每个类别 50 条；4 项测量，单位为厘米。下载日期：2026-11-17。','数据按源文件顺序编号 1–150；原文件无缺失值。除解析数值和去除类别名前缀外，不修改测量值。','研究范围决定可用记录，类别按钮进一步筛选；所有图表和摘要采用同一筛选。特征切换同时更新两轴、统计与阈值变量。','分布图展示均值 ±1 个样本标准差，不是置信区间，也不是显著性检验。类别之间的相关结构可能影响汇总相关。','阈值规则：当前横轴测量 ≥ 阈值时预测为目标类别，其余预测为其他类。没有训练集、验证集或测试集划分。'],
    'limitations': ['这是一个小型、经典教学数据集，不代表真实部署中的样本多样性。','交互中调节阈值后得到的指标是同样本描述，不能解释为模型的泛化性能。','散点可能重叠；同坐标的记录可以通过下方原始数据表检查。','过滤到单一类别时，部分指标分母为零，显示 —；样本量不足或特征为常数时，相关系数同样显示 —。'],
    'rows': rows
}
(ROOT/'examples/iris/report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print('Prepared 150 public Iris records')
