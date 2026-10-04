#!/usr/bin/env bash
#
# serve_mockups.sh — sobe (ou encerra) um servidor estático para uma pasta de mockups.
#
# Uso:
#   serve_mockups.sh start <dir>   # copia o harness, sobe http.server em background, imprime as URLs
#   serve_mockups.sh stop  <dir>   # encerra o servidor daquela pasta
#   serve_mockups.sh <dir>         # atalho para "start"
#
# O harness (assets/harness.html) é servido como index.html. O script escolhe uma
# porta livre a partir de 8420, guarda o PID em <dir>/.server.pid e a porta em
# <dir>/.server.port. Chamar "start" numa pasta já servida reaproveita o servidor.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_SRC="$SCRIPT_DIR/../assets/harness.html"

die() { echo "erro: $*" >&2; exit 1; }

is_alive() { kill -0 "$1" 2>/dev/null; }

network_ip() {
  # primeiro IPv4 não-loopback, se houver
  hostname -I 2>/dev/null | awk '{print $1}'
}

free_port() {
  python3 - <<'PY'
import socket
for port in range(8420, 8520):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            print(port)
            break
        except OSError:
            continue
else:
    raise SystemExit("sem porta livre no range 8420-8519")
PY
}

cmd_stop() {
  local dir="$1"
  local pidfile="$dir/.server.pid"
  if [[ -f "$pidfile" ]]; then
    local pid; pid="$(cat "$pidfile")"
    if is_alive "$pid"; then
      kill "$pid" 2>/dev/null || true
      echo "servidor encerrado (pid $pid)"
    else
      echo "nenhum servidor ativo para essa pasta"
    fi
    rm -f "$pidfile" "$dir/.server.port"
  else
    echo "nenhum servidor registrado para essa pasta"
  fi
}

cmd_start() {
  local dir="$1"
  [[ -d "$dir" ]] || die "diretório não existe: $dir"
  [[ -f "$HARNESS_SRC" ]] || die "harness não encontrado em $HARNESS_SRC"
  dir="$(cd "$dir" && pwd)"

  local pidfile="$dir/.server.pid"
  local portfile="$dir/.server.port"

  # reaproveita se já estiver de pé
  if [[ -f "$pidfile" && -f "$portfile" ]] && is_alive "$(cat "$pidfile")"; then
    print_urls "$(cat "$portfile")" "(reaproveitado)"
    return 0
  fi

  # harness vira o index.html servido
  cp "$HARNESS_SRC" "$dir/index.html"

  local port; port="$(free_port)"
  nohup python3 -m http.server "$port" --bind 0.0.0.0 --directory "$dir" \
    >"$dir/.server.log" 2>&1 &
  local pid=$!
  echo "$pid"  > "$pidfile"
  echo "$port" > "$portfile"

  # dá um instante para o servidor subir e confirma
  sleep 0.5
  is_alive "$pid" || { cat "$dir/.server.log" >&2; die "servidor não subiu"; }

  print_urls "$port" "(pid $pid)"
}

print_urls() {
  local port="$1" note="${2:-}"
  local ip; ip="$(network_ip || true)"
  echo "Mockups no ar $note"
  echo "  Desktop:  http://localhost:$port"
  if [[ -n "$ip" ]]; then
    echo "  Celular:  http://$ip:$port   (mesma rede Wi-Fi)"
  fi
}

main() {
  local action dir
  case "${1:-}" in
    start) action=start; dir="${2:-}";;
    stop)  action=stop;  dir="${2:-}";;
    "")    die "uso: serve_mockups.sh start|stop <dir>";;
    *)     action=start; dir="$1";;   # atalho: serve_mockups.sh <dir>
  esac
  [[ -n "$dir" ]] || die "informe o diretório dos mockups"

  if [[ "$action" == "stop" ]]; then
    cmd_stop "$dir"
  else
    cmd_start "$dir"
  fi
}

main "$@"