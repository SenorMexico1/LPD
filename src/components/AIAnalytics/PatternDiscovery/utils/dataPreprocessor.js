// src/components/AIAnalytics/PatternDiscovery/utils/dataPreprocessor.js
export function preprocessData(loans, metrics) {
  // Clean and standardize loan data
  const processedLoans = loans.map(loan => ({
    ...loan,
    // Standardize status values
    status: standardizeStatus(loan.status),
    // Calculate derived metrics
    monthsSinceOrigination: calculateMonthsSince(loan.payoutDate || loan.originationDate),
    paymentVelocity: calculatePaymentVelocity(loan),
    riskScore: calculateRiskScore(loan),
    // Clean numeric values
    remainingAmount: parseFloat(loan.remainingAmount) || 0,
    loanAmount: parseFloat(loan.loanAmount) || parseFloat(loan.remainingAmount) || 0,
    creditScore: parseInt(loan.creditScore) || 0,
    dscr: parseFloat(loan.dscr) || 0,
    rate: parseFloat(loan.rate) || 0
  }));
  
  return processedLoans;
}

export function calculateStatistics(loans) {
  if (!loans || loans.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      quartiles: [0, 0, 0]
    };
  }
  
  const values = loans.map(l => l.remainingAmount).sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median,
    stdDev,
    quartiles: [
      values[Math.floor(values.length * 0.25)],
      median,
      values[Math.floor(values.length * 0.75)]
    ]
  };
}

function standardizeStatus(status) {
  const statusMap = {
    'current': 'current',
    'performing': 'current',
    'delinquent': 'delinquent',
    'late': 'delinquent',
    'default': 'default',
    'charged_off': 'charged_off',
    'charged off': 'charged_off',
    'paid_off': 'paid_off',
    'paid off': 'paid_off'
  };
  
  return statusMap[status?.toLowerCase()] || status;
}

function calculateMonthsSince(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (isNaN(date)) return 0;
  
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + 
                 (now.getMonth() - date.getMonth());
  return Math.max(0, months);
}

function calculatePaymentVelocity(loan) {
  if (!loan.lastPaymentDate || !loan.payoutDate) return 0;
  
  const expectedPayments = calculateMonthsSince(loan.payoutDate);
  const lastPayment = calculateMonthsSince(loan.lastPaymentDate);
  
  if (expectedPayments === 0) return 0;
  return Math.max(0, Math.min(1, 1 - (lastPayment / expectedPayments)));
}

function calculateRiskScore(loan) {
  let score = 50; // Base score
  
  // Credit score impact
  if (loan.creditScore > 750) score -= 20;
  else if (loan.creditScore > 700) score -= 10;
  else if (loan.creditScore < 650) score += 20;
  
  // DSCR impact
  if (loan.dscr > 2) score -= 15;
  else if (loan.dscr > 1.5) score -= 5;
  else if (loan.dscr < 1.2) score += 15;
  
  // Delinquency impact
  if (loan.delinquencyDays > 30) score += 30;
  else if (loan.delinquencyDays > 0) score += 15;
  
  return Math.max(0, Math.min(100, score));
}