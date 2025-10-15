// src/components/AIAnalytics/PatternDiscovery/insights/ActionableRecommendation.jsx
import React from 'react';

export const ActionableRecommendation = ({ recommendation, pattern, onImplement }) => {
  return (
    <div className="actionable-recommendation bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">Recommended Actions</h4>
      
      {recommendation.immediate && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-500">🚨</span>
            <span className="text-sm font-medium text-gray-700">Immediate (24-48 hours)</span>
          </div>
          <p className="text-sm text-gray-600 ml-6">{recommendation.immediate}</p>
          <button
            onClick={() => onImplement && onImplement('immediate', pattern)}
            className="ml-6 mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Execute Now
          </button>
        </div>
      )}
      
      {recommendation.shortTerm && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-500">⏱️</span>
            <span className="text-sm font-medium text-gray-700">Short Term (1-4 weeks)</span>
          </div>
          <p className="text-sm text-gray-600 ml-6">{recommendation.shortTerm}</p>
          <button
            onClick={() => onImplement && onImplement('shortTerm', pattern)}
            className="ml-6 mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
          >
            Schedule
          </button>
        </div>
      )}
      
      {recommendation.longTerm && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500">📅</span>
            <span className="text-sm font-medium text-gray-700">Long Term (Next Quarter)</span>
          </div>
          <p className="text-sm text-gray-600 ml-6">{recommendation.longTerm}</p>
          <button
            onClick={() => onImplement && onImplement('longTerm', pattern)}
            className="ml-6 mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            Add to Roadmap
          </button>
        </div>
      )}
      
      {recommendation.expectedROI && (
        <div className="mt-3 p-2 bg-white rounded">
          <span className="text-xs text-gray-500">Expected ROI: </span>
          <span className="text-sm font-semibold text-green-600">{recommendation.expectedROI}</span>
        </div>
      )}
    </div>
  );
};