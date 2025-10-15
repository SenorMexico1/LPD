// src/components/AIAnalytics/PatternDiscovery/analyzers/RiskAnalyzer.js
export class RiskAnalyzer {
  constructor(loans, portfolioMetrics, externalData) {
    this.loans = loans;
    this.metrics = portfolioMetrics;
    this.external = externalData;
  }

  analyze() {
    const risks = [];
    
    // Early warning signals
    const earlyWarnings = this.findEarlyWarningSignals();
    risks.push(...earlyWarnings);
    
    // Concentration risks
    const concentrations = this.findConcentrationRisks();
    risks.push(...concentrations);
    
    // Payment velocity deterioration
    const velocityRisks = this.findPaymentVelocityRisks();
    risks.push(...velocityRisks);
    
    return risks;
  }

  findEarlyWarningSignals() {
    const risks = [];
    
    // Find loans with deteriorating patterns
    const deteriorating = this.loans.filter(loan => {
      const velocityDrop = loan.paymentVelocity < 0.5;
      const recentDelinquency = loan.delinquencyDays > 0 && loan.delinquencyDays < 30;
      const dscrDrop = loan.dscr < 1.2;
      
      return velocityDrop || (recentDelinquency && dscrDrop);
    });
    
    if (deteriorating.length >= 5) {
      const totalExposure = deteriorating.reduce((sum, l) => sum + l.remainingAmount, 0);
      
      risks.push({
        type: 'early_warning',
        title: 'Payment deterioration pattern detected',
        description: `${deteriorating.length} loans showing early warning signals`,
        confidence: 85,
        impact: totalExposure * 0.3, // Assume 30% loss rate
        affectedLoans: deteriorating.map(l => l.loanNumber),
        metrics: {
          loansAtRisk: deteriorating.length,
          totalExposure: totalExposure,
          avgDaysDelinquent: deteriorating.reduce((s, l) => s + (l.delinquencyDays || 0), 0) / deteriorating.length
        },
        recommendation: {
          immediate: `Contact ${deteriorating.slice(0, 5).map(l => l.loanNumber).join(', ')} immediately`,
          shortTerm: 'Implement enhanced monitoring for at-risk loans',
          longTerm: 'Develop predictive default model'
        }
      });
    }
    
    return risks;
  }

  findConcentrationRisks() {
    const risks = [];
    const concentrations = {};
    
    // Check geographic concentration
    this.loans.forEach(loan => {
      const key = `${loan.client?.state}-${loan.client?.industrySector}`;
      if (!concentrations[key]) {
        concentrations[key] = {
          loans: [],
          totalAmount: 0
        };
      }
      concentrations[key].loans.push(loan);
      concentrations[key].totalAmount += loan.remainingAmount;
    });
    
    // Find risky concentrations
    Object.entries(concentrations).forEach(([key, data]) => {
      const concentration = data.totalAmount / this.metrics.summary.totalOutstanding;
      if (concentration > 0.15 && data.loans.length > 10) {
        const [state, industry] = key.split('-');
        risks.push({
          type: 'concentration',
          title: `High concentration in ${state} ${industry}`,
          description: `${(concentration * 100).toFixed(1)}% of portfolio concentrated in single segment`,
          confidence: 90,
          impact: data.totalAmount * 0.2,
          affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber),
          metrics: {
            concentration: concentration * 100,
            loanCount: data.loans.length,
            exposure: data.totalAmount
          },
          recommendation: {
            immediate: 'Review exposure limits',
            shortTerm: `Reduce new originations in ${state} ${industry}`,
            longTerm: 'Implement concentration limits policy'
          }
        });
      }
    });
    
    return risks;
  }

  findPaymentVelocityRisks() {
    const risks = [];
    
    const slowPayers = this.loans.filter(loan => {
      return loan.paymentVelocity !== undefined && 
             loan.paymentVelocity < 0.3 && 
             loan.monthsSinceOrigination > 3;
    });
    
    if (slowPayers.length >= 5) {
      risks.push({
        type: 'payment_velocity',
        title: 'Slow payment velocity cluster',
        description: `${slowPayers.length} loans showing concerning payment patterns`,
        confidence: 75,
        impact: slowPayers.reduce((s, l) => s + l.remainingAmount, 0) * 0.25,
        affectedLoans: slowPayers.map(l => l.loanNumber),
        metrics: {
          avgVelocity: slowPayers.reduce((s, l) => s + l.paymentVelocity, 0) / slowPayers.length,
          totalAtRisk: slowPayers.reduce((s, l) => s + l.remainingAmount, 0)
        },
        recommendation: {
          immediate: 'Review payment terms with affected borrowers',
          shortTerm: 'Consider restructuring options',
          longTerm: 'Adjust underwriting for payment velocity indicators'
        }
      });
    }
    
    return risks;
  }
}