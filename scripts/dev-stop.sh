#!/bin/bash
# Остановка Kodiq dev-сервера

if [ -f /tmp/kodiq-dev.pid ]; then
  PID=$(cat /tmp/kodiq-dev.pid)
  kill "$PID" 2>/dev/null
  # Также убиваем дочерние процессы (vite, cargo)
  pkill -P "$PID" 2>/dev/null
  rm -f /tmp/kodiq-dev.pid
  echo "⏹ Kodiq dev остановлен (PID: $PID)"
else
  echo "Kodiq dev не запущен"
fi
