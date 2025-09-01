import React, { useMemo } from 'react';
import { SummaryTab } from './SummaryTab';

export const Dashboard = ({ loans }) => {
  const analytics = useMemo(() => {
    const totalLoans = loans.length;
    const totalValue = loans.reduce((sum, loan) => sum + loan.contractBalance, 0);
    
    const statusCounts = {
      current: loans.filter(l => l.status === 'current').length,
      delinquent_1: loans.filter(l => l.status === 'delinquent_1').length,
      delinquent_2: loans.filter(l => l.status === 'delinquent_2').length,
      delinquent_3: loans.filter(l => l.status === 'delinquent_3').length,
      default: loans.filter(l => l.status === 'default').length,
      restructured: loans.filter(l => l.status === 'restructured').length
    };
    
    return {
      totalLoans,
      totalValue,
      statusCounts,
      nplRate: (statusCounts.default + statusCounts.restructured) / totalLoans,
      delinquencyRate: (statusCounts.delinquent_1 + statusCounts.delinquent_2 + statusCounts.delinquent_3) / totalLoans
    };
  }, [loans]);

  return <SummaryTab loans={loans} analytics={analytics} />;
};