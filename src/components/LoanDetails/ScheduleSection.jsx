// components/LoanDetails/ScheduleSection.jsx
import React, { useState } from 'react';

export const ScheduleSection = ({ loan }) => {
  const [activeView, setActiveView] = useState('schedule'); // 'schedule' or 'progress'
  
  // Today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  const getMatchStatusColor = (status) => {
    if (status === 'matched') return 'bg-green-50';
    if (status === 'early_matched') return 'bg-teal-50';
    if (status === 'late_matched') return 'bg-yellow-50';
    if (status === 'partial') return 'bg-orange-50';
    if (status === 'partial_late') return 'bg-orange-100';
    if (status === 'recovery') return 'bg-blue-50';
    if (status === 'reversed') return 'bg-red-100';
    if (status === 'missed') return 'bg-red-50';
    if (status === 'due_today') return 'bg-gray-50';
    if (status === 'upcoming') return 'bg-white';
    if (status === 'extra') return 'bg-purple-50';
    if (status === 'satisfied') return 'bg-green-50';
    if (status === 'partial_progress') return 'bg-yellow-50';
    return '';
  };

  const getStatusBadgeColor = (status) => {
    if (status === 'matched') return 'bg-green-200 text-green-800';
    if (status === 'early_matched') return 'bg-teal-200 text-teal-800';
    if (status === 'late_matched') return 'bg-yellow-200 text-yellow-800';
    if (status === 'partial') return 'bg-orange-200 text-orange-800';
    if (status === 'partial_late') return 'bg-orange-300 text-orange-900';
    if (status === 'recovery') return 'bg-blue-200 text-blue-800';
    if (status === 'reversed') return 'bg-red-300 text-red-900';
    if (status === 'missed') return 'bg-red-200 text-red-800';
    if (status === 'due_today') return 'bg-gray-200 text-gray-800';
    if (status === 'upcoming') return 'bg-gray-100 text-gray-600';
    if (status === 'extra') return 'bg-purple-200 text-purple-800';
    if (status === 'satisfied') return 'bg-green-200 text-green-800';
    if (status === 'partial_progress') return 'bg-yellow-200 text-yellow-800';
    return 'bg-gray-200 text-gray-800';
  };

  // Helper to normalize dates - FIXED to avoid timezone issues
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    
    // If it's already in YYYY-MM-DD format, return as-is
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // For other string formats or Date objects, parse carefully
    let year, month, day;
    
    if (typeof dateStr === 'string') {
      // Check if it includes time information
      if (dateStr.includes('T') || dateStr.includes(' ')) {
        // Parse as ISO or datetime string
        const parts = dateStr.split(/[T ]/)[0].split('-');
        if (parts.length === 3) {
          [year, month, day] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      // Try parsing MM/DD/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          [month, day, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      // Last resort: try to parse with Date object but extract UTC components
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // Use UTC methods to avoid timezone shift
        year = date.getUTCFullYear();
        month = String(date.getUTCMonth() + 1).padStart(2, '0');
        day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } else if (dateStr instanceof Date) {
      // For Date objects, use local date components
      year = dateStr.getFullYear();
      month = String(dateStr.getMonth() + 1).padStart(2, '0');
      day = String(dateStr.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const normalized = normalizeDate(dateStr);
    if (!normalized) return '';
    const [year, month, day] = normalized.split('-');
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  };
  
  // Helper to calculate days difference between two date strings
  const daysDifference = (date1Str, date2Str) => {
    const [y1, m1, d1] = date1Str.split('-').map(Number);
    const [y2, m2, d2] = date2Str.split('-').map(Number);
    
    // Create dates at noon local time to avoid DST issues
    const date1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
    const date2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
    
    return Math.round((date1 - date2) / (1000 * 60 * 60 * 24));
  };

  // Enhanced schedule matching with ACH Reversal detection and Fee exclusion
  const processPaymentData = () => {
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 14534.88;
    
    // Define fee transaction types that should NOT count as payments
    const FEE_TRANSACTION_TYPES = [
      'origination fee collection',
      'initiation collection',
      'merchant fee collection',
      'stamp tax fee',
      'nsf fees',
      'legal fees',
      'legal fee',
      'merchant fee',
      'origination fee',
      'initiation',
      'restructure penalty',
      'loan payout',
      'cost of capital',
      'capital'
    ];
    
    // First, process transactions to identify reversed payments and exclude fees
    const reversedTransactionIds = new Set();
    const processedTransactions = [];
    
    // Sort transactions by date and time
    const sortedTransactions = [...loan.transactions]
      .sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        // If same date, put reversals after the original transactions
        if (a.typeName?.includes('REVERSAL')) return 1;
        if (b.typeName?.includes('REVERSAL')) return -1;
        return 0;
      });
    
    // Identify reversed transactions
    sortedTransactions.forEach((trans, idx) => {
      if (trans.typeName?.toLowerCase().includes('reversal') || 
          trans.typeName?.toLowerCase().includes('nsf')) {
        // Look for the original transaction to reverse
        for (let i = idx - 1; i >= 0; i--) {
          const prevTrans = sortedTransactions[i];
          if (prevTrans.credit === trans.debit && 
              !reversedTransactionIds.has(i) &&
              prevTrans.typeName?.toLowerCase().includes('ach')) {
            reversedTransactionIds.add(i);
            reversedTransactionIds.add(idx); // Also mark the reversal itself
            break;
          }
        }
      }
    });
    
    // Filter out reversed transactions, reversals, and fee collections
    sortedTransactions.forEach((trans, idx) => {
      // Skip if reversed or is a reversal
      if (reversedTransactionIds.has(idx)) return;
      
      // Skip if no credit amount
      if (!trans.credit || trans.credit <= 0) return;
      
      // Skip if this is a fee transaction
      const transTypeLower = (trans.typeName || '').toLowerCase();
      const isFeeTransaction = FEE_TRANSACTION_TYPES.some(feeType => 
        transTypeLower.includes(feeType)
      );
      if (isFeeTransaction) return;
      
      // This is a valid payment transaction
      processedTransactions.push({
        ...trans,
        normalizedDate: normalizeDate(trans.date),
        id: trans.id || `trans_${idx}`
      });
    });

    return { processedTransactions, reversedTransactionIds, sortedTransactions };
  };

  // Schedule View (existing logic)
  const getScheduleMatches = () => {
    const { processedTransactions, reversedTransactionIds, sortedTransactions } = processPaymentData();
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 14534.88;
    const matches = [];
    const partialPaymentTracker = new Map();
    const usedTransactions = new Set();
    
    // Process each payment date
    loan.paydates.forEach((paydate, paydateIdx) => {
      const paydateNorm = normalizeDate(paydate.date);
      const isToday = paydateNorm === todayString;
      const isPastDue = paydateNorm < todayString;
      
      let matchedTransactions = [];
      let totalPaid = partialPaymentTracker.get(paydateIdx) || 0;
      let status = '';
      let isEarly = false;
      let isLate = false;
      let daysEarlyOrLate = 0;
      
      // Find all transactions that could apply to this payment period
      const candidateTransactions = processedTransactions.filter(trans => {
        if (usedTransactions.has(trans.id)) return false;
        
        const daysDiff = daysDifference(trans.normalizedDate, paydateNorm);
        
        // Consider transactions within -7 to +30 days of the due date
        return daysDiff >= -7 && daysDiff <= 30;
      });
      
      // Sort candidates by date proximity to the paydate
      candidateTransactions.sort((a, b) => {
        const aDiff = Math.abs(daysDifference(a.normalizedDate, paydateNorm));
        const bDiff = Math.abs(daysDifference(b.normalizedDate, paydateNorm));
        return aDiff - bDiff;
      });
      
      // Try to match payments to reach the expected amount
      for (const trans of candidateTransactions) {
        if (totalPaid >= paydate.amount * 0.99) break;
        
        const daysDiff = daysDifference(trans.normalizedDate, paydateNorm);
        
        const remainingNeeded = paydate.amount - totalPaid;
        
        // Full payment or overpayment
        if (trans.credit >= remainingNeeded * 0.99) {
          matchedTransactions.push({
            transaction: trans,
            amount: trans.credit,
            daysDiff: daysDiff
          });
          totalPaid += trans.credit;
          usedTransactions.add(trans.id);
          
          if (daysDiff < 0) {
            isEarly = true;
            daysEarlyOrLate = Math.abs(daysDiff);
          } else if (daysDiff > 0) {
            isLate = true;
            daysEarlyOrLate = daysDiff;
          }
          break;
        }
        // Partial payment
        else if (trans.credit >= remainingNeeded * 0.1) {
          matchedTransactions.push({
            transaction: trans,
            amount: trans.credit,
            daysDiff: daysDiff
          });
          totalPaid += trans.credit;
          usedTransactions.add(trans.id);
          
          if (daysDiff > 0 && !isLate) {
            isLate = true;
            daysEarlyOrLate = daysDiff;
          }
        }
      }
      
      // Determine status
      if (isToday && totalPaid === 0) {
        status = 'due_today';
      } else if (!isPastDue && !isToday) {
        status = 'upcoming';
      } else if (totalPaid >= paydate.amount * 0.99) {
        if (matchedTransactions.length > 1) {
          status = isLate ? 'partial_late' : 'partial';
        } else if (isEarly) {
          status = 'early_matched';
        } else if (isLate) {
          status = 'late_matched';
        } else {
          status = 'matched';
        }
      } else if (totalPaid > 0) {
        status = isLate ? 'partial_late' : 'partial';
      } else if (isPastDue) {
        status = 'missed';
      } else {
        status = 'upcoming';
      }
      
      matches.push({
        date: paydate.date,
        expectedAmount: paydate.amount,
        actualAmount: totalPaid,
        status: status,
        variance: totalPaid - paydate.amount,
        transactions: matchedTransactions,
        isEarly: isEarly,
        isLate: isLate,
        daysEarlyOrLate: daysEarlyOrLate
      });
    });
    
    // Add extra payments not matched to any schedule
    processedTransactions.forEach(trans => {
      if (!usedTransactions.has(trans.id) && trans.credit >= installmentAmount * 0.3) {
        matches.push({
          date: trans.date,
          expectedAmount: 0,
          actualAmount: trans.credit,
          status: 'extra',
          variance: trans.credit,
          transactions: [{
            transaction: trans,
            amount: trans.credit,
            daysDiff: 0
          }]
        });
      }
    });
    
    // Add reversed transactions to show what was reversed
    sortedTransactions.forEach((trans, idx) => {
      if (reversedTransactionIds.has(idx) && trans.credit > 0) {
        matches.push({
          date: trans.date,
          expectedAmount: 0,
          actualAmount: trans.credit,
          status: 'reversed',
          variance: 0,
          transactions: [{
            transaction: trans,
            amount: trans.credit,
            daysDiff: 0
          }],
          reversalInfo: 'Payment was reversed/NSF'
        });
      }
    });
    
    return matches.sort((a, b) => {
      const dateA = normalizeDate(a.date);
      const dateB = normalizeDate(b.date);
      return dateA.localeCompare(dateB);
    });
  };

  // Progress View - Bucket filling approach
  const getProgressMatches = () => {
    const { processedTransactions } = processPaymentData();
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 14534.88;
    const progressMatches = [];
    
    // Create a pool of all valid payments
    const paymentPool = [...processedTransactions]
      .filter(t => t.credit > 0)
      .sort((a, b) => {
        const dateA = normalizeDate(a.date);
        const dateB = normalizeDate(b.date);
        return dateA.localeCompare(dateB);
      });
    
    let availablePayments = [...paymentPool];
    
    // Process each payment period in order
    loan.paydates.forEach((paydate, idx) => {
      const paydateNorm = normalizeDate(paydate.date);
      const isPastDue = paydateNorm < todayString;
      const isToday = paydateNorm === todayString;
      
      const paymentsForThisPeriod = [];
      let totalApplied = 0;
      let remainingNeeded = paydate.amount;
      
      // Try to fill this bucket with available payments
      for (let i = 0; i < availablePayments.length && remainingNeeded > 0.01; i++) {
        const payment = availablePayments[i];
        
        if (payment.credit >= remainingNeeded * 0.99) {
          // This payment completes the period (possibly with excess)
          paymentsForThisPeriod.push({
            transaction: payment,
            amountApplied: remainingNeeded,
            excess: payment.credit - remainingNeeded,
            daysDiff: daysDifference(payment.normalizedDate, paydateNorm)
          });
          
          totalApplied += remainingNeeded;
          
          // If there's excess, keep it for the next period
          if (payment.credit > remainingNeeded * 1.01) {
            availablePayments[i] = {
              ...payment,
              credit: payment.credit - remainingNeeded
            };
          } else {
            availablePayments.splice(i, 1);
            i--;
          }
          
          remainingNeeded = 0;
        } else if (payment.credit >= installmentAmount * 0.1) {
          // Partial payment
          paymentsForThisPeriod.push({
            transaction: payment,
            amountApplied: payment.credit,
            excess: 0,
            daysDiff: daysDifference(payment.normalizedDate, paydateNorm)
          });
          
          totalApplied += payment.credit;
          remainingNeeded -= payment.credit;
          availablePayments.splice(i, 1);
          i--;
        }
      }
      
      // Determine status for this period
      let status = '';
      if (totalApplied >= paydate.amount * 0.99) {
        status = 'satisfied';
      } else if (totalApplied > 0) {
        status = 'partial_progress';
      } else if (isPastDue) {
        status = 'missed';
      } else if (isToday) {
        status = 'due_today';
      } else {
        status = 'upcoming';
      }
      
      progressMatches.push({
        date: paydate.date,
        expectedAmount: paydate.amount,
        totalApplied: totalApplied,
        remainingBalance: Math.max(0, paydate.amount - totalApplied),
        status: status,
        payments: paymentsForThisPeriod
      });
    });
    
    return progressMatches;
  };

  const scheduleMatches = getScheduleMatches();
  const progressMatches = getProgressMatches();
  
  // Calculate summary stats
  const stats = {
    onTime: scheduleMatches.filter(m => m.status === 'matched').length,
    earlyMatched: scheduleMatches.filter(m => m.status === 'early_matched').length,
    lateMatched: scheduleMatches.filter(m => m.status === 'late_matched').length,
    partial: scheduleMatches.filter(m => m.status === 'partial' || m.status === 'partial_late').length,
    reversed: scheduleMatches.filter(m => m.status === 'reversed').length,
    missed: scheduleMatches.filter(m => m.status === 'missed').length,
    dueToday: scheduleMatches.filter(m => m.status === 'due_today').length,
    extra: scheduleMatches.filter(m => m.status === 'extra').length
  };
  
  // Calculate how many payments behind
  const totalExpectedPayments = progressMatches.filter(m => {
    const mDate = normalizeDate(m.date);
    return m.expectedAmount > 0 && mDate < todayString;
  }).length;
  const totalCompletedPayments = progressMatches.filter(m => {
    const mDate = normalizeDate(m.date);
    return m.status === 'satisfied' && mDate < todayString;
  }).length;
  const paymentsBehind = totalExpectedPayments - totalCompletedPayments;
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Payment Schedule Analysis</h3>
      
      {/* Key Metrics */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-sm font-semibold text-blue-900">
          Payment Status: {paymentsBehind === 0 ? (
            <span className="text-green-700">Current</span>
          ) : (
            <span className="text-red-700">{paymentsBehind} payment{paymentsBehind !== 1 ? 's' : ''} behind</span>
          )}
        </div>
        <div className="text-xs text-blue-700 mt-1">
          {totalCompletedPayments} of {totalExpectedPayments} expected payments completed
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveView('schedule')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === 'schedule'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Payment Schedule
        </button>
        <button
          onClick={() => setActiveView('progress')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeView === 'progress'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Payment Progress
        </button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">On Time</p>
          <p className="text-xl font-bold text-green-600">{stats.onTime}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Early</p>
          <p className="text-xl font-bold text-teal-600">{stats.earlyMatched}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Late (Paid)</p>
          <p className="text-xl font-bold text-yellow-600">{stats.lateMatched}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Missed</p>
          <p className="text-xl font-bold text-red-600">{stats.missed}</p>
        </div>
      </div>
      
      {/* Schedule View */}
      {activeView === 'schedule' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transaction Info</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scheduleMatches.map((match, idx) => (
                <tr key={idx} className={getMatchStatusColor(match.status)}>
                  <td className="px-4 py-2 text-sm">
                    {formatDate(match.date)}
                    {match.status === 'due_today' && (
                      <span className="ml-2 text-xs text-gray-600 font-semibold">(TODAY)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {match.expectedAmount > 0 ? `$${match.expectedAmount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {match.actualAmount > 0 ? (
                      <span className={match.status === 'partial' || match.status === 'partial_late' ? 'text-orange-600' : ''}>
                        ${match.actualAmount.toLocaleString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(match.status)}`}>
                      {match.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {match.variance !== 0 ? (
                      <span className={match.variance > 0 ? 'text-green-600' : 'text-red-600'}>
                        {match.variance > 0 ? '+' : ''}${Math.abs(match.variance).toLocaleString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {match.reversalInfo ? (
                      <div className="text-red-600 font-semibold">{match.reversalInfo}</div>
                    ) : match.transactions && match.transactions.length > 0 ? (
                      <div>
                        {match.transactions.map((t, tIdx) => (
                          <div key={tIdx} className="text-xs">
                            {t.transaction.typeName || 'Payment'}
                            {t.transaction.normalizedDate !== normalizeDate(match.date) && (
                              <span>
                                {' on '}{formatDate(t.transaction.date)}
                                {t.daysDiff !== 0 && (
                                  <span className={t.daysDiff < 0 ? 'text-teal-600' : 'text-yellow-600'}>
                                    {' '}({Math.abs(t.daysDiff)} days {t.daysDiff < 0 ? 'early' : 'late'})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Progress View */}
      {activeView === 'progress' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {progressMatches.map((match, idx) => (
                <tr key={idx} className={getMatchStatusColor(match.status)}>
                  <td className="px-4 py-2 text-sm font-medium">
                    {formatDate(match.date)}
                    {match.status === 'due_today' && (
                      <span className="ml-2 text-xs text-gray-600 font-semibold">(TODAY)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    ${match.expectedAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={match.totalApplied < match.expectedAmount ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>
                      ${match.totalApplied.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {match.remainingBalance > 0 ? (
                      <span className="text-red-600">
                        ${match.remainingBalance.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-green-600">$0</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(match.status)}`}>
                      {match.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {match.payments.length > 0 ? (
                      <div className="space-y-1">
                        {match.payments.map((payment, pIdx) => (
                          <div key={pIdx} className="text-xs flex items-center justify-between">
                            <span>
                              ${payment.amountApplied.toLocaleString()} from{' '}
                              {payment.transaction.typeName || 'ACH'} on {formatDate(payment.transaction.date)}
                            </span>
                            {payment.daysDiff !== 0 && (
                              <span className={`ml-2 ${payment.daysDiff > 0 ? 'text-yellow-600' : 'text-teal-600'}`}>
                                ({Math.abs(payment.daysDiff)} days {payment.daysDiff > 0 ? 'late' : 'early'})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No payments applied</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <p className="font-semibold mb-2">Status Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {activeView === 'schedule' ? (
            <>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-200 rounded-full mr-2"></span>
                <span>Matched - Payment on time</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-teal-200 rounded-full mr-2"></span>
                <span>Early - Payment before due</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-yellow-200 rounded-full mr-2"></span>
                <span>Late - Payment after due</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-orange-200 rounded-full mr-2"></span>
                <span>Partial - Incomplete payment</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-red-300 rounded-full mr-2"></span>
                <span>Reversed - Payment returned</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-red-200 rounded-full mr-2"></span>
                <span>Missed - No payment</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-200 rounded-full mr-2"></span>
                <span>Satisfied - Period fully paid</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-yellow-200 rounded-full mr-2"></span>
                <span>Partial Progress - Period partially paid</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-red-200 rounded-full mr-2"></span>
                <span>Missed - No payment applied</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-gray-200 rounded-full mr-2"></span>
                <span>Due Today - Payment due today</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-white border rounded-full mr-2"></span>
                <span>Upcoming - Future payment</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};