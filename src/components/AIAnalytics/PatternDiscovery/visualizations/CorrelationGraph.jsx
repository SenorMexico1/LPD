// src/components/AIAnalytics/PatternDiscovery/visualizations/CorrelationGraph.jsx
import React from 'react';

export const CorrelationGraph = ({ nodes, edges, title }) => {
  return (
    <div className="correlation-graph bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      
      <div className="relative h-96 border border-gray-200 rounded">
        {/* Simple network visualization */}
        <svg className="w-full h-full">
          {/* Draw edges */}
          {edges?.map((edge, idx) => {
            const startNode = nodes.find(n => n.id === edge.source);
            const endNode = nodes.find(n => n.id === edge.target);
            if (!startNode || !endNode) return null;
            
            return (
              <line
                key={idx}
                x1={`${startNode.x}%`}
                y1={`${startNode.y}%`}
                x2={`${endNode.x}%`}
                y2={`${endNode.y}%`}
                stroke={edge.strength > 0.7 ? '#ef4444' : edge.strength > 0.4 ? '#eab308' : '#22c55e'}
                strokeWidth={Math.max(1, edge.strength * 4)}
                opacity={0.6}
              />
            );
          })}
          
          {/* Draw nodes */}
          {nodes?.map((node, idx) => (
            <g key={idx}>
              <circle
                cx={`${node.x}%`}
                cy={`${node.y}%`}
                r={node.size || 20}
                fill={node.color || '#3b82f6'}
                className="cursor-pointer hover:opacity-80"
              />
              <text
                x={`${node.x}%`}
                y={`${node.y}%`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold fill-white pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-1 bg-green-500"></div>
          <span>Weak Correlation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 bg-yellow-500"></div>
          <span>Moderate Correlation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 bg-red-500"></div>
          <span>Strong Correlation</span>
        </div>
      </div>
    </div>
  );
};