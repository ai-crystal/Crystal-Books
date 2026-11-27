#!/usr/bin/env bash
# 静默更新（git-bash / WSL 手动用）：输出追加到 tools/sitegen/update.log
cd "$(dirname "$0")/../.." || exit 1
PY="${PY:-/c/Users/Administrator/AppData/Local/Programs/Python/Python312/python.exe}"
{
  echo
  echo "[$(date '+%Y-%m-%d %H:%M:%S')]"
  PYTHONIOENCODING=utf-8 "$PY" tools/sitegen/update_site.py
} >> tools/sitegen/update.log 2>&1
