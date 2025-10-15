import * as XLSX from 'xlsx';

export class ETLService {
  constructor() {
    // Correct column mapping based on the actual Excel headers
    this.columnMap = {
      0: 'externalId',                    // A - External ID
      1: 'loanNumber',                    // B - Loan #
      2: 'activeDebitOrder',              // C - Active Debit Order
      3: 'amountSold',                    // D - Amount Sold
      4: 'clientId',                      // E - Client/ID
      5: 'contractBalance',               // F - Contract balance
      6: 'daysOverdueMPF',               // G - Days Overdue (MPF)
      7: 'daysOverdue',                  // H - Days overdue
      8: 'loanAmount',                   // I - Loan amount
      9: 'loanTerm',                     // J - Loan term
      10: 'payoutDate',                  // K - Payout date
      11: 'progress',                    // L - Progress
      12: 'remainingAmount',             // M - Remaining Amount
      13: 'state',                       // N - State
      14: 'paydate_date',                // O - Paydates/Date
      15: 'paydate_amount',              // P - Paydates/Amount
      16: 'trans_date',                  // Q - Transactions/Date
      17: 'trans_reference',             // R - Transactions/Reference
      18: 'trans_typeId',                // S - Transactions/Type/ID
      19: 'trans_typeName',              // T - Transactions/Type/Name
      20: 'trans_debit',                 // U - Transactions/Debit
      21: 'trans_credit',                // V - Transactions/Credit
      22: 'trans_balance',               // W - Transactions/Balance
      23: 'paymentFrequency',            // X - Payment frequency
      24: 'installmentAmount',           // Y - Instalment amount
      25: 'lastInstallmentAmount',       // Z - Last instalment amount
      26: 'client_displayName',          // AA - Client/Display Name
      27: 'client_industrySector',       // AB - Client/Industry Sector/Display Name
      28: 'client_industrySubsector',    // AC - Client/Industry Subsector/Display Name
      29: 'client_dateFounded',          // AD - Client/Date Founded
      30: 'client_addressLine1',         // AE - Client/Address Line 1
      31: 'client_addressLine2',         // AF - Client/Address Line 2
      32: 'client_addressLine3',         // AG - Client/Address Line 3
      33: 'client_city',                 // AH - Client/City/Display Name
      34: 'client_state',                // AI - Client/State/Display Name
      35: 'client_country',              // AJ - Client/Country/Display Name
      36: 'client_zipCode',              // AK - Client/ZIP Code
      37: 'client_email',                // AL - Client/Email
      38: 'client_primaryNo',            // AM - Client/Primary No.
      39: 'lead_id',                     // AN - Lead/ID
      40: 'lead_fico',                   // AO - Lead/FICO
      41: 'lead_avgMonthlyRevenue',      // AP - Lead/Average Monthly Revenue
      42: 'lead_avgMCADebits',           // AQ - Lead/Average MCA Debits
      // ... debt summary columns 43-52 (AR-BA)
      53: 'contractInterest',            // BB - Contract interest
      54: 'originationFee',              // BC - Origination Fee
      55: 'firstPaymentDate',            // BD - First payment date
      56: 'lead_createdOn',              // BE - Lead/Created on
      57: 'lead_closedDate',             // BF - Lead/Closed Date
      58: 'endDate',                     // BG - End date
      59: 'lead_sellRate',               // BH - Lead/Sell Rate
      60: 'compoundDate',                // BI - Compound Date
      61: 'daysOverdueOnWriteOff',       // BJ - Days overdue (on day of write-off)
      62: 'amountOverdueOnWriteOff',     // BK - Amount overdue (on day of write-off)
      63: 'amountOverdue',               // BL - Amount overdue
      64: 'lead_avgNumDeposits',         // BM - Lead/Average Num Deposits
      65: 'lead_avgNumCredits',          // BN - Lead/Average Num Credits
      66: 'lead_avgDeposits',            // BO - Lead/Avg Deposits
      67: 'lead_avgCredits',             // BP - Lead/Avg Credits
      68: 'lead_avgDailyBalance',        // BQ - Lead/Avg Daily Balance
      69: 'lead_avgNSFs',                // BR - Lead/Avg NSFs
      70: 'lead_avgNegativeDays',        // BS - Lead/Avg Negative Days
      71: 'lead_avgRevenue',             // BT - Lead/Avg Revenue
      72: 'loanRestructured',            // BU - Loan Restructured
      73: 'lead_underwriter',            // BV - Lead/Underwriter/Display Name
      74: 'lead_salesperson',            // BW - Lead/Salesperson/Display Name
      75: 'lead_podLeader'               // BX - Lead/Pod Leader/Display Name
    };
  }

