import { create } from 'zustand';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Хранилище аутентификации пользователя
export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  loading: false,
  error: null,
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // Функция входа в систему
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API}/login`, { email, password });
      const token = response.data.access_token;
      
      set({ token });
      localStorage.setItem('token', token);
      
      // Получаем информацию о пользователе
      const userResponse = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({ user: userResponse.data, loading: false });
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Ошибка авторизации', 
        loading: false 
      });
      return false;
    }
  },
  
  // Функция регистрации
  register: async (email, password, fullName) => {
    set({ loading: true, error: null });
    try {
      // Регистрируем пользователя
      await axios.post(`${API}/users`, {
        email,
        password,
        full_name: fullName,
        role: 'guest'
      });
      
      // После регистрации входим в систему
      const loginResponse = await axios.post(`${API}/login`, { email, password });
      const token = loginResponse.data.access_token;
      
      set({ token });
      localStorage.setItem('token', token);
      
      // Получаем информацию о пользователе
      const userResponse = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({ user: userResponse.data, loading: false });
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Ошибка регистрации', 
        loading: false 
      });
      return false;
    }
  }
}));

// Хранилище для управления комнатами
export const useRoomStore = create((set, get) => ({
  rooms: [],
  selectedRoom: null,
  userBookings: [],
  loading: false,
  error: null,
  
  // Получение списка комнат
  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.get(`${API}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ rooms: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching rooms:', error);
      set({ error: 'Не удалось загрузить список комнат', loading: false });
    }
  },
  
  // Установка выбранной комнаты
  setSelectedRoom: (room) => set({ selectedRoom: room }),
  
  // Получение бронирований пользователя
  fetchUserBookings: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const response = await axios.get(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ userBookings: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      set({ error: 'Не удалось загрузить бронирования', loading: false });
    }
  },
  
  // Бронирование комнаты
  bookRoom: async (roomId, checkInDate, checkOutDate) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      await axios.post(`${API}/bookings`, {
        room_id: roomId,
        check_in_date: new Date(checkInDate).toISOString(),
        check_out_date: new Date(checkOutDate).toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список комнат и бронирования
      await get().fetchRooms();
      await get().fetchUserBookings();
      
      set({ loading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Ошибка бронирования',
        loading: false
      });
      return false;
    }
  },
  
  // Отмена бронирования
  cancelBooking: async (bookingId) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      await axios.put(`${API}/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Обновляем список комнат и бронирования
      await get().fetchRooms();
      await get().fetchUserBookings();
      
      set({ loading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Ошибка отмены бронирования',
        loading: false
      });
      return false;
    }
  }
}));

// Хранилище для статуса комнаты и управления устройствами
export const useRoomControlStore = create((set, get) => ({
  roomStatus: {
    lightsOn: false,
    doorLocked: true,
    channel1: false,
    channel2: false,
    temperature: null,
    humidity: null,
    pressure: null,
    lastUpdated: null
  },
  connectionStatus: {
    connected: false,
    type: null
  },
  loading: {
    light: false,
    door: false,
    channel1: false,
    channel2: false
  },
  error: null,
  
  // Установка статуса комнаты
  setRoomStatus: (status) => set({ roomStatus: { ...status } }),
  
  // Установка статуса подключения
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  // Установка состояния загрузки
  setLoading: (loading) => set(state => ({ 
    loading: { ...state.loading, ...loading } 
  })),
  
  // Установка ошибки
  setError: (error) => set({ error })
}));