import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./App.css";

// State management using Zustand
import { create } from 'zustand';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Zustand store
const useAuthStore = create((set) => ({
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
}));

const useRoomStore = create((set) => ({
  rooms: [],
  selectedRoom: null,
  userBookings: [],
  loading: false,
  error: null,
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
      set({ error: 'Failed to fetch rooms', loading: false });
    }
  },
  setSelectedRoom: (room) => set({ selectedRoom: room }),
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
      set({ error: 'Failed to fetch bookings', loading: false });
    }
  },
}));

// Auth guard component
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

// Components
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
          <Link to="/" className="hover:text-blue-200">Home</Link>
          {token ? (
            <>
              <Link to="/bookings" className="hover:text-blue-200">My Bookings</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="hover:text-blue-200">Admin</Link>
              )}
              <button onClick={handleLogout} className="hover:text-blue-200">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200">Login</Link>
              <Link to="/register" className="hover:text-blue-200">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

// Login Page
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setToken, setUser, loading, error, setLoading, setError } = useAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API}/login`, { email, password });
      setToken(response.data.access_token);
      
      // Fetch user details
      const userResponse = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });
      
      setUser(userResponse.data);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">Email address</label>
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
              <label htmlFor="password" className="label">Password</label>
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
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Register Page
const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { setToken, setUser, loading, error, setLoading, setError } = useAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Register user
      await axios.post(`${API}/users`, {
        email,
        password,
        full_name: fullName,
        role: 'guest'
      });
      
      // Login with the new credentials
      const loginResponse = await axios.post(`${API}/login`, { email, password });
      setToken(loginResponse.data.access_token);
      
      // Fetch user details
      const userResponse = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${loginResponse.data.access_token}` }
      });
      
      setUser(userResponse.data);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="label">Full Name</label>
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
              <label htmlFor="email" className="label">Email address</label>
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
              <label htmlFor="password" className="label">Password</label>
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
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Home Page (Room Listing)
const Home = () => {
  const { rooms, loading, error, fetchRooms, setSelectedRoom } = useRoomStore();
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);
  
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    navigate(`/room/${room.id}`);
  };
  
  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading rooms...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-600">{error}</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Available Rooms</h1>
      
      {!token ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p>Please <Link to="/login" className="underline">login</Link> or <Link to="/register" className="underline">register</Link> to book a room.</p>
        </div>
      ) : null}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room.id} className="card hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">Room {room.room_number}</h3>
            <p className="text-gray-600 mb-1">Floor: {room.floor}</p>
            <p className="text-gray-600 mb-1">Price: ${room.price_per_night}/night</p>
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
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </span>
              
              <button 
                onClick={() => handleRoomSelect(room)}
                className="btn btn-primary"
                disabled={room.status !== 'available' || !token}
              >
                {room.status === 'available' ? 'Book Now' : 'View Details'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {rooms.length === 0 && (
        <div className="text-center text-gray-500 py-8">No rooms available at the moment.</div>
      )}
    </div>
  );
};

