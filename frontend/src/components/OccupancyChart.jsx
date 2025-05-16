import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Компонент для отображения графика загрузки отеля
const OccupancyChart = ({ occupancyData }) => {
  // Настройки графика
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Загрузка отеля по дням',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Заполнено: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        },
        title: {
          display: true,
          text: 'Загрузка (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Дата'
        }
      }
    }
  };

  // Генерация данных для графика
  const chartData = {
    labels: occupancyData.map(item => item.date),
    datasets: [
      {
        label: 'Загрузка отеля',
        data: occupancyData.map(item => item.occupancy),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1
      }
    ],
  };

  return (
    <div className="occupancy-chart bg-white p-4 rounded-lg shadow">
      <Bar options={options} data={chartData} />
    </div>
  );
};

export default OccupancyChart;