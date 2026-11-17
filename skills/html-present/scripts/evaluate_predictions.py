#!/usr/bin/env python3
"""Turn aligned held-out probabilities into a complete research-report artifact.

Requires numpy, scipy and scikit-learn. No model fitting (except descriptive
calibration regression). Run in the project's authorized analysis environment.
"""
import argparse
import json
import warnings
from pathlib import Path

import numpy as np
from scipy.optimize import minimize
from scipy.special import expit
from sklearn.metrics import (accuracy_score, average_precision_score,
    cohen_kappa_score, confusion_matrix, f1_score, log_loss, roc_auc_score)


def divide(a, b):
    return float(a / b) if b else None


def curve(y, p):
    order = np.argsort(-p, kind='stable')
    ys, ps = y[order], p[order]
    ends = np.r_[np.where(ps[:-1] != ps[1:])[0], len(ps)-1]
    tp = np.r_[0, np.cumsum(ys)[ends]].astype(float)
    fp = np.r_[0, (ends+1)-np.cumsum(ys)[ends]].astype(float)
    thresholds = np.r_[np.inf, ps[ends]]
    return tp / y.sum(), fp / (len(y)-y.sum()), thresholds


def capacity(y, p, fraction):
    """Fractional allocation to tied scores: invariant to row order."""
    order=np.argsort(-p,kind='stable'); ps=p[order]; ys=y[order]
    starts=np.r_[0,np.where(ps[:-1]!=ps[1:])[0]+1]
    counts=np.diff(np.r_[starts,len(p)]); positives=np.add.reduceat(ys.astype(float),starts)
    taken=np.clip(len(y)*fraction-starts,0,counts)
    return float(np.sum(taken*positives/counts)/y.sum())


def auc_only(y,p):
    tpr,fpr,_=curve(y,p)
    return float(np.sum(np.diff(fpr)*(tpr[1:]+tpr[:-1])*.5))


def thin(points,limit=250):
    a=np.asarray(points)
    return a[np.unique(np.linspace(0,len(a)-1,min(limit,len(a))).astype(int))].tolist()


def operating(y, flag, threshold=None):
    tp = int(np.sum(y & flag)); fn = int(np.sum(y & ~flag))
    fp = int(np.sum(~y & flag)); tn = int(np.sum(~y & ~flag))
    n = len(y)
    return dict(threshold=float(threshold) if threshold is not None and np.isfinite(threshold) else None,
        flags_none=bool(not flag.any()), tp=tp, fn=fn, fp=fp, tn=tn,
        sensitivity=divide(tp,tp+fn), specificity=divide(tn,tn+fp),
        ppv=divide(tp,tp+fp), npv=divide(tn,tn+fn), nne=divide(tp+fp,tp),
        flagged=divide(tp+fp,n), caught1000=1000*tp/n,
        false1000=1000*fp/n, missed1000=1000*fn/n)


def binary(y, p, own, prior, val_threshold=None, include_curves=False):
    tpr, fpr, thresholds = curve(y, p)
    si = np.where(fpr <= .1 + 1e-12)[0][-1]
    ei = np.where(tpr >= .8 - 1e-12)[0][0]
    precision = np.divide(tpr*y.sum(), tpr*y.sum()+fpr*(len(y)-y.sum()),
        out=np.ones_like(tpr), where=(tpr*y.sum()+fpr*(len(y)-y.sum()))>0)
    area = np.sum(np.diff(fpr)*(tpr[1:]+tpr[:-1])*.5)
    ap = np.sum(np.diff(tpr)*precision[1:])
    op = operating(y, own)
    bs = float(np.mean((p-y)**2)); baseline = float(np.mean((prior-y)**2))
    result = dict(auroc=float(area), auprc=float(ap), sens_at_spec=float(tpr[si]),
        spec_at_sens=float(1-fpr[ei]), own_sens=op['sensitivity'],own_spec=op['specificity'],
        own_ppv=op['ppv'], own_npv=op['npv'],cap10=capacity(y,p,.1),
        brier=bs,bss=1-bs/baseline if baseline else None)
    if include_curves:
        result.update(roc=thin(np.c_[fpr,tpr]),pr=thin(np.c_[tpr,precision]),
            ops=dict(spec=operating(y,p>=thresholds[si],thresholds[si]),
                     sens=operating(y,p>=thresholds[ei],thresholds[ei]),own=op,
                     validation=operating(y,p>=val_threshold,val_threshold)),
            mean_risk=float(p.mean()),prevalence=float(y.mean()),
            capacity=[[float(k),capacity(y,p,k)] for k in np.linspace(0,1,101)],
            capacity_table=[dict(k=k,capture=capacity(y,p,k),ppv=capacity(y,p,k)*y.mean()/k) for k in [.05,.1,.2]],
            dca=[[float(t),float(np.mean(y & (p>=t))-np.mean(~y & (p>=t))*t/(1-t))] for t in np.linspace(.01,.8,80)],
            dca_own=[[float(t),float(np.mean(y & own)-np.mean(~y & own)*t/(1-t))] for t in np.linspace(.01,.8,80)])
    return result


