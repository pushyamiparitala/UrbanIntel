import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function BarChart({ metroData, isDarkTheme }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!metroData || !chartRef.current) return;

    const textColor = isDarkTheme ? '#f7fafc' : '#2d3748';
    const gridColor = isDarkTheme ? 'rgba(74, 85, 104, 0.5)' : 'rgba(226, 232, 240, 0.7)';
    const barBackgroundColor = isDarkTheme ? 'rgba(99, 179, 237, 0.7)' : 'rgba(66, 153, 225, 0.6)';
    const barBorderColor = isDarkTheme ? '#63b3ed' : '#2b6cb0';

    // Sort metros by walkability score and take top 10
    const sortedData = [...metroData]
      .map(d => ({ ...d, NatWalkInd: +d.NatWalkInd })) // Ensure NatWalkInd is a number
      .sort((a, b) => b.NatWalkInd - a.NatWalkInd)
      .slice(0, 10);

    const chartConfig = {
      type: 'bar',
      data: {
        labels: sortedData.map(d => d.CBSA_Name),
        datasets: [{
          label: 'Average Walkability Score',
          data: sortedData.map(d => d.NatWalkInd),
          backgroundColor: barBackgroundColor,
          borderColor: barBorderColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // For horizontal bar chart if labels are long
        plugins: {
          legend: {
            labels: {
              color: textColor
            }
          },
          title: {
            display: true,
            text: 'Top 10 Metro Areas by Walkability Score',
            color: textColor,
            font: {
              size: 16
            }
          },
          tooltip: {
            backgroundColor: isDarkTheme ? 'rgba(45, 55, 72, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkTheme ? 'rgba(74, 85, 104, 1)' : 'rgba(226, 232, 240, 1)',
            borderWidth: 1
          }
        },
        scales: {
          x: { // Now X is the value axis for horizontal bars
            beginAtZero: true,
            title: {
              display: true,
              text: 'National Walkability Index',
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
          y: { // Now Y is the category axis
            ticks: {
              color: textColor,
              font: {
                  size: 10 // Smaller font for potentially long metro names
              }
            },
            grid: {
              display: false // Often looks cleaner for category axis
            }
          }
        }
      }
    };
    
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    if (sortedData.length > 0) {
        chartInstanceRef.current = new Chart(chartRef.current, chartConfig);
    } else {
        const ctx = chartRef.current.getContext('2d');
        ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        ctx.fillText("No metro data to display.", chartRef.current.width / 2, chartRef.current.height / 2);
    }

  }, [metroData, isDarkTheme]);

  return <canvas ref={chartRef} />;
}

export default BarChart; 