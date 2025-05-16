import React from 'react';

// Компонент отображает состояние и значение датчика
const SensorDisplay = ({ label, value, unit, icon, iconColor = 'text-gray-700' }) => {
  return (
    <div className="sensor-display p-3 bg-gray-50 rounded-lg flex items-center">
      <div className={`sensor-icon mr-3 text-xl ${iconColor}`}>
        {icon}
      </div>
      <div className="sensor-info">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-lg font-semibold">
          {value} {unit}
        </div>
      </div>
    </div>
  );
};

export default SensorDisplay;