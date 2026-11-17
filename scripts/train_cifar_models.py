#!/usr/bin/env python3
"""Small reproducible CIFAR-10 study for interactive ML presentation."""
import base64
import io
import json
import os
import platform
import subprocess
from datetime import datetime, timezone
import tarfile
import time
import urllib.request
from pathlib import Path

import numpy as np
import sklearn
from PIL import Image, ImageFilter
from sklearn.calibration import CalibratedClassifierCV
from sklearn.decomposition import PCA
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC
from skimage.feature import hog

ROOT=Path(__file__).resolve().parents[1]
CLASSES=['airplane','automobile','bird','cat','deer','dog','frog','horse','ship','truck']
MODELS=[('logistic','Logistic regression','Linear'),('svm','Linear SVM · calibrated','Linear'),
        ('forest','Random forest','Tree'),('mlp','MLP · 64 hidden units','Neural'),('prior','Training prior','Baseline')]
TASKS=[dict(id='animal',label='动物 vs 交通工具',positive=[2,3,4,5,6,7]),dict(id='cat',label='猫 vs 其他',positive=[3])]


def model_for(mid):
    if mid=='logistic':return make_pipeline(StandardScaler(),LogisticRegression(C=.3,max_iter=350))
    if mid=='svm':return CalibratedClassifierCV(make_pipeline(StandardScaler(),LinearSVC(C=.1,dual=False,max_iter=2500)),method='sigmoid',cv=3,n_jobs=1)
    if mid=='forest':return RandomForestClassifier(n_estimators=120,max_depth=14,min_samples_leaf=2,random_state=17,n_jobs=2)
    if mid=='mlp':return make_pipeline(StandardScaler(),MLPClassifier(hidden_layer_sizes=(64,),alpha=.01,max_iter=65,early_stopping=True,validation_fraction=.15,n_iter_no_change=8,random_state=17))
    return DummyClassifier(strategy='prior')


def load_data():
    folder=ROOT/'datasets';folder.mkdir(exist_ok=True)
    archive=folder/'cifar-10-binary.tar.gz'
    if not archive.exists():urllib.request.urlretrieve('https://www.cs.toronto.edu/~kriz/cifar-10-binary.tar.gz',archive)
    # Read the documented binary format directly; no unpickling or tar extraction.
    with tarfile.open(archive) as tf:
        def read(name):
            with tf.extractfile('cifar-10-batches-bin/'+name) as f:
                a=np.frombuffer(f.read(),dtype=np.uint8).reshape(-1,3073)
            return a[:,1:].reshape(-1,3,32,32).transpose(0,2,3,1).copy(),a[:,0].copy()
        batches=[read(f'data_batch_{i}.bin') for i in range(1,6)]
        x=np.concatenate([a for a,b in batches]);y=np.concatenate([b for a,b in batches]);tx,ty=read('test_batch.bin')
    return x,y,tx,ty


def image_data(a):
    b=io.BytesIO();Image.fromarray(a).save(b,format='PNG')
    return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()


