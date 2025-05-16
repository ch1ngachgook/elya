const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const net = require('net');
const { v4: uuidv4 } = require('uuid');

// Настройки
const WS_PORT = 7001;          // Порт WebSocket сервера
const CONTROLLER_IP = '127.0.0.1'; // IP контроллера (localhost для имитации)
const CONTROLLER_PORT = 7000;  // Порт TCP-контроллера

// Имитация данных состояния комнаты
const roomStates = {};

// Генерируем имитационные данные для комнат с номерами 101, 102, 103, 201, 202
const initializeRoomState = (roomId) => {
  const base = {
    lightsOn: false,
    doorLocked: true,
    channel1: false,
    channel2: false,
    temperature: 22 + Math.floor(Math.random() * 4), // 22-25°C
    humidity: 40 + Math.floor(Math.random() * 20),   // 40-60%
    pressure: 1010 + Math.floor(Math.random() * 10), // 1010-1020 гПа
    lastUpdated: new Date().toISOString()
  };
  
  // Сохраняем состояние комнаты
  roomStates[roomId] = base;
  return base;
};

// Инициализация начальных состояний
['101', '102', '103', '201', '202'].forEach(roomId => {
  initializeRoomState(roomId);
});

// Токен контроллера для имитации авторизации
const controllerToken = uuidv4();
console.log(`Generated controller token: ${controllerToken}`);

// Создаем Express приложение
const app = express();
const server = http.createServer(app);

// Простой обработчик для проверки работы сервера
app.get('/', (req, res) => {
  res.send('Hotel Controller Bridge is running');
});

// Имитация TCP-контроллера
const mockController = net.createServer((socket) => {
  console.log('TCP client connected');
  
  socket.on('data', (data) => {
    try {
      const command = JSON.parse(data.toString());
      console.log('Received TCP command:', command);
      
      // Проверка токена
      if (command.type !== 'get_info' && command.token !== controllerToken) {
        socket.write(JSON.stringify({
          status: 'error',
          message: 'Invalid token'
        }));
        return;
      }
      
      // Обработка команд
      handleControllerCommand(command, (response) => {
        socket.write(JSON.stringify(response));
      });
    } catch (error) {
      console.error('Error processing TCP command:', error);
      socket.write(JSON.stringify({
        status: 'error',
        message: 'Invalid command format'
      }));
    }
  });
  
  socket.on('close', () => {
    console.log('TCP client disconnected');
  });
  
  socket.on('error', (err) => {
    console.error('TCP socket error:', err);
  });
});

// Обработчик команд контроллера
const handleControllerCommand = (command, sendResponse) => {
  switch (command.type) {
    case 'get_info':
      sendResponse({
        type: 'info',
        mac: '00:11:22:33:44:55',
        ip: CONTROLLER_IP,
        ble_name: 'HotelController',
        version: '1.0.0',
        token: controllerToken
      });
      break;
      
    case 'get_state':
      if (!command.roomId) {
        sendResponse({
          status: 'error',
          message: 'Room ID is required'
        });
        return;
      }
      
      const roomState = roomStates[command.roomId] || initializeRoomState(command.roomId);
      sendResponse({
        type: 'state',
        roomId: command.roomId,
        state: roomState
      });
      break;
      
    case 'set_state':
      if (command.global) {
        // Глобальное изменение для всех комнат
        Object.keys(roomStates).forEach(roomId => {
          roomStates[roomId] = {
            ...roomStates[roomId],
            ...command.state,
            lastUpdated: new Date().toISOString()
          };
        });
        
        sendResponse({
          status: 'success',
          message: 'Global state updated'
        });
      } else if (command.roomId) {
        // Проверяем существование комнаты
        if (!roomStates[command.roomId]) {
          initializeRoomState(command.roomId);
        }
        
        // Обновляем состояние комнаты
        roomStates[command.roomId] = {
          ...roomStates[command.roomId],
          ...command.state,
          lastUpdated: new Date().toISOString()
        };
        
        sendResponse({
          type: 'state',
          roomId: command.roomId,
          state: roomStates[command.roomId]
        });
      } else {
        sendResponse({
          status: 'error',
          message: 'Room ID is required'
        });
      }
      break;
      
    case 'door_unlock':
      if (!command.roomId) {
        sendResponse({
          status: 'error',
          message: 'Room ID is required'
        });
        return;
      }
      
      // Проверяем существование комнаты
      if (!roomStates[command.roomId]) {
        initializeRoomState(command.roomId);
      }
      
      // Разблокируем дверь
      roomStates[command.roomId].doorLocked = false;
      roomStates[command.roomId].lastUpdated = new Date().toISOString();
      
      sendResponse({
        status: 'success',
        message: 'Door unlocked',
        roomId: command.roomId,
        state: roomStates[command.roomId]
      });
      
      // Возвращаем дверь в закрытое состояние через 5 секунд
      setTimeout(() => {
        roomStates[command.roomId].doorLocked = true;
        roomStates[command.roomId].lastUpdated = new Date().toISOString();
      }, 5000);
      break;
      
    case 'door_lock':
      if (!command.roomId) {
        sendResponse({
          status: 'error',
          message: 'Room ID is required'
        });
        return;
      }
      
      // Проверяем существование комнаты
      if (!roomStates[command.roomId]) {
        initializeRoomState(command.roomId);
      }
      
      // Блокируем дверь
      roomStates[command.roomId].doorLocked = true;
      roomStates[command.roomId].lastUpdated = new Date().toISOString();
      
      sendResponse({
        status: 'success',
        message: 'Door locked',
        roomId: command.roomId,
        state: roomStates[command.roomId]
      });
      break;
      
    default:
      sendResponse({
        status: 'error',
        message: 'Unknown command'
      });
  }
};

// Периодически обновляем данные сенсоров для имитации реальных показаний
setInterval(() => {
  Object.keys(roomStates).forEach(roomId => {
    // Небольшие случайные колебания температуры
    roomStates[roomId].temperature = Math.max(18, Math.min(28, 
      roomStates[roomId].temperature + (Math.random() * 0.4 - 0.2)
    ));
    
    // Небольшие случайные колебания влажности
    roomStates[roomId].humidity = Math.max(30, Math.min(70,
      roomStates[roomId].humidity + (Math.random() * 2 - 1)
    ));
    
    // Небольшие случайные колебания давления
    roomStates[roomId].pressure = Math.max(1000, Math.min(1030,
      roomStates[roomId].pressure + (Math.random() * 0.6 - 0.3)
    ));
    
    roomStates[roomId].lastUpdated = new Date().toISOString();
  });
}, 10000);

// Запускаем имитацию TCP-контроллера
mockController.listen(CONTROLLER_PORT, () => {
  console.log(`Mock TCP controller listening on port ${CONTROLLER_PORT}`);
});

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const command = JSON.parse(message);
      console.log('Received WS command:', command);
      
      // Обработка команд
      handleControllerCommand(command, (response) => {
        ws.send(JSON.stringify(response));
      });
    } catch (error) {
      console.error('Error processing WS message:', error);
      ws.send(JSON.stringify({
        status: 'error',
        message: 'Invalid command format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  // Отправляем приветственное сообщение
  ws.send(JSON.stringify({
    status: 'connected',
    message: 'Connected to hotel controller bridge'
  }));
});

// Запускаем сервер
server.listen(WS_PORT, () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
});

// Обработка завершения работы
process.on('SIGINT', () => {
  console.log('Shutting down server');
  mockController.close();
  server.close();
  process.exit(0);
});