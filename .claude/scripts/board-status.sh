#!/usr/bin/env bash
#
# board-status.sh — muda o status de uma issue no project "Board de Atividades".
#
# Uso: board-status.sh <número da issue> "To Do"|"Doing"|"Code Review"

set -euo pipefail

OWNER="carloseduardorocha"
PROJECT_NUMBER=1
PROJECT_ID="PVT_kwHOAvWtLM4Blnxh"
STATUS_FIELD_ID="PVTSSF_lAHOAvWtLM4BlnxhzhkT55s"

die() { echo "erro: $*" >&2; exit 1; }

[[ $# -eq 2 ]] || die "uso: board-status.sh <issue> \"To Do\"|\"Doing\"|\"Code Review\""
issue="$1"
status="$2"

case "$status" in
  "To Do")       option_id="61e4505c" ;;
  "Doing")       option_id="47fc9ee4" ;;
  "Code Review") option_id="df73e18b" ;;
  *) die "status inválido: $status" ;;
esac

item_id="$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --limit 500 \
  --jq ".items[] | select(.content.number == $issue) | .id")"
[[ -n "$item_id" ]] || die "issue #$issue não está no board"

gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
  --field-id "$STATUS_FIELD_ID" --single-select-option-id "$option_id" >/dev/null

echo "#$issue → $status"
