// src/components/AIAnalytics/PatternDiscovery/visualizations/PatternHeatmap.jsx
import React from 'react';

export const PatternHeatmap = ({ data, title, onCellClick }) => {
  // Calculate intensity values for heatmap
  const getIntensity = (value, min, max) => {
    const normalized = (value - min) / (max - min);
    return Math.round(normalized * 100);
  };
  
  const values = data.flatMap(row => row.values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return (
    <div className="pattern-heatmap bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-600 p-2">Category</th>
              {data[0]?.columns?.map((col, idx) => (
                <th key={idx} className="text-center text-xs font-medium text-gray-600 p-2">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="text-sm font-medium text-gray-800 p-2">{row.label}</td>
                {row.values.map((value, colIdx) => {
                  const intensity = getIntensity(value, min, max);
                  const color = intensity > 70 ? 'bg-red' : intensity > 40 ? 'bg-yellow' : 'bg-green';
                  
                  return (
                    <td
                      key={colIdx}
                      className={`p-2 text-center text-xs cursor-pointer hover:opacity-80 transition-opacity ${color}-${Math.round(intensity / 10) * 100}`}
                      style={{
                        backgroundColor: `rgba(${intensity > 50 ? 255 : 0}, ${intensity <= 50 ? 255 : 0}, 0, ${intensity / 100})`
                      }}
                      onClick={() => onCellClick && onCellClick(row.label, row.columns[colIdx], value)}
                    >
                      <div className="font-semibold">{value.toFixed(1)}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-400"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-400"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-400"></div>
          <span>High Risk</span>
        </div>
      </div>
    </div>
  );
};
