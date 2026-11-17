#!/usr/bin/env python3
"""Generate real held-out Iris predictions. Run under Slurm on Mila by policy."""
import csv
import importlib.util
import json
from pathlib import Path
import numpy as np
import sklearn
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis,QuadraticDiscriminantAnalysis
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier,ExtraTreesClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT=Path(__file__).resolve().parents[1]
CLASS=['Setosa','Versicolor','Virginica']
MODELS=[('logistic','Logistic L2','Linear'),('lda','Linear discriminant','Linear'),
 ('qda','Quadratic discriminant','Probabilistic'),('nb','Gaussian naive Bayes','Probabilistic'),
 ('knn','5-nearest neighbors','Neighbors'),('forest','Random forest','Tree'),
 ('extra','Extra trees','Tree'),('prior','Training prior','Baseline')]
FEATURES=[dict(id='all',label='全部 4 项',columns=[0,1,2,3]),dict(id='petal',label='花瓣 2 项',columns=[2,3]),dict(id='sepal',label='花萼 2 项',columns=[0,1])]
TASKS=[dict(id='virginica',label='Virginica vs 其他',positive=[2]),dict(id='nonsetosa',label='非 Setosa vs Setosa',positive=[1,2])]


def estimator(mid):
    models={
     'logistic':make_pipeline(StandardScaler(),LogisticRegression(C=1,max_iter=1000)),
     'lda':LinearDiscriminantAnalysis(),
     'qda':QuadraticDiscriminantAnalysis(reg_param=.1),
     'nb':GaussianNB(),
     'knn':make_pipeline(StandardScaler(),KNeighborsClassifier(n_neighbors=5)),
     'forest':RandomForestClassifier(n_estimators=160,max_depth=4,random_state=17,n_jobs=1),
     'extra':ExtraTreesClassifier(n_estimators=160,max_depth=4,random_state=17,n_jobs=1),
     'prior':DummyClassifier(strategy='prior')}
    return models[mid]


