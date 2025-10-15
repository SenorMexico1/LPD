// src/services/etl/modules/RiskCalculator.js

/**
 * RiskCalculator Module
 * Calculates comprehensive risk scores based on multiple factors
 */

import { DateUtility } from './DateUtility';
import { SharedUtilities } from './SharedUtilities';

export class RiskCalculator {
  constructor() {
    this.dateUtil = new DateUtility();
    this.utils = new SharedUtilities();
    
    // Industry favorability mapping
    this.INDUSTRY_FAVORABILITY = {
      favorable: {
        level: 'Favorable',
        score: 0,
        industries: [
          'restaurants', 'food service', 'dining',
          'retail', 'store', 'shop',
          'medical', 'health', 'clinic', 'doctor',
          'software', 'saas', 'technology', 'tech',
          'education', 'school', 'training',
          'utilities', 'electric', 'water', 'gas'
        ]
      },
      neutral: {
        level: 'Neutral',
        score: 5,
        industries: [
          'waste management', 'sanitation',
          'hotel', 'hospitality', 'lodging',
          'government', 'federal', 'state',
          'manufacturing', 'factory', 'production',
          'laundry', 'dry cleaning',
          'catering', 'event',
          'auto repair', 'mechanic', 'automotive'
        ]
      },
      unfavorable: {
        level: 'Unfavorable',
        score: 10,
        industries: [
          'wholesale', 'distributor',
          'staffing', 'recruiting', 'temp agency',
          'gas station', 'fuel', 'convenience store',
          'landscaping', 'lawn care', 'gardening',
          'telecommunications', 'telecom', 'phone',
          'towing', 'tow truck',
          'food truck', 'mobile food',
          'insurance', 'broker',
          'construction', 'builder', 'contractor',
          'home health', 'home care',
          'transportation', 'trucking', 'logistics',
          'e-commerce', 'online retail', 'amazon'
        ]
      },
      veryUnfavorable: {
        level: 'Very Unfavorable',
        score: 15,
        industries: [
          'real estate', 'property', 'realtor',
          'property management', 'rental',
          'advertising', 'marketing', 'agency',
          'media', 'publishing', 'broadcast',
          'entertainment', 'music', 'theater',
          'legal', 'law', 'attorney',
          'investment', 'advisor', 'financial planning'
        ]
      },
      restricted: {
        level: 'Restricted',
        score: 20,
        industries: [
          'accounting', 'cpa', 'bookkeeping',
          'non-profit', 'charity', 'foundation',
          'church', 'religious', 'ministry',
          'political', 'campaign', 'lobbying',
          'cannabis', 'marijuana', 'dispensary',
          'cryptocurrency', 'crypto', 'blockchain',
          'gambling', 'casino', 'betting',
          'adult', 'escort'
        ]
      }
    };
  }

  /**
   * Main calculation method - returns comprehensive risk score
   * @param {Object} loan - Complete loan object
   * @returns {Object} Risk score and breakdown
   */
  calculate(loan) {
    const breakdown = {
      paymentHistory: this.calculatePaymentHistoryRisk(loan),
      ficoScore: this.calculateFICORisk(loan),
      debtRatio: this.calculateDebtRatioRisk(loan),
      businessAge: this.calculateBusinessAgeRisk(loan),
      industryRisk: this.calculateIndustryRisk(loan),
      bankingHealth: this.calculateBankingHealthRisk(loan),
      contractPerformance: this.calculateContractPerformanceRisk(loan)
    };
    
    // Calculate total score (0-100 scale)
    const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
    
    // Determine risk level
    let riskLevel;
    if (totalScore <= 27) {
      riskLevel = 'Low';
    } else if (totalScore <= 55) {
      riskLevel = 'Medium';
    } else if (totalScore <= 82) {
      riskLevel = 'High';
    } else {
      riskLevel = 'Critical';
    }
    
    return {
      score: Math.min(100, totalScore),
      level: riskLevel,
      breakdown: breakdown,
      factors: this.getTopRiskFactors(breakdown),
      recommendation: this.getRiskRecommendation(totalScore, breakdown)
    };
  }

