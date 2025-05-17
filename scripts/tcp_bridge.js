// TCP Bridge Server для связи между веб-приложением и контроллером отеля
const WebSocket = require('ws');
const net = require('net');
const http = require('http');

// Конфигурация контроллера
const CONTROLLER_IP = '192.168.1.100';
const CONTROLLER_PORT = 7000;
const CONTROLLER_TOKEN = 'SNQaq6KVIQQMHR3x';

// Информация о контроллере
const CONTROLLER_INFO = {
  ip: CONTROLLER_IP,
  mac: 'A2:DD:6C:98:2E:58',
  bleName: 'ROOM_19',
  token: CONTROLLER_TOKEN
};

// Конфигурация WebSocket сервера
const WS_PORT = 7001;

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('TCP Bridge Server Running\n');
});

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

console.log(`TCP Bridge Server запущен на порту ${WS_PORT}`);
console.log(`Подключение к контроллеру: ${CONTROLLER_IP}:${CONTROLLER_PORT}`);

// Обработка WebSocket подключений
wss.on('connection', (ws) => {
  console.log('WebSocket клиент подключен');
  
  // Создаем TCP соединение с контроллером
  const tcpClient = new net.Socket();
  let isConnected = false;
  
  // Вывод расширенной отладочной информации о подключении
  console.log(`Попытка подключения к контроллеру: ${CONTROLLER_IP}:${CONTROLLER_PORT}`);
  console.log('Локальный сетевой интерфейс:');
  require('child_process').exec('ifconfig', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(stdout);
  });
  
  // Обработка подключения к контроллеру
  tcpClient.connect({
    port: CONTROLLER_PORT,
    host: CONTROLLER_IP,
    timeout: 10000 // Увеличиваем таймаут подключения до 10 секунд
  }, () => {
    console.log(`Подключено к контроллеру ${CONTROLLER_IP}:${CONTROLLER_PORT}`);
    isConnected = true;
    
    // Отправляем информацию о успешном подключении клиенту
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      message: 'Подключено к контроллеру'
    }));
  });
  
  // Обработка данных от контроллера
  let buffer = ''; // Буфер для накопления данных
  
  tcpClient.on('data', (data) => {
    // Преобразуем данные в строку
    const dataStr = data.toString();
    buffer += dataStr;
    
    // Пытаемся разобрать полученные данные как JSON
    try {
      // Проверяем, есть ли конец сообщения
      if (buffer.includes('\n')) {
        // Разделяем буфер на сообщения
        const messages = buffer.split('\n');
        // Последний элемент может быть неполным сообщением, оставляем его в буфере
        buffer = messages.pop();
        
        // Обрабатываем все полные сообщения
        for (const msg of messages) {
          if (msg.trim()) {
            const parsedData = JSON.parse(msg);
            console.log('Получено от контроллера:', parsedData);
            
            // Добавляем токен, если его нет в ответе
            if (!parsedData.token && parsedData.type === 'info') {
              parsedData.token = CONTROLLER_TOKEN;
            }
            
            // Отправляем данные клиенту
            ws.send(JSON.stringify(parsedData));
          }
        }
      }
    } catch (error) {
      console.error('Ошибка разбора данных от контроллера:', error);
      console.log('Полученные данные:', buffer);
    }
  });
  
  // Обработка ошибок TCP подключения
  tcpClient.on('error', (error) => {
    console.error('Ошибка TCP соединения:', error);
    
    // Отправляем информацию об ошибке клиенту
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'error',
      message: `Ошибка соединения с контроллером: ${error.message}. Проверьте, что ваш компьютер находится в подсети 192.168.1.X.`
    }));
    
    isConnected = false;

    // Имитация успешного подключения для тестирования (mock-режим)
    console.log('Переключение в режим симуляции (mock)');
    
    // Отправляем виртуальное сообщение о успешном подключении
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'mock_connected',
        message: 'Подключено к виртуальному контроллеру (режим симуляции)'
      }));
      
      // Отправляем виртуальную информацию о контроллере
      ws.send(JSON.stringify({
        type: 'info',
        mac: CONTROLLER_INFO.mac,
        ip: CONTROLLER_INFO.ip,
        ble_name: CONTROLLER_INFO.bleName,
        token: CONTROLLER_INFO.token,
        version: '1.0.0-mock'
      }));
      
      // Отправляем виртуальное состояние комнаты
      ws.send(JSON.stringify({
        type: 'state',
        state: {
          lightsOn: false,
          doorLocked: true,
          channel1: false,
          channel2: false,
          temperature: 23,
          humidity: 45,
          pressure: 1013
        }
      }));
      
      isConnected = true; // Помечаем как подключенное в режиме симуляции
    }, 1000);
  });
  
  // Обработка закрытия TCP соединения
  tcpClient.on('close', () => {
    console.log('TCP соединение закрыто');
    
    // Отправляем информацию о закрытии соединения клиенту
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'disconnected',
        message: 'Соединение с контроллером закрыто'
      }));
    }
    
    isConnected = false;
  });
  
  // Обработка сообщений от клиента
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Получено от клиента:', data);
      
      // Добавляем токен аутентификации, если его нет
      if (!data.token) {
        data.token = CONTROLLER_TOKEN;
      }
      
      // Отправляем данные контроллеру, если соединение активно
      if (isConnected) {
        tcpClient.write(JSON.stringify(data) + '\n');
      } else {
        // Пытаемся переподключиться
        console.log('Попытка переподключения к контроллеру...');
        tcpClient.connect(CONTROLLER_PORT, CONTROLLER_IP);
        
        // Помещаем сообщение в очередь для отправки после подключения
        tcpClient.once('connect', () => {
          tcpClient.write(JSON.stringify(data) + '\n');
        });
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения от клиента:', error);
    }
  });
  
  // Обработка закрытия WebSocket соединения
  ws.on('close', () => {
    console.log('WebSocket клиент отключен');
    // Закрываем TCP соединение
    tcpClient.destroy();
  });
});

// Запускаем сервер
server.listen(WS_PORT, () => {
  console.log(`TCP Bridge Server запущен на http://localhost:${WS_PORT}`);
});
