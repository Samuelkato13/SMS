import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export const AttendanceChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        // Destroy existing chart
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Attendance %',
              data: [92, 94, 91, 96, 95, 93],
              backgroundColor: 'hsl(142, 76%, 36%)',
              borderRadius: 4,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                grid: {
                  color: 'hsl(20, 5.9%, 90%)',
                },
                ticks: {
                  color: 'hsl(25, 5.3%, 44.7%)',
                }
              },
              x: {
                grid: {
                  color: 'hsl(20, 5.9%, 90%)',
                },
                ticks: {
                  color: 'hsl(25, 5.3%, 44.7%)',
                }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Attendance</h3>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white">
            <option>This year</option>
            <option>Last year</option>
          </select>
        </div>
      </div>
      <div className="p-6">
        <div className="relative h-64">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
};
