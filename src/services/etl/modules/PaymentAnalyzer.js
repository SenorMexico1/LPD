// src/services/etl/modules/PaymentAnalyzer.js

/**
 * PaymentAnalyzer Module
 * Analyzes payment patterns, matches payments to schedule, and detects anomalies
 */

import { DateUtility } from './DateUtility';
import { SharedUtilities } from './SharedUtilities';

export class PaymentAnalyzer {
  constructor() {
    this.dateUtil = new DateUtility();
    this.utils = new SharedUtilities();
    
    // Configuration for payment matching
    this.MATCHING_CONFIG = {
      maxDaysForMatch: 7,        // Max days before/after for matching
      amountVarianceThreshold: 0.1, // 10% variance allowed
      catchUpMultiplier: 1.5,    // Payment >= 1.5x installment = catch-up
      partialPaymentThreshold: 0.5, // Payment >= 50% = partial
      recoveryThreshold: 2.0      // Payment >= 2x installment = recovery
    };
  }

  /**
   * Main analysis method - comprehensive payment analysis
   * @param {Object} loan - Complete loan object
   * @returns {Object} Complete payment analysis
   */
  analyze(loan) {
    const analysis = {
      paymentMatching: this.matchPaymentsToSchedule(loan),
      catchUpPayments: this.detectCatchUpPayments(loan),
      paymentVelocity: this.analyzePaymentVelocity(loan),
      collectionMetrics: this.calculateCollectionMetrics(loan),
      paymentPatterns: this.detectPaymentPatterns(loan),
      anomalies: this.detectAnomalies(loan),
      forecast: this.forecastPayments(loan)
    };
    
    return analysis;
  }

  /**
   * Match payments to scheduled paydates
   * @param {Object} loan - Loan object
   * @returns {Array} Array of matched payments
   */
  matchPaymentsToSchedule(loan) {
    const matches = [];
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    
    if (!loan.paydates || !loan.transactions) {
      return matches;
    }
    
    // Get valid payment transactions
    const validPayments = loan.transactions.filter(t => 
      t.credit > 0 && !this.isExcludedTransaction(t)
    );
    
    // Create copies for tracking
    const unmatchedPaydates = [...loan.paydates];
    const unmatchedTransactions = [...validPayments];
    const usedTransactions = new Set();
    const recoveryPayments = new Map();
    
    // First pass: identify recovery/catch-up payments
    unmatchedTransactions.forEach((trans, idx) => {
      const transId = trans.id || `trans_${idx}`;
      
      if (trans.credit >= installmentAmount * this.MATCHING_CONFIG.recoveryThreshold) {
        const paymentsCovered = Math.floor(trans.credit / installmentAmount);
        recoveryPayments.set(transId, {
          transaction: trans,
          paymentsCovered: paymentsCovered,
          type: 'recovery'
        });
      } else if (trans.credit >= installmentAmount * this.MATCHING_CONFIG.catchUpMultiplier) {
        const paymentsCovered = Math.floor(trans.credit / installmentAmount);
        recoveryPayments.set(transId, {
          transaction: trans,
          paymentsCovered: paymentsCovered,
          type: 'catch-up'
        });
      }
    });
    
    // Second pass: match payments to schedule
    unmatchedPaydates.forEach((paydate, paydateIdx) => {
      const paydateTime = new Date(paydate.date).getTime();
      const paydateId = paydate.id || `paydate_${paydateIdx}`;
      
      let matchedTransaction = null;
      let matchType = 'missed';
      let variance = -paydate.amount;
      let daysLate = 0;
      
      // Check if covered by a recovery payment
      for (const [transId, recovery] of recoveryPayments.entries()) {
        const transTime = new Date(recovery.transaction.date).getTime();
        if (transTime >= paydateTime && !usedTransactions.has(transId)) {
          // This paydate is covered by the recovery payment
          matchedTransaction = recovery.transaction;
          matchType = 'covered_by_recovery';
          variance = 0;
          usedTransactions.add(transId);
          
          // Decrement the coverage count
          recovery.paymentsCovered--;
          if (recovery.paymentsCovered <= 0) {
            recoveryPayments.delete(transId);
          }
          break;
        }
      }
      
      // If not covered by recovery, try to find direct match
      if (!matchedTransaction) {
        let closestMatch = null;
        let closestDiff = Infinity;
        
        unmatchedTransactions.forEach((trans, transIdx) => {
          const transId = trans.id || `trans_${transIdx}`;
          if (usedTransactions.has(transId)) return;
          
          const transTime = new Date(trans.date).getTime();
          const daysDiff = Math.abs((transTime - paydateTime) / (1000 * 60 * 60 * 24));
          
          // Check if within matching window
          if (daysDiff <= this.MATCHING_CONFIG.maxDaysForMatch) {
            const amountDiff = Math.abs(trans.credit - paydate.amount);
            const amountRatio = amountDiff / paydate.amount;
            
            // Check amount variance
            if (amountRatio <= this.MATCHING_CONFIG.amountVarianceThreshold || 
                trans.credit >= paydate.amount * 0.9) {
              if (daysDiff < closestDiff) {
                closestDiff = daysDiff;
                closestMatch = {
                  transaction: trans,
                  transId: transId,
                  daysLate: transTime > paydateTime ? 
                    Math.floor((transTime - paydateTime) / (1000 * 60 * 60 * 24)) : 0
                };
              }
            } else if (trans.credit >= paydate.amount * this.MATCHING_CONFIG.partialPaymentThreshold) {
              // Partial payment
              if (daysDiff < closestDiff) {
                closestDiff = daysDiff;
                closestMatch = {
                  transaction: trans,
                  transId: transId,
                  isPartial: true,
                  daysLate: transTime > paydateTime ? 
                    Math.floor((transTime - paydateTime) / (1000 * 60 * 60 * 24)) : 0
                };
              }
            }
          }
        });
        
        if (closestMatch) {
          matchedTransaction = closestMatch.transaction;
          usedTransactions.add(closestMatch.transId);
          
          if (closestMatch.isPartial) {
            matchType = 'partial_payment';
          } else if (closestMatch.daysLate > 0) {
            matchType = 'late_matched';
          } else {
            matchType = 'matched';
          }
          
          variance = matchedTransaction.credit - paydate.amount;
          daysLate = closestMatch.daysLate;
        }
      }
      
      // Determine status for unmatched paydates
      if (!matchedTransaction) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const paydateDate = new Date(paydate.date);
        paydateDate.setHours(0, 0, 0, 0);
        
        if (paydateDate.getTime() === today.getTime()) {
          matchType = 'due_today';
        } else if (paydateDate > today) {
          matchType = 'upcoming';
        } else {
          matchType = 'missed';
        }
      }
      
      matches.push({
        paydate: paydate,
        transaction: matchedTransaction,
        status: matchType,
        variance: variance,
        daysLate: daysLate,
        expectedAmount: paydate.amount || installmentAmount,
        actualAmount: matchedTransaction?.credit || 0
      });
    });
    
