// components/LoanDetails/OverviewSection.jsx
import React from 'react';

// Industry favorability mapping based on underwriter requirements
const INDUSTRY_FAVORABILITY = {
  favorable: {
    level: 'Favorable',
    score: 0, // Lower risk score for favorable industries
    color: 'text-green-600 bg-green-100',
    industries: [
      { name: 'Restaurants', naics: '7225' },
      { name: 'Retail', naics: '44-45', restrictions: 'Restricted: Wholesale' },
      { name: 'Medical Offices', naics: '621' },
      { name: 'Software', naics: '511210' },
      { name: 'Education', naics: '611110' },
      { name: 'Utilities', naics: '22', restrictions: 'Restricted: Non-profits' }
    ]
  },
  neutral: {
    level: 'Neutral',
    score: 5, // Medium risk score
    color: 'text-yellow-600 bg-yellow-100',
    industries: [
      { name: 'Waste Management', naics: '562' },
      { name: 'Hotels', naics: '7211' },
      { name: 'Government Contracting', naics: 'Varies' },
      { name: 'Manufacturing', naics: '31-33' },
      { name: 'Laundry', naics: '8123' },
      { name: 'Catering', naics: '7223' },
      { name: 'Auto Repair', naics: '8111' }
    ]
  },
  unfavorable: {
    level: 'Unfavorable',
    score: 10, // Higher risk score
    color: 'text-orange-600 bg-orange-100',
    industries: [
      { name: 'Wholesale', naics: '42' },
      { name: 'Staffing', naics: '5613' },
      { name: 'Gas Stations', naics: '4471' },
      { name: 'Landscaping', naics: '5617' },
      { name: 'Telecommunications', naics: '517' },
      { name: 'Towing', naics: '488410' },
      { name: 'Food Trucks', naics: '722330' },
      { name: 'Insurance', naics: '524' },
      { name: 'Construction', naics: '23' },
      { name: 'General Contractors', naics: '236' },
      { name: 'Home Health Care', naics: '6216' },
      { name: 'Transportation', naics: '48-49' },
      { name: 'Trucking', naics: '484' },
      { name: 'E-commerce', naics: '454110' },
      { name: 'Adult Daycare', naics: '6244' }
    ]
  },
  partiallyRestricted: {
    level: 'Very Unfavorable',
    score: 15, // Very high risk score
    color: 'text-red-600 bg-red-100',
    industries: [
      { name: 'Real Estate', naics: '531' },
      { name: 'Property Management', naics: '5311' },
      { name: 'Advertising', naics: '5418' },
      { name: 'Marketing', naics: '5418' },
      { name: 'Media', naics: '515' },
      { name: 'Entertainment', naics: '71' },
      { name: 'Legal Services', naics: '5411' },
      { name: 'Investment Advisors', naics: '523930' }
    ]
  },
  restricted: {
    level: 'Restricted',
    score: 20, // Highest risk score - should avoid
    color: 'text-red-800 bg-red-200',
    industries: [
      { name: 'Accounting', naics: '5412' },
      { name: 'Non-Profit', naics: '813' },
      { name: 'Public Administration', naics: '92' },
      { name: 'Event Ticket Resellers', naics: '4539' },
      { name: 'Bars', naics: '7224' },
      { name: 'Liquor Stores', naics: '4453' },
      { name: 'Cannabis', naics: '453998' },
      { name: 'Marijuana', naics: '453998' },
      { name: 'Tobacco', naics: '453991' },
      { name: 'Vape Stores', naics: '459991' },
      { name: 'Convenience Stores', naics: '4451' },
      { name: 'Tax Preparation', naics: '541213' },
      { name: 'Firearms', naics: '332994' },
      { name: 'Online Gambling', naics: '7132' },
      { name: 'Forex Trading', naics: '523110' },
      { name: 'Cryptocurrency', naics: '523999' },
      { name: 'Travel Agencies', naics: '5615' },
      { name: 'Online Education', naics: '611710' }
    ]
  }
};

