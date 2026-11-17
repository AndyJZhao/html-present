#!/bin/bash
set -euo pipefail
: "${SLURM_JOB_ID:?Run through Mila Slurm}"
set +u
source /etc/profile
set -u
module load python/3.10
# CVMFS Python does not discover the distribution certificate store itself.
if [ -f /etc/ssl/certs/ca-certificates.crt ]; then
  export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
fi
export OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 MKL_NUM_THREADS=2
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -u scripts/train_cifar_models.py
.venv/bin/python -u skills/html-present/scripts/evaluate_predictions.py outputs/cifar/predictions.json outputs/cifar/report.json --bootstrap 500
.venv/bin/python skills/html-present/scripts/build_report.py outputs/cifar/report.json outputs/cifar/report.html
printf 'STUDY_COMPLETE\n'
