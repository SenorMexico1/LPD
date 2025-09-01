import React from 'react';

export const LoanTable = ({ loans, sortBy, setSortBy, sortOrder, setSortOrder, onSelectLoan }) => {
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedLoans = [...loans].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader 
                field="loanNumber" 
                label="Loan #" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="merchantName" 
                label="Merchant" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="status" 
                label="Status" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="contractBalance" 
                label="Balance" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="missedPayments" 
                label="Missed" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="riskScore" 
                label="Risk" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLoans.map((loan) => (
              <tr key={loan.loanNumber} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {loan.loanNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {loan.merchantName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={loan.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${loan.contractBalance.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {loan.missedPayments}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <RiskIndicator score={loan.riskScore} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button
                    onClick={() => onSelectLoan(loan)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Details →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SortableHeader = ({ field, label, sortBy, sortOrder, onClick }) => (
  <th 
    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    onClick={() => onClick(field)}
  >
    {label} {sortBy === field && (sortOrder === 'asc' ? '↑' : '↓')}
  </th>
);

const StatusBadge = ({ status }) => {
  const colorClass = status === 'current' ? 'bg-green-100 text-green-800' :
                     status.includes('delinquent') ? 'bg-yellow-100 text-yellow-800' :
                     'bg-red-100 text-red-800';
  
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const RiskIndicator = ({ score }) => (
  <div className="flex items-center">
    <span>{score.toFixed(0)}</span>
    <div className="ml-2 w-12 bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${
          score < 30 ? 'bg-green-500' :
          score < 70 ? 'bg-yellow-500' :
          'bg-red-500'
        }`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  </div>
);