// Helper function to determine industry favorability
const getIndustryFavorability = (industrySector, industrySubsector) => {
  // Handle FALSE or null values
  if (!industrySector || industrySector === false || industrySector === 'FALSE' || 
      industrySector === 'Unknown' || industrySector === '') {
    return {
      level: 'Neutral',
      score: 5,
      color: 'text-gray-600 bg-gray-100',
      reason: 'Industry not specified'
    };
  }
  
  // Convert to string if it's not already
  const sectorStr = String(industrySector).toLowerCase();
  const subsectorStr = industrySubsector ? String(industrySubsector).toLowerCase() : '';
  
  // Check each favorability category
  for (const [key, category] of Object.entries(INDUSTRY_FAVORABILITY)) {
    for (const industry of category.industries) {
      const industryName = industry.name.toLowerCase();
      
      // Check for direct match or contains
      if (sectorStr.includes(industryName) || 
          subsectorStr.includes(industryName) ||
          industryName.includes(sectorStr) ||
          (subsectorStr && industryName.includes(subsectorStr))) {
        
        // Check for restrictions if any
        if (industry.restrictions && 
            (sectorStr.includes('wholesale') || subsectorStr.includes('wholesale'))) {
          // If it's a restricted subsector, move to unfavorable
          return {
            ...INDUSTRY_FAVORABILITY.unfavorable,
            reason: industry.restrictions
          };
        }
        
        return {
          ...category,
          matchedIndustry: industry.name,
          naics: industry.naics
        };
      }
    }
  }
  
  // Special cases for common industry patterns
  if (sectorStr.includes('health') || sectorStr.includes('medical')) {
    if (sectorStr.includes('home health')) {
      return { ...INDUSTRY_FAVORABILITY.unfavorable, reason: 'Home Health Care - Unfavorable' };
    }
    return { ...INDUSTRY_FAVORABILITY.favorable, reason: 'Medical/Health Services' };
  }
  
  if (sectorStr.includes('food') || sectorStr.includes('beverage')) {
    if (sectorStr.includes('truck')) {
      return { ...INDUSTRY_FAVORABILITY.unfavorable, reason: 'Food Trucks - Unfavorable' };
    }
    return { ...INDUSTRY_FAVORABILITY.favorable, reason: 'Food Services' };
  }
  
  if (sectorStr.includes('tech') || sectorStr.includes('software') || sectorStr.includes('saas')) {
    return { ...INDUSTRY_FAVORABILITY.favorable, reason: 'Technology/Software' };
  }
  
  if (sectorStr.includes('transport') || sectorStr.includes('truck') || sectorStr.includes('logistics')) {
    return { ...INDUSTRY_FAVORABILITY.unfavorable, reason: 'Transportation/Trucking' };
  }
  
  if (sectorStr.includes('construction') || sectorStr.includes('contractor')) {
    return { ...INDUSTRY_FAVORABILITY.unfavorable, reason: 'Construction/Contracting' };
  }
  
  // Default to neutral for unrecognized industries
  return {
    level: 'Neutral',
    score: 5,
    color: 'text-gray-600 bg-gray-100',
    reason: 'Industry not in favorability list - defaulting to neutral'
  };
};

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
    return 0;
  };

  const businessAge = calculateBusinessAge();
  
  // Get industry favorability
  const industryFavorability = getIndustryFavorability(
    loan.client?.industrySector, 
    loan.client?.industrySubsector
  );

  // Calculate detailed risk score breakdown
  const calculateRiskScoreBreakdown = () => {
    const breakdown = {
      paymentHistory: { score: 0, max: 30, label: 'Payment History' },
      ficoScore: { score: 0, max: 20, label: 'FICO Score' },
      debtRatio: { score: 0, max: 25, label: 'Debt/Revenue Ratio' },
      businessAge: { score: 0, max: 15, label: 'Business Age' },
      industryRisk: { score: 0, max: 20, label: 'Industry Risk' } // Increased max from 10 to 20
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
    
    // Business Age scoring (0-15 points)
    if (businessAge < 1) {
      breakdown.businessAge.score = 15;
    } else if (businessAge < 2) {
      breakdown.businessAge.score = 10;
    } else if (businessAge < 3) {
      breakdown.businessAge.score = 5;
    }
    
    // Industry Risk (0-20 points) - Now using favorability data
    breakdown.industryRisk.score = industryFavorability.score;
    
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
  
  // Format industry display - handles FALSE values
  const formatIndustryDisplay = () => {
    const sector = loan.client?.industrySector;
    const subsector = loan.client?.industrySubsector;
    
    // Check for FALSE or invalid values
    if (!sector || sector === false || sector === 'FALSE' || sector === '') {
      return 'Not Specified';
    }
    
    if (!subsector || subsector === false || subsector === 'FALSE' || subsector === '') {
      return String(sector);
    }
    
    return `${sector} - ${subsector}`;
  };
  
  return (
    <div className="space-y-4">
      {/* Team Information */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Team Assignment</h3>
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
      
      {/* Risk Assessment Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Risk Assessment</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Overall Risk</p>
            <p className={`text-lg font-bold px-2 py-1 rounded inline-block ${riskColors[riskLevel]}`}>
              {riskLevel}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Risk Score</p>
            <p className="text-lg font-bold">{calculatedRiskScore}/110</p>
            <p className="text-xs text-gray-500">
              {calculatedRiskScore <= 25 ? 'Low Risk' : 
               calculatedRiskScore <= 50 ? 'Medium Risk' : 
               calculatedRiskScore <= 75 ? 'High Risk' : 'Critical Risk'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Collection Rate</p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
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
      
      {/* Industry Analysis - NEW SECTION */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Industry Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Industry Classification</p>
            <p className="font-semibold">{formatIndustryDisplay()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Industry Favorability</p>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-sm font-semibold ${industryFavorability.color}`}>
                {industryFavorability.level}
              </span>
              {industryFavorability.naics && (
                <span className="text-xs text-gray-500">NAICS: {industryFavorability.naics}</span>
              )}
            </div>
            {industryFavorability.reason && (
              <p className="text-xs text-gray-500 mt-1">{industryFavorability.reason}</p>
            )}
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
                {key === 'industryRisk' && `${industryFavorability.level} - ${formatIndustryDisplay()}`}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">
            <strong>Scoring Logic:</strong> Higher scores indicate higher risk. 
            Score ranges: 0-27 (Low), 28-55 (Medium), 56-82 (High), 83-110 (Critical)
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
               (loan.lead?.avgDailyBalance || 0) >= 1000 ? 'Adequate' : 'Low'}
            </p>
          </div>
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">
            <strong>Banking Health Score:</strong> {kpis.bankingHealth.toFixed(0)}/100
          </p>
        </div>
      </div>
      
      {/* Recovery Status (if applicable) */}
      {kpis.recoveryVelocity !== null && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Recovery Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Payments Recovered</p>
              <p className="text-2xl font-bold text-green-600">{kpis.recoveryVelocity}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Recovery in Progress</p>
              <p className="text-sm font-medium">Catch-up plan active</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};