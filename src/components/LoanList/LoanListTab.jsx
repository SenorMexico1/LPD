// components/LoanList/LoanListTab.jsx
import React, { useState, useMemo } from 'react';
import { LoanTable } from './LoanTable';
import { LoanFilters } from './LoanFilters';

export const LoanListTab = ({ loans, onSelectLoan }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('loanNumber');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const filteredLoans = useMemo(() => {
    let filtered = loans;
    
    if (filter !== 'all') {
      filtered = filtered.filter(l => l.status === filter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.merchantName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [loans, filter, searchTerm]);
  
  return (
    <div className="space-y-4">
      <LoanFilters 
        filter={filter}
        setFilter={setFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loans={loans}
      />
      
      <LoanTable 
        loans={filteredLoans}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onSelectLoan={onSelectLoan}
      />
    </div>
  );
};