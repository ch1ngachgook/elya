import React, { useState, useEffect } from 'react';
import LightToggle from './LightToggle';
import DoorButton from './DoorButton';
import ChannelSwitch from './ChannelSwitch';
import SensorDisplay from './SensorDisplay';
import controllerAPI from '../services/controllerApi';

// Компонент для отображения статуса комнаты и управления устройствами
const RoomStatus = ({ roomId, isConnected = false }) => {
  // Состояние комнаты
  const [roomState, setRoomState] = useState({
    lightsOn: false,
    doorLocked: true,
    channel1: false,
    channel2: false,
    temperature: null,
    humidity: null,
    pressure: null,
    lastUpdated: null
  });
  
  // Состояние запросов
  const [loading, setLoading] = useState({
    light: false,
    door: false,
    channel1: false,
    channel2: false
  });
  
  // Состояние соединения с контроллером
  const [connectionStatus, setConnectionStatus] = useState({
    connected: isConnected,
    type: null
  });
  
  // Подключение к контроллеру и настройка обновления состояния
  useEffect(() => {
    const initController = async () => {
      try {
        // Подключаемся к контроллеру
        const connected = await controllerAPI.init();
        setConnectionStatus({
          connected,
          type: controllerAPI.connectionType
        });
        
        if (connected) {
          // Запрашиваем состояние комнаты
          await controllerAPI.getRoomState(roomId);
        }
        
        // Устанавливаем обработчик обновления состояния
        controllerAPI.setStateUpdateHandler((state) => {
          setRoomState(state);
        });
      } catch (error) {
        console.error('Failed to initialize controller:', error);
      }
    };
    
    initController();
    
    // Установка периодического обновления состояния
    const updateInterval = setInterval(() => {
      if (controllerAPI.connected) {
        controllerAPI.getRoomState(roomId);
      }
    }, 10000); // Каждые 10 секунд
    
    // Очистка при размонтировании компонента
    return () => {
      clearInterval(updateInterval);
      controllerAPI.setStateUpdateHandler(null);
    };
  }, [roomId, isConnected]);
  
  // Форматирование значений датчиков
  const formatSensorValue = (value, precision = 1) => {
    return value !== null ? value.toFixed(precision) : 'N/A';
  };
  
  // Обработчики для переключателей
  
  const handleLightToggle = async () => {
    setLoading(prev => ({ ...prev, light: true }));
    try {
      const success = await controllerAPI.toggleLight(roomId, !roomState.lightsOn);
      if (success) {
        setRoomState(prev => ({ ...prev, lightsOn: !prev.lightsOn }));
      }
    } catch (error) {
      console.error('Light toggle error:', error);
    } finally {
      setLoading(prev => ({ ...prev, light: false }));
    }
  };
  
  const handleDoorToggle = async () => {
    setLoading(prev => ({ ...prev, door: true }));
    try {
      const success = await controllerAPI.toggleDoor(roomId, true); // Всегда разблокировать
      if (success) {
        setRoomState(prev => ({ ...prev, doorLocked: false }));
        // Автоматически закрываем дверь через 5 секунд (это будет делать контроллер)
        setTimeout(() => {
          setRoomState(prev => ({ ...prev, doorLocked: true }));
        }, 5000);
      }
    } catch (error) {
      console.error('Door toggle error:', error);
    } finally {
      setLoading(prev => ({ ...prev, door: false }));
    }
  };
  
  const handleChannel1Toggle = async () => {
    setLoading(prev => ({ ...prev, channel1: true }));
    try {
      const success = await controllerAPI.toggleChannel1(roomId, !roomState.channel1);
      if (success) {
        setRoomState(prev => ({ ...prev, channel1: !prev.channel1 }));
      }
    } catch (error) {
      console.error('Channel 1 toggle error:', error);
    } finally {
      setLoading(prev => ({ ...prev, channel1: false }));
    }
  };
  
  const handleChannel2Toggle = async () => {
    setLoading(prev => ({ ...prev, channel2: true }));
    try {
      const success = await controllerAPI.toggleChannel2(roomId, !roomState.channel2);
      if (success) {
        setRoomState(prev => ({ ...prev, channel2: !prev.channel2 }));
      }
    } catch (error) {
      console.error('Channel 2 toggle error:', error);
    } finally {
      setLoading(prev => ({ ...prev, channel2: false }));
    }
  };
  
  return (
    <div className="room-status">
      {/* Статус подключения */}
      <div className={`connection-status mb-4 p-2 text-sm rounded-md ${
        connectionStatus.connected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        <div className="flex items-center">
          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
            connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
          <span>
            {connectionStatus.connected 
              ? `Подключено через ${connectionStatus.type === 'tcp' ? 'TCP' : 'Bluetooth'}` 
              : 'Не подключено к контроллеру'
            }
          </span>
        </div>
      </div>
      
      {/* Управление дверью */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Управление дверью</h3>
        <DoorButton 
          isLocked={roomState.doorLocked} 
          onClick={handleDoorToggle} 
          isLoading={loading.door}
          disabled={!connectionStatus.connected}
        />
      </div>
      
      {/* Управление устройствами */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Управление устройствами</h3>
        <div className="grid grid-cols-1 gap-3">
          <LightToggle 
            isOn={roomState.lightsOn} 
            onChange={handleLightToggle}
            disabled={!connectionStatus.connected || loading.light}
          />
          
          <ChannelSwitch 
            id="channel1" 
            label="Канал 1" 
            isOn={roomState.channel1}
            onChange={handleChannel1Toggle}
            disabled={!connectionStatus.connected || loading.channel1}
          />
          
          <ChannelSwitch 
            id="channel2" 
            label="Канал 2" 
            isOn={roomState.channel2}
            onChange={handleChannel2Toggle}
            disabled={!connectionStatus.connected || loading.channel2}
          />
        </div>
      </div>
      
      {/* Показания датчиков */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Датчики комнаты</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SensorDisplay 
            label="Температура" 
            value={formatSensorValue(roomState.temperature)} 
            unit="°C"
            icon={<span>🌡️</span>}
            iconColor="text-red-500"
          />
          
          <SensorDisplay 
            label="Влажность" 
            value={formatSensorValue(roomState.humidity)} 
            unit="%"
            icon={<span>💧</span>}
            iconColor="text-blue-500"
          />
          
          <SensorDisplay 
            label="Давление" 
            value={formatSensorValue(roomState.pressure, 0)} 
            unit="гПа"
            icon={<span>🔄</span>}
            iconColor="text-purple-500"
          />
        </div>
        
        {roomState.lastUpdated && (
          <div className="text-xs text-gray-500 mt-2 text-right">
            Последнее обновление: {new Date(roomState.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomStatus;