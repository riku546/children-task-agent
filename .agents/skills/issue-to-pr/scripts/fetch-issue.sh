#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <issue_number>"
  exit 1
fi

ISSUE_NUM="$1"

echo "=== Fetching Issue #${ISSUE_NUM} ==="
gh issue view "${ISSUE_NUM}" --json number,title,body,labels,url
