import { useState, useEffect, useMemo } from 'react';
import { AnalyticsEngine } from '../services/AnalyticsEngine';

export const useLoanData = (loans) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (loans && loans.length > 0) {
      setLoading(true);
      const engine = new AnalyticsEngine();
      const metrics = engine.calculatePortfolioMetrics(loans);
      setAnalytics(metrics);
      setLoading(false);
    }
  }, [loans]);
  
  const summary = useMemo(() => {
    if (!loans.length) return null;
    return {
      totalLoans: loans.length,
      totalValue: loans.reduce((sum, loan) => sum + loan.contractBalance, 0),
      currentCount: loans.filter(l => l.status === 'current').length,
      delinquentCount: loans.filter(l => l.status.includes('delinquent')).length,
      defaultCount: loans.filter(l => l.status === 'default' || l.isRestructured).length
    };
  }, [loans]);
  
  return { analytics, summary, loading };
};