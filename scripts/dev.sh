#!/bin/bash
# Kodiq Dev Launcher — запускает tauri dev в фоне, терминал можно закрыть
# Использование: ./scripts/dev.sh  или  npm run dev:bg

cd "$(dirname "$0")/.." || exit 1

LOG_FILE="/tmp/kodiq-dev.log"

# Убить предыдущий процесс, если есть
if [ -f /tmp/kodiq-dev.pid ]; then
  OLD_PID=$(cat /tmp/kodiq-dev.pid)
  kill "$OLD_PID" 2>/dev/null
  rm -f /tmp/kodiq-dev.pid
fi

echo "🚀 Запуск Kodiq dev..."
echo "   Логи: $LOG_FILE"
echo "   Стоп: npm run dev:stop"

# Запуск в фоне, отвязываем от терминала
nohup npm run tauri:dev > "$LOG_FILE" 2>&1 &
DEV_PID=$!
echo "$DEV_PID" > /tmp/kodiq-dev.pid

echo "   PID: $DEV_PID"
echo ""
echo "✅ Kodiq запущен. Терминал можно закрыть."
