// src/components/AIAnalytics/PatternDiscovery/visualizations/TrendChart.jsx
import React from 'react';

export const TrendChart = ({ data, title, xLabel, yLabel }) => {
  if (!data || data.length === 0) return null;
  
  // Calculate chart dimensions
  const chartWidth = 600;
  const chartHeight = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  
  // Calculate scales
  const xScale = (index) => (index / (data.length - 1)) * plotWidth;
  const yMin = Math.min(...data.map(d => d.value));
  const yMax = Math.max(...data.map(d => d.value));
  const yScale = (value) => plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
  
  // Create path for line
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`)
    .join(' ');
  
  return (
    <div className="trend-chart bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      
      <svg width={chartWidth} height={chartHeight} className="w-full">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(tick => (
            <line
              key={tick}
              x1={0}
              y1={plotHeight * (1 - tick)}
              x2={plotWidth}
              y2={plotHeight * (1 - tick)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* X-axis */}
          <line x1={0} y1={plotHeight} x2={plotWidth} y2={plotHeight} stroke="#6b7280" strokeWidth="2" />
          
          {/* Y-axis */}
          <line x1={0} y1={0} x2={0} y2={plotHeight} stroke="#6b7280" strokeWidth="2" />
          
          {/* Line chart */}
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
          
          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={xScale(i)}
                cy={yScale(d.value)}
                r="4"
                fill="#3b82f6"
                className="cursor-pointer hover:r-6"
              />
              <text
                x={xScale(i)}
                y={plotHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {d.label}
              </text>
            </g>
          ))}
          
          {/* Y-axis labels */}
          {[yMin, (yMin + yMax) / 2, yMax].map((value, i) => (
            <text
              key={i}
              x={-10}
              y={yScale(value) + 5}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {value.toFixed(0)}
            </text>
          ))}
        </g>
        
        {/* Axis labels */}
        <text x={chartWidth / 2} y={chartHeight - 5} textAnchor="middle" className="text-sm fill-gray-700">
          {xLabel}
        </text>
        <text
          x={15}
          y={chartHeight / 2}
          transform={`rotate(-90 15 ${chartHeight / 2})`}
          textAnchor="middle"
          className="text-sm fill-gray-700"
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
};