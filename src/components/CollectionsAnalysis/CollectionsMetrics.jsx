// components/CollectionsAnalysis/CollectionsMetrics.jsx
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const CollectionsMetrics = ({ loans, selectedDate, calculateHistoricalStatus, dateRange }) => {
  const [viewMode, setViewMode] = useState('overview'); // overview, aging, performance
  
  // Calculate collection metrics
  const collectionMetrics = useMemo(() => {
    const metrics = {
      // Daily metrics
      todayExpected: 0,
      todayCollected: 0,
      todayCount: 0,
      
      // Weekly metrics
      weekExpected: 0,
      weekCollected: 0,
      weekCount: 0,
      
      // Monthly metrics
      monthExpected: 0,
      monthCollected: 0,
      monthCount: 0,
      
      // Aging buckets
      aging: {
        current: { count: 0, amount: 0 },
        days30: { count: 0, amount: 0 },
        days60: { count: 0, amount: 0 },
        days90: { count: 0, amount: 0 },
        days120Plus: { count: 0, amount: 0 }
      },
      
      // Collection efficiency
      promiseToPayKept: 0,
      averageDaysToCollect: 0,
      recoveryRate: 0,
      writeOffAmount: 0,
      
      // Payment methods
      paymentMethods: {
        ach: { count: 0, amount: 0 },
        creditCard: { count: 0, amount: 0 },
        wire: { count: 0, amount: 0 },
        other: { count: 0, amount: 0 }
      }
    };
    
    const today = new Date(selectedDate);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    loans.forEach(loan => {
      const status = calculateHistoricalStatus(loan, selectedDate);
      
      // Calculate aging
      if (status.missedPayments === 0) {
        metrics.aging.current.count++;
        metrics.aging.current.amount += status.balance;
      } else if (status.missedPayments === 1) {
        metrics.aging.days30.count++;
        metrics.aging.days30.amount += status.balance;
      } else if (status.missedPayments === 2) {
        metrics.aging.days60.count++;
        metrics.aging.days60.amount += status.balance;
      } else if (status.missedPayments === 3) {
        metrics.aging.days90.count++;
        metrics.aging.days90.amount += status.balance;
      } else {
        metrics.aging.days120Plus.count++;
        metrics.aging.days120Plus.amount += status.balance;
      }
      
      // Calculate daily, weekly, monthly collections
      loan.transactions.forEach(trans => {
        const transDate = new Date(trans.date);
        const transDateStr = trans.date.split('T')[0];
        
        if (trans.credit > 0 && transDateStr <= selectedDate) {
          const typeLower = (trans.typeName || '').toLowerCase();
          
          // Skip fees and reversals
          const isFee = ['fee', 'origination', 'merchant'].some(term => typeLower.includes(term));
          const isReversal = typeLower.includes('reversal') || typeLower.includes('nsf');
          
          if (!isFee && !isReversal) {
            // Daily collections
            if (transDateStr === selectedDate) {
              metrics.todayCollected += trans.credit;
              metrics.todayCount++;
            }
            
            // Weekly collections
            if (transDate >= weekAgo && transDate <= today) {
              metrics.weekCollected += trans.credit;
              metrics.weekCount++;
            }
            
            // Monthly collections
            if (transDate >= monthAgo && transDate <= today) {
              metrics.monthCollected += trans.credit;
              metrics.monthCount++;
            }
            
            // Payment method breakdown
            if (typeLower.includes('ach')) {
              metrics.paymentMethods.ach.count++;
              metrics.paymentMethods.ach.amount += trans.credit;
            } else if (typeLower.includes('credit card') || typeLower.includes('debit card')) {
              metrics.paymentMethods.creditCard.count++;
              metrics.paymentMethods.creditCard.amount += trans.credit;
            } else if (typeLower.includes('wire')) {
              metrics.paymentMethods.wire.count++;
              metrics.paymentMethods.wire.amount += trans.credit;
            } else {
              metrics.paymentMethods.other.count++;
              metrics.paymentMethods.other.amount += trans.credit;
            }
          }
        }
      });
      
      // Calculate expected payments
      loan.paydates.forEach(paydate => {
        const paydateStr = paydate.date.split('T')[0];
        const paydateObj = new Date(paydate.date);
        
        if (paydateStr === selectedDate) {
          metrics.todayExpected += paydate.amount;
        }
        if (paydateObj >= weekAgo && paydateObj <= today) {
          metrics.weekExpected += paydate.amount;
        }
        if (paydateObj >= monthAgo && paydateObj <= today) {
          metrics.monthExpected += paydate.amount;
        }
      });
    });
    
    // Calculate collection rates
    metrics.todayRate = metrics.todayExpected > 0 ? (metrics.todayCollected / metrics.todayExpected) * 100 : 0;
    metrics.weekRate = metrics.weekExpected > 0 ? (metrics.weekCollected / metrics.weekExpected) * 100 : 0;
    metrics.monthRate = metrics.monthExpected > 0 ? (metrics.monthCollected / metrics.monthExpected) * 100 : 0;
    
    return metrics;
  }, [loans, selectedDate, calculateHistoricalStatus]);
  
  // Generate daily collection trend data
  const dailyTrend = useMemo(() => {
    const data = [];
    const endDate = new Date(selectedDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      let dailyCollected = 0;
      let dailyExpected = 0;
      
      loans.forEach(loan => {
        loan.transactions.forEach(trans => {
          if (trans.date.split('T')[0] === dateStr && trans.credit > 0) {
            const typeLower = (trans.typeName || '').toLowerCase();
            const isFee = ['fee', 'origination', 'merchant'].some(term => typeLower.includes(term));
            const isReversal = typeLower.includes('reversal') || typeLower.includes('nsf');
            
            if (!isFee && !isReversal) {
              dailyCollected += trans.credit;
            }
          }
        });
        
        loan.paydates.forEach(paydate => {
          if (paydate.date.split('T')[0] === dateStr) {
            dailyExpected += paydate.amount;
          }
        });
      });
      
      data.push({
        date: dateStr,
        collected: dailyCollected,
        expected: dailyExpected,
        rate: dailyExpected > 0 ? (dailyCollected / dailyExpected) * 100 : 0
      });
    }
    
    return data;
  }, [loans, selectedDate]);
  
  // Pie chart colors
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
  
  // Export collection report
  const exportCollectionReport = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [{
      'Report Date': selectedDate,
      'Today Collected': collectionMetrics.todayCollected.toFixed(2),
      'Today Expected': collectionMetrics.todayExpected.toFixed(2),
      'Today Collection Rate': collectionMetrics.todayRate.toFixed(2) + '%',
      'Week Collected': collectionMetrics.weekCollected.toFixed(2),
      'Week Expected': collectionMetrics.weekExpected.toFixed(2),
      'Week Collection Rate': collectionMetrics.weekRate.toFixed(2) + '%',
      'Month Collected': collectionMetrics.monthCollected.toFixed(2),
      'Month Expected': collectionMetrics.monthExpected.toFixed(2),
      'Month Collection Rate': collectionMetrics.monthRate.toFixed(2) + '%'
    }];
    
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Collection Summary');
    
    // Aging Analysis Sheet
    const agingData = Object.entries(collectionMetrics.aging).map(([bucket, data]) => ({
      'Aging Bucket': bucket.replace('days', ' Days'),
      'Count': data.count,
      'Amount': data.amount.toFixed(2),
      'Percentage': ((data.amount / loans.reduce((sum, l) => sum + l.loanAmount, 0)) * 100).toFixed(2) + '%'
    }));
    
    const ws2 = XLSX.utils.json_to_sheet(agingData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Aging Analysis');
    
    // Payment Methods Sheet
    const paymentData = Object.entries(collectionMetrics.paymentMethods).map(([method, data]) => ({
      'Payment Method': method.toUpperCase(),
      'Transaction Count': data.count,
      'Total Amount': data.amount.toFixed(2),
      'Average Amount': data.count > 0 ? (data.amount / data.count).toFixed(2) : '0.00'
    }));
    
    const ws3 = XLSX.utils.json_to_sheet(paymentData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Payment Methods');
    
    // Daily Trend Sheet
    const ws4 = XLSX.utils.json_to_sheet(dailyTrend);
    XLSX.utils.book_append_sheet(wb, ws4, 'Daily Trend');
    
    XLSX.writeFile(wb, `Collection_Report_${selectedDate}.xlsx`);
  };
  
  return (
    <div>
      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={exportCollectionReport}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Export Collection Report
        </button>
      </div>
      
      {/* View Mode Selector */}
      <div className="bg-gray-100 rounded-lg p-1 inline-flex mb-6">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2 rounded ${viewMode === 'overview' ? 'bg-white shadow' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setViewMode('aging')}
          className={`px-4 py-2 rounded ${viewMode === 'aging' ? 'bg-white shadow' : ''}`}
        >
          Aging Analysis
        </button>
        <button
          onClick={() => setViewMode('performance')}
          className={`px-4 py-2 rounded ${viewMode === 'performance' ? 'bg-white shadow' : ''}`}
        >
          Performance
        </button>
      </div>
      
      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div>
          {/* Collection Rate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Collection</h3>
              <p className="text-3xl font-bold text-blue-600">
                ${collectionMetrics.todayCollected.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Expected: ${collectionMetrics.todayExpected.toLocaleString()}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Collection Rate</span>
                  <span className="font-semibold">{collectionMetrics.todayRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{width: `${Math.min(100, collectionMetrics.todayRate)}%`}}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">This Week's Collection</h3>
              <p className="text-3xl font-bold text-green-600">
                ${collectionMetrics.weekCollected.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Expected: ${collectionMetrics.weekExpected.toLocaleString()}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Collection Rate</span>
                  <span className="font-semibold">{collectionMetrics.weekRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{width: `${Math.min(100, collectionMetrics.weekRate)}%`}}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">This Month's Collection</h3>
              <p className="text-3xl font-bold text-purple-600">
                ${collectionMetrics.monthCollected.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Expected: ${collectionMetrics.monthExpected.toLocaleString()}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Collection Rate</span>
                  <span className="font-semibold">{collectionMetrics.monthRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full"
                    style={{width: `${Math.min(100, collectionMetrics.monthRate)}%`}}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment Methods Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Payment Methods Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(collectionMetrics.paymentMethods).map(([method, data]) => ({
                      name: method.toUpperCase(),
                      value: data.amount
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(collectionMetrics.paymentMethods).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Payment Method Stats</h3>
              <div className="space-y-3">
                {Object.entries(collectionMetrics.paymentMethods).map(([method, data]) => (
                  <div key={method} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium capitalize">{method}</p>
                      <p className="text-sm text-gray-500">{data.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${data.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">
                        Avg: ${data.count > 0 ? (data.amount / data.count).toLocaleString() : '0'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Aging Analysis Mode */}
      {viewMode === 'aging' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Accounts Receivable Aging</h3>
            <div className="grid grid-cols-5 gap-4 mb-6">
              {Object.entries(collectionMetrics.aging).map(([bucket, data]) => (
                <div key={bucket} className="text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {bucket === 'current' ? 'Current' : 
                     bucket === 'days30' ? '1-30 Days' :
                     bucket === 'days60' ? '31-60 Days' :
                     bucket === 'days90' ? '61-90 Days' : '90+ Days'}
                  </p>
                  <p className="text-2xl font-bold mb-1">{data.count}</p>
                  <p className="text-sm font-semibold text-gray-700">
                    ${(data.amount / 1000000).toFixed(2)}M
                  </p>
                </div>
              ))}
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(collectionMetrics.aging).map(([bucket, data]) => ({
                name: bucket === 'current' ? 'Current' : 
                      bucket === 'days30' ? '1-30' :
                      bucket === 'days60' ? '31-60' :
                      bucket === 'days90' ? '61-90' : '90+',
                amount: data.amount,
                count: data.count
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar yAxisId="left" dataKey="amount" fill="#8884d8" name="Amount ($)" />
                <Bar yAxisId="right" dataKey="count" fill="#82ca9d" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Aging Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Aging Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-yellow-700">Total Past Due</p>
                <p className="text-xl font-bold text-yellow-900">
                  ${(
                    collectionMetrics.aging.days30.amount +
                    collectionMetrics.aging.days60.amount +
                    collectionMetrics.aging.days90.amount +
                    collectionMetrics.aging.days120Plus.amount
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-yellow-700">Past Due Count</p>
                <p className="text-xl font-bold text-yellow-900">
                  {collectionMetrics.aging.days30.count +
                   collectionMetrics.aging.days60.count +
                   collectionMetrics.aging.days90.count +
                   collectionMetrics.aging.days120Plus.count}
                </p>
              </div>
              <div>
                <p className="text-sm text-yellow-700">Critical (90+ days)</p>
                <p className="text-xl font-bold text-red-600">
                  ${collectionMetrics.aging.days120Plus.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-yellow-700">Current %</p>
                <p className="text-xl font-bold text-green-600">
                  {(
                    (collectionMetrics.aging.current.amount /
                     Object.values(collectionMetrics.aging).reduce((sum, a) => sum + a.amount, 0)) * 100
                  ).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Mode */}
      {viewMode === 'performance' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">30-Day Collection Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value, name) => 
                    name === 'rate' ? `${value.toFixed(1)}%` : `$${value.toLocaleString()}`
                  }
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="collected" 
                  stroke="#3b82f6" 
                  name="Collected ($)"
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="expected" 
                  stroke="#ef4444" 
                  name="Expected ($)"
                  strokeDasharray="5 5"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#10b981" 
                  name="Collection Rate (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Avg Daily Collection</p>
              <p className="text-2xl font-bold">
                ${(collectionMetrics.monthCollected / 30).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Best Day (Last 30)</p>
              <p className="text-2xl font-bold text-green-600">
                ${Math.max(...dailyTrend.map(d => d.collected)).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Avg Collection Rate</p>
              <p className="text-2xl font-bold">
                {(dailyTrend.reduce((sum, d) => sum + d.rate, 0) / dailyTrend.length).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Payment Count</p>
              <p className="text-2xl font-bold">
                {collectionMetrics.monthCount}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};