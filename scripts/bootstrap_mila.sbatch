#!/bin/bash
#SBATCH --job-name=html-present-bootstrap
#SBATCH --partition=long-cpu
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --time=00:30:00
#SBATCH --output=/network/scratch/j/jianan.zhao/html-present-bootstrap-%j.out
set -euo pipefail
: "${SLURM_JOB_ID:?Run through Slurm}"
project_root=/network/scratch/j/jianan.zhao/html-present
if [ ! -d "$project_root" ]; then
  git clone https://github.com/AndyJZhao/html-present.git "$project_root"
fi
cd "$project_root"
export PIP_CACHE_DIR="$project_root/.cache/pip"
mkdir -p configs/user
if ! grep -qxF "configs/user/" .git/info/exclude; then
  echo "configs/user/" >> .git/info/exclude
fi
if [ ! -e configs/user/env.yaml ]; then
  umask 077
  echo "{}" > configs/user/env.yaml
fi
set +u
source /etc/profile
set -u
module load python/3.10
python --version
python -m venv --clear .venv
.venv/bin/python -m pip install -r requirements-analysis.txt
.venv/bin/python -m py_compile scripts/train_cifar_models.py skills/html-present/scripts/evaluate_predictions.py
echo BOOTSTRAP_COMPLETE
