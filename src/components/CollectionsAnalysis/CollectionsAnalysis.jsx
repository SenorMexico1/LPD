// components/CollectionsAnalysis/CollectionsAnalysis.jsx
import React, { useState, useMemo } from 'react';
import { CollectionsMetrics } from './CollectionsMetrics';
import { HistoricalAnalysis } from './HistoricalAnalysis';
import { PredictiveAnalysis } from './PredictiveAnalysis';

export const CollectionsAnalysis = ({ loans, etlService }) => {
  const [activeSubTab, setActiveSubTab] = useState('metrics');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Get date range from data
  const dateRange = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date(2020, 0, 1);
    
    loans.forEach(loan => {
      loan.transactions.forEach(trans => {
        const transDate = new Date(trans.date);
        if (transDate < minDate) minDate = transDate;
        if (transDate > maxDate) maxDate = transDate;
      });
      loan.paydates.forEach(pd => {
        const payDate = new Date(pd.date);
        if (payDate < minDate) minDate = payDate;
        if (payDate > maxDate) maxDate = payDate;
      });
    });
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0],
      today: new Date().toISOString().split('T')[0]
    };
  }, [loans]);

  // Shared utility: Recalculate loan status at any historical date
  const calculateHistoricalStatus = (loan, asOfDate) => {
    const targetDate = new Date(asOfDate);
    targetDate.setHours(0, 0, 0, 0);
    const targetString = targetDate.toISOString().split('T')[0];
    
    // Get paydates up to target date
    const expectedPayments = loan.paydates.filter(p => {
      const paydateString = p.date.split('T')[0];
      return paydateString < targetString;
    });
    
    // Get transactions up to target date
    const transactions = loan.transactions.filter(t => {
      const transString = t.date.split('T')[0];
      return transString <= targetString;
    });
    
    // Calculate total received (excluding fees and reversals)
    const FEE_TYPES = [
      'origination fee', 'merchant fee', 'nsf fees', 'legal fees',
      'initiation', 'stamp tax fee', 'restructure penalty'
    ];
    
    let totalReceived = 0;
    const reversedAmounts = new Set();
    
    transactions.forEach((trans, idx) => {
      const typeLower = (trans.typeName || '').toLowerCase();
      const isReversal = typeLower.includes('reversal') || typeLower.includes('nsf');
      
      if (isReversal && trans.debit > 0) {
        // Find original transaction to reverse
        for (let i = idx - 1; i >= 0; i--) {
          if (transactions[i].credit === trans.debit && !reversedAmounts.has(i)) {
            reversedAmounts.add(i);
            break;
          }
        }
      }
    });
    
    transactions.forEach((trans, idx) => {
      if (reversedAmounts.has(idx)) return;
      
      const typeLower = (trans.typeName || '').toLowerCase();
      const isFee = FEE_TYPES.some(fee => typeLower.includes(fee));
      const isReversal = typeLower.includes('reversal') || typeLower.includes('nsf');
      
      if (trans.credit > 0 && !isFee && !isReversal) {
        if (trans.credit < loan.loanAmount * 0.5) {
          totalReceived += trans.credit;
        }
      }
    });
    
    const paymentsMade = loan.installmentAmount > 0 
      ? Math.floor(totalReceived / loan.installmentAmount)
      : 0;
    
    const missedPayments = Math.max(0, expectedPayments.length - paymentsMade);
    
    // Determine status
    let status = 'current';
    if (missedPayments === 0) status = 'current';
    else if (missedPayments === 1) status = 'delinquent_1';
    else if (missedPayments === 2) status = 'delinquent_2';
    else if (missedPayments === 3) status = 'delinquent_3';
    else status = 'default';
    
    return {
      status,
      missedPayments,
      totalReceived,
      paymentsMade,
      expectedPayments: expectedPayments.length,
      balance: loan.loanAmount - totalReceived,
      transactions
    };
  };

  // Calculate metrics at selected date
  const historicalMetrics = useMemo(() => {
    const metrics = {
      total: loans.length,
      current: 0,
      delinquent1: 0,
      delinquent2: 0,
      delinquent3: 0,
      default: 0,
      totalOutstanding: 0,
      totalCollected: 0,
      collectionRate: 0,
      recoveries: [],
      catchUps: []
    };
    
    loans.forEach(loan => {
      const status = calculateHistoricalStatus(loan, selectedDate);
      
      metrics[status.status === 'delinquent_1' ? 'delinquent1' : 
              status.status === 'delinquent_2' ? 'delinquent2' :
              status.status === 'delinquent_3' ? 'delinquent3' :
              status.status]++;
      
      metrics.totalOutstanding += status.balance;
      metrics.totalCollected += status.totalReceived;
      
      // Detect catch-ups (large payments)
      loan.transactions.forEach(trans => {
        const transDate = trans.date.split('T')[0];
        if (transDate <= selectedDate && trans.credit > loan.installmentAmount * 1.5) {
          metrics.catchUps.push({
            loanId: loan.loanNumber,
            clientName: loan.client?.name,
            date: trans.date,
            amount: trans.credit,
            paymentsCleared: Math.floor(trans.credit / loan.installmentAmount)
          });
        }
      });
      
      // Detect recoveries (payments after default)
      if (status.missedPayments >= 4) {
        const recentPayments = loan.transactions.filter(t => {
          const tDate = new Date(t.date);
          const sDate = new Date(selectedDate);
          const daysDiff = (sDate - tDate) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30 && daysDiff >= 0 && t.credit > 0;
        });
        
        if (recentPayments.length > 0) {
          metrics.recoveries.push({
            loanId: loan.loanNumber,
            clientName: loan.client?.name,
            amount: recentPayments.reduce((sum, t) => sum + t.credit, 0),
            payments: recentPayments.length
          });
        }
      }
    });
    
    metrics.collectionRate = metrics.totalOutstanding + metrics.totalCollected > 0
      ? (metrics.totalCollected / (metrics.totalOutstanding + metrics.totalCollected)) * 100
      : 0;
    
    return metrics;
  }, [loans, selectedDate]);

  // Generate time series data for charts
  const timeSeriesData = useMemo(() => {
    const data = [];
    const startDate = new Date(dateRange.min);
    const endDate = new Date(selectedDate);
    
    // Sample weekly to avoid too many data points
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayMetrics = {
        date: dateStr,
        current: 0,
        delinquent: 0,
        default: 0,
        collectionRate: 0
      };
      
      loans.forEach(loan => {
        const status = calculateHistoricalStatus(loan, dateStr);
        if (status.status === 'current') dayMetrics.current++;
        else if (status.status.includes('delinquent')) dayMetrics.delinquent++;
        else if (status.status === 'default') dayMetrics.default++;
      });
      
      // Calculate collection rate
      let totalExpected = 0;
      let totalCollected = 0;
      loans.forEach(loan => {
        const status = calculateHistoricalStatus(loan, dateStr);
        totalExpected += status.expectedPayments * loan.installmentAmount;
        totalCollected += status.totalReceived;
      });
      
      dayMetrics.collectionRate = totalExpected > 0 
        ? (totalCollected / totalExpected) * 100 
        : 0;
      
      data.push(dayMetrics);
    }
    
    return data;
  }, [loans, selectedDate, dateRange.min]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Collections Analysis</h2>
      
      {/* Date Selector - Available across all subtabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Analysis Date (Time Travel)
            </label>
            <input
              type="date"
              value={selectedDate}
              min={dateRange.min}
              max={dateRange.today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <span className="ml-3 text-sm text-gray-500">
              Range: {dateRange.min} to {dateRange.today}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'metrics'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Collection Metrics
        </button>
        <button
          onClick={() => setActiveSubTab('historical')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'historical'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Historical Analysis
        </button>
        <button
          onClick={() => setActiveSubTab('predictive')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSubTab === 'predictive'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Predictive Analytics
        </button>
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === 'metrics' && (
        <CollectionsMetrics
          loans={loans}
          selectedDate={selectedDate}
          calculateHistoricalStatus={calculateHistoricalStatus}
          dateRange={dateRange}
        />
      )}
      
      {activeSubTab === 'historical' && (
        <HistoricalAnalysis
          loans={loans}
          selectedDate={selectedDate}
          historicalMetrics={historicalMetrics}
          timeSeriesData={timeSeriesData}
          calculateHistoricalStatus={calculateHistoricalStatus}
        />
      )}
      
      {activeSubTab === 'predictive' && (
        <PredictiveAnalysis
          loans={loans}
          selectedDate={selectedDate}
          calculateHistoricalStatus={calculateHistoricalStatus}
          exportToExcel={() => {}} // You can implement a comprehensive export here if needed
        />
      )}
    </div>
  );
};