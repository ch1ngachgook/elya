// Сервис для взаимодействия с контроллером отеля через TCP или BLE
// Поддерживает две стратегии подключения:
// 1. TCP через WebSocket мост (для стабильного соединения)
// 2. Прямое BLE-соединение через Web Bluetooth API (для мобильных устройств)

// Константы для подключения
const TCP_BRIDGE_URL = 'ws://localhost:7001'; // URL WebSocket моста
const BLE_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'; // Основной сервис BLE
const BLE_CHARACTERISTIC_UUID = '0000ff02-0000-1000-8000-00805f9b34fb'; // Характеристика команд

// Информация о контроллере
const CONTROLLER_INFO = {
  ip: '192.168.1.100',
  mac: 'A2:DD:6C:98:2E:58',
  bleName: 'ROOM_19',
  token: 'SNQaq6KVIQQMHR3x'
};

// Команды контроллера
export const ControllerCommand = {
  GET_INFO: 'get_info',        // Запрос информации о контроллере
  GET_STATE: 'get_state',      // Запрос текущего состояния
  SET_STATE: 'set_state',      // Установка нового состояния
  DOOR_UNLOCK: 'door_unlock',  // Открытие двери
  DOOR_LOCK: 'door_lock'       // Закрытие двери
};

// Состояния устройств
export const States = {
  LIGHT_ON: 'LightOn',
  LIGHT_OFF: 'LightOff',
  DOOR_LOCK_OPEN: 'DoorLockOpen',
  DOOR_LOCK_CLOSE: 'DoorLockClose',
  CHANNEL1_ON: 'Channel1On',
  CHANNEL1_OFF: 'Channel1Off',
  CHANNEL2_ON: 'Channel2On',
  CHANNEL2_OFF: 'Channel2Off'
};

class ControllerAPI {
  constructor() {
    this.connected = false;
    this.connectionType = null; // 'tcp' или 'ble'
    this.wsConnection = null;
    this.bleDevice = null;
    this.bleCharacteristic = null;
    this.controllerInfo = CONTROLLER_INFO; // Используем предопределенную информацию
    this.onStateUpdate = null; // Колбэк для обновления состояния UI
    this.connectionTimeout = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.token = CONTROLLER_INFO.token || localStorage.getItem('controller_token') || null;
  }

  // Инициализация соединения
  async init() {
    // Сначала пробуем TCP через WebSocket, если не удается - BLE
    try {
      await this.connectTCP();
      return true;
    } catch (error) {
      console.log('TCP connection failed, trying BLE...', error);
      try {
        await this.connectBLE();
        return true;
      } catch (bleError) {
        console.error('BLE connection failed', bleError);
        return false;
      }
    }
  }

