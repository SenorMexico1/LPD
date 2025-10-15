// src/services/etl/modules/DataTransformer.js

/**
 * DataTransformer Module
 * Transforms raw Excel data into structured loan objects
 */

import { COLUMN_MAP, DEFAULTS } from '../utils/constants';
import { parseNumber, parseField, parseBoolean } from '../utils/helpers';
import { parseDate } from '../utils/dateHelpers';

export class DataTransformer {
  constructor() {
    this.columnMap = COLUMN_MAP;
    this.defaults = DEFAULTS;
  }

  /**
   * Transform raw Excel data into loan objects
   * @param {Array} rawData - Raw data from ExcelParser
   * @returns {Array} Array of loan objects
   */
  transformToLoans(rawData) {
    const loans = [];
    let currentLoan = null;
    
    // Skip header row (index 0)
    for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
      const row = rawData[rowIndex];
      
      // Skip completely empty rows
      if (this.isEmptyRow(row)) {
        continue;
      }
      
      // Check if this is a new loan (both columns A and B filled)
      if (this.isNewLoan(row)) {
        // Save previous loan if exists
        if (currentLoan) {
          loans.push(this.finalizeLoan(currentLoan));
        }
        
        // Start new loan
        currentLoan = this.createLoanObject(row, rowIndex + 1);
      } else if (currentLoan) {
        // This is a continuation row for the current loan
        this.appendToLoan(currentLoan, row, rowIndex + 1);
      }
    }
    
    // Don't forget the last loan
    if (currentLoan) {
      loans.push(this.finalizeLoan(currentLoan));
    }
    
