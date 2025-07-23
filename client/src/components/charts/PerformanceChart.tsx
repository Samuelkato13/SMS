import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export const PerformanceChart = () => {
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
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Average Score',
              data: [78, 82, 79, 85, 88, 84],
              borderColor: 'hsl(207, 90%, 54%)',
              backgroundColor: 'hsla(207, 90%, 54%, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: 'hsl(207, 90%, 54%)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
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
          <h3 className="text-lg font-semibold text-gray-900">Student Performance Trends</h3>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white">
            <option>Last 6 months</option>
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