  /**
   * Calculate payment history risk (0-30 points)
   * @private
   */
  calculatePaymentHistoryRisk(loan) {
    let score = 0;
    const missedPayments = loan.statusCalculation?.missedPayments || 
                          loan.missedPayments || 0;
    
    // 7.5 points per missed payment, max 30
    score = Math.min(30, missedPayments * 7.5);
    
    // Additional risk for payment velocity issues
    if (loan.statusCalculation?.actualPayments) {
      const expectedFrequency = loan.paymentFrequency || 'monthly';
      const avgDaysBetween = this.calculateAveragePaymentGap(
        loan.statusCalculation.actualPayments
      );
      
      // Expected days based on frequency
      const expectedDays = expectedFrequency === 'weekly' ? 7 :
                          expectedFrequency === 'bi-weekly' ? 14 :
                          expectedFrequency === 'monthly' ? 30 : 30;
      
      if (avgDaysBetween > expectedDays * 1.5) {
        score = Math.min(30, score + 5);
      }
    }
    
    return {
      score: score,
      max: 30,
      label: 'Payment History',
      details: `${missedPayments} missed payments`
    };
  }

  /**
   * Calculate FICO risk (0-20 points)
   * @private
   */
  calculateFICORisk(loan) {
    const fico = loan.lead?.fico || 650;
    let score = 0;
    
    if (fico < 500) {
      score = 20;
    } else if (fico < 550) {
      score = 17;
    } else if (fico < 600) {
      score = 15;
    } else if (fico < 650) {
      score = 10;
    } else if (fico < 700) {
      score = 5;
    } else if (fico < 750) {
      score = 2;
    }
    
    return {
      score: score,
      max: 20,
      label: 'FICO Score',
      details: `FICO: ${fico}`
    };
  }

  /**
   * Calculate debt to revenue ratio risk (0-25 points)
   * @private
   */
  calculateDebtRatioRisk(loan) {
    const revenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue || 0;
    const debt = loan.lead?.avgMCADebts || 0;
    let score = 0;
    
    if (revenue > 0) {
      const ratio = debt / revenue;
      
      if (ratio > 0.5) {
        score = 25;
      } else if (ratio > 0.3) {
        score = 20;
      } else if (ratio > 0.15) {
        score = 15;
      } else if (ratio > 0.05) {
        score = 10;
      } else if (ratio > 0.01) {
        score = 5;
      }
    } else {
      // No revenue data is high risk
      score = 20;
    }
    
    const ratioPercent = revenue > 0 ? ((debt / revenue) * 100).toFixed(1) : 'N/A';
    
    return {
      score: score,
      max: 25,
      label: 'Debt/Revenue Ratio',
      details: `Ratio: ${ratioPercent}%`
    };
  }

  /**
   * Calculate business age risk (0-15 points)
   * @private
   */
  calculateBusinessAgeRisk(loan) {
    const businessAge = this.calculateBusinessAge(loan.client?.dateFounded);
    let score = 0;
    
    if (businessAge < 0.5) {
      score = 15;
    } else if (businessAge < 1) {
      score = 12;
    } else if (businessAge < 2) {
      score = 10;
    } else if (businessAge < 3) {
      score = 7;
    } else if (businessAge < 5) {
      score = 3;
    }
    
    return {
      score: score,
      max: 15,
      label: 'Business Age',
      details: `${businessAge.toFixed(1)} years`
    };
  }

  /**
   * Calculate industry risk (0-20 points)
   * @private
   */
  calculateIndustryRisk(loan) {
    const favorability = this.getIndustryFavorability(
      loan.client?.industrySector,
      loan.client?.industrySubsector
    );
    
    return {
      score: favorability.score,
      max: 20,
      label: 'Industry Risk',
      details: `${favorability.level} - ${favorability.matchedIndustry || 'Unknown'}`
    };
  }