// Room Detail Page
const RoomDetail = () => {
  const { selectedRoom, fetchRooms } = useRoomStore();
  const { token, user } = useAuthStore();
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
      await axios.post(`${API}/bookings`, {
        room_id: selectedRoom.id,
        check_in_date: new Date(checkInDate).toISOString(),
        check_out_date: new Date(checkOutDate).toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Room booked successfully!');
      setLoading(false);
      
      // Refresh rooms list
      setTimeout(() => {
        fetchRooms();
        navigate('/bookings');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Booking failed');
      setLoading(false);
    }
  };
  
  if (!selectedRoom) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading room details...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Room {selectedRoom.room_number}</h1>
        
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Room Details</h2>
              <p className="text-gray-600 mb-1">Floor: {selectedRoom.floor}</p>
              <p className="text-gray-600 mb-1">Price: ${selectedRoom.price_per_night}/night</p>
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
                {selectedRoom.status.charAt(0).toUpperCase() + selectedRoom.status.slice(1)}
              </span>
            </div>
            
            {selectedRoom.status === 'available' && token && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Book This Room</h2>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
                
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label htmlFor="checkInDate" className="label">Check-in Date</label>
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
                    <label htmlFor="checkOutDate" className="label">Check-out Date</label>
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
                    {loading ? 'Processing...' : 'Book Now'}
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
          Back to Rooms
        </button>
      </div>
    </div>
  );
};

// My Bookings Page
const MyBookings = () => {
  const { userBookings, loading, error, fetchUserBookings } = useRoomStore();
  const { token } = useAuthStore();
  const [roomData, setRoomData] = useState({});
  const [cancelingId, setCancelingId] = useState(null);
  
  useEffect(() => {
    if (token) {
      fetchUserBookings();
    }
  }, [token, fetchUserBookings]);
  
  useEffect(() => {
    // Fetch room details for each booking
    const fetchRoomDetails = async () => {
      const rooms = {};
      for (const booking of userBookings) {
        if (!rooms[booking.room_id]) {
          try {
            const response = await axios.get(`${API}/rooms/${booking.room_id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            rooms[booking.room_id] = response.data;
          } catch (error) {
            console.error(`Error fetching room ${booking.room_id}:`, error);
          }
        }
      }
      setRoomData(rooms);
    };
    
    if (userBookings.length > 0) {
      fetchRoomDetails();
    }
  }, [userBookings, token]);
  
  const handleCancelBooking = async (bookingId) => {
    setCancelingId(bookingId);
    try {
      await axios.put(`${API}/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUserBookings(); // Refresh bookings
    } catch (error) {
      console.error('Error canceling booking:', error);
    } finally {
      setCancelingId(null);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading bookings...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-600">{error}</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
      
      {userBookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">You don't have any bookings yet.</p>
          <Link to="/" className="btn btn-primary">Book a Room</Link>
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
                      {room ? `Room ${room.room_number}` : 'Loading room details...'}
                    </h3>
                    <p className="text-gray-600 mb-1">
                      {formatDate(booking.check_in_date)} to {formatDate(booking.check_out_date)}
                    </p>
                    <p className="text-gray-600 mb-1">
                      Booking Status: <span className={`font-medium ${
                        booking.status === 'active' ? 'text-green-600' :
                        booking.status === 'cancelled' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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
                          to={`/room-control/${booking.room_id}`}
                          className="btn btn-primary text-center"
                        >
                          Room Controls
                        </Link>
                        
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="btn btn-danger"
                          disabled={cancelingId === booking.id}
                        >
                          {cancelingId === booking.id ? 'Canceling...' : 'Cancel Booking'}
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

// Room Control Page (BLE/Smart Room)
const RoomControl = () => {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [roomStatus, setRoomStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [doorStatus, setDoorStatus] = useState('locked');
  const [bleSupported, setBleSupported] = useState(true);
  const [bleDevice, setBleDevice] = useState(null);
  
  // Get room_id from URL
  const roomId = window.location.pathname.split('/').pop();
  
  useEffect(() => {
    // Check if Web Bluetooth API is supported
    if (!navigator.bluetooth) {
      setBleSupported(false);
    }
    
    // Fetch initial room status
    const fetchRoomStatus = async () => {
      try {
        const response = await axios.get(`${API}/room-status/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoomStatus(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch room status');
        setLoading(false);
      }
    };
    
    fetchRoomStatus();
    
    // Cleanup function to disconnect BLE device if connected
    return () => {
      if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
      }
    };
  }, [roomId, token]);
  
  const connectBLE = async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth API is not supported in your browser.');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Request device with a name filter - in a real app, you would filter by services
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'HotelDoor' } // This should match your device name prefix
        ],
        optionalServices: ['generic_access'] // In a real app, you'd include your custom service UUIDs
      });
      
      setBleDevice(device);
      setIsConnecting(false);
      
      // In a real app, you would connect to GATT and interact with services/characteristics
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected');
        setBleDevice(null);
      });
      
      return device;
    } catch (error) {
      console.error('BLE connection error:', error);
      setError(error.message || 'Failed to connect to BLE device');
      setIsConnecting(false);
      
      // Simulate success for demo purposes
      setTimeout(() => {
        setError(null);
        setBleDevice({ name: 'Simulated HotelDoor Device' });
      }, 1000);
    }
  };
  
  const unlockDoor = async () => {
    setIsUnlocking(true);
    setError(null);
    
    try {
      // Call backend to register unlock attempt
      await axios.post(`${API}/door-control/${roomId}/unlock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // In a real app, you would send a command to the BLE device
      // For demo, we'll simulate success after a delay
      setTimeout(() => {
        setDoorStatus('unlocked');
        setIsUnlocking(false);
        
        // Auto-lock after 5 seconds
        setTimeout(() => {
          setDoorStatus('locked');
        }, 5000);
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to unlock door');
      setIsUnlocking(false);
    }
  };
  
  const toggleLight = async () => {
    if (!roomStatus) return;
    
    const newStatus = roomStatus.light === 'on' ? 'off' : 'on';
    
    try {
      const response = await axios.put(`${API}/room-status/${roomId}/light`, newStatus, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoomStatus(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to toggle light');
    }
  };
  
  const toggleAC = async () => {
    if (!roomStatus) return;
    
    const newStatus = roomStatus.ac === 'on' ? 'off' : 'on';
    
    try {
      const response = await axios.put(`${API}/room-status/${roomId}/ac`, newStatus, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoomStatus(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to toggle AC');
    }
  };
  
  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading room controls...</div>;
  }
  
  if (error && !roomStatus) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button onClick={() => navigate('/bookings')} className="btn btn-primary">
          Back to My Bookings
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Room Controls</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {!bleSupported && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            <p>Web Bluetooth API is not supported in your browser. Some features may not work properly.</p>
          </div>
        )}
        
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Door Access</h2>
          
          <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg mb-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
              doorStatus === 'unlocked' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {doorStatus === 'unlocked' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
              </svg>
            </div>
            
            <p className="text-lg font-medium mb-4">
              Door Status: <span className={doorStatus === 'unlocked' ? 'text-green-600' : 'text-red-600'}>
                {doorStatus.charAt(0).toUpperCase() + doorStatus.slice(1)}
              </span>
            </p>
            
            {!bleDevice ? (
              <button
                onClick={connectBLE}
                className="btn btn-primary"
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect to Door Lock'}
              </button>
            ) : (
              <button
                onClick={unlockDoor}
                className="btn btn-success"
                disabled={isUnlocking || doorStatus === 'unlocked'}
              >
                {isUnlocking ? 'Unlocking...' : 'Unlock Door'}
              </button>
            )}
            
            {bleDevice && (
              <p className="text-sm text-gray-500 mt-2">
                Connected to: {bleDevice.name || 'Hotel Smart Lock'}
              </p>
            )}
          </div>
        </div>
        
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Room Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-lg font-medium">Lights</span>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={roomStatus?.light === 'on'}
                    onChange={toggleLight}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-lg font-medium">Air Conditioning</span>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={roomStatus?.ac === 'on'}
                    onChange={toggleAC}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button onClick={() => navigate('/bookings')} className="btn btn-secondary">
            Back to My Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { rooms, loading, error, fetchRooms } = useRoomStore();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms');
  const { token } = useAuthStore();
  
  useEffect(() => {
    fetchRooms();
    
    const fetchAllBookings = async () => {
      try {
        const response = await axios.get(`${API}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(response.data);
        setLoadingBookings(false);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setLoadingBookings(false);
      }
    };
    
    fetchAllBookings();
  }, [fetchRooms, token]);
  
  const countRoomsByStatus = () => {
    const counts = {
      available: 0,
      occupied: 0,
      maintenance: 0,
      cleaning: 0
    };
    
    rooms.forEach(room => {
      if (counts[room.status] !== undefined) {
        counts[room.status]++;
      }
    });
    
    return counts;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  if (loading || loadingBookings) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading dashboard data...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-600">{error}</div>;
  }
  
  const roomStats = countRoomsByStatus();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Room Status Overview</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <p className="text-green-800 text-sm">Available</p>
            <p className="text-3xl font-bold text-green-600">{roomStats.available}</p>
          </div>
          
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <p className="text-red-800 text-sm">Occupied</p>
            <p className="text-3xl font-bold text-red-600">{roomStats.occupied}</p>
          </div>
          
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <p className="text-yellow-800 text-sm">Maintenance</p>
            <p className="text-3xl font-bold text-yellow-600">{roomStats.maintenance}</p>
          </div>
          
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <p className="text-blue-800 text-sm">Cleaning</p>
            <p className="text-3xl font-bold text-blue-600">{roomStats.cleaning}</p>
          </div>
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
            Rooms
          </button>
          
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2 px-4 font-medium ${
              activeTab === 'bookings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
            }`}
          >
            Bookings
          </button>
        </div>
      </div>
      
      {activeTab === 'rooms' && (
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Room #</th>
                  <th className="py-2 px-4 border-b text-left">Floor</th>
                  <th className="py-2 px-4 border-b text-left">Price/Night</th>
                  <th className="py-2 px-4 border-b text-left">Status</th>
                  <th className="py-2 px-4 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{room.room_number}</td>
                    <td className="py-2 px-4 border-b">{room.floor}</td>
                    <td className="py-2 px-4 border-b">${room.price_per_night}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded text-xs ${
                        room.status === 'available' ? 'bg-green-100 text-green-800' :
                        room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                        room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <Link to={`/room-control/${room.id}`} className="text-blue-600 hover:underline mr-2">
                        Control
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'bookings' && (
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Room</th>
                  <th className="py-2 px-4 border-b text-left">Check-in</th>
                  <th className="py-2 px-4 border-b text-left">Check-out</th>
                  <th className="py-2 px-4 border-b text-left">Status</th>
                  <th className="py-2 px-4 border-b text-left">User ID</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{booking.room_id}</td>
                    <td className="py-2 px-4 border-b">{formatDate(booking.check_in_date)}</td>
                    <td className="py-2 px-4 border-b">{formatDate(booking.check_out_date)}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded text-xs ${
                        booking.status === 'active' ? 'bg-green-100 text-green-800' :
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b">{booking.user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <Route path="/room/:id" element={<PrivateRoute><RoomDetail /></PrivateRoute>} />
          <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
          <Route path="/room-control/:id" element={<PrivateRoute><RoomControl /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
