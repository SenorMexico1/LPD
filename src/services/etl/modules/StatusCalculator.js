// src/services/etl/modules/StatusCalculator.js

/**
 * StatusCalculator Module
 * Determines loan status, delinquency levels, and restructure status
 */

import { LOAN_STATUSES, FEE_TRANSACTION_TYPES, RESTRUCTURE_TRANSACTION_TYPES } from '../utils/constants';
import { DateUtility } from './DateUtility';

export class StatusCalculator {
  constructor() {
    this.dateUtil = new DateUtility();
  }

  /**
   * Main calculation method - returns complete status analysis
   * @param {Object} loan - Loan object with transactions and payment schedule
   * @returns {Object} Complete status calculation with details
   */
  calculate(loan) {
    // Get today's date at midnight for consistent comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    
    const calculation = {
      today: todayString,
      expectedPayments: [],
      actualPayments: [],
      allTransactions: [],
      totalExpected: 0,
      totalReceived: 0,
      paymentsMade: 0,
      missedPayments: 0,
      isRestructured: loan.isRestructured || false,
      status: LOAN_STATUSES.CURRENT,
      explanation: ''
    };
    
    // Check for restructure flag or restructure transactions
    if (loan.isRestructured) {
      calculation.isRestructured = true;
    } else {
      // Check transactions for restructure indicators
      const hasRestructureTransaction = loan.transactions?.some(trans => 
        this.isRestructureTransaction(trans)
      );
      if (hasRestructureTransaction) {
        calculation.isRestructured = true;
      }
    }
    
    // Find expected payments (excluding today and future)
    calculation.expectedPayments = this.getExpectedPayments(loan, todayString);
    calculation.totalExpected = calculation.expectedPayments.length;
    
    // Find actual payments (excluding fees and reversals)
    calculation.actualPayments = this.getActualPayments(loan);
    
    // Calculate total received and payments made
    calculation.totalReceived = calculation.actualPayments.reduce(
      (sum, payment) => sum + payment.amount, 0
    );
    
    // Count payments by installment amounts
    calculation.paymentsMade = this.countPaymentsByInstallments(
      calculation.actualPayments, 
      loan.installmentAmount || loan.instalmentAmount || 0
    );
    
    // Calculate missed payments
    calculation.missedPayments = Math.max(0, 
      calculation.totalExpected - calculation.paymentsMade
    );
    
    // Determine final status
    calculation.status = this.determineStatus(calculation);
    calculation.explanation = this.getStatusExplanation(calculation);
    
    // Categorize all transactions for detailed analysis
    calculation.allTransactions = this.categorizeTransactions(loan.transactions);
    
    return calculation;
  }

  /**
   * Get expected payments up to but not including today
   * @private
   */
  getExpectedPayments(loan, todayString) {
    if (!loan.paydates || !Array.isArray(loan.paydates)) {
      return [];
    }
    
    return loan.paydates.filter(paydate => {
      if (!paydate || !paydate.date) return false;
      const paydateString = paydate.date.split('T')[0];
      return paydateString < todayString;
    }).map(paydate => ({
      date: paydate.date,
      amount: paydate.amount || loan.installmentAmount || loan.instalmentAmount || 0,
      rowNumber: paydate.rowNumber
    }));
  }

  /**
   * Get actual payments (credits excluding fees and reversals)
   * @private
   */
  getActualPayments(loan) {
    if (!loan.transactions || !Array.isArray(loan.transactions)) {
      return [];
    }
    
    return loan.transactions
      .filter(trans => this.isValidPayment(trans))
      .map(trans => ({
        date: trans.date,
        amount: trans.credit || 0,
        type: trans.typeName || 'Unknown',
        reference: trans.reference,
        rowNumber: trans.rowNumber
      }));
  }