  /**
   * Calculate banking health risk (0-15 points)
   * @private
   */
  calculateBankingHealthRisk(loan) {
    let score = 0;
    
    // NSF history
    const avgNSFs = loan.lead?.avgNSFs || 0;
    if (avgNSFs > 5) {
      score += 7;
    } else if (avgNSFs > 3) {
      score += 5;
    } else if (avgNSFs > 1) {
      score += 3;
    } else if (avgNSFs > 0) {
      score += 1;
    }
    
    // Negative days
    const avgNegativeDays = loan.lead?.avgNegativeDays || 0;
    if (avgNegativeDays > 10) {
      score += 5;
    } else if (avgNegativeDays > 5) {
      score += 3;
    } else if (avgNegativeDays > 2) {
      score += 2;
    } else if (avgNegativeDays > 0) {
      score += 1;
    }
    
    // Low daily balance
    const avgDailyBalance = loan.lead?.avgDailyBalance || 0;
    if (avgDailyBalance < 500) {
      score += 3;
    } else if (avgDailyBalance < 1000) {
      score += 2;
    } else if (avgDailyBalance < 2500) {
      score += 1;
    }
    
    return {
      score: Math.min(15, score),
      max: 15,
      label: 'Banking Health',
      details: `NSFs: ${avgNSFs}, Neg Days: ${avgNegativeDays}`
    };
  }

  /**
   * Calculate contract performance risk (0-10 points)
   * @private
   */
  calculateContractPerformanceRisk(loan) {
    let score = 0;
    
    // Check if first payment was made on time
    const contractDate = loan.contractDate || loan.payoutDate;
    if (contractDate) {
      const firstPaymentExpected = loan.paydates?.[0]?.date;
      const firstPaymentActual = loan.statusCalculation?.actualPayments?.[0]?.date;
      
      if (firstPaymentExpected && !firstPaymentActual) {
        const daysSinceExpected = this.dateUtil.getDaysBetween(
          firstPaymentExpected,
          new Date().toISOString().split('T')[0]
        );
        if (daysSinceExpected > 7) {
          score += 5;
        }
      }
    }
    
    // Check collection rate
    const collectionRate = this.calculateCollectionRate(loan);
    if (collectionRate < 50) {
      score += 5;
    } else if (collectionRate < 75) {
      score += 3;
    } else if (collectionRate < 90) {
      score += 1;
    }
    
    return {
      score: Math.min(10, score),
      max: 10,
      label: 'Contract Performance',
      details: `Collection: ${collectionRate.toFixed(0)}%`
    };
  }

  /**
   * Get industry favorability
   * @private
   */
  getIndustryFavorability(sector, subsector) {
    if (!sector && !subsector) {
      return { level: 'Unknown', score: 10, matchedIndustry: 'Not specified' };
    }
    
    const searchString = `${sector || ''} ${subsector || ''}`.toLowerCase();
    
    // Check each favorability level
    for (const [key, config] of Object.entries(this.INDUSTRY_FAVORABILITY)) {
      for (const industry of config.industries) {
        if (searchString.includes(industry)) {
          return {
            level: config.level,
            score: config.score,
            matchedIndustry: industry
          };
        }
      }
    }
    
    // Default to neutral for unrecognized
    return {
      level: 'Neutral',
      score: 5,
      matchedIndustry: sector || subsector || 'Unknown'
    };
  }

  /**
   * Calculate business age in years
   * @private
   */
  calculateBusinessAge(dateFounded) {
    if (!dateFounded) return 0;
    
    const founded = new Date(dateFounded);
    const now = new Date();
    const years = (now - founded) / (1000 * 60 * 60 * 24 * 365);
    
    return Math.max(0, years);
  }