def multiclass(y, prob, prior):
    k = prob.shape[1]; pred = prob.argmax(axis=1)
    cm = confusion_matrix(y,pred,labels=np.arange(k))
    per = []
    for i in range(k):
        actual=y==i; flag=pred==i; op=operating(actual,flag)
        per.append(dict(**op, f1=divide(2*op['tp'],2*op['tp']+op['fp']+op['fn']) or 0,
            auroc=float(roc_auc_score(actual,prob[:,i])), auprc=float(average_precision_score(actual,prob[:,i]))))
    confidence=prob.max(axis=1); correct=pred==y
    ece=0.0
    for a,b in zip(np.linspace(0,1,11)[:-1],np.linspace(0,1,11)[1:]):
        mask=(confidence>=a)&((confidence<b) if b<1 else (confidence<=b))
        if mask.any(): ece+=mask.mean()*abs(confidence[mask].mean()-correct[mask].mean())
    adjusted=(prob/np.asarray(prior)).argmax(axis=1)
    acm=confusion_matrix(y,adjusted,labels=np.arange(k))
    return dict(cm=cm.tolist(), per_class=per, accuracy=float(correct.mean()),
        macro_f1=float(f1_score(y,pred,average='macro',zero_division=0)),
        balanced_accuracy=float(np.mean([x['sensitivity'] for x in per])),
        macro_auroc=float(np.mean([x['auroc'] for x in per])),
        macro_auprc=float(np.mean([x['auprc'] for x in per])),
        log_loss=float(log_loss(y,prob,labels=np.arange(k))),
        brier_multiclass=float(np.mean(np.sum((prob-np.eye(k)[y])**2,axis=1))),
        kappa=float(cohen_kappa_score(y,pred)), qwk=float(cohen_kappa_score(y,pred,weights='quadratic')),
        ece=float(ece), adjusted=dict(cm=acm.tolist(),
            accuracy=float(accuracy_score(y,adjusted)),
            macro_f1=float(f1_score(y,adjusted,average='macro',zero_division=0)),
            balanced_accuracy=float(np.mean(np.diag(acm)/acm.sum(axis=1)))))


def calibration(y,p):
    z=np.log(np.clip(p,1e-6,1-1e-6)/(1-np.clip(p,1e-6,1-1e-6)))
    slope=intercept=None
    if np.std(z)>1e-10:
        def loss(b):
            eta=b[0]+b[1]*z
            return np.sum(np.logaddexp(0,eta)-y*eta)
        fit=minimize(loss,[0.,1.],method='BFGS')
        if fit.success and np.max(np.abs(fit.x))<50:
            intercept,slope=map(float,fit.x)
    # Equal-frequency bins; identical probabilities stay together.
    cuts=np.unique(np.quantile(p,np.linspace(0,1,11)))
    bins=[]
    if len(cuts)==1:bins=[[float(p.mean()),float(y.mean()),len(y)]]
    for i in range(len(cuts)-1):
        mask=(p>=cuts[i])&((p<cuts[i+1]) if i<len(cuts)-2 else (p<=cuts[i+1]))
        if mask.any():bins.append([float(p[mask].mean()),float(y[mask].mean()),int(mask.sum())])
    return dict(slope=slope,intercept=intercept,bins=bins)