  /**
   * Check if a transaction is a valid payment
   * @private
   */
  isValidPayment(transaction) {
    // Must have credit amount
    if (!transaction.credit || transaction.credit <= 0) {
      return false;
    }
    
    // Check if it's a fee transaction
    if (this.isFeeTransaction(transaction)) {
      return false;
    }
    
    // Check if it's a reversal
    if (this.isReversal(transaction)) {
      return false;
    }
    
    // Check if it's a capital/loan payout
    if (this.isCapitalTransaction(transaction)) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if transaction is a fee
   * @private
   */
  isFeeTransaction(transaction) {
    const typeName = (transaction.typeName || '').toLowerCase();
    return FEE_TRANSACTION_TYPES.some(feeType => 
      typeName.includes(feeType.toLowerCase())
    );
  }

  /**
   * Check if transaction is a reversal
   * @private
   */
  isReversal(transaction) {
    const typeName = (transaction.typeName || '').toLowerCase();
    const reference = (transaction.reference || '').toLowerCase();
    
    return typeName.includes('reversal') || 
           typeName.includes('refund') ||
           typeName.includes('chargeback') ||
           reference.includes('reversal') ||
           reference.includes('refund');
  }

  /**
   * Check if transaction is capital/loan payout
   * @private
   */
  isCapitalTransaction(transaction) {
    const typeName = (transaction.typeName || '').toLowerCase();
    return typeName.includes('loan payout') || 
           typeName.includes('capital') ||
           typeName.includes('cost of capital');
  }

  /**
   * Check if transaction indicates restructure
   * @private
   */
  isRestructureTransaction(transaction) {
    const typeName = (transaction.typeName || '').toLowerCase();
    return RESTRUCTURE_TRANSACTION_TYPES.some(restructureType => 
      typeName.includes(restructureType.toLowerCase())
    );
  }

  /**
   * Count payments made based on installment amounts
   * @private
   */
  countPaymentsByInstallments(actualPayments, installmentAmount) {
    if (!installmentAmount || installmentAmount <= 0) {
      // If no installment amount, count individual payments
      return actualPayments.length;
    }
    
    // Calculate total payments based on installment coverage
    let totalPayments = 0;
    let accumulatedAmount = 0;
    
    for (const payment of actualPayments) {
      accumulatedAmount += payment.amount;
      
      // Check if this is a catch-up payment (multiple installments)
      if (payment.amount >= installmentAmount * 1.5) {
        totalPayments += Math.floor(payment.amount / installmentAmount);
      } else {
        // Regular payment counting
        while (accumulatedAmount >= installmentAmount * 0.9) { // 90% threshold
          totalPayments++;
          accumulatedAmount -= installmentAmount;
        }
      }
    }
    
    return totalPayments;
  }

  /**
   * Determine loan status based on calculation
   * @private
   */
  determineStatus(calculation) {
    // Restructured takes priority
    if (calculation.isRestructured) {
      return LOAN_STATUSES.RESTRUCTURED;
    }
    
    // Based on missed payments
    if (calculation.missedPayments === 0) {
      return LOAN_STATUSES.CURRENT;
    } else if (calculation.missedPayments === 1) {
      return LOAN_STATUSES.DELINQUENT_1;
    } else if (calculation.missedPayments === 2) {
      return LOAN_STATUSES.DELINQUENT_2;
    } else if (calculation.missedPayments === 3) {
      return LOAN_STATUSES.DELINQUENT_3;
    } else {
      return LOAN_STATUSES.DEFAULT;
    }
  }

  /**
   * Get human-readable explanation for status
   * @private
   */
  getStatusExplanation(calculation) {
    if (calculation.isRestructured) {
      return 'Loan has been restructured';
    }
    
    if (calculation.missedPayments === 0) {
      return 'All payments up to date';
    } else if (calculation.missedPayments === 1) {
      return '1 payment missed';
    } else if (calculation.missedPayments === 2) {
      return '2 payments missed';
    } else if (calculation.missedPayments === 3) {
      return '3 payments missed';
    } else {
      return `${calculation.missedPayments} payments missed (4+ = default)`;
    }
  }

  /**
   * Categorize all transactions for detailed analysis
   * @private
   */
  categorizeTransactions(transactions) {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    
    return transactions.map(trans => {
      const transactionInfo = {
        date: trans.date,
        amount: trans.credit || -trans.debit,
        type: trans.typeName || 'Unknown',
        reference: trans.reference,
        category: 'other',
        isValid: false
      };
      
      // Categorize the transaction
      if (trans.credit > 0) {
        if (this.isFeeTransaction(trans)) {
          transactionInfo.category = 'fee';
        } else if (this.isReversal(trans)) {
          transactionInfo.category = 'reversal';
        } else if (this.isRestructureTransaction(trans)) {
          transactionInfo.category = 'restructure';
        } else if (this.isCapitalTransaction(trans)) {
          transactionInfo.category = 'capital';
        } else {
          transactionInfo.category = 'payment';
          transactionInfo.isValid = true;
        }
      } else if (trans.debit > 0) {
        transactionInfo.category = 'debit';
      }
      
      return transactionInfo;
    });
  }

  /**
   * Calculate delinquency in days
   * @param {Object} loan - Loan object
   * @returns {number} Days delinquent
   */
  calculateDaysDelinquent(loan) {
    const statusCalc = this.calculate(loan);
    
    if (statusCalc.missedPayments === 0) {
      return 0;
    }
    
    // Find the oldest missed payment
    const today = new Date();
    const missedPayments = statusCalc.expectedPayments.slice(
      -statusCalc.missedPayments
    );
    
    if (missedPayments.length > 0) {
      const oldestMissed = new Date(missedPayments[0].date);
      const daysDiff = Math.floor((today - oldestMissed) / (1000 * 60 * 60 * 24));
      return Math.max(0, daysDiff);
    }
    
    return 0;
  }

  /**
   * Detect catch-up payments
   * @param {Object} loan - Loan object
   * @returns {Array} Array of catch-up payment details
   */
  detectCatchUpPayments(loan) {
    const catchUps = [];
    const installmentAmount = loan.installmentAmount || loan.instalmentAmount || 0;
    
    if (!installmentAmount || !loan.transactions) {
      return catchUps;
    }
    
    loan.transactions.forEach((trans) => {
      if (this.isValidPayment(trans) && trans.credit >= installmentAmount * 1.5) {
        const paymentsCleared = Math.floor(trans.credit / installmentAmount);
        catchUps.push({
          date: trans.date,
          amount: trans.credit,
          paymentsCleared: paymentsCleared,
          rowNumber: trans.rowNumber,
          type: trans.typeName
        });
      }
    });
    
    return catchUps;
  }
}