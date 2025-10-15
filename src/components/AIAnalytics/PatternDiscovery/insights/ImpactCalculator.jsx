// src/components/AIAnalytics/PatternDiscovery/insights/ImpactCalculator.jsx
import React from 'react';
import { formatCurrency } from '../utils/formatters';

export const ImpactCalculator = ({ patterns }) => {
  const totalImpact = patterns.reduce((sum, p) => sum + (p.financialImpact || 0), 0);
  const totalLoans = new Set(patterns.flatMap(p => p.affectedLoans || [])).size;
  
  const byType = patterns.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + (p.financialImpact || 0);
    return acc;
  }, {});
  
  const highConfidence = patterns.filter(p => p.confidence >= 80);
  const criticalPatterns = patterns.filter(p => p.financialImpact > 200000);
  
  return (
    <div className="impact-calculator bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Total Impact Analysis</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-green-50 rounded p-3">
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(totalImpact)}
          </div>
          <div className="text-xs text-green-600">Total Impact</div>
        </div>
        
        <div className="bg-blue-50 rounded p-3">
          <div className="text-2xl font-bold text-blue-800">
            {totalLoans}
          </div>
          <div className="text-xs text-blue-600">Affected Loans</div>
        </div>
        
        <div className="bg-purple-50 rounded p-3">
          <div className="text-2xl font-bold text-purple-800">
            {highConfidence.length}
          </div>
          <div className="text-xs text-purple-600">High Confidence</div>
        </div>
        
        <div className="bg-red-50 rounded p-3">
          <div className="text-2xl font-bold text-red-800">
            {criticalPatterns.length}
          </div>
          <div className="text-xs text-red-600">Critical Patterns</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Impact by Type</h4>
        {Object.entries(byType).map(([type, impact]) => (
          <div key={type} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">{type}</span>
            <span className="text-sm font-semibold">{formatCurrency(impact)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};