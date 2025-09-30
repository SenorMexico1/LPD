// components/CollectionsAnalysis/HistoricalAnalysis.jsx
import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const HistoricalAnalysis = ({ 
  loans, 
  selectedDate, 
  historicalMetrics, 
  timeSeriesData,
  calculateHistoricalStatus 
}) => {
  const [showTrends, setShowTrends] = useState(false);
  
  return (
    <div>
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Current</p>
          <p className="text-2xl font-bold text-green-600">{historicalMetrics.current}</p>
          <p className="text-xs text-gray-500">
            {((historicalMetrics.current / historicalMetrics.total) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Delinquent</p>
          <p className="text-2xl font-bold text-yellow-600">
            {historicalMetrics.delinquent1 + historicalMetrics.delinquent2 + historicalMetrics.delinquent3}
          </p>
          <div className="text-xs text-gray-500 mt-1">
            <span className="block">30d: {historicalMetrics.delinquent1}</span>
            <span className="block">60d: {historicalMetrics.delinquent2}</span>
            <span className="block">90d: {historicalMetrics.delinquent3}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Default</p>
          <p className="text-2xl font-bold text-red-600">{historicalMetrics.default}</p>
          <p className="text-xs text-gray-500">
            {((historicalMetrics.default / historicalMetrics.total) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Collection Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {historicalMetrics.collectionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">
            ${(historicalMetrics.totalCollected / 1000000).toFixed(2)}M collected
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Total Outstanding</p>
            <p className="text-xl font-bold text-gray-800">
              ${(historicalMetrics.totalOutstanding / 1000000).toFixed(2)}M
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Collected</p>
            <p className="text-xl font-bold text-green-600">
              ${(historicalMetrics.totalCollected / 1000000).toFixed(2)}M
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Portfolio</p>
            <p className="text-xl font-bold text-blue-600">
              ${((historicalMetrics.totalOutstanding + historicalMetrics.totalCollected) / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
      </div>

      {/* Recoveries and Catch-ups */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Recent Catch-up Payments</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {historicalMetrics.catchUps.length} total
            </span>
          </div>
          {historicalMetrics.catchUps.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historicalMetrics.catchUps.slice(0, 10).map((catchUp, idx) => (
                <div key={idx} className="border-b pb-2 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{catchUp.loanId}</p>
                      <p className="text-xs text-gray-600">{catchUp.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-semibold">
                        ${catchUp.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {catchUp.paymentsCleared} payments cleared
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No catch-up payments in this period</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Recoveries from Defaults</h3>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
              {historicalMetrics.recoveries.length} total
            </span>
          </div>
          {historicalMetrics.recoveries.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historicalMetrics.recoveries.slice(0, 10).map((recovery, idx) => (
                <div key={idx} className="border-b pb-2 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{recovery.loanId}</p>
                      <p className="text-xs text-gray-600">{recovery.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 font-semibold">
                        ${recovery.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {recovery.payments} payment{recovery.payments !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recoveries in this period</p>
          )}
        </div>
      </div>

      {/* Trends Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowTrends(!showTrends)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors"
        >
          {showTrends ? 'Hide' : 'Show'} Historical Trends
        </button>
      </div>

      {/* Trends Charts */}
      {showTrends && (
        <div className="space-y-4">
          {/* Status Trends Chart */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Portfolio Status Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="current" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  name="Current"
                />
                <Area 
                  type="monotone" 
                  dataKey="delinquent" 
                  stackId="1" 
                  stroke="#f59e0b" 
                  fill="#f59e0b"
                  name="Delinquent" 
                />
                <Area 
                  type="monotone" 
                  dataKey="default" 
                  stackId="1" 
                  stroke="#ef4444" 
                  fill="#ef4444"
                  name="Default" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Collection Rate Trend */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Collection Rate Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => `${value.toFixed(2)}%`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="collectionRate" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Collection Rate %"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Portfolio Health Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">Portfolio Health Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-blue-700">Health Score</p>
            <p className="font-bold text-lg">
              {(100 - (historicalMetrics.default / historicalMetrics.total * 100)).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-blue-700">Delinquency Rate</p>
            <p className="font-bold text-lg">
              {(((historicalMetrics.delinquent1 + historicalMetrics.delinquent2 + 
                 historicalMetrics.delinquent3 + historicalMetrics.default) / 
                 historicalMetrics.total) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-blue-700">Recovery Rate</p>
            <p className="font-bold text-lg">
              {historicalMetrics.recoveries.length > 0
                ? `${((historicalMetrics.recoveries.length / historicalMetrics.default) * 100).toFixed(1)}%`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-blue-700">Catch-up Rate</p>
            <p className="font-bold text-lg">
              {((historicalMetrics.catchUps.length / historicalMetrics.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};