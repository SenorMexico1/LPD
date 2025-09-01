export class PatternRecognition {
  detectPaymentPatterns(loans) {
    const patterns = {
      consistentPayers: [],
      erraticPayers: [],
      decliningPerformance: [],
      recovering: []
    };
    
    loans.forEach(loan => {
      if (loan.status === 'current' && loan.catchUpPayments.length === 0) {
        patterns.consistentPayers.push(loan);
      } else if (loan.catchUpPayments.length > 2) {
        patterns.erraticPayers.push(loan);
      } else if (loan.missedPayments > 2) {
        patterns.decliningPerformance.push(loan);
      }
    });
    
    return patterns;
  }

  identifyDefaultPredictors(loans) {
    const predictors = [];
    const defaultedLoans = loans.filter(l => l.status === 'default' || l.status === 'restructured');
    
    if (defaultedLoans.length > 0) {
      const avgDaysOverdue = defaultedLoans.reduce((sum, l) => sum + l.daysOverdue, 0) / defaultedLoans.length;
      const avgFICO = defaultedLoans.reduce((sum, l) => sum + (l.lead?.fico || 0), 0) / defaultedLoans.length;
      
      predictors.push({
        factor: 'Low FICO Score',
        threshold: avgFICO,
        impact: 'high',
        recommendation: `Require higher down payments for FICO < ${Math.round(avgFICO)}`
      });
      
      predictors.push({
        factor: 'Days Overdue',
        threshold: avgDaysOverdue,
        impact: 'critical',
        recommendation: `Immediate intervention at ${Math.round(avgDaysOverdue / 2)} days overdue`
      });
    }
    
    return predictors;
  }
}