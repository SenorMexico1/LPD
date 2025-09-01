import React, { useMemo } from 'react';

export const LoanFilters = ({ filter, setFilter, searchTerm, setSearchTerm, loans }) => {
  const statusCounts = useMemo(() => {
    return {
      all: loans.length,
      current: loans.filter(l => l.status === 'current').length,
      delinquent_1: loans.filter(l => l.status === 'delinquent_1').length,
      delinquent_2: loans.filter(l => l.status === 'delinquent_2').length,
      delinquent_3: loans.filter(l => l.status === 'delinquent_3').length,
      default: loans.filter(l => l.status === 'default').length,
      restructured: loans.filter(l => l.status === 'restructured').length
    };
  }, [loans]);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded text-sm ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search loans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1 border rounded-md"
        />
      </div>
    </div>
  );
};