export class AnalyticsEngine {
  calculatePortfolioMetrics(loans) {
    const totalLoans = loans.length;
    const totalValue = loans.reduce((sum, l) => sum + l.contractBalance, 0);
    
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
  }

  analyzeIndustryPerformance(loans) {
    const industryGroups = {};
    
    loans.forEach(loan => {
      const sector = loan.client?.industrySector || 'Unknown';
      if (!industryGroups[sector]) {
        industryGroups[sector] = {
          loans: [],
          defaultCount: 0,
          totalValue: 0
        };
      }
      industryGroups[sector].loans.push(loan);
      industryGroups[sector].totalValue += loan.contractBalance;
      if (loan.status === 'default' || loan.status === 'restructured') {
        industryGroups[sector].defaultCount++;
      }
    });
    
    return Object.entries(industryGroups).map(([sector, data]) => ({
      sector,
      loanCount: data.loans.length,
      defaultRate: data.defaultCount / data.loans.length,
      totalExposure: data.totalValue
    }));
  }
}