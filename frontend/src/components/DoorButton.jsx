import React from 'react';

// Кнопка для управления дверью комнаты
const DoorButton = ({ isLocked, onClick, isLoading = false, disabled = false }) => {
  return (
    <div className="door-button-container">
      <button
        className={`door-button w-full py-4 px-6 rounded-lg font-bold text-white text-center transition-all ${
          isLocked 
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-green-600 hover:bg-green-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isLoading ? 'animate-pulse' : ''}`}
        onClick={onClick}
        disabled={disabled || isLoading}
      >
        <div className="flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 mr-2 transition-transform ${isLocked ? '' : 'door-unlock-animation'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isLocked ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" 
              />
            )}
          </svg>
          {isLoading 
            ? 'Обработка...' 
            : (isLocked ? 'Открыть дверь' : 'Дверь открыта')
          }
        </div>
      </button>
      <p className="text-sm text-center mt-2 text-gray-600">
        {isLocked 
          ? 'Нажмите, чтобы разблокировать дверь с помощью Bluetooth' 
          : 'Дверь автоматически заблокируется через несколько секунд'}
      </p>
    </div>
  );
};

export default DoorButton;