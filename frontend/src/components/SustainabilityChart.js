import React, { useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as d3 from 'd3'; // For normalization and color schemes if needed

// Define which metrics to display as areas and their friendly names for the legend
const metricsForAreaChart = [
  { key: 'Walkability', label: 'Walkability', color: '#2563eb' }, // darker blue
  { key: 'Density', label: 'Density', color: '#60a5fa' }, // medium blue
  { key: 'JobHousingBalance', label: 'Job-Housing Balance', color: '#93c5fd' }, // lighter blue
  { key: 'IntersectionDensity', label: 'Intersection Density', color: '#bfdbfe' }, // lightest blue
];

function SustainabilityChart({ data, isDarkTheme }) {

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 1. Clean and select relevant parts of the data
    let tempData = data.map(d => {
      const clean_d = { 
        Region: d.Region,
        SustainabilityLabel: d.SustainabilityLabel 
      };
      metricsForAreaChart.forEach(metricConfig => {
        clean_d[metricConfig.key] = +d[metricConfig.key] || 0;
      });
      return clean_d;
    });

    // 2. Normalize each metric to a 0-100 scale for stacking
    metricsForAreaChart.forEach(metricConfig => {
      const metricKey = metricConfig.key;
      const values = tempData.map(d => d[metricKey]);
      const minVal = d3.min(values);
      const maxVal = d3.max(values);

      tempData.forEach(d => {
        if (maxVal === minVal) {
          d[metricKey + '_norm'] = 50; // Avoid division by zero, assign mid-value
        } else {
          d[metricKey + '_norm'] = ((d[metricKey] - minVal) / (maxVal - minVal)) * 100;
        }
      });
    });

    // 3. Sort data: by SustainabilityLabel (High > Medium > Low), then by Region
    const sustainabilityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
    tempData.sort((a, b) => {
      const orderA = sustainabilityOrder[a.SustainabilityLabel] || 4;
      const orderB = sustainabilityOrder[b.SustainabilityLabel] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return d3.ascending(a.Region, b.Region);
    });
    return tempData;
  }, [data]);

  if (!processedData || processedData.length === 0) {
    return <div style={{ padding: '20px', color: isDarkTheme ? '#fff' : '#000' }}>Loading data or no data available for California Sustainability Overview...</div>;
  }

  const tickColor = isDarkTheme ? '#A0A0A0' : '#666';

  return (
    <ResponsiveContainer width="100%" height={500}>
      <AreaChart
        data={processedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 100, // Increased for rotated X-axis labels
        }}
      >
        <defs>
          {metricsForAreaChart.map(metric => (
            <linearGradient key={`grad-${metric.key}`} id={`color${metric.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={metric.color} stopOpacity={isDarkTheme ? 0.7 : 0.8} />
              <stop offset="95%" stopColor={metric.color} stopOpacity={isDarkTheme ? 0.2 : 0.3} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? '#444' : '#ccc'} vertical={false} />
        <XAxis 
          dataKey="Region" 
          angle={-65} 
          textAnchor="end" 
          height={80} 
          interval={0} 
          tick={{ fontSize: 10, fill: tickColor }}
        />
        <YAxis tick={{ fontSize: 10, fill: tickColor }} label={{ value: 'Normalized Metric Sum', angle: -90, position: 'insideLeft', fill: tickColor, dy: 70, dx: -15, fontSize:12 }}/>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: isDarkTheme ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.9)', 
            borderColor: isDarkTheme ? '#555' : '#ccc',
            color: isDarkTheme ? '#fff' : '#333'
          }}
          formatter={(value, name, itemProps) => {
            const metricConfig = metricsForAreaChart.find(m => m.label === name);
            let originalValueText = "N/A";

            if (metricConfig && itemProps.payload && typeof itemProps.payload[metricConfig.key] === 'number') {
              originalValueText = itemProps.payload[metricConfig.key].toFixed(2);
            }
            
            const normalizedValueText = typeof value === 'number' ? value.toFixed(1) + '%' : 'N/A';

            // Display format: "OriginalValue (Normalized: NormalizedValue%)"
            return `${originalValueText} (Normalized: ${normalizedValueText})`;
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0 && payload[0].payload) {
              return `${label} (Sustainability: ${payload[0].payload.SustainabilityLabel})`;
            }
            return label;
          }}
        />
        <Legend 
            wrapperStyle={{ paddingTop: '20px' }} 
            formatter={(value, entry) => {
                const metricConfig = metricsForAreaChart.find(m => m.key === value.replace('_norm', ''));
                return <span style={{ color: tickColor }}>{metricConfig ? metricConfig.label : value}</span>;
            }}
        />
        {metricsForAreaChart.map(metric => (
          <Area
            key={metric.key}
            type="monotone"
            dataKey={metric.key + '_norm'} // Use normalized data for stacking
            stackId="1" // All areas with the same stackId will be stacked
            stroke={metric.color}
            fill={`url(#color${metric.key})`}
            name={metric.label} // This will be used by Legend and Tooltip if not overridden
            activeDot={{ r: 6, stroke: isDarkTheme ? '#fff' : '#333' }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default SustainabilityChart;