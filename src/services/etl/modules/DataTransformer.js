// src/services/etl/modules/DataTransformer.js

/**
 * DataTransformer Module
 * Transforms raw Excel data into structured loan objects
 * COMPLETE VERSION - Matching original working ETLService.js
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
        
        // Start new loan with COMPLETE structure matching original
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
    // Check columns A (0) and B (1) - External ID and Loan Number
    return row[0] !== null && 
           row[0] !== '' && 
           row[0] !== undefined &&
           row[1] !== null && 
           row[1] !== '' && 
           row[1] !== undefined;
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
   * Create a new loan object from a row - COMPLETE VERSION
   * Matching the original ETLService.js structure exactly
   * @private
   */
  createLoanObject(row, excelRowNumber) {
    // Create loan object with COMPLETE structure from original
    const loan = {
      // Metadata
      rowNumber: excelRowNumber,
      externalId: String(row[0]),           // Column A
      loanNumber: String(row[1]),           // Column B
      
      // Active status
      active: row[2] === true || row[2] === 'TRUE' || row[2] === 1 || row[2] === 'Yes',
      
      // Client ID
      clientId: row[4],                     // Column E
      
      // Financial amounts
      contractBalance: this.parseNumberSafe(row[5]) || 0,  // Column F
      loanAmount: this.parseNumberSafe(row[8]) || 0,       // Column I
      amountSold: this.parseNumberSafe(row[3]) || 0,       // Column D
      remainingAmount: this.parseNumberSafe(row[12]) || 0, // Column M
      amountOverdue: this.parseNumberSafe(row[63]) || 0,   // Column BL
      amountOverdueOnWriteOff: this.parseNumberSafe(row[62]) || 0, // Column BK
      
      // Days metrics
      daysOverdue: parseInt(row[7]) || 0,   // Column H
      daysOverdueMPF: parseInt(row[6]) || 0, // Column G
      daysOverdueOnWriteOff: parseInt(row[61]) || 0, // Column BJ
      
      // Loan terms
      loanTerm: parseInt(row[9]) || 0,      // Column J
      progress: this.parseNumberSafe(row[11]) || 0, // Column L
      state: row[13] || 'Unknown',          // Column N
      
      // Payment information
      paymentFrequency: row[23] || 'Weekly', // Column X
      installmentAmount: this.parseNumberSafe(row[24]) || 1000, // Column Y - default 1000
      lastInstallmentAmount: this.parseNumberSafe(row[25]) || 0, // Column Z
      
      // Dates
      payoutDate: this.parseDateSafe(row[10]),      // Column K
      firstPaymentDate: this.parseDateSafe(row[55]), // Column BD
      endDate: this.parseDateSafe(row[58]),         // Column BG
      compoundDate: this.parseDateSafe(row[60]),    // Column BI
      
      // Fees and interest
      contractInterest: this.parseNumberSafe(row[53]) || 0, // Column BB
      originationFee: this.parseNumberSafe(row[54]) || 0,   // Column BC
      
      // Restructure flag
      isRestructured: row[72] === true || row[72] === 'TRUE' || row[72] === 1 || row[72] === 'Yes', // Column BU
      
      // Client information - COMPLETE structure
      client: {
        name: this.parseFieldSafe(row[26], row[4] || 'Unknown'),  // Column AA
        displayName: this.parseFieldSafe(row[26], row[4] || 'Unknown'),
        industrySector: this.parseFieldSafe(row[27], 'Unknown'),  // Column AB
        industrySubsector: this.parseFieldSafe(row[28], 'General'), // Column AC
        dateFounded: this.parseDateSafe(row[29]),  // Column AD
        addressLine1: row[30] || '',           // Column AE
        addressLine2: row[31] || '',           // Column AF
        addressLine3: row[32] || '',           // Column AG
        city: row[33] || 'Unknown',            // Column AH
        state: row[34] || row[13] || 'Unknown', // Column AI or N
        country: row[35] || 'United States',   // Column AJ
        zipCode: row[36] || '',                // Column AK
        email: row[37] || '',                  // Column AL
        primaryNo: row[38] || ''               // Column AM
      },
      
      // Lead information - COMPLETE structure
      lead: {
        id: row[39],                           // Column AN
        fico: parseInt(row[40]) || 650,        // Column AO
        avgMonthlyRevenue: this.parseNumberSafe(row[41]) || 0, // Column AP
        avgMCADebits: this.parseNumberSafe(row[42]) || 0,      // Column AQ
        avgMCADebts: this.parseNumberSafe(row[42]) || 0,       // Alias for compatibility
        avgRevenue: this.parseNumberSafe(row[71]) || 0,        // Column BT
        avgDailyBalance: this.parseNumberSafe(row[68]) || 0,   // Column BQ
        avgNSFs: this.parseNumberSafe(row[69]) || 0,           // Column BR
        avgNegativeDays: this.parseNumberSafe(row[70]) || 0,   // Column BS
        avgNumDeposits: this.parseNumberSafe(row[64]) || 0,    // Column BM
        avgNumCredits: this.parseNumberSafe(row[65]) || 0,     // Column BN
        avgDeposits: this.parseNumberSafe(row[66]) || 0,       // Column BO
        avgCredits: this.parseNumberSafe(row[67]) || 0,        // Column BP
        underwriter: row[73] || null,          // Column BV
        salesperson: row[74] || null,          // Column BW
        podleader: row[75] || null,            // Column BX
        podLeader: row[75] || null,            // Alias for compatibility
        sellRate: this.parseNumberSafe(row[59]) || 0,  // Column BH
        createdOn: this.parseDateSafe(row[56]),        // Column BE
        closedDate: this.parseDateSafe(row[57])        // Column BF
      },
      
      // CRITICAL: Initialize arrays for paydates and transactions
      paydates: [],
      transactions: []
    };
    
    // Process initial paydate if present (Column O and P)
    if (row[14]) {
      loan.paydates.push({
        date: this.parseDateSafe(row[14]),
        amount: this.parseNumberSafe(row[15]) || loan.installmentAmount,
        rowNumber: excelRowNumber
      });
    }
    
    // Process initial transaction if present (Columns Q through W)
    if (row[16]) {
      loan.transactions.push({
        date: this.parseDateSafe(row[16]),
        reference: row[17] || '',
        typeId: row[18],
        typeName: row[19] || '',
        debit: this.parseNumberSafe(row[20]) || 0,
        credit: this.parseNumberSafe(row[21]) || 0,
        balance: this.parseNumberSafe(row[22]) || 0,
        rowNumber: excelRowNumber
      });
    }
    
    return loan;
  }

  /**
   * Append continuation row data to existing loan
   * @private
   */
  appendToLoan(loan, row, excelRowNumber) {
    // ENSURE arrays exist (defensive programming)
    if (!Array.isArray(loan.paydates)) {
      console.warn(`Loan ${loan.loanNumber} missing paydates array, initializing`);
      loan.paydates = [];
    }
    if (!Array.isArray(loan.transactions)) {
      console.warn(`Loan ${loan.loanNumber} missing transactions array, initializing`);
      loan.transactions = [];
    }
    
    // Check for additional paydates (Column O and P)
    if (row[14]) {
      loan.paydates.push({
        date: this.parseDateSafe(row[14]),
        amount: this.parseNumberSafe(row[15]) || loan.installmentAmount,
        rowNumber: excelRowNumber
      });
    }
    
    // Check for additional transactions (Columns Q through W)
    if (row[16]) {
      loan.transactions.push({
        date: this.parseDateSafe(row[16]),
        reference: row[17] || '',
        typeId: row[18],
        typeName: row[19] || '',
        debit: this.parseNumberSafe(row[20]) || 0,
        credit: this.parseNumberSafe(row[21]) || 0,
        balance: this.parseNumberSafe(row[22]) || 0,
        rowNumber: excelRowNumber
      });
    }
  }

  /**
   * Finalize loan object before adding to results
   * @private
   */
  finalizeLoan(loan) {
    // ENSURE arrays exist before sorting (defensive programming)
    if (!Array.isArray(loan.paydates)) {
      console.error(`CRITICAL: Loan ${loan.loanNumber} has no paydates array!`);
      loan.paydates = [];
    }
    if (!Array.isArray(loan.transactions)) {
      console.error(`CRITICAL: Loan ${loan.loanNumber} has no transactions array!`);
      loan.transactions = [];
    }
    
    // Sort paydates by date
    loan.paydates.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Sort transactions by date
    loan.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Add summary counts
    loan.totalPaydates = loan.paydates.length;
    loan.totalTransactions = loan.transactions.length;
    
    // Calculate loan term if not present
    if (!loan.loanTerm && loan.firstPaymentDate && loan.endDate) {
      const start = new Date(loan.firstPaymentDate);
      const end = new Date(loan.endDate);
      const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
      loan.loanTerm = months;
    }
    
    // Set contract date
    loan.contractDate = loan.payoutDate || loan.firstPaymentDate || null;
    
    return loan;
  }

  /**
   * Safe parse number - matches original parseNumber from ETLService
   * @private
   */
  parseNumberSafe(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Safe parse date - matches original parseDate from ETLService
   * @private
   */
  parseDateSafe(value) {
    if (!value) return null;
    
    // If it's a Date object from Excel
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's an Excel serial number
    if (typeof value === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const msPerDay = 24 * 60 * 60 * 1000;
      const adjustedValue = value > 59 ? value - 1 : value;
      const date = new Date(excelEpoch.getTime() + (adjustedValue - 1) * msPerDay);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's a string
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return value;
      }
      
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return String(value);
  }

  /**
   * Safe parse field - handles FALSE values from Excel
   * @private
   */
  parseFieldSafe(value, defaultValue = '') {
    if (!value || value === 'FALSE' || value === 'false' || value === false) {
      return defaultValue;
    }
    return value;
  }

  /**
   * Get transformation statistics
   * @param {Array} loans - Transformed loans
   * @returns {Object} Statistics
   */
  getTransformationStats(loans) {
    return {
      totalLoans: loans.length,
      loansWithTransactions: loans.filter(l => l.transactions && l.transactions.length > 0).length,
      loansWithPaydates: loans.filter(l => l.paydates && l.paydates.length > 0).length,
      restructuredLoans: loans.filter(l => l.isRestructured).length,
      activeLoans: loans.filter(l => l.active).length,
      averageTransactionsPerLoan: loans.reduce((sum, l) => 
        sum + (l.transactions ? l.transactions.length : 0), 0) / (loans.length || 1),
      averagePaydatesPerLoan: loans.reduce((sum, l) => 
        sum + (l.paydates ? l.paydates.length : 0), 0) / (loans.length || 1)
    };
  }
}

// Export singleton instance and class
export const dataTransformer = new DataTransformer();
export default DataTransformer;