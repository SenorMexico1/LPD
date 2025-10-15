// src/components/Dashboard/Dashboard.jsx
import React, { useMemo } from 'react';
import { SummaryTab } from './SummaryTab';

export const Dashboard = ({ loans }) => {
  const analytics = useMemo(() => {
    const totalLoans = loans.length;
    
    // Use the correct field names - contractBalance should work, but fallback to loanAmount
    const totalValue = loans.reduce((sum, loan) => {
      // Try contractBalance first, then loanAmount as fallback
      const amount = loan.contractBalance || loan.loanAmount || 0;
      return sum + amount;
    }, 0);
    
    const statusCounts = {
      current: loans.filter(l => l.status === 'current').length,
      delinquent_1: loans.filter(l => l.status === 'delinquent_1').length,
      delinquent_2: loans.filter(l => l.status === 'delinquent_2').length,
      delinquent_3: loans.filter(l => l.status === 'delinquent_3').length,
      default: loans.filter(l => l.status === 'default').length,
      restructured: loans.filter(l => l.status === 'restructured').length
    };
    
    // Calculate NPL (Non-Performing Loans) rate
    const nplCount = statusCounts.default + statusCounts.restructured;
    const nplRate = totalLoans > 0 ? nplCount / totalLoans : 0;
    
    // Calculate delinquency rate
    const delinquentCount = statusCounts.delinquent_1 + statusCounts.delinquent_2 + statusCounts.delinquent_3;
    const delinquencyRate = totalLoans > 0 ? delinquentCount / totalLoans : 0;
    
    // Add enhanced metrics if available from new ETL
    const enhancedMetrics = {
      avgRiskScore: loans.reduce((sum, l) => sum + (l.riskScore || 0), 0) / (totalLoans || 1),
      criticalRiskLoans: loans.filter(l => l.riskLevel === 'Critical').length,
      highRiskLoans: loans.filter(l => l.riskLevel === 'High').length,
      totalOutstanding: loans.reduce((sum, l) => sum + (l.collectionMetrics?.outstanding || 0), 0),
      avgCollectionRate: loans.reduce((sum, l) => 
        sum + (l.collectionMetrics?.collectionRate || 0), 0) / (totalLoans || 1)
    };
    
    return {
      totalLoans,
      totalValue,
      statusCounts,
      nplRate,
      delinquencyRate,
      ...enhancedMetrics
    };
  }, [loans]);

  return <SummaryTab loans={loans} analytics={analytics} />;
};