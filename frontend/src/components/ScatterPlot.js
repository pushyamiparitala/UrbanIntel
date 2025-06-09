import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(zoomPlugin); // Register the plugin

function ScatterPlot({ data, isDarkTheme }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!data || !chartRef.current) return;

    const textColor = isDarkTheme ? '#f7fafc' : '#2d3748';
    const gridColor = isDarkTheme ? 'rgba(74, 85, 104, 0.5)' : 'rgba(226, 232, 240, 0.7)';
    const pointBackgroundColor = isDarkTheme ? 'rgba(99, 179, 237, 0.7)' : 'rgba(66, 153, 225, 0.6)'; // --accent & --accent-light

    const chartConfig = {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Residential Density vs VMT',
          data: data.map(d => ({ x: d.D1A_scaled, y: d.Composite_VMT_scaled })),
          backgroundColor: pointBackgroundColor,
          radius: data.length > 1000 ? 2 : 3,
          hoverRadius: data.length > 1000 ? 4 : 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            labels: {
              color: textColor
            }
          },
          tooltip: {
            backgroundColor: isDarkTheme ? 'rgba(45, 55, 72, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkTheme ? 'rgba(74, 85, 104, 1)' : 'rgba(226, 232, 240, 1)',
            borderWidth: 1
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
              threshold: 5,
            },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'xy',
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Residential Density (Scaled)',
              color: textColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor,
              borderColor: gridColor
            }
          },
          y: {
            title: {
              display: true,
              text: 'Vehicle Miles Traveled (Scaled)',
              color: textColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor,
              borderColor: gridColor
            }
          }
        }
      }
    };

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    if (data.length > 0) {
        chartInstanceRef.current = new Chart(chartRef.current, chartConfig);
    } else {
        const ctx = chartRef.current.getContext('2d');
        ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        ctx.fillText("No data to display for current selection.", chartRef.current.width / 2, chartRef.current.height / 2);
    }

  }, [data, isDarkTheme]);

  return <canvas ref={chartRef} />;
}

export default ScatterPlot;
