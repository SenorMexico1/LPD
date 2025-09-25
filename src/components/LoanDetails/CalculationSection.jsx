import React from 'react';

export const CalculationSection = ({ loan }) => {
  // Today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  // Helper to get category color
  const getCategoryColor = (category) => {
    switch(category) {
      case 'payment': return 'bg-green-100 text-green-800';
      case 'fee': return 'bg-yellow-100 text-yellow-800';
      case 'restructure': return 'bg-red-100 text-red-800';
      case 'reversal': return 'bg-red-200 text-red-900';
      case 'reversed': return 'bg-gray-200 text-gray-500';
      case 'recovery': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (category) => {
    switch(category) {
      case 'payment': return '✓';
      case 'fee': return '○';
      case 'restructure': return '⚠';
      case 'reversal': return '⊗';
      case 'reversed': return '✗';
      case 'recovery': return '⟲';
      default: return '•';
    }
  };

  // Process all transactions with ACH reversal detection and fee exclusion
  const processTransactions = () => {
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

    // Define restructure/settlement transaction types
    const RESTRUCTURE_TRANSACTION_TYPES = [
      'settlement',
      'settlement - renewal',
      'settlement discount',
      'write-off',
      'restructure penalty',
      'discount adjustment'
    ];

    const reversedTransactionIds = new Set();
    const categorizedTransactions = [];
    const actualPayments = [];
    let totalReceived = 0;
    let isRestructured = loan.isRestructured || false;

    // Sort transactions by date and time
    const sortedTransactions = [...loan.transactions].sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      // If same date, put reversals after original transactions
      if (a.typeName?.includes('REVERSAL')) return 1;
      if (b.typeName?.includes('REVERSAL')) return -1;
      return 0;
    });

    // First pass: identify reversed transactions
    sortedTransactions.forEach((trans, idx) => {
      const transTypeLower = (trans.typeName || '').toLowerCase();
      
      if (transTypeLower.includes('reversal') || transTypeLower.includes('nsf')) {
        // Look for the original transaction to reverse
        for (let i = idx - 1; i >= 0; i--) {
          const prevTrans = sortedTransactions[i];
          const prevTypeLower = (prevTrans.typeName || '').toLowerCase();
          
          if (prevTrans.credit === trans.debit && 
              !reversedTransactionIds.has(i) &&
              prevTypeLower.includes('ach')) {
            reversedTransactionIds.add(i);
            reversedTransactionIds.add(idx);
            break;
          }
        }
      }
    });

    // Second pass: categorize all transactions
    sortedTransactions.forEach((trans, idx) => {
      const transTypeLower = (trans.typeName || '').toLowerCase();
      const transRefLower = (trans.reference || '').toLowerCase();
      let category = 'other';
      let amount = trans.credit || -trans.debit;
      let countsAsPayment = false;

      // Check if this transaction was reversed
      if (reversedTransactionIds.has(idx)) {
        if (transTypeLower.includes('reversal') || transTypeLower.includes('nsf')) {
          category = 'reversal';
        } else {
          category = 'reversed';
        }
      }
      // Check if it's a fee transaction
      else if (FEE_TRANSACTION_TYPES.some(feeType => 
        transTypeLower.includes(feeType))) {
        category = 'fee';
      }
      // Check if it's a restructure transaction
      else if (RESTRUCTURE_TRANSACTION_TYPES.some(type => 
        transTypeLower.includes(type)) || 
        transRefLower.includes('restructur')) {
        category = 'restructure';
        isRestructured = true;
      }
      // Check if it's a valid payment
      else if (trans.credit > 0) {
        // Skip if it's a fee based on more specific checks
        const isFeeTransaction = 
          transTypeLower.includes('fee') && 
          !transTypeLower.includes('nsf') &&
          transTypeLower !== 'fee';
          
        if (!isFeeTransaction) {
          category = 'payment';
          countsAsPayment = true;
          
          // Check if it's a recovery payment (multiple installments)
          const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
          if (installmentAmount > 0 && trans.credit >= installmentAmount * 1.8) {
            category = 'recovery';
            const periodsRecovered = Math.floor(trans.credit / installmentAmount);
            amount = trans.credit;
          }
        }
      }

      // Add to categorized transactions
      categorizedTransactions.push({
        date: trans.date,
        type: trans.typeName || 'Unknown',
        reference: trans.reference || '',
        amount: amount,
        category: category,
        countsAsPayment: countsAsPayment,
        isReversed: reversedTransactionIds.has(idx),
        transactionIndex: idx
      });

      // Track actual payments for calculations
      if (countsAsPayment && !reversedTransactionIds.has(idx)) {
        actualPayments.push({
          date: trans.date,
          amount: trans.credit,
          type: trans.typeName
        });
        totalReceived += trans.credit;
      }
    });

    return {
      categorizedTransactions,
      actualPayments,
      totalReceived,
      isRestructured,
      reversedCount: Array.from(reversedTransactionIds).filter(idx => {
        const trans = sortedTransactions[idx];
        return trans && !((trans.typeName || '').toLowerCase().includes('reversal'));
      }).length
    };
  };

  // Calculate accurate missed payments
  const calculateAccurateMissedPayments = () => {
    const { actualPayments, totalReceived } = processTransactions();
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    
    // Get expected payments (excluding today)
    const expectedPayments = loan.paydates.filter(p => {
      const paydateString = p.date.split('T')[0];
      return paydateString < todayString;
    });
    
    const totalExpected = expectedPayments.length;
    
    // Calculate payments made
    let paymentsMade = 0;
    if (installmentAmount > 0) {
      const totalRounded = Math.round(totalReceived * 100) / 100;
      const installmentRounded = Math.round(installmentAmount * 100) / 100;
      paymentsMade = Math.floor(totalRounded / installmentRounded);
    }
    
    const missedPayments = Math.max(0, totalExpected - paymentsMade);
    
    return {
      expectedPayments,
      actualPayments,
      totalExpected,
      totalReceived,
      paymentsMade,
      missedPayments
    };
  };

  const processedData = processTransactions();
  const accurateCalc = calculateAccurateMissedPayments();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Status Calculation Details</h3>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Calculation Date</h4>
          <p>{todayString}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Expected Payments (Paydates up to today)</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {accurateCalc.expectedPayments.map((p, idx) => (
              <p key={idx} className="text-sm">
                {p.date.split('T')[0]}: ${p.amount.toLocaleString()}
              </p>
            ))}
          </div>
          <p className="mt-2 font-semibold">
            Total Expected: {accurateCalc.totalExpected} payments
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Valid Payments (Excludes reversed & fees)</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {accurateCalc.actualPayments.map((p, idx) => (
              <p key={idx} className="text-sm">
                {p.date.split('T')[0]}: ${p.amount.toLocaleString()} {p.type && `(${p.type})`}
              </p>
            ))}
          </div>
          <p className="mt-2 font-semibold">
            Total Received: ${accurateCalc.totalReceived.toLocaleString()}
          </p>
          {processedData.reversedCount > 0 && (
            <p className="mt-1 text-sm text-red-600">
              ⚠ {processedData.reversedCount} payment(s) were reversed/NSF
            </p>
          )}
        </div>

        {/* Enhanced transaction categorization display */}
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">All Transactions (Categorized)</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {processedData.categorizedTransactions.map((trans, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTransactionIcon(trans.category)}</span>
                  <span className={trans.isReversed ? 'line-through text-gray-400' : ''}>
                    {trans.date.split('T')[0]}: {trans.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(trans.category)}`}>
                    {trans.category}
                  </span>
                  <span className={
                    trans.isReversed ? 'text-gray-400 line-through' :
                    trans.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }>
                    ${Math.abs(trans.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <p className="font-semibold mb-1">Transaction Types:</p>
              <p>✓ Payments - Count toward installments</p>
              <p>○ Fees - Don't count toward installments</p>
              <p>⟲ Recovery - Multiple installments paid</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Special Status:</p>
              <p>✗ Reversed - Payment was reversed</p>
              <p>⊗ Reversal - ACH reversal/NSF</p>
              <p>⚠ Restructure - Loan modification</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Status Determination</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-gray-600">Installment Amount:</p>
              <p className="font-semibold">${(loan.installmentAmount || loan.instalmentAmount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Received:</p>
              <p className="font-semibold">${accurateCalc.totalReceived.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payments Made:</p>
              <p className="font-semibold">{accurateCalc.paymentsMade} of {accurateCalc.totalExpected}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Missed Payments:</p>
              <p className="font-semibold text-red-600">{accurateCalc.missedPayments}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-sm text-gray-600">Loan Status:</p>
            <p className="text-lg font-bold">
              {processedData.isRestructured ? 'RESTRUCTURED' :
               accurateCalc.missedPayments === 0 ? 'CURRENT' :
               accurateCalc.missedPayments <= 2 ? 'DELINQUENT' :
               'DEFAULT'}
            </p>
          </div>
        </div>

        {/* Recovery Payment Detection */}
        {processedData.categorizedTransactions.some(t => t.category === 'recovery') && (
          <div className="bg-blue-50 p-4 rounded">
            <h4 className="font-semibold mb-2">Recovery Payments Detected</h4>
            <div className="space-y-2">
              {processedData.categorizedTransactions
                .filter(t => t.category === 'recovery')
                .map((trans, idx) => {
                  const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 1;
                  const periodsRecovered = Math.floor(trans.amount / installmentAmount);
                  return (
                    <div key={idx} className="bg-white p-2 rounded">
                      <p className="text-sm">
                        {trans.date.split('T')[0]}: ${trans.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600">
                        Covers {periodsRecovered} payment periods
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Summary Statistics */}
        <div className="bg-gray-100 p-4 rounded">
          <h4 className="font-semibold mb-2">Transaction Summary</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Valid Payments:</p>
              <p className="font-semibold text-green-600">
                {processedData.categorizedTransactions.filter(t => t.category === 'payment' && !t.isReversed).length}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Reversed Payments:</p>
              <p className="font-semibold text-red-600">
                {processedData.reversedCount}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Fee Transactions:</p>
              <p className="font-semibold text-yellow-600">
                {processedData.categorizedTransactions.filter(t => t.category === 'fee').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};