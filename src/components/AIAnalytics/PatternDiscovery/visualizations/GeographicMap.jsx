// src/components/AIAnalytics/PatternDiscovery/visualizations/GeographicMap.jsx
import React from 'react';

export const GeographicMap = ({ data, title }) => {
  // Simple US state grid representation
  const stateGrid = [
    ['', '', '', '', '', '', '', '', '', '', 'ME'],
    ['AK', '', '', '', '', '', '', '', 'VT', 'NH', 'MA'],
    ['', '', 'WA', 'ID', 'MT', 'ND', 'MN', 'WI', '', 'NY', 'CT', 'RI'],
    ['', '', 'OR', 'NV', 'WY', 'SD', 'IA', 'MI', 'PA', 'NJ', ''],
    ['', '', 'CA', 'UT', 'CO', 'NE', 'IL', 'IN', 'OH', 'MD', 'DE'],
    ['', '', '', 'AZ', 'NM', 'KS', 'MO', 'KY', 'WV', 'VA', ''],
    ['HI', '', '', '', '', 'OK', 'AR', 'TN', 'NC', 'SC', ''],
    ['', '', '', '', 'TX', 'LA', 'MS', 'AL', 'GA', '', ''],
    ['', '', '', '', '', '', '', '', 'FL', '', '']
  ];
  
  const getStateColor = (state) => {
    const stateData = data[state];
    if (!stateData) return 'bg-gray-200';
    
    const value = stateData.value || stateData.defaultRate || 0;
    if (value > 10) return 'bg-red-500';
    if (value > 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="geographic-map bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      
      <div className="grid grid-cols-11 gap-1">
        {stateGrid.map((row, rowIdx) => (
          row.map((state, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={`aspect-square flex items-center justify-center text-xs font-semibold rounded ${
                state ? `${getStateColor(state)} text-white cursor-pointer hover:opacity-80` : ''
              }`}
              title={state && data[state] ? `${state}: ${data[state].value?.toFixed(1)}%` : ''}
            >
              {state}
            </div>
          ))
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500"></div>
          <span>Low (&lt;5%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-500"></div>
          <span>Medium (5-10%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500"></div>
          <span>High (&gt;10%)</span>
        </div>
      </div>
    </div>
  );
};