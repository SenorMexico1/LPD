// src/components/AIAnalytics/PatternDiscovery/visualizations/RiskMatrix.jsx
import React from 'react';

/**
 * Risk Matrix Visualization
 * Displays patterns on a probability vs impact grid
 */

export const RiskMatrix = ({ patterns, loans, onPatternClick }) => {
  // Calculate risk scores for patterns
  const matrixData = patterns.map(pattern => ({
    ...pattern,
    probability: calculateProbability(pattern, loans),
    impact: pattern.financialImpact || 0,
    quadrant: getQuadrant(pattern)
  }));

  // Group patterns by quadrant
  const quadrants = {
    highHigh: matrixData.filter(p => p.probability > 50 && p.impact > 100000),
    highLow: matrixData.filter(p => p.probability > 50 && p.impact <= 100000),
    lowHigh: matrixData.filter(p => p.probability <= 50 && p.impact > 100000),
    lowLow: matrixData.filter(p => p.probability <= 50 && p.impact <= 100000)
  };

  return (
    <div className="risk-matrix-container bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Risk/Opportunity Matrix</h3>
      
      {/* Matrix Grid */}
      <div className="relative h-96 border-2 border-gray-300 rounded">
        {/* Axis Labels */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 rotate-[-90deg] text-sm font-medium text-gray-600">
          Impact ($)
        </div>
        <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 text-sm font-medium text-gray-600">
          Probability (%)
        </div>
        
        {/* Quadrant Labels */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* High Impact, High Probability - Critical */}
          <div className="border-r border-b border-gray-300 bg-red-50 p-2">
            <div className="text-xs font-semibold text-red-700">Critical Action</div>
            <div className="text-xs text-red-600">High Impact, High Probability</div>
          </div>
          
          {/* Low Impact, High Probability - Monitor */}
          <div className="border-b border-gray-300 bg-yellow-50 p-2">
            <div className="text-xs font-semibold text-yellow-700">Monitor Closely</div>
            <div className="text-xs text-yellow-600">Low Impact, High Probability</div>
          </div>
          
          {/* High Impact, Low Probability - Prepare */}
          <div className="border-r border-gray-300 bg-orange-50 p-2">
            <div className="text-xs font-semibold text-orange-700">Prepare Plans</div>
            <div className="text-xs text-orange-600">High Impact, Low Probability</div>
          </div>
          
          {/* Low Impact, Low Probability - Accept */}
          <div className="bg-green-50 p-2">
            <div className="text-xs font-semibold text-green-700">Accept/Watch</div>
            <div className="text-xs text-green-600">Low Impact, Low Probability</div>
          </div>
        </div>
        
        {/* Plot Patterns */}
        {matrixData.map((pattern, idx) => {
          const x = (pattern.probability / 100) * 100; // Convert to percentage position
          const y = 100 - Math.min((pattern.impact / 500000) * 100, 100); // Invert Y and scale
          const size = Math.max(20, Math.min(50, pattern.confidence / 2)); // Size based on confidence
          
          return (
            <div
              key={pattern.id || idx}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:z-10 group"
              style={{
                left: `${x}%`,
                top: `${y}%`
              }}
              onClick={() => onPatternClick && onPatternClick(pattern)}
            >
              {/* Pattern Bubble */}
              <div
                className={`rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-110 ${
                  pattern.type === 'risk' ? 'bg-red-500 hover:bg-red-600' :
                  pattern.type === 'opportunity' ? 'bg-green-500 hover:bg-green-600' :
                  'bg-blue-500 hover:bg-blue-600'
                }`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`
                }}
              >
                {idx + 1}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                <div className="bg-gray-900 text-white p-2 rounded text-xs whitespace-nowrap">
                  <div className="font-semibold">{pattern.title}</div>
                  <div>Impact: ${(pattern.impact / 1000).toFixed(0)}K</div>
                  <div>Probability: {pattern.probability.toFixed(0)}%</div>
                  <div>Confidence: {pattern.confidence}%</div>
                </div>
                <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>
          );
        })}
        
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 border-t border-gray-300 opacity-50"></div>
          <div className="absolute top-0 bottom-0 left-1/2 border-l border-gray-300 opacity-50"></div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Opportunity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Neutral</span>
          </div>
        </div>
        <div className="text-gray-500">
          Bubble size = Confidence level
        </div>
      </div>
      
      {/* Pattern List by Quadrant */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Critical Action Items */}
        {quadrants.highHigh.length > 0 && (
          <div className="bg-red-50 rounded p-3">
            <h4 className="font-semibold text-red-700 text-sm mb-2">
              🚨 Critical Action Required ({quadrants.highHigh.length})
            </h4>
            <ul className="text-xs space-y-1">
              {quadrants.highHigh.slice(0, 3).map(p => (
                <li key={p.id} className="text-red-600">
                  • {p.title} (${(p.impact / 1000).toFixed(0)}K)
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* High Impact Items */}
        {quadrants.lowHigh.length > 0 && (
          <div className="bg-orange-50 rounded p-3">
            <h4 className="font-semibold text-orange-700 text-sm mb-2">
              ⚡ High Impact Patterns ({quadrants.lowHigh.length})
            </h4>
            <ul className="text-xs space-y-1">
              {quadrants.lowHigh.slice(0, 3).map(p => (
                <li key={p.id} className="text-orange-600">
                  • {p.title} (${(p.impact / 1000).toFixed(0)}K)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function calculateProbability(pattern, loans) {
  // Calculate probability based on pattern type and metrics
  if (pattern.statisticalSignificance) {
    return (1 - pattern.statisticalSignificance) * 100;
  }
  
  // Use confidence as proxy for probability if no p-value
  if (pattern.confidence) {
    return pattern.confidence;
  }
  
  // Default based on affected loans ratio
  const affectedRatio = pattern.affectedCount / loans.length;
  return Math.min(affectedRatio * 100, 100);
}

function getQuadrant(pattern) {
  const prob = pattern.probability || pattern.confidence || 50;
  const impact = pattern.financialImpact || 0;
  
  if (prob > 50 && impact > 100000) return 'critical';
  if (prob > 50 && impact <= 100000) return 'monitor';
  if (prob <= 50 && impact > 100000) return 'prepare';
  return 'accept';
}