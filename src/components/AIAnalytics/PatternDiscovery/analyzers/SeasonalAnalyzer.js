// src/components/AIAnalytics/PatternDiscovery/analyzers/SeasonalAnalyzer.js
export class SeasonalAnalyzer {
  constructor(loans, portfolioMetrics) {
    this.loans = loans;
    this.metrics = portfolioMetrics;
  }

  analyze() {
    const patterns = [];
    
    const monthlyPatterns = this.findMonthlyPatterns();
    patterns.push(...monthlyPatterns);
    
    const quarterlyPatterns = this.findQuarterlyPatterns();
    patterns.push(...quarterlyPatterns);
    
    return patterns;
  }

  findMonthlyPatterns() {
    const patterns = [];
    const monthlyData = {};
    
    this.loans.forEach(loan => {
      const originDate = new Date(loan.payoutDate || loan.originationDate);
      if (isNaN(originDate)) return;
      
      const month = originDate.getMonth();
      if (!monthlyData[month]) {
        monthlyData[month] = {
          loans: [],
          defaults: 0
        };
      }
      
      monthlyData[month].loans.push(loan);
      if (loan.status === 'default') {
        monthlyData[month].defaults++;
      }
    });
    
    // Find seasonal patterns
    Object.entries(monthlyData).forEach(([month, data]) => {
      if (data.loans.length >= 10) {
        const defaultRate = (data.defaults / data.loans.length) * 100;
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
        
        if (Math.abs(defaultRate - this.metrics.summary.defaultRate) > 5) {
          patterns.push({
            type: 'seasonal',
            title: `${monthName} origination pattern`,
            description: `Loans originated in ${monthName} show ${defaultRate.toFixed(1)}% default rate`,
            confidence: 70,
            impact: data.loans.reduce((s, l) => s + l.remainingAmount, 0) * 0.05,
            affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber)
          });
        }
      }
    });
    
    return patterns;
  }

  findQuarterlyPatterns() {
    const patterns = [];
    const quarterlyData = { Q1: [], Q2: [], Q3: [], Q4: [] };
    
    this.loans.forEach(loan => {
      const date = new Date(loan.payoutDate);
      if (isNaN(date)) return;
      
      const month = date.getMonth();
      const quarter = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4';
      quarterlyData[quarter].push(loan);
    });
    
    return patterns;
  }
}