def validate_cohort(c):
    if not c['y'] or any(type(v) is not int for v in c['y']):raise ValueError('Labels must be integer class indices')
    y=np.array(c['y'],dtype=int); k=len(c['classes'])
    if len(y)!=len(c['sample_ids']) or len(set(c['sample_ids']))!=len(y):raise ValueError('Sample IDs must be unique and aligned')
    if set(y)!=set(range(k)):raise ValueError('Every cohort must contain every class for the provided metrics')
    if not c['positive_classes'] or not set(c['positive_classes'])<set(range(k)):raise ValueError('Positive classes must be a nonempty proper subset')
    prior=np.asarray(c['train_prior'],dtype=float)
    if len(prior)!=k or np.any(prior<=0) or not np.isclose(prior.sum(),1):raise ValueError('Invalid training prior')
    ids=[]
    if not c['models'] or all(m['family']=='Baseline' for m in c['models']):raise ValueError('At least one non-baseline model is required')
    validation_labels=c['models'][0]['validation_y']
    validation_ids=c['models'][0].get('validation_ids')
    for m in c['models']:
        ids.append(m['id'])
        if m['validation_y']!=validation_labels or m.get('validation_ids')!=validation_ids:raise ValueError('Validation records must align across models')
        if set(m['validation_y'])!=set(range(k)):raise ValueError('Validation must contain every class')
        if validation_ids is not None and (len(validation_ids)!=len(validation_labels) or len(set(validation_ids))!=len(validation_ids)):raise ValueError('Invalid validation sample IDs')
        for key,labels in [('probabilities',y),('validation_probabilities',m['validation_y'])]:
            p=np.asarray(m[key],dtype=float)
            if p.shape!=(len(labels),k) or not np.isfinite(p).all() or np.any(p<0) or np.any(p>1) or not np.allclose(p.sum(axis=1),1):raise ValueError('Invalid probability array')
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate model ID')