  async extractFromExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          });
          
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1, 
            defval: null,
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });
          
          resolve(rawData);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  transformToLoans(rawData) {
    const loans = [];
    let currentLoan = null;
    
    // Skip header row
    for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
      const row = rawData[rowIndex];
      
      // Check if this is a new loan (both columns A and B filled)
      if (row[0] !== null && row[0] !== '' && row[0] !== undefined &&
          row[1] !== null && row[1] !== '' && row[1] !== undefined) {
        
        // Save previous loan if exists
        if (currentLoan) {
          loans.push(this.processLoanData(currentLoan));
        }
        
        // Start new loan with CORRECT column mappings
        currentLoan = {
          rowNumber: rowIndex + 1,
          externalId: String(row[0]),           // Column A
          loanNumber: String(row[1]),           // Column B
          active: row[2] === true || row[2] === 'TRUE' || row[2] === 1 || row[2] === 'Yes',
          clientId: row[4],                     // Column E
          contractBalance: this.parseNumber(row[5]) || 0,  // Column F
          daysOverdue: parseInt(row[7]) || 0,   // Column H
          loanAmount: this.parseNumber(row[8]) || 0,       // Column I
          state: row[13] || 'Unknown',          // Column N
          installmentAmount: this.parseNumber(row[24]) || 1000, // Column Y
          
          // Client information - using CORRECT columns
          client: {
            name: row[26] || row[4] || 'Unknown',  // Column AA - Client/Display Name
            industrySector: row[27] || 'Unknown',  // Column AB - Industry Sector
            industrySubsector: row[28] || 'General', // Column AC - Industry Subsector
            dateFounded: this.parseDate(row[29]),  // Column AD - Date Founded
            addressLine1: row[30] || '',           // Column AE
            addressLine2: row[31] || '',           // Column AF
            addressLine3: row[32] || '',           // Column AG
            city: row[33] || 'Unknown',            // Column AH - City
            state: row[34] || row[13] || 'Unknown', // Column AI - State (or fallback to column N)
            country: row[35] || 'United States',   // Column AJ - Country
            zipCode: row[36] || '',                // Column AK - ZIP Code
            email: row[37] || '',                  // Column AL
            primaryNo: row[38] || ''               // Column AM
          },
          
          // Lead information - using CORRECT columns
          lead: {
            id: row[39],                           // Column AN
            fico: parseInt(row[40]) || 650,        // Column AO - Lead/FICO
            avgMonthlyRevenue: this.parseNumber(row[71]) || 0, // Column AP
            avgMCADebts: this.parseNumber(row[42]) || 0,       // Column AQ
            avgRevenue: this.parseNumber(row[71]) || 0,        // Column BT
            avgDailyBalance: this.parseNumber(row[68]) || 0,    // Column BQ
            avgNSFs: this.parseNumber(row[69]) || 0,           // Column BR - Lead/Avg NSFs
            avgNegativeDays: this.parseNumber(row[70]) || 0,   // Column BS - Lead/Avg Negative Days
            avgNumDeposits: this.parseNumber(row[64]) || 0,    // Column BM - Lead/Average Num Deposits
            avgNumCredits: this.parseNumber(row[65]) || 0,     // Column BN - Lead/Average Num Credits
            avgDeposits: this.parseNumber(row[66]) || 0,       // Column BO - Lead/Avg Deposits
            avgCredits: this.parseNumber(row[67]) || 0, 
            underwriter: row[73] || null, // Column BV - Lead/Underwriter/Display Name
            salesperson: row[74] || null, // Column BW - Lead/Salesperson/Display Name
            podleader: row[75] || null, // Column BX - Lead/Pod Leader/Display Name
          },
          
          // Additional loan flags
          isRestructured: row[72] === true || row[72] === 'TRUE' || row[72] === 1 || row[72] === 'Yes', // Column BU
          
          paydates: [],
          transactions: []
        };
        
        // Process paydates and transactions from the same row
        if (row[14]) { // Column O - Paydate date
          currentLoan.paydates.push({
            date: this.parseDate(row[14]),
            amount: this.parseNumber(row[15]) || currentLoan.installmentAmount,
            rowNumber: rowIndex + 1
          });
        }
        
        if (row[16]) { // Column Q - Transaction date
          currentLoan.transactions.push({
            date: this.parseDate(row[16]),
            reference: row[17] || '',
            typeId: row[18],
            typeName: row[19] || '',
            debit: this.parseNumber(row[20]) || 0,
            credit: this.parseNumber(row[21]) || 0,
            balance: this.parseNumber(row[22]) || 0,
            rowNumber: rowIndex + 1
          });
        }
      }
      // Continuation row for current loan
      else if (currentLoan) {
        // Check for additional paydates
        if (row[14]) {
          currentLoan.paydates.push({
            date: this.parseDate(row[14]),
            amount: this.parseNumber(row[15]) || currentLoan.installmentAmount,
            rowNumber: rowIndex + 1
          });
        }
        
        // Check for additional transactions
        if (row[16]) {
          currentLoan.transactions.push({
            date: this.parseDate(row[16]),
            reference: row[17] || '',
            typeId: row[18],
            typeName: row[19] || '',
            debit: this.parseNumber(row[20]) || 0,
            credit: this.parseNumber(row[21]) || 0,
            balance: this.parseNumber(row[22]) || 0,
            rowNumber: rowIndex + 1
          });
        }
      }
    }
    
    // Don't forget the last loan
    if (currentLoan) {
      loans.push(this.processLoanData(currentLoan));
    }
    
    return loans;
  }
  
  processLoanData(loan) {
    // Sort paydates and transactions by date
    loan.paydates.sort((a, b) => new Date(a.date) - new Date(b.date));
    loan.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate status and metrics
    const statusCalculation = this.calculateLoanStatus(loan);
    loan.statusCalculation = statusCalculation;
    loan.status = statusCalculation.status;
    loan.missedPayments = statusCalculation.missedPayments;
    
    // Use the explicit restructured flag from column BU
    if (loan.isRestructured) {
      loan.status = 'restructured';
      loan.statusCalculation.isRestructured = true;
      loan.statusCalculation.explanation = 'Loan has been restructured (column BU flag)';
    }
    
    // Detect catch-up payments
    loan.catchUpPayments = this.detectCatchUpPayments(loan);
    
    // Track payment matching
    loan.paymentMatching = this.matchPaymentsToSchedule(loan);
    
    // Calculate risk score
    loan.riskScore = this.calculateRiskScore(loan);
    
    return loan;
  }

  // Update the calculateLoanStatus method in ETLService.js

