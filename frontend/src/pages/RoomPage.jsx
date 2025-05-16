import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoomStatus from '../components/RoomStatus';
import { useAuthStore, useRoomStore } from '../store/useStore';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Страница управления комнатой
const RoomPage = () => {
  const { id } = useParams(); // Получаем ID комнаты из URL
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { rooms, fetchRooms } = useRoomStore();
  
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  
  // Загружаем информацию о комнате
  useEffect(() => {
    const loadRoom = async () => {
      if (!id) {
        setError('Идентификатор комнаты не указан');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Сначала проверяем, есть ли комната уже в нашем хранилище
        const roomFromStore = rooms.find(r => r.id === id);
        
        if (roomFromStore) {
          setRoom(roomFromStore);
        } else {
          // Если нет, загружаем с сервера
          const response = await axios.get(`${API}/rooms/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRoom(response.data);
        }
        
        setConnected(true);
        setLoading(false);
      } catch (err) {
        console.error('Error loading room:', err);
        setError('Не удалось загрузить информацию о комнате');
        setLoading(false);
      }
    };
    
    loadRoom();
  }, [id, token, rooms]);
  
  // Проверка прав доступа
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Для администратора проверки не требуются
        if (user && user.role === 'admin') {
          return;
        }
        
        // Проверяем бронирование пользователя для этой комнаты
        const response = await axios.get(`${API}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const bookings = response.data;
        const hasActiveBooking = bookings.some(booking => 
          booking.room_id === id && 
          booking.status === 'active' && 
          new Date(booking.check_in_date) <= new Date() && 
          new Date(booking.check_out_date) >= new Date()
        );
        
        if (!hasActiveBooking) {
          setError('У вас нет активного бронирования для этой комнаты');
        }
      } catch (err) {
        console.error('Error checking access:', err);
      }
    };
    
    if (token && user) {
      checkAccess();
    }
  }, [id, token, user]);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="spinner-border" role="status">
          <span className="sr-only">Загрузка...</span>
        </div>
      </div>
    );
  }
  
  if (error && !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button 
            onClick={() => navigate('/bookings')} 
            className="btn btn-primary"
          >
            Вернуться к бронированиям
          </button>
        </div>
      </div>
    );
  }
  
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Комната не найдена
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Комната {room.room_number}
        </h1>
        
        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="card mb-6">
          <RoomStatus roomId={id} isConnected={connected} />
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={() => navigate('/bookings')} 
            className="btn btn-secondary"
          >
            Назад к бронированиям
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;