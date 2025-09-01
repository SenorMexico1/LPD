// components/LoanDetails/OverviewSection.jsx
import React from 'react';

export const OverviewSection = ({ loan }) => {
  // Calculate key performance indicators
  const calculateKPIs = () => {
    const totalExpected = loan.statusCalculation.totalExpected * loan.installmentAmount;
    const totalReceived = loan.statusCalculation.totalReceived;
    const collectionRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;
    
    // Debt Service Coverage Ratio (DSCR)
    const monthlyRevenue = loan.lead?.avgRevenue || 0;
    const monthlyDebtService = loan.lead?.avgMCADebts || 0;
    const dscr = monthlyDebtService > 0 ? monthlyDebtService / monthlyRevenue : 0;
    
    // Banking Health Score (0-100)
    let bankingHealth = 100;
    if (loan.lead?.avgNSFs > 0) bankingHealth -= Math.min(30, loan.lead.avgNSFs * 5);
    if (loan.lead?.avgNegativeDays > 0) bankingHealth -= Math.min(30, loan.lead.avgNegativeDays * 3);
    if (loan.lead?.avgDailyBalance < 1000) bankingHealth -= 20;
    bankingHealth = Math.max(0, bankingHealth);
    
    // Payment Velocity (average days between payments)
    const paymentDates = loan.statusCalculation.actualPayments
      .map(p => new Date(p.date))
      .sort((a, b) => a - b);
    
    let avgDaysBetweenPayments = 0;
    if (paymentDates.length > 1) {
      const gaps = [];
      for (let i = 1; i < paymentDates.length; i++) {
        gaps.push((paymentDates[i] - paymentDates[i-1]) / (1000 * 60 * 60 * 24));
      }
      avgDaysBetweenPayments = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }
    
    // First Payment Default Risk
    const firstPaymentMade = loan.statusCalculation.actualPayments.length > 0;
    const daysSinceContract = Math.floor(
      (new Date() - new Date(loan.contractDate)) / (1000 * 60 * 60 * 24)
    );
    const firstPaymentRisk = !firstPaymentMade && daysSinceContract > 7 ? 'High' : 
                             !firstPaymentMade && daysSinceContract > 3 ? 'Medium' : 'Low';
    
    // Recovery Velocity (if applicable)
    let recoveryVelocity = null;
    if (loan.catchUpPayments?.length > 0) {
      const lastCatchUp = loan.catchUpPayments[loan.catchUpPayments.length - 1];
      recoveryVelocity = lastCatchUp.paymentsCleared;
    }
    
    return {
      collectionRate,
      dscr,
      bankingHealth,
      avgDaysBetweenPayments,
      firstPaymentRisk,
      recoveryVelocity
    };
  };
  
  const kpis = calculateKPIs();
  
      const calculateBusinessAge = () => {
        if (loan.client?.dateFounded) {
            const founded = new Date(loan.client.dateFounded);
            const now = new Date();
            const years = (now - founded) / (1000 * 60 * 60 * 24 * 365);
            return Math.floor(years);
        }
        else return 0;
    };

    const businessAge = calculateBusinessAge();

  // Calculate detailed risk score breakdown
  const calculateRiskScoreBreakdown = () => {
    const breakdown = {
      paymentHistory: { score: 0, max: 30, label: 'Payment History' },
      ficoScore: { score: 0, max: 20, label: 'FICO Score' },
      debtRatio: { score: 0, max: 25, label: 'Debt/Revenue Ratio' },
      businessAge: { score: 0, max: 15, label: 'Business Age' },
      industryRisk: { score: 0, max: 10, label: 'Industry Risk' }
    };
    
    // Payment History (0-30 points)
    if (loan.statusCalculation.missedPayments > 0) {
      breakdown.paymentHistory.score = Math.min(30, loan.statusCalculation.missedPayments * 7.5);
    }
    
    // FICO Score (0-20 points)
    const fico = loan.lead?.fico || 650;
    if (fico < 600) {
      breakdown.ficoScore.score = 20;
    } else if (fico < 650) {
      breakdown.ficoScore.score = 10;
    } else if (fico < 700) {
      breakdown.ficoScore.score = 5;
    }
    
    // Debt/Revenue Ratio (0-25 points)
    const revenue = loan.lead?.avgRevenue || 0;
    const debt = loan.lead?.avgMCADebts || 0;
    if (revenue > 0) {
      const ratio = debt / revenue;
      if (ratio > .15 ) {
        breakdown.debtRatio.score = 25;
      } else if (ratio > .05) {
        breakdown.debtRatio.score = 15;
      } else if (ratio > .01) {
        breakdown.debtRatio.score = 5;
      }
    }
    
    // Calculate Business Age (0-15 points)
    // Business Age scoring
    if (businessAge < 1) {
    breakdown.businessAge.score = 15;
    } else if (businessAge < 2) {
    breakdown.businessAge.score = 10;
    } else if (businessAge < 3) {
    breakdown.businessAge.score = 5;
    }
    
    // Industry Risk (0-10 points)
    const sector = loan.client?.industrySector?.toLowerCase() || '';
    const highRiskIndustries = ['restaurant', 'retail', 'hospitality', 'construction'];
    if (highRiskIndustries.some(industry => sector.includes(industry))) {
      breakdown.industryRisk.score = 10;
    } else if (sector.includes('transportation') || sector.includes('auto')) {
      breakdown.industryRisk.score = 5;
    }
    
    const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
    
    return { breakdown, totalScore };
  };
  
  const { breakdown: riskBreakdown, totalScore: calculatedRiskScore } = calculateRiskScoreBreakdown();
  
  // Risk level determination
  const getRiskLevel = () => {
    if (loan.status === 'default' || loan.status === 'restructured') return 'Critical';
    if (loan.statusCalculation.missedPayments >= 2) return 'High';
    if (loan.statusCalculation.missedPayments === 1 || kpis.dscr < 1.5) return 'Medium';
    if (kpis.bankingHealth < 50 || loan.lead?.fico < 600) return 'Elevated';
    return 'Low';
  };
  
  const riskLevel = getRiskLevel();
  const riskColors = {
    'Critical': 'text-red-600 bg-red-100',
    'High': 'text-orange-600 bg-orange-100',
    'Medium': 'text-yellow-600 bg-yellow-100',
    'Elevated': 'text-blue-600 bg-blue-100',
    'Low': 'text-green-600 bg-green-100'
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <div className="space-y-4">
      {/* Team Information */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Team Assignment</h3>
        {console.log('Loan object:', loan)}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Underwriter</p>
            <p className="text-sm font-semibold">{loan.lead?.underwriter || 'Not Assigned'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Salesperson</p>
            <p className="text-sm font-semibold">{loan.lead?.salesperson || 'Not Assigned'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Pod Leader</p>
            <p className="text-sm font-semibold">{loan.lead?.podleader || 'Not Assigned'}</p>
          </div>
        </div>
      </div>
      
      {/* Risk Assessment Card */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Risk Assessment</h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">Overall Risk Level</p>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${riskColors[riskLevel]}`}>
              {riskLevel}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Risk Score</p>
            <p className="text-2xl font-bold">{calculatedRiskScore}</p>
            <p className="text-xs text-gray-500">out of 100</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div>
            <p className="text-xs text-gray-600">Banking Health</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className={`h-2 rounded-full ${
                    kpis.bankingHealth >= 70 ? 'bg-green-500' : 
                    kpis.bankingHealth >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${kpis.bankingHealth}%` }}
                />
              </div>
              <span className="text-sm font-medium">{kpis.bankingHealth.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600">Collection Rate</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className={`h-2 rounded-full ${
                    kpis.collectionRate >= 90 ? 'bg-green-500' : 
                    kpis.collectionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, kpis.collectionRate)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{kpis.collectionRate.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Risk Score Breakdown */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Risk Score Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(riskBreakdown).map(([key, item]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className="text-sm font-semibold">
                  {item.score}/{item.max} points
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    item.score === 0 ? 'bg-green-500' :
                    item.score / item.max < 0.5 ? 'bg-yellow-500' : 
                    item.score / item.max < 0.75 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {key === 'paymentHistory' && `${loan.statusCalculation.missedPayments} missed payments`}
                {key === 'ficoScore' && `FICO: ${loan.lead?.fico || 'Unknown'}`}
                {key === 'debtRatio' && `Ratio: ${kpis.dscr.toFixed(2)*100}%`}
                {key === 'businessAge' && `${businessAge || 0} years`}
                {key === 'industryRisk' && (loan.client?.industrySector || 'Unknown')}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">
            <strong>Scoring Logic:</strong> Higher scores indicate higher risk. 
            Score ranges: 0-25 (Low), 26-50 (Medium), 51-75 (High), 76-100 (Critical)
          </p>
        </div>
      </div>
      
      {/* Key Performance Indicators */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Key Performance Indicators</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Debt Service Coverage Ratio</p>
            <p className={`text-lg font-semibold ${
              kpis.dscr <= .01 ? 'text-green-600' : 
              kpis.dscr <= 0.5 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {kpis.dscr.toFixed(2) * 100}%
            </p>
            <p className="text-xs text-gray-500">
              {kpis.dscr >= 2 ? 'Strong' : kpis.dscr >= 1.5 ? 'Adequate' : 'Concerning'}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600">Payment Velocity</p>
            <p className="text-lg font-semibold">
              {kpis.avgDaysBetweenPayments > 0 ? 
                `${kpis.avgDaysBetweenPayments.toFixed(0)} days` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500">Avg between payments</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600">Debt to Revenue</p>
            <p className="text-lg font-semibold">
              {formatCurrency(loan.lead?.avgMCADebts || 0)}/ 
              {formatCurrency(loan.lead?.avgRevenue || 0)}
            </p>
            <p className="text-xs text-gray-500">Monthly cash flow</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600">First Payment Risk</p>
            <p className={`text-lg font-semibold ${
              kpis.firstPaymentRisk === 'Low' ? 'text-green-600' : 
              kpis.firstPaymentRisk === 'Medium' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {kpis.firstPaymentRisk}
            </p>
            <p className="text-xs text-gray-500">Default probability</p>
          </div>
        </div>
      </div>
      
      {/* Banking Behavior Indicators */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Banking Behavior</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded ${
            (loan.lead?.avgNSFs || 0) <= 2 ? 'bg-green-50' : 
            (loan.lead?.avgNSFs || 0) <= 5 ? 'bg-yellow-50' : 'bg-red-50'
          }`}>
            <p className="text-xs text-gray-600">NSFs/Month</p>
            <p className="text-xl font-bold">{(loan.lead?.avgNSFs || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              {(loan.lead?.avgNSFs || 0) <= 2 ? 'Healthy' : 
               (loan.lead?.avgNSFs || 0) <= 5 ? 'Warning' : 'Critical'}
            </p>
          </div>
          
          <div className={`p-3 rounded ${
            (loan.lead?.avgNegativeDays || 0) <= 3 ? 'bg-green-50' : 
            (loan.lead?.avgNegativeDays || 0) <= 7 ? 'bg-yellow-50' : 'bg-red-50'
          }`}>
            <p className="text-xs text-gray-600">Negative Days</p>
            <p className="text-xl font-bold">{(loan.lead?.avgNegativeDays || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              {(loan.lead?.avgNegativeDays || 0) <= 3 ? 'Stable' : 
               (loan.lead?.avgNegativeDays || 0) <= 7 ? 'Unstable' : 'Distressed'}
            </p>
          </div>
          
          <div className={`p-3 rounded ${
            (loan.lead?.avgDailyBalance || 0) >= 5000 ? 'bg-green-50' : 
            (loan.lead?.avgDailyBalance || 0) >= 1000 ? 'bg-yellow-50' : 'bg-red-50'
          }`}>
            <p className="text-xs text-gray-600">Avg Balance</p>
            <p className="text-xl font-bold">{formatCurrency(loan.lead?.avgDailyBalance || 0)}</p>
            <p className="text-xs text-gray-500">
              {(loan.lead?.avgDailyBalance || 0) >= 5000 ? 'Strong' : 
               (loan.lead?.avgDailyBalance || 0) >= 1000 ? 'Low' : 'Critical'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Payment Status Summary */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-blue-900">
              Status: {loan.status.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-sm text-blue-700 mt-1">{loan.statusCalculation.explanation}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">Performance</p>
            <p className="text-xl font-bold text-blue-900">
              {loan.statusCalculation.paymentsMade} / {loan.statusCalculation.totalExpected}
            </p>
          </div>
        </div>
        
        {loan.catchUpPayments && loan.catchUpPayments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-sm font-semibold text-blue-900">
              Recovery Detected: {kpis.recoveryVelocity} periods recovered
            </p>
          </div>
        )}
      </div>
      
      {/* Early Warning Signals */}
      {(kpis.dscr > .15 || kpis.bankingHealth < 50 || loan.statusCalculation.missedPayments > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Early Warning Signals</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            {kpis.dscr > .15 && (
              <li>• High debt service coverage ratio ({kpis.dscr.toFixed(2)*100}%)</li>
            )}
            {kpis.bankingHealth < 50 && (
              <li>• Poor banking behavior indicators ({kpis.bankingHealth.toFixed(0)}% health)</li>
            )}
            {loan.lead?.avgNSFs > 4 && (
              <li>• High NSF frequency ({loan.lead.avgNSFs.toFixed(2)}/month)</li>
            )}
            {loan.statusCalculation.missedPayments > 0 && (
              <li>• Payment delinquency ({loan.statusCalculation.missedPayments} missed)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};