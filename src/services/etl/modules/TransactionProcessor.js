// src/services/etl/modules/TransactionProcessor.js

/**
 * TransactionProcessor Module
 * Processes and categorizes loan transactions, handles reversals, identifies fees
 */

import { FEE_TRANSACTION_TYPES, RESTRUCTURE_TRANSACTION_TYPES } from '../utils/constants';

export class TransactionProcessor {
  constructor() {
    this.feeTypes = FEE_TRANSACTION_TYPES;
    this.restructureTypes = RESTRUCTURE_TRANSACTION_TYPES;
  }

  /**
   * Process all transactions for a loan
   * @param {Array} transactions - Raw transactions from loan
   * @param {Object} options - Processing options
   * @returns {Object} Processed transactions with metadata
   */
  processTransactions(transactions, options = {}) {
    if (!transactions || transactions.length === 0) {
      return {
        processed: [],
        summary: this.getEmptySummary()
      };
    }

    // Sort transactions chronologically first
    const sorted = this.sortTransactions(transactions);
    
    // Identify and mark reversed transactions
    const withReversals = this.identifyReversals(sorted);
    
    // Categorize each transaction
    const categorized = this.categorizeTransactions(withReversals);
    
    // Calculate summary statistics
    const summary = this.calculateTransactionSummary(categorized);
    
    return {
      processed: categorized,
      summary: summary,
      hasReversals: summary.reversalCount > 0,
      hasFees: summary.feeCount > 0,
      hasSettlements: summary.settlementCount > 0
    };
  }

  /**
   * Sort transactions by date and type
   * @private
   */
  sortTransactions(transactions) {
    return [...transactions].sort((a, b) => {
      // First sort by date
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, put reversals after original transactions
      const aIsReversal = this.isReversalType(a.typeName);
      const bIsReversal = this.isReversalType(b.typeName);
      
      if (aIsReversal && !bIsReversal) return 1;
      if (!aIsReversal && bIsReversal) return -1;
      
      return 0;
    });
  }

  /**
   * Identify and mark reversed transactions
   * @private
   */
  identifyReversals(transactions) {
    const processed = [...transactions];
    const reversedIndices = new Set();
    
    // First pass: identify all reversal transactions
    processed.forEach((trans, idx) => {
      if (this.isReversalTransaction(trans)) {
        trans.isReversal = true;
        trans.reversalType = this.getReversalType(trans);
        
        // Try to find the original transaction
        const originalIdx = this.findOriginalTransaction(processed, trans, idx);
        
        if (originalIdx !== -1) {
          // Mark the original as reversed
          processed[originalIdx].isReversed = true;
          processed[originalIdx].reversedBy = idx;
          reversedIndices.add(originalIdx);
          
          // Link reversal to original
          trans.reversalOf = originalIdx;
          trans.originalAmount = processed[originalIdx].credit;
        }
      }
    });
    
    // Second pass: mark any additional properties
    processed.forEach((trans, idx) => {
      // Calculate net amount after reversals
      if (trans.isReversed) {
        trans.netAmount = 0; // Reversed transactions net to zero
      } else if (trans.credit > 0) {
        trans.netAmount = trans.credit;
      } else if (trans.debit > 0) {
        trans.netAmount = -trans.debit;
      } else {
        trans.netAmount = 0;
      }
      
      // Add index for reference
      trans.processedIndex = idx;
    });
    
    return processed;
  }

  /**
   * Find the original transaction for a reversal
   * @private
   */
  findOriginalTransaction(transactions, reversal, reversalIdx) {
    // Look backwards from the reversal for a matching transaction
    for (let i = reversalIdx - 1; i >= 0; i--) {
      const candidate = transactions[i];
      
      // Skip if already marked as reversed
      if (candidate.isReversed) continue;
      
      // Check if amounts match (reversal debit should match original credit)
      if (reversal.debit === candidate.credit) {
        // Additional checks for confidence
        const daysBetween = this.getDaysBetween(candidate.date, reversal.date);
        
        // Reversals typically happen within 10 days
        if (daysBetween <= 10) {
          return i;
        }
        
        // If more than 10 days, check if it's the same amount and no other candidates
        if (daysBetween <= 30 && !this.hasOtherCandidates(transactions, reversal, i, reversalIdx)) {
          return i;
        }
      }
    }
    
    return -1;
  }

