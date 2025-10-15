/**
 * Validation Functions
 * Functions to validate and check data integrity
 */

import { FEE_TRANSACTION_TYPES, RESTRUCTURE_TRANSACTION_TYPES } from './constants';

// Check if a transaction is a fee
export const isFeeTransaction = (transaction) => {
  if (!transaction || !transaction.typeName) return false;
  
  const typeLower = transaction.typeName.toLowerCase();
  return FEE_TRANSACTION_TYPES.some(feeType => 
    typeLower.includes(feeType.toLowerCase())
  );
};

// Check if a transaction is a reversal
export const isReversalTransaction = (transaction) => {
  if (!transaction || !transaction.typeName) return false;
  
  const typeLower = transaction.typeName.toLowerCase();
  return typeLower.includes('reversal') || 
         typeLower.includes('nsf') ||
         typeLower.includes('return') ||
         typeLower.includes('chargeback');
};

// Check if a transaction is a restructure/settlement
export const isRestructureTransaction = (transaction) => {
  if (!transaction || !transaction.typeName) return false;
  
  const typeLower = transaction.typeName.toLowerCase();
  return RESTRUCTURE_TRANSACTION_TYPES.some(restructureType => 
    typeLower.includes(restructureType.toLowerCase())
  );
};

// Check if a transaction is a valid payment
export const isValidPayment = (transaction) => {
  return transaction.credit > 0 && 
         !isFeeTransaction(transaction) &&
         !isReversalTransaction(transaction) &&
         !transaction.isReversed;  // Flag set during processing
};

// Validate loan data completeness
export const validateLoan = (loan) => {
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!loan.loanNumber) {
    errors.push('Missing loan number');
  }
  
  if (!loan.loanAmount || loan.loanAmount <= 0) {
    errors.push('Invalid loan amount');
  }
  
  // Warnings for missing data
  if (!loan.client?.name || loan.client?.name === 'Unknown') {
    warnings.push('Missing client name');
  }
  
  if (!loan.lead?.fico) {
    warnings.push('Missing FICO score');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness: calculateCompleteness(loan)
  };
};

// Calculate data completeness percentage
export const calculateCompleteness = (loan) => {
  const fields = [
    loan.loanNumber,
    loan.loanAmount,
    loan.client?.name,
    loan.client?.industrySector,
    loan.client?.city,
    loan.client?.state,
    loan.client?.email,
    loan.lead?.fico,
    loan.lead?.avgMonthlyRevenue,
    loan.payoutDate
  ];
  
  const filledFields = fields.filter(field => 
    field && field !== 'Unknown' && field !== ''
  ).length;
  
  return Math.round((filledFields / fields.length) * 100);
};

// Validate Excel headers match expected structure
export const validateExcelHeaders = (headers, expectedColumns) => {
  const missingColumns = [];
  
  for (const [columnName, columnIndex] of Object.entries(expectedColumns)) {
    if (!headers[columnIndex]) {
      missingColumns.push(`Column ${columnIndex}: ${columnName}`);
    }
  }
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};