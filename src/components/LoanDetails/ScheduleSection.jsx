// components/LoanDetails/ScheduleSection.jsx
import React from 'react';

export const ScheduleSection = ({ loan }) => {
  // Today's date for comparison (already in CST in your system)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  const getMatchStatusColor = (status) => {
    if (status === 'matched') return 'bg-green-50';
    if (status === 'late_matched') return 'bg-yellow-50';
    if (status === 'partial_payment') return 'bg-orange-50';
    if (status === 'recovery') return 'bg-blue-50';
    if (status === 'covered_by_recovery') return 'bg-blue-50';
    if (status === 'missed') return 'bg-red-50';
    if (status === 'due_today') return 'bg-gray-50';
    if (status === 'upcoming') return 'bg-white';
    if (status === 'extra') return 'bg-purple-50';
    return '';
  };

  const getStatusBadgeColor = (status) => {
    if (status === 'matched') return 'bg-green-200 text-green-800';
    if (status === 'late_matched') return 'bg-yellow-200 text-yellow-800';
    if (status === 'partial_payment') return 'bg-orange-200 text-orange-800';
    if (status === 'recovery') return 'bg-blue-200 text-blue-800';
    if (status === 'covered_by_recovery') return 'bg-blue-100 text-blue-700';
    if (status === 'missed') return 'bg-red-200 text-red-800';
    if (status === 'due_today') return 'bg-gray-200 text-gray-800';
    if (status === 'upcoming') return 'bg-gray-100 text-gray-600';
    if (status === 'extra') return 'bg-purple-200 text-purple-800';
    return 'bg-gray-200 text-gray-800';
  };

  // Enhanced schedule matching - NO TIMEZONE CONVERSION, dates are already in CST
  const matchSchedule = () => {
    const matches = [];
    const usedTransactions = new Set();
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 3590.81;
    const periodsCoveredByRecovery = new Map();
    
    // Sort transactions by date
    const sortedTransactions = [...loan.transactions]
      .filter(t => t.credit > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // First pass: identify recovery payments (multiple installments in one payment)
    sortedTransactions.forEach((trans, transIdx) => {
      const amount = trans.credit;
      const transDateStr = trans.date.split('T')[0]; // Get just the date part
      
      // Check if this is a recovery payment (multiple installments)
      if (amount >= installmentAmount * 1.8) {
        const periodsRecovered = Math.floor(amount / installmentAmount);
        
        // Find which payment periods this recovery covers
        let periodsCovered = 0;
        let startIndex = -1;
        
        loan.paydates.forEach((paydate, idx) => {
          const paydateStr = paydate.date.split('T')[0];
          
          // If this paydate is on or before the transaction date
          if (paydateStr <= transDateStr && periodsCovered < periodsRecovered) {
            if (startIndex === -1) startIndex = idx;
            
            // Check if this period needs coverage (not already paid)
            const needsCoverage = !sortedTransactions.some((t, tIdx) => {
              if (tIdx === transIdx) return false; // Skip the recovery payment itself
              const tDateStr = t.date.split('T')[0];
              return tDateStr === paydateStr && Math.abs(t.credit - paydate.amount) < paydate.amount * 0.1;
            });
            
            if (needsCoverage) {
              periodsCoveredByRecovery.set(idx, {
                transactionId: trans.id || `trans_${transIdx}`,
                transactionDate: trans.date,
                amount: trans.credit,
                periodsRecovered: periodsRecovered
              });
              periodsCovered++;
            }
          }
        });
      }
    });
    
    // Process each payment date
    loan.paydates.forEach((paydate, paydateIndex) => {
      const paydateStr = paydate.date.split('T')[0]; // Just the date part
      const isToday = paydateStr === todayString;
      const isPastDue = paydateStr < todayString;
      
      // Check if covered by recovery payment
      const recoveryInfo = periodsCoveredByRecovery.get(paydateIndex);
      
      let matchedTransaction = null;
      let isLatePayment = false;
      let isPartialPayment = false;
      let isRecoveryPayment = false;
      
      if (recoveryInfo) {
        // Find the recovery transaction
        const trans = sortedTransactions.find((t, idx) => 
          (t.id || `trans_${idx}`) === recoveryInfo.transactionId
        );
        if (trans) {
          matchedTransaction = trans;
          isRecoveryPayment = true;
          
          // Check if late
          const transDateStr = trans.date.split('T')[0];
          if (transDateStr > paydateStr) {
            isLatePayment = true;
          }
        }
      } else {
        // Look for regular payment matching this date
        sortedTransactions.forEach((trans, transIdx) => {
          if (usedTransactions.has(trans.id || `trans_${transIdx}`)) return;
          
          const transDateStr = trans.date.split('T')[0];
          const amount = trans.credit;
          
          // Check for exact date match first
          if (transDateStr === paydateStr) {
            // Check if amount matches (within 10% tolerance)
            if (Math.abs(amount - paydate.amount) / paydate.amount < 0.1) {
              matchedTransaction = trans;
              usedTransactions.add(trans.id || `trans_${transIdx}`);
              return;
            }
            // Check if partial payment
            if (amount < paydate.amount * 0.9 && amount > paydate.amount * 0.1) {
              matchedTransaction = trans;
              isPartialPayment = true;
              usedTransactions.add(trans.id || `trans_${transIdx}`);
              return;
            }
          }
          
          // Check for late payment (within 30 days after due date)
          if (!matchedTransaction && transDateStr > paydateStr && transDateStr <= todayString) {
            const daysDiff = Math.floor((new Date(transDateStr) - new Date(paydateStr)) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 30 && Math.abs(amount - paydate.amount) / paydate.amount < 0.1) {
              matchedTransaction = trans;
              isLatePayment = true;
              usedTransactions.add(trans.id || `trans_${transIdx}`);
              return;
            }
          }
        });
      }
      
      // Determine status
      let status;
      if (isToday && !matchedTransaction) {
        status = 'due_today';
      } else if (isRecoveryPayment && paydateIndex === Array.from(periodsCoveredByRecovery.entries())
        .filter(([_, info]) => info.transactionId === (matchedTransaction?.id || `trans_${sortedTransactions.indexOf(matchedTransaction)}`))
        .map(([idx, _]) => idx)
        .sort((a, b) => a - b)[0]) {
        status = 'recovery';
      } else if (isRecoveryPayment) {
        status = 'covered_by_recovery';
      } else if (matchedTransaction && isPartialPayment) {
        status = 'partial_payment';
      } else if (matchedTransaction && isLatePayment) {
        status = 'late_matched';
      } else if (matchedTransaction && !isLatePayment) {
        status = 'matched';
      } else if (isPastDue) {
        status = 'missed';
      } else {
        status = 'upcoming';
      }
      
      const transDateStr = matchedTransaction?.date?.split('T')[0];
      const daysLate = matchedTransaction && transDateStr ? 
        Math.max(0, Math.floor((new Date(transDateStr) - new Date(paydateStr)) / (1000 * 60 * 60 * 24))) : 0;
      
      matches.push({
        date: paydate.date,
        expectedAmount: paydate.amount,
        actualAmount: matchedTransaction?.credit || 0,
        status: status,
        variance: matchedTransaction ? 
          (status === 'recovery' ? matchedTransaction.credit - paydate.amount : 
           status === 'covered_by_recovery' ? 0 : 
           matchedTransaction.credit - paydate.amount) : 
          (status === 'upcoming' || status === 'due_today' ? 0 : -paydate.amount),
        transactionDate: matchedTransaction?.date,
        transactionType: matchedTransaction?.typeName,
        isLate: isLatePayment,
        daysLate: daysLate,
        recoveryInfo: recoveryInfo
      });
    });
    
    // Add extra payments not in schedule
    sortedTransactions.forEach((trans, transIdx) => {
      const transId = trans.id || `trans_${transIdx}`;
      if (!usedTransactions.has(transId) && 
          !Array.from(periodsCoveredByRecovery.values()).some(info => info.transactionId === transId) &&
          trans.credit >= installmentAmount * 0.5) {
        matches.push({
          date: trans.date,
          expectedAmount: 0,
          actualAmount: trans.credit,
          status: 'extra',
          variance: trans.credit,
          transactionDate: trans.date,
          transactionType: trans.typeName
        });
      }
    });
    
    return matches.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const scheduleMatches = matchSchedule();
  
  // Calculate summary stats
  const stats = {
    onTime: scheduleMatches.filter(m => m.status === 'matched').length,
    lateMatched: scheduleMatches.filter(m => m.status === 'late_matched').length,
    partialPayments: scheduleMatches.filter(m => m.status === 'partial_payment').length,
    recoveries: scheduleMatches.filter(m => m.status === 'recovery' || m.status === 'covered_by_recovery').length,
    missed: scheduleMatches.filter(m => m.status === 'missed').length,
    dueToday: scheduleMatches.filter(m => m.status === 'due_today').length,
    extra: scheduleMatches.filter(m => m.status === 'extra').length
  };
  
  // Format date for display (no conversion, just formatting)
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Payment Schedule Analysis</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">On Time</p>
          <p className="text-xl font-bold text-green-600">{stats.onTime}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Late (Paid)</p>
          <p className="text-xl font-bold text-yellow-600">{stats.lateMatched}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Missed (Past Due)</p>
          <p className="text-xl font-bold text-red-600">{stats.missed}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Due Today</p>
          <p className="text-xl font-bold text-gray-600">{stats.dueToday}</p>
        </div>
      </div>
      
      {/* Additional Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Partial</p>
          <p className="text-xl font-bold text-orange-600">{stats.partialPayments}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Recoveries</p>
          <p className="text-xl font-bold text-blue-600">{stats.recoveries}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Extra</p>
          <p className="text-xl font-bold text-purple-600">{stats.extra}</p>
        </div>
      </div>
      
      {/* Schedule Table */}
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
                  ${match.expectedAmount.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm">
                  {match.status === 'covered_by_recovery' ? (
                    <span className="text-blue-600 text-xs">Covered by recovery</span>
                  ) : (
                    <>
                      ${match.actualAmount.toLocaleString()}
                      {match.transactionDate && match.transactionDate !== match.date && (
                        <span className="block text-xs text-gray-500">
                          on {formatDate(match.transactionDate)}
                          {match.isLate && ` (${match.daysLate} days late)`}
                        </span>
                      )}
                      {match.recoveryInfo && match.status === 'recovery' && (
                        <span className="block text-xs text-blue-600">
                          Covers {match.recoveryInfo.periodsRecovered} periods
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusBadgeColor(match.status)}`}>
                    {match.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">
                  <span className={
                    match.status === 'upcoming' || match.status === 'due_today' ? 'text-gray-400' :
                    match.variance < 0 ? 'text-red-600' : 
                    match.variance > 0 ? 'text-green-600' : 'text-gray-600'
                  }>
                    {match.status === 'upcoming' || match.status === 'due_today' ? '-' :
                     match.variance > 0 ? '+' : ''}{match.variance !== 0 && match.status !== 'upcoming' && match.status !== 'due_today' ? 
                     `$${Math.abs(match.variance).toLocaleString()}` : match.variance === 0 ? '-' : ''}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {match.transactionType || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};