import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import "./App.css";

// Импортируем наши хранилища
import { useAuthStore, useRoomStore } from "./store/useStore";

// Импортируем страницы и компоненты
import RoomPage from "./pages/RoomPage";
import AdminPage from "./pages/AdminPage";

// Компонент аутентификации
const PrivateRoute = ({ children, requiredRole = null }) => {
  const { token, user } = useAuthStore();
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Компонент заголовка
const Header = () => {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">HotelKey</Link>
        
        <nav className="flex space-x-4">
          <Link to="/" className="hover:text-blue-200">Главная</Link>
          {token ? (
            <>
              <Link to="/bookings" className="hover:text-blue-200">Мои бронирования</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="hover:text-blue-200">Администратор</Link>
              )}
              <button onClick={handleLogout} className="hover:text-blue-200">Выход</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200">Вход</Link>
              <Link to="/register" className="hover:text-blue-200">Регистрация</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

// Страница входа
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Вход в аккаунт</h2>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="label">Пароль</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Нет аккаунта?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Страница регистрации
const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(email, password, fullName);
    if (success) {
      navigate('/');
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Создание аккаунта</h2>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="label">Полное имя</label>
              <input
                id="fullName"
                type="text"
                required
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="label">Пароль</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Войти
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Главная страница (список комнат)
const Home = () => {
  const { rooms, loading, error, fetchRooms, setSelectedRoom } = useRoomStore();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);
  
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    navigate(`/room/${room.id}`);
  };
  
  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Загрузка списка номеров...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-600">{error}</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Доступные номера</h1>
      
      {!token ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p>Пожалуйста, <Link to="/login" className="underline">войдите</Link> или <Link to="/register" className="underline">зарегистрируйтесь</Link> для бронирования номера.</p>
        </div>
      ) : null}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room.id} className="card hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">Номер {room.room_number}</h3>
            <p className="text-gray-600 mb-1">Этаж: {room.floor}</p>
            <p className="text-gray-600 mb-1">Цена: {room.price_per_night}₽/ночь</p>
            <p className="text-gray-600 mb-4">{room.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {room.features.map((feature, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {feature}
                </span>
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded text-sm ${
                room.status === 'available' ? 'bg-green-100 text-green-800' :
                room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {room.status === 'available' ? 'Свободен' : 
                 room.status === 'occupied' ? 'Занят' : 
                 room.status === 'maintenance' ? 'На обслуживании' : 
                 room.status === 'cleaning' ? 'На уборке' : 'Неизвестно'}
              </span>
              
              <button 
                onClick={() => handleRoomSelect(room)}
                className="btn btn-primary"
                disabled={room.status !== 'available' || !token}
              >
                {room.status === 'available' ? 'Забронировать' : 'Подробнее'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {rooms.length === 0 && (
        <div className="text-center text-gray-500 py-8">На данный момент нет доступных номеров.</div>
      )}
    </div>
  );
};

// Страница бронирования
const RoomDetail = () => {
  const { selectedRoom, fetchRooms, bookRoom } = useRoomStore();
  const { token } = useAuthStore();
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!selectedRoom) {
      fetchRooms();
      navigate('/');
    }
  }, [selectedRoom, fetchRooms, navigate]);
  
  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const booked = await bookRoom(selectedRoom.id, checkInDate, checkOutDate);
      
      if (booked) {
        setSuccess('Номер успешно забронирован!');
        
        // Переход на страницу бронирований через 2 секунды
        setTimeout(() => {
          navigate('/bookings');
        }, 2000);
      }
    } catch (err) {
      setError('Не удалось забронировать номер');
    } finally {
      setLoading(false);
    }
  };
  
  if (!selectedRoom) {
    return <div className="container mx-auto px-4 py-8 text-center">Загрузка информации о номере...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Номер {selectedRoom.room_number}</h1>
        
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Детали номера</h2>
              <p className="text-gray-600 mb-1">Этаж: {selectedRoom.floor}</p>
              <p className="text-gray-600 mb-1">Цена: {selectedRoom.price_per_night}₽/ночь</p>
              <p className="text-gray-600 mb-4">{selectedRoom.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedRoom.features.map((feature, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
              
              <span className={`px-2 py-1 rounded text-sm ${
                selectedRoom.status === 'available' ? 'bg-green-100 text-green-800' :
                selectedRoom.status === 'occupied' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedRoom.status === 'available' ? 'Свободен' : 
                 selectedRoom.status === 'occupied' ? 'Занят' : 
                 selectedRoom.status === 'maintenance' ? 'На обслуживании' : 
                 selectedRoom.status === 'cleaning' ? 'На уборке' : 'Неизвестно'}
              </span>
            </div>
            
            {selectedRoom.status === 'available' && token && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Забронировать номер</h2>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
                
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label htmlFor="checkInDate" className="label">Дата заезда</label>
                    <input
                      id="checkInDate"
                      type="date"
                      required
                      className="input"
                      value={checkInDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckInDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="checkOutDate" className="label">Дата выезда</label>
                    <input
                      id="checkOutDate"
                      type="date"
                      required
                      className="input"
                      value={checkOutDate}
                      min={checkInDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Обработка...' : 'Забронировать'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
        >
          Назад к списку номеров
        </button>
      </div>
    </div>
  );
};

// Страница "Мои бронирования"
const MyBookings = () => {
  const { userBookings, loading, error, fetchUserBookings, cancelBooking } = useRoomStore();
  const { token } = useAuthStore();
  const [roomData, setRoomData] = useState({});
  const [cancelingId, setCancelingId] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (token) {
      fetchUserBookings();
    }
  }, [token, fetchUserBookings]);
  
  useEffect(() => {
    // Получение данных о комнатах для каждого бронирования
    const fetchRoomDetails = async () => {
      const rooms = { ...roomData };
      let updated = false;
      
      for (const booking of userBookings) {
        if (!rooms[booking.room_id]) {
          try {
            // Найдем комнату в списке комнат, если они уже загружены
            const room = userBookings.find(b => b.room_id === booking.room_id);
            if (room) {
              rooms[booking.room_id] = room;
              updated = true;
            }
          } catch (error) {
            console.error(`Ошибка получения данных о комнате ${booking.room_id}:`, error);
          }
        }
      }
      
      if (updated) {
        setRoomData(rooms);
      }
    };
    
    if (userBookings.length > 0) {
      fetchRoomDetails();
    }
  }, [userBookings, roomData]);
  
  const handleCancelBooking = async (bookingId) => {
    setCancelingId(bookingId);
    try {
      await cancelBooking(bookingId);
    } catch (error) {
      console.error('Ошибка отмены бронирования:', error);
    } finally {
      setCancelingId(null);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Загрузка бронирований...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-600">{error}</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Мои бронирования</h1>
      
      {userBookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">У вас еще нет бронирований.</p>
          <Link to="/" className="btn btn-primary">Забронировать номер</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {userBookings.map((booking) => {
            const room = roomData[booking.room_id];
            const isActive = booking.status === 'active';
            const isPast = new Date(booking.check_out_date) < new Date();
            
            return (
              <div key={booking.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {room ? `Номер ${room.room_number}` : `Комната ${booking.room_id}`}
                    </h3>
                    <p className="text-gray-600 mb-1">
                      {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                    </p>
                    <p className="text-gray-600 mb-1">
                      Статус: <span className={`font-medium ${
                        booking.status === 'active' ? 'text-green-600' :
                        booking.status === 'cancelled' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {booking.status === 'active' ? 'Активно' :
                         booking.status === 'cancelled' ? 'Отменено' :
                         booking.status === 'completed' ? 'Завершено' : 'Неизвестно'}
                      </span>
                    </p>
                    {room && (
                      <p className="text-gray-600 mb-4">
                        {room.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {isActive && !isPast && (
                      <>
                        <Link
                          to={`/room/${booking.room_id}`}
                          className="btn btn-primary text-center"
                        >
                          Управление номером
                        </Link>
                        
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="btn btn-danger"
                          disabled={cancelingId === booking.id}
                        >
                          {cancelingId === booking.id ? 'Отмена...' : 'Отменить бронирование'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/room/:id" element={<PrivateRoute><RoomPage /></PrivateRoute>} />
          <Route path="/room-control/:id" element={<PrivateRoute requiredRole="admin"><RoomControlPage /></PrivateRoute>} />
          <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;