    return loans;
  }

  /**
   * Check if row represents a new loan
   * @private
   */
  isNewLoan(row) {
    return row[this.columnMap.EXTERNAL_ID] !== null && 
           row[this.columnMap.EXTERNAL_ID] !== '' && 
           row[this.columnMap.EXTERNAL_ID] !== undefined &&
           row[this.columnMap.LOAN_NUMBER] !== null && 
           row[this.columnMap.LOAN_NUMBER] !== '' && 
           row[this.columnMap.LOAN_NUMBER] !== undefined;
  }

  /**
   * Check if row is completely empty
   * @private
   */
  isEmptyRow(row) {
    if (!row) return true;
    return row.every(cell => cell === null || cell === '' || cell === undefined);
  }

  /**
   * Create a new loan object from a row
   * @private
   */
  createLoanObject(row, excelRowNumber) {
    const loan = {
      // Metadata
      rowNumber: excelRowNumber,
      externalId: String(row[this.columnMap.EXTERNAL_ID]),
      loanNumber: String(row[this.columnMap.LOAN_NUMBER]),
      
      // Loan basics
      active: parseBoolean(row[this.columnMap.ACTIVE_DEBIT_ORDER]),
      loanAmount: parseNumber(row[this.columnMap.LOAN_AMOUNT]) || 0,
      contractBalance: parseNumber(row[this.columnMap.CONTRACT_BALANCE]) || 0,
      remainingAmount: parseNumber(row[this.columnMap.REMAINING_AMOUNT]) || 0,
      
      // Status info
      state: row[this.columnMap.STATE] || 'Unknown',
      progress: parseNumber(row[this.columnMap.PROGRESS]) || 0,
      daysOverdue: parseInt(row[this.columnMap.DAYS_OVERDUE]) || 0,
      daysOverdueMPF: parseInt(row[this.columnMap.DAYS_OVERDUE_MPF]) || 0,
      
      // Payment info
      installmentAmount: parseNumber(row[this.columnMap.INSTALLMENT_AMOUNT]) || this.defaults.INSTALLMENT_AMOUNT,
      lastInstallmentAmount: parseNumber(row[this.columnMap.LAST_INSTALLMENT_AMOUNT]) || 0,
      paymentFrequency: row[this.columnMap.PAYMENT_FREQUENCY] || 'Weekly',
      
      // Dates
      payoutDate: parseDate(row[this.columnMap.PAYOUT_DATE]),
      firstPaymentDate: parseDate(row[this.columnMap.FIRST_PAYMENT_DATE]),
      endDate: parseDate(row[this.columnMap.END_DATE]),
      compoundDate: parseDate(row[this.columnMap.COMPOUND_DATE]),
      
      // Fees and interest
      contractInterest: parseNumber(row[this.columnMap.CONTRACT_INTEREST]) || 0,
      originationFee: parseNumber(row[this.columnMap.ORIGINATION_FEE]) || 0,
      
      // Client information
      client: this.extractClientInfo(row),
      
      // Lead information
      lead: this.extractLeadInfo(row),
      
      // Flags
      isRestructured: parseBoolean(row[this.columnMap.LOAN_RESTRUCTURED]),
      
      // Write-off info
      daysOverdueOnWriteOff: parseInt(row[this.columnMap.DAYS_OVERDUE_ON_WRITEOFF]) || 0,
      amountOverdueOnWriteOff: parseNumber(row[this.columnMap.AMOUNT_OVERDUE_ON_WRITEOFF]) || 0,
      amountOverdue: parseNumber(row[this.columnMap.AMOUNT_OVERDUE]) || 0,
      
      // Collections - will be populated from continuation rows
      paydates: [],
      transactions: []
    };
    
    // Add initial paydate if present
    if (row[this.columnMap.PAYDATE_DATE]) {
      loan.paydates.push(this.createPaydate(row, excelRowNumber));
    }
    
    // Add initial transaction if present
    if (row[this.columnMap.TRANS_DATE]) {
      loan.transactions.push(this.createTransaction(row, excelRowNumber));
    }
    
    return loan;
  }

  /**
   * Extract client information from row
   * @private
   */
  extractClientInfo(row) {
    return {
      id: row[this.columnMap.CLIENT_ID],
      name: parseField(row[this.columnMap.CLIENT_DISPLAY_NAME], this.defaults.CLIENT_NAME),
      displayName: parseField(row[this.columnMap.CLIENT_DISPLAY_NAME], this.defaults.CLIENT_NAME),
      
      // Industry
      industrySector: parseField(row[this.columnMap.CLIENT_INDUSTRY_SECTOR], this.defaults.INDUSTRY_SECTOR),
      industrySubsector: parseField(row[this.columnMap.CLIENT_INDUSTRY_SUBSECTOR], 'General'),
      
      // Foundation
      dateFounded: parseDate(row[this.columnMap.CLIENT_DATE_FOUNDED]),
      
      // Address
      addressLine1: parseField(row[this.columnMap.CLIENT_ADDRESS_LINE_1], ''),
      addressLine2: parseField(row[this.columnMap.CLIENT_ADDRESS_LINE_2], ''),
      addressLine3: parseField(row[this.columnMap.CLIENT_ADDRESS_LINE_3], ''),
      city: parseField(row[this.columnMap.CLIENT_CITY], 'Unknown'),
      state: parseField(row[this.columnMap.CLIENT_STATE], row[this.columnMap.STATE] || this.defaults.STATE),
      country: parseField(row[this.columnMap.CLIENT_COUNTRY], this.defaults.COUNTRY),
      zipCode: parseField(row[this.columnMap.CLIENT_ZIP_CODE], ''),
      
      // Contact
      email: parseField(row[this.columnMap.CLIENT_EMAIL], ''),
      primaryNo: parseField(row[this.columnMap.CLIENT_PRIMARY_NO], '')
    };
  }

  /**
   * Extract lead information from row
   * @private
   */
  extractLeadInfo(row) {
    return {
      id: row[this.columnMap.LEAD_ID],
      fico: parseInt(row[this.columnMap.LEAD_FICO]) || this.defaults.FICO_SCORE,
      
      // Revenue metrics
      avgMonthlyRevenue: parseNumber(row[this.columnMap.LEAD_AVG_MONTHLY_REVENUE]) || 0,
      avgRevenue: parseNumber(row[this.columnMap.LEAD_AVG_REVENUE]) || 0,
      avgMCADebits: parseNumber(row[this.columnMap.LEAD_AVG_MCA_DEBITS]) || 0,
      avgMCADebts: parseNumber(row[this.columnMap.LEAD_AVG_MCA_DEBITS]) || 0, // Alias
      avgMcaDebits: parseNumber(row[this.columnMap.LEAD_AVG_MCA_DEBITS]) || 0, // Another alias
      
      // Banking metrics
      avgDailyBalance: parseNumber(row[this.columnMap.LEAD_AVG_DAILY_BALANCE]) || 0,
      avgNSFs: parseNumber(row[this.columnMap.LEAD_AVG_NSFS]) || 0,
      avgNegativeDays: parseNumber(row[this.columnMap.LEAD_AVG_NEGATIVE_DAYS]) || 0,
      
      // Deposit/Credit metrics
      avgNumDeposits: parseNumber(row[this.columnMap.LEAD_AVG_NUM_DEPOSITS]) || 0,
      avgNumCredits: parseNumber(row[this.columnMap.LEAD_AVG_NUM_CREDITS]) || 0,
      avgDeposits: parseNumber(row[this.columnMap.LEAD_AVG_DEPOSITS]) || 0,
      avgCredits: parseNumber(row[this.columnMap.LEAD_AVG_CREDITS]) || 0,
      
      // Dates
      createdOn: parseDate(row[this.columnMap.LEAD_CREATED_ON]),
      closedDate: parseDate(row[this.columnMap.LEAD_CLOSED_DATE]),
      
      // Rates
      sellRate: parseNumber(row[this.columnMap.LEAD_SELL_RATE]) || 0,
      
      // Team
      underwriter: parseField(row[this.columnMap.LEAD_UNDERWRITER], null),
      salesperson: parseField(row[this.columnMap.LEAD_SALESPERSON], null),
      podleader: parseField(row[this.columnMap.LEAD_POD_LEADER], null),
      podLeader: parseField(row[this.columnMap.LEAD_POD_LEADER], null) // Alias
    };
  }

  /**
   * Create a paydate object from row
   * @private
   */
  createPaydate(row, excelRowNumber) {
    return {
      date: parseDate(row[this.columnMap.PAYDATE_DATE]),
      amount: parseNumber(row[this.columnMap.PAYDATE_AMOUNT]) || 0,
      rowNumber: excelRowNumber
    };
  }

  /**
   * Create a transaction object from row
   * @private
   */
  createTransaction(row, excelRowNumber) {
    return {
      date: parseDate(row[this.columnMap.TRANS_DATE]),
      reference: row[this.columnMap.TRANS_REFERENCE] || '',
      typeId: row[this.columnMap.TRANS_TYPE_ID],
      typeName: row[this.columnMap.TRANS_TYPE_NAME] || '',
      debit: parseNumber(row[this.columnMap.TRANS_DEBIT]) || 0,
      credit: parseNumber(row[this.columnMap.TRANS_CREDIT]) || 0,
      balance: parseNumber(row[this.columnMap.TRANS_BALANCE]) || 0,
      rowNumber: excelRowNumber
    };
  }

  /**
   * Append continuation row data to existing loan
   * @private
   */
  appendToLoan(loan, row, excelRowNumber) {
    // Add paydate if present
    if (row[this.columnMap.PAYDATE_DATE]) {
      loan.paydates.push(this.createPaydate(row, excelRowNumber));
    }
    
    // Add transaction if present
    if (row[this.columnMap.TRANS_DATE]) {
      loan.transactions.push(this.createTransaction(row, excelRowNumber));
    }
  }

  /**
   * Finalize loan object before adding to results
   * @private
   */
  finalizeLoan(loan) {
    // Sort paydates chronologically
    loan.paydates.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
    
    // Sort transactions chronologically
    loan.transactions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
    
    // Calculate derived fields
    loan.totalPaydates = loan.paydates.length;
    loan.totalTransactions = loan.transactions.length;
    
    // Determine contract date (earliest of payout or first payment date)
    loan.contractDate = loan.payoutDate || loan.firstPaymentDate || null;
    
    // Set loan term if not present
    if (!loan.loanTerm && loan.firstPaymentDate && loan.endDate) {
      const start = new Date(loan.firstPaymentDate);
      const end = new Date(loan.endDate);
      const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
      loan.loanTerm = months;
    }
    
    return loan;
  }

  /**
   * Get statistics about the transformation
   * @param {Array} loans - Transformed loans
   * @returns {Object} Transformation statistics
   */
  getTransformationStats(loans) {
    return {
      totalLoans: loans.length,
      loansWithTransactions: loans.filter(l => l.transactions.length > 0).length,
      loansWithPaydates: loans.filter(l => l.paydates.length > 0).length,
      restructuredLoans: loans.filter(l => l.isRestructured).length,
      activeLoans: loans.filter(l => l.active).length,
      averageTransactionsPerLoan: loans.reduce((sum, l) => sum + l.transactions.length, 0) / loans.length,
      averagePaydatesPerLoan: loans.reduce((sum, l) => sum + l.paydates.length, 0) / loans.length
    };
  }
}

// Export singleton instance and class
export const dataTransformer = new DataTransformer();