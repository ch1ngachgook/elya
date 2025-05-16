import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminTable from '../components/AdminTable';
import OccupancyChart from '../components/OccupancyChart';
import { useAuthStore, useRoomStore } from '../store/useStore';
import controllerAPI from '../services/controllerApi';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Страница панели администратора
const AdminPage = () => {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { rooms, loading: roomsLoading, error: roomsError, fetchRooms } = useRoomStore();
  
  const [bookings, setBookings] = useState([]);
  const [roomStatuses, setRoomStatuses] = useState({});
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms');
  const [occupancyData, setOccupancyData] = useState([]);
  const [isLightOff, setIsLightOff] = useState(false);
  
  // Загрузка списка комнат и бронирований при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем список комнат
        await fetchRooms();
        
        // Загружаем список бронирований
        const bookingsResponse = await axios.get(`${API}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(bookingsResponse.data);
        setLoadingBookings(false);
        
        // Генерируем данные о загрузке отеля
        generateOccupancyData(bookingsResponse.data);
      } catch (error) {
        console.error('Error loading admin data:', error);
        setLoadingBookings(false);
      }
    };
    
    loadData();
  }, [fetchRooms, token]);
  
  // Генерация данных о загрузке отеля на основе бронирований
  const generateOccupancyData = (bookingsData) => {
    const today = new Date();
    const occupancy = [];
    
    // Создаем данные на 14 дней (неделя назад и неделя вперед)
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      // Подсчет загрузки отеля на эту дату
      const dateStr = date.toISOString().split('T')[0];
      const totalRooms = rooms.length;
      
      // Считаем количество активных бронирований на эту дату
      const activeBookings = bookingsData.filter(booking => {
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        
        return booking.status === 'active' && 
               checkIn <= date &&
               checkOut >= date;
      });
      
      // Рассчитываем процент загрузки
      const occupancyPercent = totalRooms > 0 
        ? Math.round((activeBookings.length / totalRooms) * 100) 
        : 0;
      
      occupancy.push({
        date: dateStr,
        occupancy: occupancyPercent
      });
    }
    
    setOccupancyData(occupancy);
  };
  
  // Получаем информацию о статусе комнат
  useEffect(() => {
    // Функция для получения статуса комнаты
    const fetchRoomStatus = async (roomId) => {
      try {
        await controllerAPI.getRoomState(roomId);
      } catch (error) {
        console.error(`Error fetching status for room ${roomId}:`, error);
      }
    };
    
    // Устанавливаем обработчик обновления состояния
    controllerAPI.setStateUpdateHandler((state) => {
      if (state && state.roomId) {
        setRoomStatuses(prev => ({
          ...prev,
          [state.roomId]: state
        }));
      }
    });
    
    // Инициализируем контроллер
    const initController = async () => {
      try {
        await controllerAPI.init();
        
        // Запрашиваем статус для каждой комнаты
        for (const room of rooms) {
          fetchRoomStatus(room.id);
        }
      } catch (error) {
        console.error('Failed to initialize controller:', error);
      }
    };
    
    initController();
    
    // Очистка при размонтировании
    return () => {
      controllerAPI.setStateUpdateHandler(null);
    };
  }, [rooms]);
  
  // Объединяем данные о комнатах с их статусами
  const roomsWithStatus = rooms.map(room => {
    const status = roomStatuses[room.id] || {};
    const activeBooking = bookings.find(booking => 
      booking.room_id === room.id && 
      booking.status === 'active' &&
      new Date(booking.check_in_date) <= new Date() &&
      new Date(booking.check_out_date) >= new Date()
    );
    
    // Находим данные гостя, если комната занята
    const guestName = activeBooking ? 'Гость' : null;
    
    return {
      ...room,
      lightsOn: status.lightsOn || false,
      doorLocked: status.doorLocked !== false,  // По умолчанию закрыто
      channel1: status.channel1 || false,
      channel2: status.channel2 || false,
      temperature: status.temperature,
      humidity: status.humidity,
      pressure: status.pressure,
      guest_name: guestName
    };
  });
  
  // Обработчик перехода на страницу управления комнатой
  const handleControlRoom = (roomId) => {
    navigate(`/room-control/${roomId}`);
  };
  
  // Обработчик выключения света во всех комнатах
  const handleTurnOffAllLights = async () => {
    setIsLightOff(true);
    try {
      await controllerAPI.turnOffAllLights();
      
      // Обновляем состояние комнат в UI
      setRoomStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(roomId => {
          updated[roomId] = {
            ...updated[roomId],
            lightsOn: false
          };
        });
        return updated;
      });
      
      // Перезагружаем статусы комнат
      for (const room of rooms) {
        await controllerAPI.getRoomState(room.id);
      }
    } catch (error) {
      console.error('Error turning off all lights:', error);
    } finally {
      setIsLightOff(false);
    }
  };
  
  if (roomsLoading || loadingBookings) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Загрузка данных панели администратора...
      </div>
    );
  }
  
  if (roomsError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-600">
        {roomsError}
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Панель администратора</h1>
      
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Общая информация</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <p className="text-green-800 text-sm">Свободно</p>
            <p className="text-3xl font-bold text-green-600">
              {rooms.filter(room => room.status === 'available').length}
            </p>
          </div>
          
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <p className="text-red-800 text-sm">Занято</p>
            <p className="text-3xl font-bold text-red-600">
              {rooms.filter(room => room.status === 'occupied').length}
            </p>
          </div>
          
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <p className="text-yellow-800 text-sm">На обслуживании</p>
            <p className="text-3xl font-bold text-yellow-600">
              {rooms.filter(room => room.status === 'maintenance').length}
            </p>
          </div>
          
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <p className="text-blue-800 text-sm">Уборка</p>
            <p className="text-3xl font-bold text-blue-600">
              {rooms.filter(room => room.status === 'cleaning').length}
            </p>
          </div>
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleTurnOffAllLights}
            className={`btn ${isLightOff ? 'btn-secondary' : 'btn-danger'}`}
            disabled={isLightOff}
          >
            {isLightOff ? 'Выключение света...' : 'Выключить свет во всех комнатах'}
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`py-2 px-4 font-medium ${
              activeTab === 'rooms' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
            }`}
          >
            Управление номерами
          </button>
          
          <button
            onClick={() => setActiveTab('occupancy')}
            className={`py-2 px-4 font-medium ${
              activeTab === 'occupancy' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
            }`}
          >
            График загрузки
          </button>
        </div>
      </div>
      
      {activeTab === 'rooms' && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Номерной фонд</h2>
          <AdminTable 
            rooms={roomsWithStatus} 
            onControlRoom={handleControlRoom} 
          />
        </div>
      )}
      
      {activeTab === 'occupancy' && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">График загрузки отеля</h2>
          <OccupancyChart occupancyData={occupancyData} />
        </div>
      )}
    </div>
  );
};

export default AdminPage;