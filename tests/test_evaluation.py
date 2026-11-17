"""Independent numeric checks; run on the authorized ML compute host."""
import importlib.util
import unittest
from pathlib import Path
import numpy as np
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, confusion_matrix

spec=importlib.util.spec_from_file_location('evaluation',Path(__file__).resolve().parents[1]/'skills/html-present/scripts/evaluate_predictions.py')
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)

class EvaluationTests(unittest.TestCase):
    def test_rank_metrics_with_ties(self):
        y=np.array([0,1,0,1,1,0,0,1],bool);p=np.array([.1,.1,.4,.4,.8,.8,.8,.9])
        r=e.binary(y,p,p>=.5,.5,include_curves=False)
        self.assertAlmostEqual(r['auroc'],roc_auc_score(y,p))
        self.assertAlmostEqual(r['auprc'],average_precision_score(y,p))
        self.assertAlmostEqual(r['brier'],brier_score_loss(y,p))
    def test_prior_and_fractional_ties(self):
        y=np.array([0,0,1,0,1],bool);p=np.full(5,.4)
        r=e.binary(y,p,np.zeros(5,bool),.4)
        self.assertAlmostEqual(r['auroc'],.5)
        self.assertAlmostEqual(r['auprc'],.4)
        self.assertAlmostEqual(e.capacity(y,p,.1),.1)
        self.assertAlmostEqual(e.capacity(y[::-1],p,.1),.1)
        self.assertIsNone(r['own_ppv'])
        self.assertAlmostEqual(r['bss'],0)
    def test_decision_rules_and_confusion(self):
        y=np.array([0,0,1,1,2,2]);p=np.array([[.7,.2,.1],[.2,.5,.3],[.2,.6,.2],[.1,.3,.6],[.1,.2,.7],[.6,.3,.1]])
        multi=e.multiclass(y,p,[1/3]*3)
        self.assertEqual(multi['cm'],confusion_matrix(y,p.argmax(1)).tolist())
        yy=y==2;z=p[:,2];r=e.binary(yy,z,p.argmax(1)==2,1/3,.65,True)
        self.assertGreaterEqual(r['ops']['spec']['specificity'],.9)
        self.assertGreaterEqual(r['ops']['sens']['sensitivity'],.8)
        self.assertEqual(r['ops']['validation']['tp'],1)
        self.assertEqual(r['ops']['validation']['fp'],0)
    def test_reject_misaligned_probabilities(self):
        c=dict(y=[0,1],sample_ids=['a','b'],classes=['a','b'],positive_classes=[1],train_prior=[.5,.5],models=[dict(id='m',probabilities=[[.6,.6],[.4,.6]],validation_y=[0,1],validation_probabilities=[[.6,.4],[.4,.6]])])
        with self.assertRaises(ValueError):e.validate_cohort(c)
    def test_paired_identical_models(self):
        y=[0,0,0,1,1,1];p=[[.8,.2],[.6,.4],[.4,.6],[.2,.8],[.3,.7],[.55,.45]]
        def m(mid):return dict(id=mid,label=mid,family='Linear',probabilities=p,validation_probabilities=p,validation_y=y)
        c=dict(id='test',kind='main',task='t',eval_set='test',feature_set='f',classes=['0','1'],sample_ids=list('abcdef'),y=y,positive_classes=[1],train_prior=[.5,.5],models=[m('a'),m('b')],gallery_ids=['a'])
        r=e.evaluate(c,100,17)
        for interval in r['paired'][0]['ci'].values():self.assertEqual(interval,[0.,0.])
        self.assertEqual(len(r['models'][0]['gallery']),1)

if __name__=='__main__':unittest.main(verbosity=2)
