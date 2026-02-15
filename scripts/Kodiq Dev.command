#!/bin/bash
# Двойной клик → Kodiq запускается, терминал закрывается
cd "$(dirname "$0")/.." || exit 1

LOG_FILE="/tmp/kodiq-dev.log"

# Убить предыдущий, если есть
[ -f /tmp/kodiq-dev.pid ] && kill "$(cat /tmp/kodiq-dev.pid)" 2>/dev/null

nohup npm run tauri:dev > "$LOG_FILE" 2>&1 &
echo "$!" > /tmp/kodiq-dev.pid

# Закрыть окно Terminal через 2 секунды
sleep 2
osascript -e 'tell application "Terminal" to close front window' 2>/dev/null &

exit 0
