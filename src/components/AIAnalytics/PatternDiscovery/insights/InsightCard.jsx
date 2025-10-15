// src/components/AIAnalytics/PatternDiscovery/insights/InsightCard.jsx
import React from 'react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export const InsightCard = ({ pattern, onActionClick, onDetailsClick }) => {
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };
  
  const getTypeIcon = (type) => {
    const icons = {
      opportunity: '💰',
      risk: '⚠️',
      correlation: '🔗',
      anomaly: '🔍',
      seasonal: '📅',
      geographic: '🗺️',
      industry: '🏭'
    };
    return icons[type] || '📊';
  };
  
  return (
    <div className="insight-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon(pattern.type)}</span>
          <h3 className="font-semibold text-gray-900">{pattern.title}</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(pattern.confidence)}`}>
          {pattern.confidence}% confidence
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{pattern.description}</p>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Financial Impact</div>
          <div className="text-sm font-semibold text-gray-900">
            {formatCurrency(pattern.financialImpact)}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Affected Loans</div>
          <div className="text-sm font-semibold text-gray-900">
            {pattern.affectedCount || pattern.affectedLoans?.length || 0}
          </div>
        </div>
      </div>
      
      {pattern.metrics && (
        <div className="mb-3 p-2 bg-blue-50 rounded">
          <div className="text-xs font-medium text-blue-900 mb-1">Key Metrics</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(pattern.metrics).slice(0, 4).map(([key, value]) => (
              <div key={key}>
                <span className="text-gray-600">{key}:</span>
                <span className="ml-1 font-medium">
                  {typeof value === 'number' ? formatPercentage(value) : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={() => onActionClick && onActionClick(pattern)}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Take Action
        </button>
        <button
          onClick={() => onDetailsClick && onDetailsClick(pattern)}
          className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};