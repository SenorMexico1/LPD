import React, { useMemo } from 'react';
import { SummaryTab } from './SummaryTab';

export const Dashboard = ({ loans }) => {
  // Calculate accurate missed payments accounting for ACH reversals and fees
  const calculateAccurateMissedPayments = (loan) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    
    // Define fee transaction types that should NOT count as payments
    const FEE_TRANSACTION_TYPES = [
      'origination fee collection',
      'initiation collection',
      'merchant fee collection',
      'stamp tax fee',
      'nsf fees',
      'legal fees',
      'legal fee',
      'merchant fee',
      'origination fee',
      'initiation',
      'restructure penalty',
      'loan payout',
      'cost of capital',
      'capital'
    ];
    
    // Process transactions to identify reversed payments
    const reversedTransactionIds = new Set();
    const processedTransactions = [];
    
    // Sort transactions by date and time
    const sortedTransactions = [...loan.transactions]
      .sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (a.typeName?.includes('REVERSAL')) return 1;
        if (b.typeName?.includes('REVERSAL')) return -1;
        return 0;
      });
    
    // Identify reversed transactions
    sortedTransactions.forEach((trans, idx) => {
      if (trans.typeName?.toLowerCase().includes('reversal') || 
          trans.typeName?.toLowerCase().includes('nsf')) {
        // Look for the original transaction to reverse
        for (let i = idx - 1; i >= 0; i--) {
          const prevTrans = sortedTransactions[i];
          if (prevTrans.credit === trans.debit && 
              !reversedTransactionIds.has(i) &&
              prevTrans.typeName?.toLowerCase().includes('ach')) {
            reversedTransactionIds.add(i);
            reversedTransactionIds.add(idx);
            break;
          }
        }
      }
    });
    
    // Filter out reversed transactions, reversals, and fee collections
    sortedTransactions.forEach((trans, idx) => {
      if (reversedTransactionIds.has(idx)) return;
      if (!trans.credit || trans.credit <= 0) return;
      
      const transTypeLower = (trans.typeName || '').toLowerCase();
      const isFeeTransaction = FEE_TRANSACTION_TYPES.some(feeType => 
        transTypeLower.includes(feeType)
      );
      if (isFeeTransaction) return;
      
      processedTransactions.push({
        ...trans,
        normalizedDate: trans.date.split('T')[0],
        id: trans.id || `trans_${idx}`
      });
    });
    
    // Calculate how many payment periods are satisfied
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 14534.88;
    let availablePayments = [...processedTransactions];
    let satisfiedPeriods = 0;
    let expectedPeriods = 0;
    
    // Process each payment period - EXCLUDE today's payments from being counted as missed
    loan.paydates.forEach((paydate) => {
      const paydateStr = paydate.date.split('T')[0];
      // Skip future payments AND today's payments
      if (paydateStr >= todayString) return;
      
      expectedPeriods++;
      let remainingNeeded = paydate.amount;
      let periodSatisfied = false;
      
      // Try to satisfy this period with available payments
      for (let i = 0; i < availablePayments.length && remainingNeeded > 0.01; i++) {
        const payment = availablePayments[i];
        
        if (payment.credit >= remainingNeeded * 0.99) {
          // This payment completes the period
          remainingNeeded = 0;
          periodSatisfied = true;
          
          // If there's excess, keep it for the next period
          if (payment.credit > paydate.amount * 1.01) {
            availablePayments[i] = {
              ...payment,
              credit: payment.credit - paydate.amount
            };
          } else {
            availablePayments.splice(i, 1);
            i--;
          }
          break;
        } else if (payment.credit >= installmentAmount * 0.1) {
          // Partial payment
          remainingNeeded -= payment.credit;
          availablePayments.splice(i, 1);
          i--;
        }
      }
      
      if (periodSatisfied || remainingNeeded <= 0.01) {
        satisfiedPeriods++;
      }
    });
    
    return expectedPeriods - satisfiedPeriods;
  };
  
  // Calculate risk score for each loan (100-point scale)
  const calculateRiskScore = (loan, missedPayments) => {
    const breakdown = {
      paymentHistory: 0,
      ficoScore: 0,
      debtRatio: 0,
      businessAge: 0,
      industryRisk: 0
    };
    
    // Payment History (0-30 points)
    if (missedPayments > 0) {
      breakdown.paymentHistory = Math.min(30, missedPayments * 10);
    }
    
    // FICO Score (0-15 points)
    const fico = loan.lead?.fico || 650;
    if (fico < 600) {
      breakdown.ficoScore = 15;
    } else if (fico < 650) {
      breakdown.ficoScore = 8;
    } else if (fico < 700) {
      breakdown.ficoScore = 4;
    }
    
    // Debt/Revenue Ratio (0-25 points)
    const revenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue || 0;
    const debt = loan.lead?.avgMCADebits || loan.lead?.avgMcaDebts || loan.lead?.avgMCADebts || 0;
    if (revenue > 0) {
      const ratio = debt / revenue;
      if (ratio > 0.15) {
        breakdown.debtRatio = 25;
      } else if (ratio > 0.05) {
        breakdown.debtRatio = 15;
      } else if (ratio > 0.01) {
        breakdown.debtRatio = 5;
      }
    }
    
    // Business Age (0-10 points)
    if (loan.client?.dateFounded) {
      const founded = new Date(loan.client.dateFounded);
      const now = new Date();
      const years = Math.floor((now - founded) / (1000 * 60 * 60 * 24 * 365));
      if (years < 1) {
        breakdown.businessAge = 10;
      } else if (years < 2) {
        breakdown.businessAge = 7;
      } else if (years < 3) {
        breakdown.businessAge = 3;
      }
    }
    
    // Industry Risk (0-20 points) - simplified for dashboard
    const industrySector = loan.client?.industrySector?.toLowerCase() || '';
    if (industrySector.includes('construction') || industrySector.includes('trucking')) {
      breakdown.industryRisk = 10;
    } else if (industrySector.includes('restaurant') || industrySector.includes('medical')) {
      breakdown.industryRisk = 0;
    } else {
      breakdown.industryRisk = 5;
    }
    
    return Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  };
  
  const analytics = useMemo(() => {
    // Calculate accurate metrics for each loan
    const enhancedLoans = loans.map(loan => {
      const accurateMissedPayments = calculateAccurateMissedPayments(loan);
      const riskScore = calculateRiskScore(loan, accurateMissedPayments);
      
      // Determine accurate status based on missed payments
      let accurateStatus = 'current';
      if (loan.status === 'restructured') {
        accurateStatus = 'restructured';
      } else if (accurateMissedPayments >= 3) {
        accurateStatus = 'default';
      } else if (accurateMissedPayments === 2) {
        accurateStatus = 'delinquent_2';
      } else if (accurateMissedPayments === 1) {
        accurateStatus = 'delinquent_1';
      }
      
      return {
        ...loan,
        accurateMissedPayments,
        accurateStatus,
        riskScore
      };
    });
    
    const totalLoans = enhancedLoans.length;
    const totalValue = enhancedLoans.reduce((sum, loan) => sum + loan.contractBalance, 0);
    
    // Count loans by accurate status
    const accurateStatusCounts = {
      current: enhancedLoans.filter(l => l.accurateStatus === 'current').length,
      delinquent_1: enhancedLoans.filter(l => l.accurateStatus === 'delinquent_1').length,
      delinquent_2: enhancedLoans.filter(l => l.accurateStatus === 'delinquent_2').length,
      delinquent_3: enhancedLoans.filter(l => l.accurateMissedPayments === 3).length,
      default: enhancedLoans.filter(l => l.accurateStatus === 'default' && l.accurateMissedPayments > 3).length,
      restructured: enhancedLoans.filter(l => l.accurateStatus === 'restructured').length
    };
    
    // Calculate risk distribution
    const riskDistribution = {
      low: enhancedLoans.filter(l => l.riskScore <= 25).length,
      medium: enhancedLoans.filter(l => l.riskScore > 25 && l.riskScore <= 50).length,
      high: enhancedLoans.filter(l => l.riskScore > 50 && l.riskScore <= 75).length,
      critical: enhancedLoans.filter(l => l.riskScore > 75).length
    };
    
    // Calculate average risk score
    const avgRiskScore = enhancedLoans.reduce((sum, l) => sum + l.riskScore, 0) / totalLoans;
    
    // Calculate DSCR distribution
    const dscrAnalysis = enhancedLoans.map(loan => {
      const revenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue || 0;
      const debt = loan.lead?.avgMCADebits || loan.lead?.avgMcaDebts || loan.lead?.avgMCADebts || 0;
      return debt > 0 ? revenue / debt : 999;
    });
    
    const dscrDistribution = {
      veryStrong: dscrAnalysis.filter(dscr => dscr > 100).length,  // No debt
      strong: dscrAnalysis.filter(dscr => dscr > 15 && dscr <= 100).length,
      moderate: dscrAnalysis.filter(dscr => dscr > 6.67 && dscr <= 15).length,
      weak: dscrAnalysis.filter(dscr => dscr <= 6.67).length
    };
    
    // Calculate collection rate (only counting actual payments, not fees or capital)
    // Exclude today's expected payments to avoid confusion
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    const totalExpected = enhancedLoans.reduce((sum, loan) => {
      // Count only payments due up to yesterday
      const expectedPayments = loan.paydates.filter(p => p.date.split('T')[0] <= yesterdayString).length;
      return sum + (expectedPayments * (loan.installmentAmount || loan.instalmentAmount || 0));
    }, 0);
    
    // Calculate actual payments received (excluding fees, capital, reversals)
    const totalReceived = enhancedLoans.reduce((sum, loan) => {
      // Use the same fee exclusion logic
      const FEE_TYPES = [
        'origination fee collection',
        'initiation collection',
        'merchant fee collection',
        'stamp tax fee',
        'nsf fees',
        'legal fees',
        'legal fee',
        'merchant fee',
        'origination fee',
        'initiation',
        'restructure penalty',
        'loan payout',
        'cost of capital',
        'capital'
      ];
      
      // Track reversed transactions first
      const reversedIds = new Set();
      const sortedTrans = [...loan.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      sortedTrans.forEach((trans, idx) => {
        const typeLower = (trans.typeName || '').toLowerCase();
        if (typeLower.includes('reversal') || typeLower.includes('nsf')) {
          // Find the original transaction
          for (let i = idx - 1; i >= 0; i--) {
            if (sortedTrans[i].credit === trans.debit && !reversedIds.has(i)) {
              reversedIds.add(i);
              reversedIds.add(idx);
              break;
            }
          }
        }
      });
      
      // Sum only legitimate payment transactions
      const loanPayments = sortedTrans.reduce((paySum, trans, idx) => {
        // Skip if reversed
        if (reversedIds.has(idx)) return paySum;
        
        const typeLower = (trans.typeName || '').toLowerCase();
        const isFee = FEE_TYPES.some(fee => typeLower.includes(fee));
        
        // Only count credits that aren't fees
        if (trans.credit > 0 && !isFee) {
          // Additional check to exclude very large transactions that might be loan disbursements
          if (trans.credit < loan.loanAmount * 0.5) { // Exclude if it's more than half the loan amount
            return paySum + trans.credit;
          }
        }
        return paySum;
      }, 0);
      
      return sum + loanPayments;
    }, 0);
    
    const collectionRate = totalExpected > 0 ? Math.min(100, (totalReceived / totalExpected) * 100) : 0;
    
    // Count ACH reversals
    const achReversalCount = enhancedLoans.reduce((sum, loan) => {
      const reversals = loan.transactions.filter(t => 
        t.typeName?.toLowerCase().includes('reversal') || 
        t.typeName?.toLowerCase().includes('nsf')
      ).length;
      return sum + reversals;
    }, 0);
    
    return {
      totalLoans,
      totalValue,
      statusCounts: accurateStatusCounts,
      riskDistribution,
      avgRiskScore,
      dscrDistribution,
      collectionRate,
      achReversalCount,
      nplRate: (accurateStatusCounts.default + accurateStatusCounts.restructured) / totalLoans,
      delinquencyRate: (accurateStatusCounts.delinquent_1 + accurateStatusCounts.delinquent_2 + accurateStatusCounts.delinquent_3) / totalLoans,
      enhancedLoans // Pass enhanced loans to SummaryTab
    };
  }, [loans]);

  return <SummaryTab loans={loans} analytics={analytics} />;
};