    // Third pass: add unmatched transactions as extra payments
    unmatchedTransactions.forEach((trans, idx) => {
      const transId = trans.id || `trans_${idx}`;
      
      if (!usedTransactions.has(transId) && 
          trans.credit >= installmentAmount * this.MATCHING_CONFIG.partialPaymentThreshold) {
        matches.push({
          paydate: null,
          transaction: trans,
          status: 'extra',
          variance: trans.credit,
          daysLate: 0,
          expectedAmount: 0,
          actualAmount: trans.credit
        });
      }
    });
    
    // Sort by date
    return matches.sort((a, b) => {
      const dateA = new Date(a.paydate?.date || a.transaction?.date);
      const dateB = new Date(b.paydate?.date || b.transaction?.date);
      return dateA - dateB;
    });
  }

  /**
   * Detect catch-up payments
   * @param {Object} loan - Loan object
   * @returns {Array} Array of catch-up payments
   */
  detectCatchUpPayments(loan) {
    const catchUps = [];
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    
    if (!installmentAmount || !loan.transactions) {
      return catchUps;
    }
    
    loan.transactions.forEach((trans) => {
      if (trans.credit >= installmentAmount * this.MATCHING_CONFIG.catchUpMultiplier) {
        const paymentsCleared = Math.floor(trans.credit / installmentAmount);
        const isRecovery = trans.credit >= installmentAmount * this.MATCHING_CONFIG.recoveryThreshold;
        
        catchUps.push({
          date: trans.date,
          amount: trans.credit,
          paymentsCleared: paymentsCleared,
          type: isRecovery ? 'recovery' : 'catch-up',
          expectedAmount: installmentAmount * paymentsCleared,
          overpayment: trans.credit - (installmentAmount * paymentsCleared),
          rowNumber: trans.rowNumber,
          transactionType: trans.typeName
        });
      }
    });
    
    return catchUps;
  }

  /**
   * Analyze payment velocity
   * @param {Object} loan - Loan object
   * @returns {Object} Payment velocity metrics
   */
  analyzePaymentVelocity(loan) {
    const metrics = {
      avgDaysBetweenPayments: 0,
      paymentFrequencyConsistency: 0,
      velocityTrend: 'stable',
      recentVelocity: 0,
      historicalVelocity: 0,
      isDecelerating: false,
      isAccelerating: false
    };
    
    const validPayments = loan.statusCalculation?.actualPayments || [];
    
    if (validPayments.length < 2) {
      return metrics;
    }
    
    // Sort payments by date
    const sortedPayments = [...validPayments].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Calculate gaps between payments
    const gaps = [];
    for (let i = 1; i < sortedPayments.length; i++) {
      const gap = this.dateUtil.getDaysBetween(
        sortedPayments[i - 1].date,
        sortedPayments[i].date
      );
      gaps.push(gap);
    }
    
    // Average days between payments
    metrics.avgDaysBetweenPayments = gaps.length > 0 ?
      gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    
    // Payment frequency consistency (standard deviation)
    if (gaps.length > 1) {
      const mean = metrics.avgDaysBetweenPayments;
      const variance = gaps.reduce((sum, gap) => 
        sum + Math.pow(gap - mean, 2), 0) / gaps.length;
      const stdDev = Math.sqrt(variance);
      
      // Consistency score (0-100, higher = more consistent)
      metrics.paymentFrequencyConsistency = Math.max(0, 
        100 - (stdDev / mean * 100));
    }
    
    // Recent vs historical velocity
    if (gaps.length >= 4) {
      const midpoint = Math.floor(gaps.length / 2);
      const recentGaps = gaps.slice(midpoint);
      const historicalGaps = gaps.slice(0, midpoint);
      
      metrics.recentVelocity = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;
      metrics.historicalVelocity = historicalGaps.reduce((a, b) => a + b, 0) / historicalGaps.length;
      
      // Determine trend
      const velocityChange = metrics.recentVelocity - metrics.historicalVelocity;
      const changePercent = Math.abs(velocityChange / metrics.historicalVelocity);
      
      if (changePercent > 0.2) {
        if (velocityChange > 0) {
          metrics.velocityTrend = 'decelerating';
          metrics.isDecelerating = true;
        } else {
          metrics.velocityTrend = 'accelerating';
          metrics.isAccelerating = true;
        }
      }
    }
    
    return metrics;
  }

  /**
   * Calculate collection metrics
   * @param {Object} loan - Loan object
   * @returns {Object} Collection metrics
   */
  calculateCollectionMetrics(loan) {
    const metrics = {
      collectionRate: 0,
      expectedToDate: 0,
      collectedToDate: 0,
      outstanding: 0,
      projectedShortfall: 0,
      onTimePaymentRate: 0,
      avgDaysLate: 0,
      recoveryRate: 0
    };
    
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    const totalLoanAmount = loan.loanAmount || 0;
    
    // Collection rate
    const totalExpected = loan.statusCalculation?.totalExpected || 0;
    const totalReceived = loan.statusCalculation?.totalReceived || 0;
    
    if (totalExpected > 0 && installmentAmount > 0) {
      metrics.expectedToDate = totalExpected * installmentAmount;
      metrics.collectedToDate = totalReceived;
      metrics.collectionRate = (totalReceived / metrics.expectedToDate) * 100;
      metrics.outstanding = Math.max(0, metrics.expectedToDate - totalReceived);
    }
    
    // On-time payment rate
    const paymentMatches = this.matchPaymentsToSchedule(loan);
    const completedPaydates = paymentMatches.filter(m => 
      m.status !== 'upcoming' && m.status !== 'due_today'
    );
    const onTimePayments = completedPaydates.filter(m => 
      m.status === 'matched' || m.status === 'covered_by_recovery'
    );
    
    if (completedPaydates.length > 0) {
      metrics.onTimePaymentRate = (onTimePayments.length / completedPaydates.length) * 100;
    }
    
    // Average days late
    const latePayments = paymentMatches.filter(m => m.daysLate > 0);
    if (latePayments.length > 0) {
      metrics.avgDaysLate = latePayments.reduce((sum, p) => 
        sum + p.daysLate, 0) / latePayments.length;
    }
    
    // Recovery rate (for delinquent loans)
    if (loan.status && loan.status !== 'current') {
      const catchUps = this.detectCatchUpPayments(loan);
      const totalRecovered = catchUps.reduce((sum, c) => sum + c.amount, 0);
      
      if (metrics.outstanding > 0) {
        metrics.recoveryRate = (totalRecovered / metrics.outstanding) * 100;
      }
    }
    
    // Projected shortfall
    if (totalLoanAmount > 0 && metrics.collectionRate > 0) {
      const projectedTotal = (metrics.collectedToDate / metrics.collectionRate) * 100;
      metrics.projectedShortfall = Math.max(0, totalLoanAmount - projectedTotal);
    }
    
    return metrics;
  }

  /**
   * Detect payment patterns
   * @param {Object} loan - Loan object
   * @returns {Object} Payment patterns
   */
  detectPaymentPatterns(loan) {
    const patterns = {
      hasRegularPayments: false,
      paymentDayOfWeek: null,
      paymentDayOfMonth: null,
      preferredPaymentMethod: null,
      seasonality: null,
      paymentTiming: null
    };
    
    const validPayments = loan.statusCalculation?.actualPayments || [];
    
    if (validPayments.length < 3) {
      return patterns;
    }
    
    // Day of week analysis
    const dayOfWeekCounts = new Array(7).fill(0);
    const dayOfMonthCounts = new Map();
    
    validPayments.forEach(payment => {
      const date = new Date(payment.date);
      
      // Day of week (0 = Sunday)
      dayOfWeekCounts[date.getDay()]++;
      
      // Day of month
      const dayOfMonth = date.getDate();
      dayOfMonthCounts.set(dayOfMonth, 
        (dayOfMonthCounts.get(dayOfMonth) || 0) + 1
      );
    });
    
    // Find preferred day of week
    const maxDayOfWeek = Math.max(...dayOfWeekCounts);
    if (maxDayOfWeek >= validPayments.length * 0.4) {
      const dayIndex = dayOfWeekCounts.indexOf(maxDayOfWeek);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      patterns.paymentDayOfWeek = days[dayIndex];
      patterns.hasRegularPayments = true;
    }
    
    // Find preferred day of month
    let maxDayOfMonthCount = 0;
    let preferredDayOfMonth = null;
    
    for (const [day, count] of dayOfMonthCounts.entries()) {
      if (count > maxDayOfMonthCount) {
        maxDayOfMonthCount = count;
        preferredDayOfMonth = day;
      }
    }
    
    if (maxDayOfMonthCount >= validPayments.length * 0.3) {
      patterns.paymentDayOfMonth = preferredDayOfMonth;
      patterns.hasRegularPayments = true;
    }
    
    // Payment timing (early/on-time/late tendency)
    const paymentMatches = this.matchPaymentsToSchedule(loan);
    const timingCounts = { early: 0, onTime: 0, late: 0 };
    
    paymentMatches.forEach(match => {
      if (match.status === 'matched') {
        if (match.daysLate < 0) timingCounts.early++;
        else if (match.daysLate === 0) timingCounts.onTime++;
        else timingCounts.late++;
      } else if (match.status === 'late_matched') {
        timingCounts.late++;
      }
    });
    
    const maxTiming = Math.max(...Object.values(timingCounts));
    patterns.paymentTiming = Object.keys(timingCounts).find(
      key => timingCounts[key] === maxTiming
    );
    
    return patterns;
  }

  /**
   * Detect payment anomalies
   * @param {Object} loan - Loan object
   * @returns {Array} Array of anomalies
   */
  detectAnomalies(loan) {
    const anomalies = [];
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    
    if (!loan.transactions) {
      return anomalies;
    }
    
    // Detect reversals
    const reversals = loan.transactions.filter(t => 
      t.typeName?.toLowerCase().includes('reversal') ||
      t.reference?.toLowerCase().includes('reversal')
    );
    
    if (reversals.length > 0) {
      anomalies.push({
        type: 'reversals',
        severity: 'high',
        count: reversals.length,
        details: `${reversals.length} payment reversal(s) detected`,
        transactions: reversals
      });
    }
    
    // Detect duplicate payments
    const paymentsByAmount = new Map();
    loan.transactions.forEach(trans => {
      if (trans.credit > 0) {
        const key = `${trans.credit}_${trans.date}`;
        if (!paymentsByAmount.has(key)) {
          paymentsByAmount.set(key, []);
        }
        paymentsByAmount.get(key).push(trans);
      }
    });
    
    for (const [key, transactions] of paymentsByAmount.entries()) {
      if (transactions.length > 1) {
        anomalies.push({
          type: 'duplicate_payment',
          severity: 'medium',
          count: transactions.length,
          details: `Potential duplicate payments on same day`,
          transactions: transactions
        });
      }
    }
    
    // Detect unusual payment amounts
    const validPayments = loan.transactions.filter(t => 
      t.credit > 0 && !this.isExcludedTransaction(t)
    );
    
    validPayments.forEach(payment => {
      const variance = Math.abs(payment.credit - installmentAmount) / installmentAmount;
      
      if (variance > 5) {
        anomalies.push({
          type: 'unusual_amount',
          severity: 'low',
          details: `Payment of ${payment.credit} is ${(variance * 100).toFixed(0)}% different from expected`,
          transaction: payment
        });
      }
    });
    
    // Detect payment gaps
    const velocity = this.analyzePaymentVelocity(loan);
    if (velocity.avgDaysBetweenPayments > 45) {
      anomalies.push({
        type: 'payment_gap',
        severity: 'high',
        details: `Long gap between payments: avg ${velocity.avgDaysBetweenPayments.toFixed(0)} days`
      });
    }
    
    return anomalies;
  }

  /**
   * Forecast future payments
   * @param {Object} loan - Loan object
   * @returns {Object} Payment forecast
   */
  forecastPayments(loan) {
    const forecast = {
      nextPaymentDue: null,
      expectedNextAmount: 0,
      likelihoodOfPayment: 0,
      projectedCompletionDate: null,
      projectedTotalCollection: 0,
      remainingPayments: 0,
      riskOfDefault: 'low'
    };
    
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    const totalLoanAmount = loan.loanAmount || 0;
    const collectionMetrics = this.calculateCollectionMetrics(loan);
    
    // Next payment due
    const futurePaydates = loan.paydates?.filter(p => 
      new Date(p.date) >= new Date()
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (futurePaydates && futurePaydates.length > 0) {
      forecast.nextPaymentDue = futurePaydates[0].date;
      forecast.expectedNextAmount = futurePaydates[0].amount || installmentAmount;
      forecast.remainingPayments = futurePaydates.length;
    }
    
    // Likelihood of payment (based on historical performance)
    if (collectionMetrics.onTimePaymentRate > 0) {
      forecast.likelihoodOfPayment = collectionMetrics.onTimePaymentRate;
    }
    
    // Adjust likelihood based on recent trends
    const velocity = this.analyzePaymentVelocity(loan);
    if (velocity.isDecelerating) {
      forecast.likelihoodOfPayment *= 0.8;
    } else if (velocity.isAccelerating) {
      forecast.likelihoodOfPayment *= 1.1;
    }
    
    // Risk of default
    if (loan.statusCalculation?.missedPayments >= 3) {
      forecast.riskOfDefault = 'critical';
    } else if (loan.statusCalculation?.missedPayments >= 2) {
      forecast.riskOfDefault = 'high';
    } else if (loan.statusCalculation?.missedPayments >= 1) {
      forecast.riskOfDefault = 'medium';
    } else if (collectionMetrics.collectionRate < 80) {
      forecast.riskOfDefault = 'medium';
    }
    
    // Projected completion
    if (collectionMetrics.collectionRate > 0 && forecast.remainingPayments > 0) {
      const avgPaymentAmount = collectionMetrics.collectedToDate / 
        (loan.statusCalculation?.paymentsMade || 1);
      const remainingAmount = totalLoanAmount - collectionMetrics.collectedToDate;
      const paymentsNeeded = Math.ceil(remainingAmount / avgPaymentAmount);
      
      // Calculate projected completion date
      if (velocity.avgDaysBetweenPayments > 0) {
        const daysToCompletion = paymentsNeeded * velocity.avgDaysBetweenPayments;
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysToCompletion);
        forecast.projectedCompletionDate = completionDate.toISOString().split('T')[0];
      }
      
      // Projected total collection
      forecast.projectedTotalCollection = collectionMetrics.collectedToDate + 
        (avgPaymentAmount * forecast.remainingPayments * (forecast.likelihoodOfPayment / 100));
    }
    
    return forecast;
  }

  /**
   * Check if transaction should be excluded from payment analysis
   * @private
   */
  isExcludedTransaction(transaction) {
    const typeName = (transaction.typeName || '').toLowerCase();
    const excludedTypes = [
      'fee', 'origination', 'initiation', 'merchant fee',
      'stamp tax', 'nsf', 'legal', 'penalty', 'reversal',
      'refund', 'chargeback', 'loan payout', 'capital',
      'cost of capital', 'write-off', 'discount'
    ];
    
    return excludedTypes.some(type => typeName.includes(type));
  }
}