  // Подключение через WebSocket мост
  async connectTCP() {
    return new Promise((resolve, reject) => {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.connectionType = 'tcp';
        this.connected = true;
        resolve(true);
        return;
      }

      try {
        this.wsConnection = new WebSocket(TCP_BRIDGE_URL);

        this.wsConnection.onopen = () => {
          console.log('WebSocket connection established');
          this.connectionType = 'tcp';
          this.connected = true;
          this.reconnectAttempts = 0;
          
          // Запрос информации о контроллере
          this.sendCommand({ type: ControllerCommand.GET_INFO });
          
          resolve(true);
        };

        this.wsConnection.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleResponse(data);
        };

        this.wsConnection.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          this.connectionType = null;
          reject(error);
        };

        this.wsConnection.onclose = () => {
          console.log('WebSocket connection closed');
          this.connected = false;
          this.connectionType = null;
          this.attemptReconnect();
        };

      } catch (error) {
        console.error('WebSocket connection failed:', error);
        reject(error);
      }
    });
  }

  // Подключение через Web Bluetooth API
  async connectBLE() {
    // Проверяем поддержку Web Bluetooth API
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not supported in your browser');
    }

    try {
      // Запрашиваем устройство по имени или по сервису
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICE_UUID] },
          // Добавим фильтр по имени, если известно имя устройства
          // { name: 'HotelController' }
        ],
        optionalServices: [BLE_SERVICE_UUID]
      });

      this.bleDevice = device;

      // Обработчик отключения устройства
      device.addEventListener('gattserverdisconnected', () => {
        console.log('BLE device disconnected');
        this.connected = false;
        this.connectionType = null;
        this.attemptReconnect();
      });

      // Подключаемся к GATT серверу
      const server = await device.gatt.connect();
      console.log('Connected to GATT server');

      // Получаем основной сервис
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      console.log('Got primary service');

      // Получаем характеристику для команд
      this.bleCharacteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);
      console.log('Got command characteristic');

      // Настраиваем уведомления о изменении состояния
      await this.bleCharacteristic.startNotifications();
      this.bleCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = new TextDecoder().decode(event.target.value);
        const data = JSON.parse(value);
        this.handleResponse(data);
      });

      this.connectionType = 'ble';
      this.connected = true;
      
      // Запрос информации о контроллере
      await this.sendCommand({ type: ControllerCommand.GET_INFO });
      
      return true;
    } catch (error) {
      console.error('BLE connection failed:', error);
      throw error;
    }
  }

  // Отправка команды контроллеру
  async sendCommand(command) {
    if (!this.connected) {
      try {
        await this.init();
      } catch (error) {
        console.error('Failed to initialize connection:', error);
        throw new Error('Not connected to controller');
      }
    }

    // Добавляем токен аутентификации, если есть
    if (this.token) {
      command.token = this.token;
    }

    // Отправляем команду через активное соединение
    if (this.connectionType === 'tcp' && this.wsConnection) {
      this.wsConnection.send(JSON.stringify(command));
      return true;
    } else if (this.connectionType === 'ble' && this.bleCharacteristic) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(command));
      await this.bleCharacteristic.writeValue(data);
      return true;
    } else {
      throw new Error('No active connection to controller');
    }
  }

  // Обработка ответа от контроллера
  handleResponse(data) {
    console.log('Received response:', data);

    // Сохраняем токен, если получили
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('controller_token', data.token);
    }

    // Сохраняем информацию о контроллере
    if (data.type === 'info') {
      this.controllerInfo = {
        mac: data.mac,
        ip: data.ip,
        bleName: data.ble_name,
        version: data.version
      };
    }

    // Обрабатываем обновление состояния
    if (data.type === 'state' && this.onStateUpdate) {
      this.onStateUpdate(data.state);
    }

    // Обрабатываем статус команды
    if (data.status === 'error') {
      console.error('Controller error:', data.message);
    }
  }

  // Получение текущего состояния комнаты
  async getRoomState(roomId) {
    try {
      await this.sendCommand({
        type: ControllerCommand.GET_STATE,
        roomId: roomId
      });
      return true;
    } catch (error) {
      console.error('Failed to get room state:', error);
      return false;
    }
  }

  // Установка нового состояния
  async setState(roomId, stateChanges) {
    try {
      await this.sendCommand({
        type: ControllerCommand.SET_STATE,
        roomId: roomId,
        state: stateChanges
      });
      return true;
    } catch (error) {
      console.error('Failed to set state:', error);
      return false;
    }
  }

  // Включение/выключение света
  async toggleLight(roomId, on) {
    return this.setState(roomId, { lightsOn: on });
  }

  // Управление замком двери
  async toggleDoor(roomId, unlock) {
    const command = unlock ? ControllerCommand.DOOR_UNLOCK : ControllerCommand.DOOR_LOCK;
    try {
      await this.sendCommand({
        type: command,
        roomId: roomId
      });
      return true;
    } catch (error) {
      console.error(`Failed to ${unlock ? 'unlock' : 'lock'} door:`, error);
      return false;
    }
  }

  // Управление каналом 1
  async toggleChannel1(roomId, on) {
    return this.setState(roomId, { channel1: on });
  }

  // Управление каналом 2
  async toggleChannel2(roomId, on) {
    return this.setState(roomId, { channel2: on });
  }

  // Глобальное выключение света во всех комнатах (для админа)
  async turnOffAllLights() {
    try {
      await this.sendCommand({
        type: ControllerCommand.SET_STATE,
        global: true,
        state: { lightsOn: false }
      });
      return true;
    } catch (error) {
      console.error('Failed to turn off all lights:', error);
      return false;
    }
  }

  // Установка обработчика обновления состояния
  setStateUpdateHandler(callback) {
    this.onStateUpdate = callback;
  }

  // Попытка переподключения при разрыве связи
  attemptReconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Attempting to reconnect in ${backoffTime}ms (attempt ${this.reconnectAttempts})`);

    this.connectionTimeout = setTimeout(async () => {
      try {
        await this.init();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, backoffTime);
  }

  // Разрыв соединения
  disconnect() {
    if (this.connectionType === 'tcp' && this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    } else if (this.connectionType === 'ble' && this.bleDevice?.gatt.connected) {
      this.bleDevice.gatt.disconnect();
      this.bleDevice = null;
      this.bleCharacteristic = null;
    }

    this.connected = false;
    this.connectionType = null;
  }
}

// Создаем и экспортируем синглтон
const controllerAPI = new ControllerAPI();
export default controllerAPI;