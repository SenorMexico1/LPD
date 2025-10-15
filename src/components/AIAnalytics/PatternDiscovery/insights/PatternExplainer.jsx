// src/components/AIAnalytics/PatternDiscovery/insights/PatternExplainer.jsx
import React from 'react';

export const PatternExplainer = ({ pattern }) => {
  return (
    <div className="pattern-explainer bg-gray-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">Pattern Explanation</h4>
      
      {pattern.evidence && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-1">Evidence</h5>
          <p className="text-sm text-gray-600">{pattern.evidence.dataPoints || pattern.evidence}</p>
          
          {pattern.evidence.statisticalTest && (
            <div className="mt-2 text-xs bg-white rounded p-2">
              <span className="text-gray-500">Statistical Test: </span>
              <span className="font-medium">{pattern.evidence.statisticalTest}</span>
              {pattern.evidence.pValue && (
                <span className="ml-2">
                  (p-value: {pattern.evidence.pValue.toFixed(4)})
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {pattern.factors && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-1">Contributing Factors</h5>
          <div className="space-y-1">
            {pattern.factors.primary?.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-500">Primary: </span>
                <span className="font-medium">{pattern.factors.primary.join(', ')}</span>
              </div>
            )}
            {pattern.factors.secondary?.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-500">Secondary: </span>
                <span>{pattern.factors.secondary.join(', ')}</span>
              </div>
            )}
            {pattern.factors.correlation && (
              <div className="text-sm">
                <span className="text-gray-500">Correlation: </span>
                <span className="font-medium">{pattern.factors.correlation.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {pattern.methodology && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-1">Methodology</h5>
          <p className="text-xs text-gray-600">{pattern.methodology}</p>
        </div>
      )}
    </div>
  );
};