// components/LoanList/LoanTable.jsx
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

// Calculate business age
const calculateBusinessAge = (dateFounded) => {
  if (dateFounded) {
    const founded = new Date(dateFounded);
    const now = new Date();
    const years = (now - founded) / (1000 * 60 * 60 * 24 * 365);
    return Math.floor(years);
  }
  return 0;
};

// Calculate comprehensive risk score - matching the OverviewSection logic
const calculateRiskScore = (loan) => {
  const breakdown = {
    paymentHistory: { score: 0, max: 30 },
    ficoScore: { score: 0, max: 20 },
    debtRatio: { score: 0, max: 25 },
    businessAge: { score: 0, max: 15 },
    industryRisk: { score: 0, max: 20 }
  };
  
  // Payment History (0-30 points)
  const missedPayments = loan.statusCalculation?.missedPayments || loan.missedPayments || 0;
  if (missedPayments > 0) {
    breakdown.paymentHistory.score = Math.min(30, missedPayments * 7.5);
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
    if (ratio > 0.15) {
      breakdown.debtRatio.score = 25;
    } else if (ratio > 0.05) {
      breakdown.debtRatio.score = 15;
    } else if (ratio > 0.01) {
      breakdown.debtRatio.score = 5;
    }
  }
  
  // Business Age scoring (0-15 points)
  const businessAge = calculateBusinessAge(loan.client?.dateFounded);
  if (businessAge < 1) {
    breakdown.businessAge.score = 15;
  } else if (businessAge < 2) {
    breakdown.businessAge.score = 10;
  } else if (businessAge < 3) {
    breakdown.businessAge.score = 5;
  }
  
  // Industry Risk (0-20 points) - Using favorability data
  const industryFavorability = getIndustryFavorability(
    loan.client?.industrySector, 
    loan.client?.industrySubsector
  );
  breakdown.industryRisk.score = industryFavorability.score;
  
  // Calculate total score
  const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
  
  return totalScore;
};

export const LoanTable = ({ loans, sortBy, setSortBy, sortOrder, setSortOrder, onSelectLoan }) => {
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Enhance loans with calculated risk scores
  const enhancedLoans = loans.map(loan => ({
    ...loan,
    calculatedRiskScore: calculateRiskScore(loan),
    merchantName: loan.client?.name || loan.merchantName || 'Unknown'
  }));

  const sortedLoans = [...enhancedLoans].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Special handling for calculated risk score
    if (sortBy === 'riskScore') {
      aVal = a.calculatedRiskScore;
      bVal = b.calculatedRiskScore;
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal?.toLowerCase() || '';
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader 
                field="loanNumber" 
                label="Loan #" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="merchantName" 
                label="Merchant"
                className="w-64" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="status" 
                label="Status" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="contractBalance" 
                label="Balance" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <SortableHeader 
                field="missedPayments" 
                label="Missed" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Industry
              </th>
              <SortableHeader 
                field="riskScore" 
                label="Risk Score" 
                sortBy={sortBy} 
                sortOrder={sortOrder} 
                onClick={handleSort} 
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLoans.map((loan) => {
              const industryFavorability = getIndustryFavorability(
                loan.client?.industrySector,
                loan.client?.industrySubsector
              );
              
              return (
                <tr key={loan.loanNumber} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {loan.loanNumber}
                  </td>
                  <td className="px-2 py-4 text-sm text-gray-900 max-w-[100px] truncate">
                    {loan.merchantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={loan.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${loan.contractBalance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {loan.missedPayments || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <IndustryBadge favorability={industryFavorability} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <RiskIndicator score={loan.calculatedRiskScore} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => onSelectLoan(loan)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SortableHeader = ({ field, label, sortBy, sortOrder, onClick }) => (
  <th 
    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    onClick={() => onClick(field)}
  >
    {label} {sortBy === field && (sortOrder === 'asc' ? '↑' : '↓')}
  </th>
);

const StatusBadge = ({ status }) => {
  const colorClass = status === 'current' ? 'bg-green-100 text-green-800' :
                     status === 'restructured' ? 'bg-purple-100 text-purple-800' :
                     status === 'default' ? 'bg-red-100 text-red-800' :
                     status.includes('delinquent') ? 'bg-yellow-100 text-yellow-800' :
                     'bg-gray-100 text-gray-800';
  
  const displayText = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {displayText}
    </span>
  );
};

const IndustryBadge = ({ favorability }) => {
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${favorability.color}`}>
      {favorability.level}
    </span>
  );
};

const RiskIndicator = ({ score }) => {
  // Determine risk level based on score (0-110 scale)
  const getRiskLevel = () => {
    if (score <= 27) return { text: 'Low', color: 'bg-green-500', textColor: 'text-green-600' };
    if (score <= 55) return { text: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (score <= 82) return { text: 'High', color: 'bg-orange-500', textColor: 'text-orange-600' };
    return { text: 'Critical', color: 'bg-red-500', textColor: 'text-red-600' };
  };
  
  const riskLevel = getRiskLevel();
  
  return (
    <div className="flex items-center space-x-2">
      <span className={`font-semibold ${riskLevel.textColor}`}>
        {score.toFixed(0)}
      </span>
      <div className="flex-1">
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${riskLevel.color}`}
            style={{ width: `${Math.min((score / 110) * 100, 100)}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-500">
        {riskLevel.text}
      </span>
    </div>
  );
};