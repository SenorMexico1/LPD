import React from 'react';

export const CalculationSection = ({ loan }) => {
  // Helper to get category color
  const getCategoryColor = (category) => {
    switch(category) {
      case 'payment': return 'bg-green-100 text-green-800';
      case 'fee': return 'bg-yellow-100 text-yellow-800';
      case 'restructure': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Status Calculation Details</h3>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Calculation Date</h4>
          <p>{loan.statusCalculation.today}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Expected Payments (Paydates up to today)</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {loan.statusCalculation.expectedPayments.map((p, idx) => (
              <p key={idx} className="text-sm">
                {p.date}: ${p.amount.toLocaleString()}
              </p>
            ))}
          </div>
          <p className="mt-2 font-semibold">
            Total: {loan.statusCalculation.totalExpected} payments
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Actual Payments (Credits from transactions)</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {loan.statusCalculation.actualPayments.map((p, idx) => (
              <p key={idx} className="text-sm">
                {p.date}: ${p.amount.toLocaleString()} {p.type && `(${p.type})`}
              </p>
            ))}
          </div>
          <p className="mt-2 font-semibold">
            Total Received: ${loan.statusCalculation.totalReceived.toLocaleString()}
          </p>
        </div>

        {/* New section showing all transactions with categorization */}
        {loan.statusCalculation.allTransactions && (
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold mb-2">All Transactions (Categorized)</h4>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {loan.statusCalculation.allTransactions.map((trans, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span>{trans.date}: {trans.type}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(trans.category)}`}>
                      {trans.category}
                    </span>
                    <span className={trans.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${Math.abs(trans.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>✓ Payments count toward installments</p>
              <p>○ Fees don't count toward installments</p>
              <p>⚠ Restructure/Settlement transactions</p>
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-semibold mb-2">Status Determination</h4>
          <p>Installment Amount: ${loan.installmentAmount.toLocaleString()}</p>
          <p>Payments Made: {loan.statusCalculation.paymentsMade} 
            (${loan.statusCalculation.totalReceived.toLocaleString()} / ${loan.installmentAmount.toLocaleString()})
          </p>
          <p>Missed Payments: {loan.statusCalculation.missedPayments}</p>
          <p>Restructured: {loan.statusCalculation.isRestructured ? 'Yes' : 'No'}</p>
          <p className="mt-2 font-semibold">
            Result: {loan.status.replace('_', ' ').toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
};