  /**
   * Check if there are other potential original transactions
   * @private
   */
  hasOtherCandidates(transactions, reversal, currentIdx, reversalIdx) {
    for (let i = currentIdx + 1; i < reversalIdx; i++) {
      if (transactions[i].credit === reversal.debit && !transactions[i].isReversed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Categorize transactions by type
   * @private
   */
  categorizeTransactions(transactions) {
    return transactions.map(trans => {
      const categorized = { ...trans };
      
      // Determine category
      if (trans.isReversal) {
        categorized.category = 'reversal';
      } else if (trans.isReversed) {
        categorized.category = 'reversed';
      } else if (this.isFeeTransaction(trans)) {
        categorized.category = 'fee';
        categorized.feeType = this.getFeeType(trans);
      } else if (this.isSettlementTransaction(trans)) {
        categorized.category = 'settlement';
        categorized.settlementType = this.getSettlementType(trans);
      } else if (trans.credit > 0) {
        categorized.category = 'payment';
        
        // Check if it's a catch-up payment (larger than normal)
        if (this.isCatchUpPayment(trans, transactions)) {
          categorized.isCatchUp = true;
          categorized.paymentsCleared = this.estimatePaymentsCleared(trans, transactions);
        }
      } else if (trans.debit > 0) {
        categorized.category = 'debit';
      } else {
        categorized.category = 'other';
      }
      
      // Add display properties
      categorized.displayType = this.getDisplayType(categorized);
      categorized.isValidPayment = this.isValidPayment(categorized);
      
      return categorized;
    });
  }

  /**
   * Check if transaction is a reversal type
   * @private
   */
  isReversalType(typeName) {
    if (!typeName) return false;
    
    const lower = typeName.toLowerCase();
    return lower.includes('reversal') || 
           lower.includes('nsf') ||
           lower.includes('return') ||
           lower.includes('chargeback') ||
           lower.includes('insufficient funds');
  }

  /**
   * Check if transaction is a reversal
   * @private
   */
  isReversalTransaction(transaction) {
    return this.isReversalType(transaction.typeName) ||
           (transaction.debit > 0 && this.isReversalType(transaction.typeName));
  }

  /**
   * Get reversal type for display
   * @private
   */
  getReversalType(transaction) {
    const typeName = (transaction.typeName || '').toLowerCase();
    
    if (typeName.includes('nsf') || typeName.includes('insufficient funds')) {
      return 'NSF';
    }
    if (typeName.includes('ach')) {
      return 'ACH Reversal';
    }
    if (typeName.includes('chargeback')) {
      return 'Chargeback';
    }
    if (typeName.includes('return')) {
      return 'Return';
    }
    
    return 'Reversal';
  }

  /**
   * Check if transaction is a fee
   * @private
   */
  isFeeTransaction(transaction) {
    if (!transaction.typeName) return false;
    
    const typeLower = transaction.typeName.toLowerCase();
    return this.feeTypes.some(feeType => 
      typeLower.includes(feeType.toLowerCase())
    );
  }

  /**
   * Get fee type for display
   * @private
   */
  getFeeType(transaction) {
    const typeLower = (transaction.typeName || '').toLowerCase();
    
    if (typeLower.includes('origination')) return 'Origination Fee';
    if (typeLower.includes('initiation')) return 'Initiation Fee';
    if (typeLower.includes('merchant fee')) return 'Merchant Fee';
    if (typeLower.includes('nsf fee')) return 'NSF Fee';
    if (typeLower.includes('legal')) return 'Legal Fee';
    if (typeLower.includes('stamp tax')) return 'Stamp Tax';
    if (typeLower.includes('restructure penalty')) return 'Restructure Penalty';
    
    return 'Fee';
  }

  /**
   * Check if transaction is a settlement/restructure
   * @private
   */
  isSettlementTransaction(transaction) {
    if (!transaction.typeName) return false;
    
    const typeLower = transaction.typeName.toLowerCase();
    return this.restructureTypes.some(type => 
      typeLower.includes(type.toLowerCase())
    );
  }

  /**
   * Get settlement type for display
   * @private
   */
  getSettlementType(transaction) {
    const typeLower = (transaction.typeName || '').toLowerCase();
    
    if (typeLower.includes('write-off')) return 'Write-off';
    if (typeLower.includes('discount')) return 'Settlement Discount';
    if (typeLower.includes('renewal')) return 'Settlement Renewal';
    
    return 'Settlement';
  }

  /**
   * Check if payment is a catch-up (multiple payments at once)
   * @private
   */
  isCatchUpPayment(transaction, allTransactions) {
    // Need to estimate typical payment amount
    const regularPayments = allTransactions.filter(t => 
      t.category === 'payment' && 
      !t.isReversed && 
      t.credit > 0 &&
      t.credit < transaction.credit // Less than current transaction
    );
    
    if (regularPayments.length < 3) return false;
    
    // Calculate median payment amount
    const amounts = regularPayments.map(p => p.credit).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    
    // If this payment is more than 1.5x the median, it's likely a catch-up
    return transaction.credit > median * 1.5;
  }

  /**
   * Estimate how many payments a catch-up payment clears
   * @private
   */
  estimatePaymentsCleared(transaction, allTransactions) {
    // Get typical payment amount
    const regularPayments = allTransactions.filter(t => 
      t.category === 'payment' && 
      !t.isReversed && 
      t.credit > 0 &&
      t.credit < transaction.credit
    );
    
    if (regularPayments.length === 0) return 1;
    
    const amounts = regularPayments.map(p => p.credit).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    
    return Math.round(transaction.credit / median);
  }

  /**
   * Check if transaction counts as a valid payment
   * @private
   */
  isValidPayment(transaction) {
    return transaction.category === 'payment' &&
           !transaction.isReversed &&
           transaction.credit > 0;
  }

  /**
   * Get display type for UI
   * @private
   */
  getDisplayType(transaction) {
    if (transaction.isReversal) {
      return `⊗ ${transaction.reversalType}`;
    }
    if (transaction.isReversed) {
      return '✗ Reversed Payment';
    }
    if (transaction.category === 'fee') {
      return `○ ${transaction.feeType}`;
    }
    if (transaction.category === 'settlement') {
      return `⚠ ${transaction.settlementType}`;
    }
    if (transaction.isCatchUp) {
      return `✓✓ Catch-up Payment (${transaction.paymentsCleared}x)`;
    }
    if (transaction.category === 'payment') {
      return '✓ Payment';
    }
    
    return '• ' + (transaction.typeName || 'Transaction');
  }

  /**
   * Calculate summary statistics
   * @private
   */
  calculateTransactionSummary(transactions) {
    const summary = this.getEmptySummary();
    
    transactions.forEach(trans => {
      // Count by category
      summary.totalCount++;
      
      if (trans.category === 'payment' && trans.isValidPayment) {
        summary.paymentCount++;
        summary.totalPayments += trans.credit;
        
        if (trans.isCatchUp) {
          summary.catchUpCount++;
          summary.catchUpAmount += trans.credit;
        }
      } else if (trans.category === 'reversal') {
        summary.reversalCount++;
        summary.totalReversals += trans.debit;
      } else if (trans.category === 'fee') {
        summary.feeCount++;
        summary.totalFees += trans.credit || trans.debit;
      } else if (trans.category === 'settlement') {
        summary.settlementCount++;
        summary.settlementAmount += trans.credit || trans.debit;
      }
      
      // Track reversed payments separately
      if (trans.isReversed) {
        summary.reversedPaymentCount++;
        summary.reversedAmount += trans.credit;
      }
    });
    
    // Calculate net amounts
    summary.netPayments = summary.totalPayments - summary.reversedAmount;
    summary.effectivePaymentCount = summary.paymentCount - summary.reversedPaymentCount;
    
    // Calculate success rate
    if (summary.paymentCount > 0) {
      summary.paymentSuccessRate = 
        ((summary.paymentCount - summary.reversedPaymentCount) / summary.paymentCount) * 100;
    }
    
    return summary;
  }

  /**
   * Get empty summary object
   * @private
   */
  getEmptySummary() {
    return {
      totalCount: 0,
      paymentCount: 0,
      reversalCount: 0,
      feeCount: 0,
      settlementCount: 0,
      catchUpCount: 0,
      reversedPaymentCount: 0,
      totalPayments: 0,
      totalReversals: 0,
      totalFees: 0,
      settlementAmount: 0,
      catchUpAmount: 0,
      reversedAmount: 0,
      netPayments: 0,
      effectivePaymentCount: 0,
      paymentSuccessRate: 100
    };
  }

  /**
   * Calculate days between two dates
   * @private
   */
  getDaysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get transaction history for a specific period
   * @param {Array} transactions - All transactions
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Array} Filtered transactions
   */
  getTransactionsInPeriod(transactions, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return transactions.filter(trans => {
      const transDate = new Date(trans.date);
      return transDate >= start && transDate <= end;
    });
  }

  /**
   * Analyze payment patterns
   * @param {Array} transactions - Processed transactions
   * @returns {Object} Payment pattern analysis
   */
  analyzePaymentPatterns(transactions) {
    const payments = transactions.filter(t => t.isValidPayment);
    
    if (payments.length < 2) {
      return {
        hasRegularPattern: false,
        averageDaysBetween: 0,
        paymentFrequency: 'Unknown',
        consistency: 0
      };
    }
    
    // Calculate days between payments
    const gaps = [];
    for (let i = 1; i < payments.length; i++) {
      gaps.push(this.getDaysBetween(payments[i-1].date, payments[i].date));
    }
    
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    
    // Determine payment frequency
    let frequency = 'Irregular';
    if (avgGap <= 3) frequency = 'Daily';
    else if (avgGap <= 8) frequency = 'Weekly';
    else if (avgGap <= 16) frequency = 'Bi-weekly';
    else if (avgGap <= 35) frequency = 'Monthly';
    
    // Calculate consistency (how regular the payments are)
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev / avgGap * 100));
    
    return {
      hasRegularPattern: consistency > 70,
      averageDaysBetween: Math.round(avgGap),
      paymentFrequency: frequency,
      consistency: Math.round(consistency),
      totalPayments: payments.length,
      gaps: gaps
    };
  }

