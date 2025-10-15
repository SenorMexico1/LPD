// src/components/AIAnalytics/PatternDiscovery/analyzers/IndustryAnalyzer.js
export class IndustryAnalyzer {
  constructor(loans, portfolioMetrics) {
    this.loans = loans;
    this.metrics = portfolioMetrics;
  }

  analyze() {
    const patterns = [];
    
    const industryPerformance = this.analyzeIndustryPerformance();
    patterns.push(...industryPerformance);
    
    const crossIndustry = this.findCrossIndustryCorrelations();
    patterns.push(...crossIndustry);
    
    return patterns;
  }

  analyzeIndustryPerformance() {
    const patterns = [];
    const industryData = {};
    
    this.loans.forEach(loan => {
      const industry = loan.client?.industrySector;
      if (!industry) return;
      
      if (!industryData[industry]) {
        industryData[industry] = {
          loans: [],
          totalAmount: 0,
          defaults: 0,
          totalDSCR: 0
        };
      }
      
      industryData[industry].loans.push(loan);
      industryData[industry].totalAmount += loan.remainingAmount || 0;
      industryData[industry].totalDSCR += loan.dscr || 0;
      
      if (loan.status === 'default' || loan.status === 'charged_off') {
        industryData[industry].defaults++;
      }
    });
    
    Object.entries(industryData).forEach(([industry, data]) => {
      if (data.loans.length >= 5) {
        const defaultRate = (data.defaults / data.loans.length) * 100;
        const avgDSCR = data.totalDSCR / data.loans.length;
        
        if (defaultRate < this.metrics.summary.defaultRate * 0.6 || 
            defaultRate > this.metrics.summary.defaultRate * 1.5) {
          patterns.push({
            type: 'industry',
            title: `${industry} sector ${defaultRate < this.metrics.summary.defaultRate ? 'opportunity' : 'risk'}`,
            description: `${industry} shows ${defaultRate.toFixed(1)}% default rate with ${avgDSCR.toFixed(2)} avg DSCR`,
            confidence: 80,
            impact: data.totalAmount * Math.abs(defaultRate - this.metrics.summary.defaultRate) / 100,
            affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber),
            metrics: {
              sectorLoans: data.loans.length,
              defaultRate: defaultRate,
              avgDSCR: avgDSCR,
              totalExposure: data.totalAmount
            }
          });
        }
      }
    });
    
    return patterns;
  }

  findCrossIndustryCorrelations() {
    const patterns = [];
    
    // Find industry combinations that perform well together
    const industryPairs = {};
    
    // Group loans by client if they have multiple loans
    const clientLoans = {};
    this.loans.forEach(loan => {
      const clientId = loan.client?.name || loan.client?.id;
      if (!clientId) return;
      
      if (!clientLoans[clientId]) {
        clientLoans[clientId] = [];
      }
      clientLoans[clientId].push(loan);
    });
    
    // Look for patterns in multi-loan clients
    Object.values(clientLoans).forEach(loans => {
      if (loans.length > 1) {
        const industries = [...new Set(loans.map(l => l.client?.industrySector).filter(Boolean))];
        if (industries.length > 1) {
          const pairKey = industries.sort().join('-');
          if (!industryPairs[pairKey]) {
            industryPairs[pairKey] = {
              clients: 0,
              performing: 0
            };
          }
          industryPairs[pairKey].clients++;
          if (loans.every(l => l.status === 'current')) {
            industryPairs[pairKey].performing++;
          }
        }
      }
    });
    
    return patterns;
  }
}