def main():
    if not os.environ.get('SLURM_JOB_ID'):raise SystemExit('Run this study on Mila through mh/Slurm.')
    X,y,TX,ty=load_data();rng=np.random.default_rng(17)
    train=[];val=[];test=[];gallery=[]
    for c in range(10):
        ids=rng.permutation(np.flatnonzero(y==c));train.extend(ids[:600]);val.extend(ids[600:800])
        ids=rng.permutation(np.flatnonzero(ty==c));test.extend(ids[:200]);gallery.extend(ids[:50])
    train=np.sort(train);val=np.sort(val);test=np.sort(test);gallery=set(gallery)
    small=np.concatenate([np.flatnonzero(ty[test]==c)[:50] for c in range(10)])
    train_x=X[train];val_x=X[val];clean=TX[test]
    noise_rng=np.random.default_rng(71)
    noise=np.clip(clean.astype(float)+noise_rng.normal(0,20,clean.shape),0,255).round().astype(np.uint8)
    blur=np.array([np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(radius=1))) for a in clean])
    raw_views={'test':clean,'subset':clean[small],'noise':noise,'blur':blur}
    ids_by={'test':test,'subset':test[small],'noise':test,'blur':test}
    labels_by={k:ty[v] for k,v in ids_by.items()}
    out=dict(schema='html-present-predictions/v1',title='同一张图片，模型为什么给出不同答案？',
        intro='CIFAR-10 图像分类研究汇报。比较线性模型、随机森林与轻量 MLP，连接总体排名、概率可信度和具体图像错误。切换特征或图像条件，并用共享选择器追踪同一组模型在各项指标上的表现。',date='2026-11-17',
        source=dict(url='https://www.cs.toronto.edu/~kriz/cifar.html',citation='Alex Krizhevsky. Learning Multiple Layers of Features from Tiny Images, 2009. CIFAR-10.',license='数据版权与使用条件遵循原始发布方；本仓库 MIT 许可仅覆盖原创代码',note='从 CIFAR-10 官方 binary archive 读取；保留官方 50,000 train / 10,000 test 边界。报告的子样本规模见方法。'),
        tasks=[dict(id=t['id'],label=t['label']) for t in TASKS],
        eval_sets=[dict(id='test',label='原图 · 2,000'),dict(id='subset',label='原图子集 · 500'),dict(id='noise',label='噪声压力测试'),dict(id='blur',label='模糊压力测试')],
        feature_sets=[dict(id='pca',label='RGB → PCA 64'),dict(id='hog',label='HOG 324')],
        images={},gallery_note='图库固定抽取 500 张测试图片（每类 50 张），在查看模型结果前确定。混淆矩阵指标基于当前完整评估集；点击后的图库只显示这 500 张中匹配的样本。噪声与模糊视图同时保留原图对照。',
        sweep_label='PCA components · clean 2,000 only',feature_sweep=[],cohorts=[],
        methods=[f'运行环境 scikit-learn {sklearn.__version__}；CPU 轻量模型，无预训练视觉模型或测试集调参。',
        '从官方训练集按类别随机抽取训练 6,000（每类 600）、验证 2,000（每类 200）；从官方测试集随机抽取评估 2,000（每类 200）。随机种子 17。原图子集为当前测试记录中每类原始 ID 最小的 50 张。其余官方数据未用于本演示。',
        '图库 500 张由采样时每类前 50 张构成，与预测结果无关。每个模型、任务和图像条件共享评估 ID。图库并非完整评估集，界面分别标出两个分母。',
        '训练只用干净图像。噪声为加性高斯噪声 σ=20/255，seed=71；模糊为 Pillow GaussianBlur(radius=1)。二者是合成压力测试，不能声称代表真实域外泛化。',
        '特征一：RGB 值除以 255，PCA 64 维（仅训练集拟合）；特征二：HOG 9 orientations、8×8 pixels/cell、2×2 cells/block、RGB channel_axis=-1，324 维。标准化仅在训练数据拟合。',
        '固定配置：Logistic C=0.3；Linear SVM C=0.1，训练集内部三折 sigmoid calibration；Random Forest 120 trees / depth 14 / min leaf 2；MLP 隐层 64，最多 65 epochs、内部 15% early stopping；另加训练先验基线。',
        '主分析先训练 10 类分类器，再合并概率计算动物 vs 交通工具、猫 vs 其他。own decision 是 10 类 argmax 是否属于目标组。二分类附录另外训练同类算法，不能与概率合并混淆。',
        '比较基准按干净验证集 log-loss 预先选定，排除 prior。bootstrap 为按真实类别分层、对所有模型使用相同重采样索引；不重新训练，表示固定模型的条件不确定性。',
        'AUROC 使用完整 ROC 梯形面积；AUPRC 使用 average precision。图上曲线最多显示 250 个阈值坐标，数值指标由未稀疏化的全部预测计算。',
        '测试集的 90% specificity / 80% sensitivity 操作点在每次 bootstrap 内重新选择，具有探索性偏差；validation threshold 只在干净验证集确定后固定应用。',
        '容量曲线在分界同分样本间按比例分配名额。净收益 TP/n−FP/n×pt/(1−pt) 只用于演示不同误报成本，没有临床决策含义。',
        '校准图使用最多 10 个等频分箱且不拆同分；直方图使用 20 个等宽箱。回归校准斜率/截距无法稳定拟合时显示 —。',
        'Selective accuracy 按最大类别概率排序，保留高置信度样本；同分时按原始样本顺序，结果描述这一确定性规则。QWK 对无序物种/物体类别没有自然距离意义，只展示指标接口。',
        '特征数曲线仅比较干净 2,000 测试图像上的 Logistic Regression 与 Random Forest，在同一训练集拟合的 PCA 前 16/32/64 维上分别训练。',
        '质检对象为 predict_proba：有效概率、重复向量、最大概率与并列；不存在 LLM token 或 JSON 推理输出，因此这些专属字段为不适用。训练耗时包含该模型的拟合，推理耗时为当前批次每张图片的平均值，不含图像特征提取。'])
    gallery_ids={f'test-{i}' for i in gallery}
    for ev,ims in raw_views.items():
        out['images'][ev]={f'test-{int(sid)}':image_data(im) for sid,im in zip(ids_by[ev],ims) if sid in gallery}
    t=time.perf_counter();pca=PCA(n_components=64,svd_solver='randomized',random_state=17)
    pca_train=pca.fit_transform(train_x.reshape(len(train),-1).astype(float)/255)
    pca_val=pca.transform(val_x.reshape(len(val),-1).astype(float)/255)
    pca_eval={k:pca.transform(a.reshape(len(a),-1).astype(float)/255) for k,a in raw_views.items()}
    print(f'FEATURES_READY PCA seconds={time.perf_counter()-t:.1f}',flush=True)
    def hogs(ims):return np.array([hog(a,orientations=9,pixels_per_cell=(8,8),cells_per_block=(2,2),channel_axis=-1) for a in ims])
    t=time.perf_counter();hog_train=hogs(train_x);hog_val=hogs(val_x);hog_eval={k:hogs(a) for k,a in raw_views.items()}
    print(f'FEATURES_READY HOG dimensions={hog_train.shape[1]} seconds={time.perf_counter()-t:.1f}',flush=True)
    for feat,fx,fv,fe in [('pca',pca_train,pca_val,pca_eval),('hog',hog_train,hog_val,hog_eval)]:
        main_models={};binary_models={}
        for task in [None]+TASKS:
            truth=y if task is None else np.isin(y,task['positive']).astype(int)
            pool={}
            for mid,label,family in MODELS:
                started=time.perf_counter();model=model_for(mid).fit(fx,truth[train]);elapsed=time.perf_counter()-started
                vp=model.predict_proba(fv);preds={}
                for ev,a in fe.items():
                    started=time.perf_counter();p=model.predict_proba(a);ms=(time.perf_counter()-started)*1000/len(a);preds[ev]=(p,ms)
                pool[mid]=(vp,preds,elapsed)
                print(f'MODEL_READY feature={feat} task={task["id"] if task else "10class"} model={mid} seconds={elapsed:.1f}',flush=True)
            if task is None:main_models=pool
            else:binary_models[task['id']]=pool
        for task in TASKS:
            for ev in raw_views:
                for kind,pool,classes,positive in [('main',main_models,CLASSES,task['positive']),('binary',binary_models[task['id']],['其他','目标'],[1])]:
                    target_y=labels_by[ev] if kind=='main' else np.isin(labels_by[ev],task['positive']).astype(int)
                    train_y=y[train] if kind=='main' else np.isin(y[train],task['positive']).astype(int)
                    val_y=y[val] if kind=='main' else np.isin(y[val],task['positive']).astype(int)
                    c=dict(id=f'{kind}/{task["id"]}/{ev}/{feat}',kind=kind,task=task['id'],eval_set=ev,feature_set=feat,classes=classes,
                        sample_ids=[f'test-{i}' for i in ids_by[ev]],y=target_y.tolist(),positive_classes=positive,
                        train_prior=(np.bincount(train_y,minlength=len(classes))/len(train_y)).tolist(),gallery_ids=sorted(gallery_ids),models=[])
                    for mid,label,family in MODELS:
                        vp,ps,seconds=pool[mid];p,ms=ps[ev]
                        c['models'].append(dict(id=mid,label=label,family=family,probabilities=p.tolist(),validation_probabilities=vp.tolist(),validation_y=val_y.tolist(),validation_ids=[f'train-{i}' for i in val],train_seconds=seconds,inference_ms=ms))
                    out['cohorts'].append(c)
    for mid in ['logistic','forest']:
        for k in [16,32,64]:
            model=model_for(mid).fit(pca_train[:,:k],y[train]);p=model.predict_proba(pca_eval['test'][:,:k])
            out['feature_sweep'].append(dict(model=mid,label=next(m[1] for m in MODELS if m[0]==mid),family=next(m[2] for m in MODELS if m[0]==mid),k=k,eval_set='test',macro_auroc=float(roc_auc_score(labels_by['test'],p,multi_class='ovr',average='macro'))))
    dest=ROOT/'outputs/cifar';dest.mkdir(parents=True,exist_ok=True)
    (dest/'predictions.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
    (dest/'run.json').write_text(json.dumps(dict(job_id=os.environ['SLURM_JOB_ID'],partition=os.environ.get('SLURM_JOB_PARTITION'),python=platform.python_version(),sklearn=sklearn.__version__,numpy=np.__version__,git_revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),completed_at=datetime.now(timezone.utc).isoformat(),train_n=len(train),validation_n=len(val),test_n=len(test),seed=17),indent=2)+'\n')
    (dest/'splits.json').write_text(json.dumps(dict(train=train.tolist(),validation=val.tolist(),test=test.tolist(),gallery=sorted(gallery)),indent=2)+'\n')
    print(f'TRAINING_COMPLETE {dest} cohorts={len(out["cohorts"])}',flush=True)


if __name__=='__main__':main()