  /**
   * Detect potential fraud patterns
   * @param {Array} transactions - Processed transactions
   * @returns {Object} Fraud risk indicators
   */
  detectFraudIndicators(transactions) {
    const indicators = {
      hasRapidReversals: false,
      unusualPatterns: false,
      riskLevel: 'Low',
      flags: []
    };
    
    // Check for rapid reversals (multiple reversals in short time)
    const reversals = transactions.filter(t => t.isReversal);
    if (reversals.length >= 3) {
      const reversalDates = reversals.map(r => new Date(r.date)).sort((a, b) => a - b);
      
      for (let i = 2; i < reversalDates.length; i++) {
        const daySpan = this.getDaysBetween(reversalDates[i-2], reversalDates[i]);
        if (daySpan <= 7) {
          indicators.hasRapidReversals = true;
          indicators.flags.push(`${3} reversals within ${daySpan} days`);
          break;
        }
      }
    }
    
    // Check reversal rate
    const reversalRate = transactions.length > 0 
      ? (reversals.length / transactions.filter(t => t.category === 'payment').length) * 100
      : 0;
      
    if (reversalRate > 30) {
      indicators.unusualPatterns = true;
      indicators.flags.push(`High reversal rate: ${reversalRate.toFixed(1)}%`);
    }
    
    // Determine risk level
    if (indicators.hasRapidReversals || reversalRate > 50) {
      indicators.riskLevel = 'High';
    } else if (reversalRate > 30 || reversals.length > 5) {
      indicators.riskLevel = 'Medium';
    }
    
    indicators.reversalCount = reversals.length;
    indicators.reversalRate = reversalRate;
    
    return indicators;
  }

  /**
   * Export transactions for reporting
   * @param {Array} transactions - Processed transactions
   * @param {string} format - Export format ('summary' or 'detailed')
   * @returns {Array} Formatted transactions
   */
  exportForReporting(transactions, format = 'summary') {
    if (format === 'detailed') {
      return transactions.map(trans => ({
        date: trans.date,
        type: trans.displayType,
        category: trans.category,
        reference: trans.reference,
        debit: trans.debit || 0,
        credit: trans.credit || 0,
        netAmount: trans.netAmount || 0,
        isReversed: trans.isReversed || false,
        isValidPayment: trans.isValidPayment || false
      }));
    }
    
    // Summary format
    const summary = this.calculateTransactionSummary(transactions);
    return {
      totalTransactions: summary.totalCount,
      validPayments: summary.effectivePaymentCount,
      totalCollected: summary.netPayments,
      reversals: summary.reversalCount,
      fees: summary.totalFees,
      successRate: summary.paymentSuccessRate.toFixed(1) + '%'
    };
  }
}

// Export singleton instance and class
export const transactionProcessor = new TransactionProcessor();