def main():
    data=[r for r in csv.reader((ROOT/'data/iris.data').read_text().splitlines()) if r]
    X=np.array([[float(v) for v in r[:4]] for r in data]);y=np.array([CLASS.index(r[4].removeprefix('Iris-').capitalize()) for r in data])
    train,other=train_test_split(np.arange(len(y)),train_size=.5,random_state=17,stratify=y)
    val,test=train_test_split(other,test_size=.6,random_state=23,stratify=y[other])
    subset=np.concatenate([np.sort(test[y[test]==i])[:10] for i in range(3)])
    splits={'test':np.sort(test),'subset':np.sort(subset)}
    out=dict(schema='html-present-predictions/v1',title='从分类到决策：Iris 模型评估交互报告',
        intro='在同一批独立测试样本上比较 7 个分类器与先验基线。切换任务、测试范围和特征，检查排名、阈值决策、有限容量、概率校准与不确定性。模型选择在 ROC、PR、容量与净收益图之间共享。',
        date='2026-11-17',source=dict(url='https://archive.ics.uci.edu/dataset/53/iris',
        citation='Fisher, R. (1936). Iris. UCI Machine Learning Repository. DOI: 10.24432/C56C76',license='CC BY 4.0',
        note='UCI iris.data 原始版本；保留第 35、38 条与 Fisher 原文的已知差异。'),
        tasks=[{k:v for k,v in t.items() if k!='positive'} for t in TASKS],
        eval_sets=[dict(id='test',label='测试集 · 45 条'),dict(id='subset',label='固定子集 · 30 条')],
        feature_sets=[dict(id=f['id'],label=f['label']) for f in FEATURES],feature_sweep=[],cohorts=[],
        methods=[f'软件：scikit-learn {sklearn.__version__}。全部模型均使用明确固定的超参数；没有利用测试集调参。',
        '分层划分：训练 75、验证 30、测试 45 条，每个原始类别分别 25、10、15 条。random_state=17/23。子集取测试集中每类原始 ID 最小的 10 条，不依据模型结果选择。',
        '各模型使用相同划分与同一评估集的样本顺序。StandardScaler 只在训练集上拟合。原始数据无缺失值。',
        '主分析的二分类风险由三分类概率相加得到；own decision 是三分类 argmax 是否落在目标类别中。附录另行训练直接二分类模型。',
        '比较基准在每个任务、特征配置内按验证集多分类 log-loss 最小选择，排除先验基线；不在测试集上选择基准。',
        '95% CI 为按原始类别分层、配对重采样测试记录的百分位 bootstrap；不重新拟合模型，只描述固定已训练模型的条件评估不确定性。每个 cohort 的所有模型共享完全相同的重采样。',
        'AUROC 用完整阈值 ROC 的梯形面积；AUPRC 使用 average precision（非梯形 PR 面积）。90% 特异度点取满足约束的最低阈值；80% 敏感度点取满足约束的最高阈值。每个 bootstrap 内重新选择这两个测试集操作点。',
        '验证阈值仅在验证集选取 90% 特异度点，然后固定应用到测试集；测试集操作点具有探索性乐观偏差。',
        '容量曲线对分界分数相同的样本按比例分配名额；净收益为 TP/n − FP/n × pt/(1−pt)。这是教学决策分析，没有临床含义。',
        '校准使用最多 10 个等频分箱，相同预测值不拆分；回归 logit 风险估计 slope/intercept，无法稳定拟合时显示 —。概率直方图为 20 个等宽箱，按真实类别归一化。',
        '特征数量曲线按预先指定顺序：花瓣长度、花瓣宽度、花萼长度、花萼宽度。没有把特征数增加误写成同一模型的实时训练。',
        'Iris 三分类先验均为 1/3，因此三分类先验调整 argmax 与原始 argmax 相同；直接二分类任务的先验不均衡。QWK 将类索引视为有序，仅为功能示例，不应据此解释物种距离。',
        '模型输出质检在本例检查 predict_proba 的有效性、重复、最大概率与并列。LLM token/JSON 指标无数据，因此显示不适用，未伪造 LLM 结果。'])
    for feat in FEATURES:
        cols=feat['columns'];trained={}
        for mid,label,family in MODELS:
            model=estimator(mid).fit(X[train][:,cols],y[train]);trained[mid]=(model.predict_proba(X[:,cols]),model.predict_proba(X[val][:,cols]))
        for task in TASKS:
            pos=task['positive'];by=np.isin(y,pos).astype(int);binary_models={}
            for mid,label,family in MODELS:
                model=estimator(mid).fit(X[train][:,cols],by[train]);binary_models[mid]=(model.predict_proba(X[:,cols]),model.predict_proba(X[val][:,cols]))
            for ev,ids in splits.items():
                for kind,labels,target,truth,pool in [('main',CLASS,pos,y,trained),('binary',['其他','目标'],[1],by,binary_models)]:
                    c=dict(id=f'{kind}/{task["id"]}/{ev}/{feat["id"]}',kind=kind,task=task['id'],eval_set=ev,feature_set=feat['id'],
                        classes=labels,sample_ids=(ids+1).tolist(),y=truth[ids].tolist(),positive_classes=target,
                        train_prior=(np.bincount(truth[train],minlength=len(labels))/len(train)).tolist(),models=[])
                    for mid,label,family in MODELS:
                        p,vp=pool[mid];c['models'].append(dict(id=mid,label=label,family=family,probabilities=p[ids].tolist(),
                            validation_probabilities=vp.tolist(),validation_y=truth[val].tolist()))
                    out['cohorts'].append(c)
        print(f'PREDICTIONS_READY features={feat["id"]} train=75 val=30 test=45',flush=True)
    for mid,label,family in MODELS:
        for k in range(1,5):
            cols=[2,3,0,1][:k];model=estimator(mid).fit(X[train][:,cols],y[train])
            for ev,ids in splits.items():
                p=model.predict_proba(X[ids][:,cols]);auc=np.mean([roc_auc_score(y[ids]==j,p[:,j]) for j in range(3)])
                out['feature_sweep'].append(dict(model=mid,label=label,family=family,k=k,eval_set=ev,macro_auroc=float(auc)))
    dest=ROOT/'examples/iris/predictions.json';dest.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
    (ROOT/'examples/iris/splits.json').write_text(json.dumps({k:(v+1).tolist() for k,v in dict(train=np.sort(train),validation=np.sort(val),test=np.sort(test),subset=np.sort(subset)).items()},indent=2)+'\n')
    print(f'TRAINING_COMPLETE {dest}',flush=True)


if __name__=='__main__':main()
