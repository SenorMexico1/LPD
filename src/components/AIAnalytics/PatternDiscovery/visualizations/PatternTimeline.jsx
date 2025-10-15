// src/components/AIAnalytics/PatternDiscovery/visualizations/PatternTimeline.jsx
import React from 'react';

export const PatternTimeline = ({ events, title }) => {
  return (
    <div className="pattern-timeline bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
        
        {/* Events */}
        <div className="space-y-4">
          {events?.map((event, idx) => (
            <div key={idx} className="flex items-start gap-4">
              {/* Timeline dot */}
              <div className={`relative z-10 w-4 h-4 rounded-full mt-1 ${
                event.type === 'risk' ? 'bg-red-500' :
                event.type === 'opportunity' ? 'bg-green-500' :
                'bg-blue-500'
              }`}>
                <div className="absolute inset-0 rounded-full animate-ping opacity-30"></div>
              </div>
              
              {/* Event content */}
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">{event.title}</h4>
                  <span className="text-xs text-gray-500">{event.date}</span>
                </div>
                <p className="text-xs text-gray-600">{event.description}</p>
                {event.impact && (
                  <div className="mt-2 text-xs font-medium text-blue-600">
                    Impact: ${(event.impact / 1000).toFixed(0)}K
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};