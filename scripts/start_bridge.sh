#!/bin/bash
# Скрипт для запуска моста TCP<->WebSocket в фоновом режиме

echo "Проверка зависимостей..."
npm list ws &>/dev/null || npm install ws

echo "Запуск TCP моста в фоновом режиме..."
nohup node /app/scripts/tcp_bridge.js > /app/scripts/tcp_bridge.log 2>&1 &

# Получаем PID процесса
BRIDGE_PID=$!
echo "TCP мост запущен с PID: $BRIDGE_PID"
echo $BRIDGE_PID > /app/scripts/tcp_bridge.pid

echo "Логи доступны в файле: /app/scripts/tcp_bridge.log"