def evaluate(c, boots, seed):
    validate_cohort(c)
    y=np.asarray(c['y'],dtype=int); positives=c['positive_classes']; binary_y=np.isin(y,positives)
    prior=np.asarray(c['train_prior']); binary_prior=float(prior[positives].sum())
    rng=np.random.default_rng(seed)
    strata=[np.where(y==i)[0] for i in range(len(c['classes']))]
    samples=[np.concatenate([rng.choice(a,len(a),replace=True) for a in strata]) for _ in range(boots)]
    models=[]; boot_values={}; val_losses={}
    for m in c['models']:
        prob=np.asarray(m['probabilities']); p=prob[:,positives].sum(axis=1)
        own=np.isin(prob.argmax(axis=1),positives)
        vp=np.asarray(m['validation_probabilities']); vy=np.asarray(m['validation_y'],dtype=int)
        vbinary=np.isin(vy,positives); vscore=vp[:,positives].sum(axis=1)
        vt,vf,vs=curve(vbinary,vscore); vthreshold=vs[np.where(vf<=.1+1e-12)[0][-1]]
        val_losses[m['id']]=float(log_loss(vy,vp,labels=np.arange(len(prior))))
        stats=binary(binary_y,p,own,binary_prior,vthreshold,True)
        multi=multiclass(y,prob,prior)
        bs=[]
        for idx in samples:
            b=binary(binary_y[idx],p[idx],own[idx],binary_prior)
            pred=prob[idx].argmax(axis=1); cm=np.bincount(y[idx]*len(prior)+pred,minlength=len(prior)**2).reshape(len(prior),len(prior))
            recalls=np.diag(cm)/cm.sum(axis=1)
            f1s=np.divide(2*np.diag(cm),cm.sum(axis=1)+cm.sum(axis=0),out=np.zeros(len(prior)),where=cm.sum(axis=1)+cm.sum(axis=0)>0)
            b.update(accuracy=float((pred==y[idx]).mean()),macro_f1=float(f1s.mean()),balanced_accuracy=float(recalls.mean()),
                macro_auroc=float(np.mean([auc_only(y[idx]==j,prob[idx,j]) for j in range(len(prior))])))
            bs.append(b)
        keys=list(bs[0]); arrays={key:np.array([np.nan if b[key] is None else b[key] for b in bs]) for key in keys}
        cis={key:np.nanquantile(a,[.025,.975]).tolist() if np.isfinite(a).any() else [None,None] for key,a in arrays.items()}
        boot_values[m['id']]=arrays
        hist=[np.histogram(p[y==j],bins=np.linspace(0,1,21))[0].tolist() for j in range(len(prior))]
        maxp=prob.max(axis=1); ties=np.sum(np.isclose(prob,maxp[:,None],rtol=0,atol=1e-12),axis=1)>1
        unique,counts=np.unique(np.round(prob,8),axis=0,return_counts=True)
        model=dict(id=m['id'],label=m['label'],family=m['family'],**stats,ci=cis,multiclass=multi,
            calibration=calibration(binary_y,p),hist=hist,
            qc=dict(method='predict_proba',n=len(y),distinct=len(unique),most_common=float(counts.max()/len(y)),
                extreme=float((maxp>.99).mean()),ties=float(ties.mean()),valid=1.0,
                top_token_not_digit=None,digit_mass_lt_05=None,argmax_matches_top_token=None,json_valid=None),
            gallery=[dict(id=sid,y=int(y[j]),probabilities=np.round(prob[j],6).tolist()) for j,sid in enumerate(c['sample_ids']) if sid in set(c.get('gallery_ids',[]))],
            validation_loss=val_losses[m['id']],train_seconds=m.get('train_seconds'),
            inference_ms=m.get('inference_ms'),
            selective=[dict(coverage=float(k),accuracy=float((prob[np.argsort(-maxp,kind='stable')[:max(1,int(len(y)*k))]].argmax(axis=1)==y[np.argsort(-maxp,kind='stable')[:max(1,int(len(y)*k))]]).mean())) for k in np.linspace(.05,1,20)])
        models.append(model)
    candidates=[m for m in models if m['family']!='Baseline']
    ref=min(candidates,key=lambda m:val_losses[m['id']])['id']
    paired=[]
    for m in models:
        if m['id']==ref:continue
        diff={};ci={}
        reference=next(r for r in models if r['id']==ref)
        for key in ['auroc','auprc','sens_at_spec','own_sens','own_spec','cap10']:
            diff[key]=m[key]-reference[key]
            a=boot_values[m['id']][key]-boot_values[ref][key]
            ci[key]=np.quantile(a,[.025,.975]).tolist()
        paired.append(dict(id=m['id'],label=m['label'],**diff,ci=ci))
    return {key:c[key] for key in ['id','kind','task','eval_set','feature_set','classes','sample_ids','y','positive_classes','train_prior']} | dict(
        n=len(y),positives=int(binary_y.sum()),prevalence=float(binary_y.mean()),
        class_counts=np.bincount(y,minlength=len(prior)).tolist(),models=models,reference=ref,paired=paired)


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('input',type=Path);ap.add_argument('output',type=Path)
    ap.add_argument('--bootstrap',type=int,default=500);ap.add_argument('--seed',type=int,default=20261117);args=ap.parse_args()
    if args.bootstrap<100:ap.error('Use at least 100 bootstrap draws')
    raw=json.loads(args.input.read_text());assert raw['schema']=='html-present-predictions/v1'
    result={k:raw[k] for k in ['title','intro','date','source','tasks','eval_sets','feature_sets','feature_sweep','methods']}
    result.update(schema='html-present-evaluation/v1',bootstrap=args.bootstrap,seed=args.seed,cohorts=[],images=raw.get('images',{}),gallery_note=raw.get('gallery_note',''),sweep_label=raw.get('sweep_label','Number of features'))
    for i,c in enumerate(raw['cohorts']):
        print(f'Evaluating {i+1}/{len(raw["cohorts"])}: {c["id"]}',flush=True)
        result['cohorts'].append(evaluate(c,args.bootstrap,args.seed+i))
    # Python/JSON reject unavailable numbers; null is explicit and renders as a dash.
    def clean(x):
        if isinstance(x,float) and not np.isfinite(x):return None
        if isinstance(x,dict):return {k:clean(v) for k,v in x.items()}
        if isinstance(x,list):return [clean(v) for v in x]
        return x
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(clean(result),ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
    print(f'EVALUATION_COMPLETE {args.output} cohorts={len(result["cohorts"])}',flush=True)


if __name__=='__main__':main()