calculateLoanStatus(loan) {
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
    status: 'current',
    explanation: ''
  };
  
  // Define which transaction types count as actual payments
  const PAYMENT_TRANSACTION_TYPES = [
    'ACH',
    'Credit Card Payment Received',
    'Credit Card',
    'Debit Card',
    'Successful Payment',
    'Down Payment',
    'Wire Transfer',
    'Transfer to/from Advance',
    'Dedicated - Recovered Collections',
    'Check Deposit',
    'Account Credit',
    'Kalamata Credit',
    'Repay Manual Debit'
  ];
  
  // Define fee/non-payment transaction types
  const FEE_TRANSACTION_TYPES = [
    'Origination Fee Collection',
    'Initiation Collection',
    'Merchant Fee Collection',
    'Stamp Tax Fee',
    'Accrued Interest',
    'NSF Fees',
    'Legal Fees',
    'Legal Fee',
    'Merchant Fee',
    'Origination Fee',
    'Initiation',
    'Restructure Penalty'
  ];
  
  // Define restructure/settlement transaction types
  const RESTRUCTURE_TRANSACTION_TYPES = [
    'Settlement',
    'Settlement - Renewal',
    'Settlement Discount',
    'Write-Off',
    'Restructure Penalty',
    'Discount Adjustment'
  ];
  
  // Find expected payments - EXCLUDE today completely
  calculation.expectedPayments = loan.paydates.filter(p => {
    const paydateString = p.date.split('T')[0]; // Get just the date part
    return paydateString < todayString; // String comparison works for ISO dates
  });
  calculation.totalExpected = calculation.expectedPayments.length;
  
  // Process all transactions and categorize them
  loan.transactions.forEach(trans => {
    const transactionInfo = {
      date: trans.date,
      amount: trans.credit || -trans.debit,
      type: trans.typeName || 'Unknown',
      category: 'other'
    };
    
    // Categorize the transaction
    if (trans.credit > 0) {
      const typeName = trans.typeName || '';
      
      // Check if it's a restructure transaction
      if (RESTRUCTURE_TRANSACTION_TYPES.some(type => 
        typeName.toLowerCase().includes(type.toLowerCase()))) {
        calculation.isRestructured = true;
        transactionInfo.category = 'restructure';
      }
      // Check if it's an actual payment
      else if (PAYMENT_TRANSACTION_TYPES.some(type => 
        typeName.toLowerCase() === type.toLowerCase() ||
        (type.toLowerCase().includes('transfer') && typeName.toLowerCase().includes('transfer')))) {
        transactionInfo.category = 'payment';
        calculation.totalReceived += trans.credit;
        calculation.actualPayments.push({
          date: trans.date,
          amount: trans.credit,
          type: trans.typeName
        });
      }
      // Check if it's a fee
      else if (FEE_TRANSACTION_TYPES.some(type => 
        typeName.toLowerCase().includes(type.toLowerCase()))) {
        transactionInfo.category = 'fee';
      }
      // Default case - if we're not sure, check for keywords
      else {
        const lowerTypeName = typeName.toLowerCase();
        if (lowerTypeName.includes('payment') || 
            (lowerTypeName.includes('collection') && 
             !lowerTypeName.includes('fee') && 
             !lowerTypeName.includes('origination') && 
             !lowerTypeName.includes('initiation'))) {
          transactionInfo.category = 'payment';
          calculation.totalReceived += trans.credit;
          calculation.actualPayments.push({
            date: trans.date,
            amount: trans.credit,
            type: trans.typeName
          });
        } else {
          transactionInfo.category = 'other';
        }
      }
    }
    
    calculation.allTransactions.push(transactionInfo);
    
    // Also check for restructure in references
    if (trans.reference?.toLowerCase().includes('restructur')) {
      calculation.isRestructured = true;
    }
  });
  
  // Calculate payments made - FIX THE MATH
  if (loan.installmentAmount > 0) {
    // Round to 2 decimal places to avoid floating point issues
    const totalRounded = Math.round(calculation.totalReceived * 100) / 100;
    const installmentRounded = Math.round(loan.installmentAmount * 100) / 100;
    
    // Calculate number of payments
    calculation.paymentsMade = Math.round(totalRounded / installmentRounded);
  }
  
  calculation.missedPayments = Math.max(0, calculation.totalExpected - calculation.paymentsMade);
  
  // Determine status
  if (calculation.isRestructured) {
    calculation.status = 'restructured';
    calculation.explanation = 'Loan has been restructured';
  } else if (calculation.missedPayments === 0) {
    calculation.status = 'current';
    calculation.explanation = 'All payments up to date';
  } else if (calculation.missedPayments === 1) {
    calculation.status = 'delinquent_1';
    calculation.explanation = '1 payment missed';
  } else if (calculation.missedPayments === 2) {
    calculation.status = 'delinquent_2';
    calculation.explanation = '2 payments missed';
  } else if (calculation.missedPayments === 3) {
    calculation.status = 'delinquent_3';
    calculation.explanation = '3 payments missed';
  } else {
    calculation.status = 'default';
    calculation.explanation = `${calculation.missedPayments} payments missed (4+ = default)`;
  }
  
  return calculation;
}

  matchPaymentsToSchedule(loan) {
    const matches = [];
    const unmatchedPaydates = [...loan.paydates];
    const unmatchedTransactions = [...loan.transactions.filter(t => t.credit > 0)];
    
    // Try to match payments to schedule
    unmatchedPaydates.forEach(paydate => {
      const paydateTime = new Date(paydate.date).getTime();
      
      // Find closest matching transaction within 7 days
      let closestTrans = null;
      let closestDiff = Infinity;
      
      unmatchedTransactions.forEach(trans => {
        const transTime = new Date(trans.date).getTime();
        const daysDiff = Math.abs((transTime - paydateTime) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7 && daysDiff < closestDiff) {
          const amountDiff = Math.abs(trans.credit - paydate.amount);
          const amountRatio = amountDiff / paydate.amount;
          
          if (amountRatio < 0.1) { // Within 10% of expected amount
            closestDiff = daysDiff;
            closestTrans = trans;
          }
        }
      });
      
      if (closestTrans) {
        matches.push({
          paydate: paydate,
          transaction: closestTrans,
          status: 'matched',
          variance: closestTrans.credit - paydate.amount
        });
        const index = unmatchedTransactions.indexOf(closestTrans);
        if (index > -1) {
          unmatchedTransactions.splice(index, 1);
        }
      } else {
        const isFuture = new Date(paydate.date) > new Date();
        matches.push({
          paydate: paydate,
          transaction: null,
          status: isFuture ? 'future' : 'missed',
          variance: -paydate.amount
        });
      }
    });
    
    // Add unmatched transactions (likely catch-up or extra payments)
    unmatchedTransactions.forEach(trans => {
      matches.push({
        paydate: null,
        transaction: trans,
        status: 'extra',
        variance: trans.credit
      });
    });
    
    return matches;
  }

  detectCatchUpPayments(loan) {
    const catchUps = [];
    
    loan.transactions.forEach((trans) => {
      if (trans.credit > loan.installmentAmount * 1.5) {
        const paymentsCleared = Math.floor(trans.credit / loan.installmentAmount);
        catchUps.push({
          date: trans.date,
          amount: trans.credit,
          paymentsCleared: paymentsCleared,
          rowNumber: trans.rowNumber
        });
      }
    });
    
    return catchUps;
  }

  calculateRiskScore(loan) {
    let score = 50; // Base score
    
    // Adjust based on status
    if (loan.status === 'current') score -= 20;
    else if (loan.status === 'delinquent_1') score += 10;
    else if (loan.status === 'delinquent_2') score += 20;
    else if (loan.status === 'delinquent_3') score += 30;
    else if (loan.status === 'default') score += 40;
    else if (loan.status === 'restructured') score += 35;
    
    // Adjust based on FICO
    const fico = loan.lead?.fico || 650;
    if (fico < 600) score += 15;
    else if (fico < 650) score += 5;
    else if (fico > 700) score -= 10;
    
    // Adjust based on revenue to debt ratio
    const avgMonthlyRevenue = loan.lead?.avgMonthlyRevenue || 0;
    const avgMCADebts = loan.lead?.avgMCADebts || 1;
    const revenueToDebt = avgMCADebts > 0 ? avgMonthlyRevenue / avgMCADebts : 10;
    
    if (revenueToDebt < 2) score += 15;
    else if (revenueToDebt > 5) score -= 10;
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  }

  parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'number') {
      // Excel date serial number
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      // Try to parse various date formats
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return String(value);
  }

  parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}