  /**
   * Calculate average days between payments
   * @private
   */
  calculateAveragePaymentGap(payments) {
    if (!payments || payments.length < 2) {
      return 0;
    }
    
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    let totalGap = 0;
    let gapCount = 0;
    
    for (let i = 1; i < sortedPayments.length; i++) {
      const gap = this.dateUtil.getDaysBetween(
        sortedPayments[i - 1].date,
        sortedPayments[i].date
      );
      totalGap += gap;
      gapCount++;
    }
    
    return gapCount > 0 ? totalGap / gapCount : 0;
  }

  /**
   * Calculate collection rate
   * @private
   */
  calculateCollectionRate(loan) {
    const totalExpected = loan.statusCalculation?.totalExpected || 0;
    const totalReceived = loan.statusCalculation?.totalReceived || 0;
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    
    if (totalExpected > 0 && installmentAmount > 0) {
      const expectedAmount = totalExpected * installmentAmount;
      return Math.min(100, (totalReceived / expectedAmount) * 100);
    }
    
    return 0;
  }

  /**
   * Get top risk factors
   * @private
   */
  getTopRiskFactors(breakdown) {
    const factors = Object.entries(breakdown)
      .map(([key, value]) => ({
        factor: value.label,
        score: value.score,
        details: value.details,
        percentOfMax: (value.score / value.max) * 100
      }))
      .filter(f => f.score > 0)
      .sort((a, b) => b.percentOfMax - a.percentOfMax)
      .slice(0, 3);
    
    return factors;
  }

  /**
   * Get risk recommendation
   * @private
   */
  getRiskRecommendation(totalScore, breakdown) {
    const recommendations = [];
    
    // Payment history recommendations
    if (breakdown.paymentHistory.score > 15) {
      recommendations.push('Immediate collection action required - multiple missed payments');
    } else if (breakdown.paymentHistory.score > 7) {
      recommendations.push('Follow up on missed payment(s) immediately');
    }
    
    // FICO recommendations
    if (breakdown.ficoScore.score > 15) {
      recommendations.push('Very low FICO score - high default risk');
    }
    
    // Debt ratio recommendations
    if (breakdown.debtRatio.score > 20) {
      recommendations.push('Extremely high debt burden - monitor closely');
    } else if (breakdown.debtRatio.score > 15) {
      recommendations.push('High debt-to-revenue ratio - payment capacity concern');
    }
    
    // Business age recommendations
    if (breakdown.businessAge.score > 12) {
      recommendations.push('Very young business - higher failure risk');
    }
    
    // Industry recommendations
    if (breakdown.industryRisk.score >= 15) {
      recommendations.push('High-risk industry - requires close monitoring');
    }
    
    // Banking health recommendations
    if (breakdown.bankingHealth.score > 10) {
      recommendations.push('Poor banking behavior - NSF and negative balance history');
    }
    
    // Overall recommendation
    if (totalScore <= 27) {
      recommendations.unshift('Low risk - maintain standard monitoring');
    } else if (totalScore <= 55) {
      recommendations.unshift('Medium risk - increase monitoring frequency');
    } else if (totalScore <= 82) {
      recommendations.unshift('High risk - daily monitoring recommended');
    } else {
      recommendations.unshift('Critical risk - immediate intervention needed');
    }
    
    return recommendations.slice(0, 3).join('; ');
  }

  /**
   * Calculate DSCR (Debt Service Coverage Ratio)
   * @param {Object} loan - Loan object
   * @returns {number} DSCR value
   */
  calculateDSCR(loan) {
    const monthlyRevenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue || 0;
    const monthlyDebtService = loan.lead?.avgMCADebts || 0;
    
    if (monthlyDebtService <= 0) {
      return 10; // No debt = excellent DSCR
    }
    
    if (monthlyRevenue <= 0) {
      return 0; // No revenue = cannot service debt
    }
    
    return monthlyRevenue / monthlyDebtService;
  }
}