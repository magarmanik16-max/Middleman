#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
MONGO_DIR="$ROOT_DIR/.local/mongodb"
MONGO_DATA="$ROOT_DIR/.mongo-data"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PIDS=()
MONGO_PID=""

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  for pid in "${PIDS[@]}"; do
    if [ "$(id -u)" -ne 0 ]; then
      sudo kill "$pid" 2>/dev/null || true
    else
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  # Safety net: kill any lingering Vite processes
  pkill -f "vite" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start local MongoDB if MONGODB_URI points at localhost:27017 (user-run, no root needed)
start_mongo() {
  # already running?
  if curl -s --max-time 3 http://127.0.0.1:27017/ >/dev/null 2>&1; then
    echo -e "${GREEN}→ MongoDB already running on :27017${NC}"
    return 0
  fi

  local MONGOD_BIN
  if command -v mongod >/dev/null 2>&1; then
    MONGOD_BIN="$(command -v mongod)"
  elif [ -x "$MONGO_DIR/bin/mongod" ]; then
    MONGOD_BIN="$MONGO_DIR/bin/mongod"
  else
    echo -e "${YELLOW}⚠ mongod not found (install MongoDB or place it in .local/mongodb). Backend will fail to connect.${NC}"
    return 0
  fi

  mkdir -p "$MONGO_DATA"
  echo -e "${GREEN}→ Starting MongoDB on :27017${NC}"
  "$MONGOD_BIN" --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 \
    --logpath "$MONGO_DATA/mongod.log" --fork 2>&1 | tail -2 || true

  # wait for it to accept connections
  for i in $(seq 1 20); do
    if curl -s --max-time 2 http://127.0.0.1:27017/ >/dev/null 2>&1; then
      MONGO_PID="$(pgrep -f "mongod --dbpath $MONGO_DATA" | head -1)"
      return 0
    fi
    sleep 0.5
  done
  echo -e "${YELLOW}⚠ MongoDB did not start in time.${NC}"
}

echo -e "${GREEN}Starting ManikCloud...${NC}"

start_mongo

# Ensure dependencies are installed
[ ! -d "$BACKEND_DIR/node_modules" ] && echo -e "${YELLOW}Installing backend deps...${NC}" && (cd "$BACKEND_DIR" && npm install)
[ ! -d "$FRONTEND_DIR/node_modules" ] && echo -e "${YELLOW}Installing frontend deps...${NC}" && (cd "$FRONTEND_DIR" && npm install)

# Track child PIDs so we can clean up on exit
PIDS=()

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}→ Backend on http://localhost:5000${NC}"
(cd "$BACKEND_DIR" && npm run dev) &
PIDS+=($!)

# Generate self-signed SSL certs if missing
CERTS_DIR="$ROOT_DIR/certs"
if [ ! -f "$CERTS_DIR/cert.pem" ] || [ ! -f "$CERTS_DIR/key.pem" ]; then
  mkdir -p "$CERTS_DIR"
  openssl req -x509 -newkey rsa:4096 -keyout "$CERTS_DIR/key.pem" -out "$CERTS_DIR/cert.pem" \
    -days 730 -nodes -subj "/CN=192.168.55.155" \
    -addext "subjectAltName=DNS:localhost,IP:192.168.55.155,IP:127.0.0.1" 2>/dev/null
  echo -e "${GREEN}  Self-signed SSL certs generated in certs/${NC}"
fi

# Start frontend (--host binds to LAN)
# Port 443 (HTTPS) is privileged. If not running as root, cache sudo credentials
# upfront (prompts once) so the background process doesn't garble the ui.
if [ "$(id -u)" -ne 0 ]; then
  echo -e "${YELLOW}  Frontend needs port 443 (HTTPS) — you may be prompted for sudo password.${NC}"
  sudo -v 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ sudo failed. Try running start.sh as root or set Vite to an unprivileged port.${NC}"
  }
fi

echo -e "${GREEN}→ Frontend on https://192.168.55.155 (or https://localhost)${NC}"

if [ "$(id -u)" -eq 0 ]; then
  # Already root — no sudo needed
  (cd "$FRONTEND_DIR" && npm run dev -- --host) &
else
  # Use cached sudo credentials (prompted by sudo -v above)
  (cd "$FRONTEND_DIR" && sudo -E npm run dev -- --host) &
fi
PIDS+=($!)

echo -e "${YELLOW}Press Ctrl+C to stop both.${NC}"
wait
