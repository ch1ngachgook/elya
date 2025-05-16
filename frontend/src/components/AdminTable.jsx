import React from 'react';

// Компонент таблицы для панели администратора
const AdminTable = ({ rooms, onControlRoom }) => {
  return (
    <div className="admin-table overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b text-left">Номер</th>
            <th className="py-2 px-4 border-b text-left">Гость</th>
            <th className="py-2 px-4 border-b text-left">Статус</th>
            <th className="py-2 px-4 border-b text-left">Свет</th>
            <th className="py-2 px-4 border-b text-left">Замок</th>
            <th className="py-2 px-4 border-b text-left">Канал 1</th>
            <th className="py-2 px-4 border-b text-left">Канал 2</th>
            <th className="py-2 px-4 border-b text-left">Действия</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => {
            // Определяем статус комнаты для отображения
            const statusDisplay = {
              available: { text: 'Свободен', className: 'bg-green-100 text-green-800' },
              occupied: { text: 'Занят', className: 'bg-red-100 text-red-800' },
              maintenance: { text: 'Обслуживание', className: 'bg-yellow-100 text-yellow-800' },
              cleaning: { text: 'Уборка', className: 'bg-blue-100 text-blue-800' }
            };
            
            const status = statusDisplay[room.status] || { text: 'Неизвестно', className: 'bg-gray-100 text-gray-800' };
            
            return (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{room.room_number}</td>
                <td className="py-2 px-4 border-b">
                  {room.guest_name || (room.status === 'occupied' ? 'Имя не указано' : '-')}
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${status.className}`}>
                    {status.text}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.lightsOn ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {room.lightsOn ? 'Вкл' : 'Выкл'}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.doorLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {room.doorLocked ? 'Закрыт' : 'Открыт'}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.channel1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {room.channel1 ? 'Вкл' : 'Выкл'}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.channel2 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {room.channel2 ? 'Вкл' : 'Выкл'}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <button 
                    onClick={() => onControlRoom(room.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Управление
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;