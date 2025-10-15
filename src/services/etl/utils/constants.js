/**
 * ETL Constants and Configuration
 * Centralized location for all ETL constants
 */

// Loan Status Types
export const LOAN_STATUSES = {
  CURRENT: 'current',
  DELINQUENT_1: 'delinquent_1',
  DELINQUENT_2: 'delinquent_2',
  DELINQUENT_3: 'delinquent_3',
  DEFAULT: 'default',
  RESTRUCTURED: 'restructured'
};

// Fee Transaction Types (should NOT count as payments)
export const FEE_TRANSACTION_TYPES = [
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

// Restructure/Settlement Transaction Types
export const RESTRUCTURE_TRANSACTION_TYPES = [
  'settlement',
  'settlement - renewal',
  'settlement discount',
  'write-off',
  'restructure penalty',
  'discount adjustment'
];

// Excel Column Mappings (based on your actual Excel structure)
export const COLUMN_MAP = {
  EXTERNAL_ID: 0,              // A
  LOAN_NUMBER: 1,              // B
  ACTIVE_DEBIT_ORDER: 2,       // C
  AMOUNT_SOLD: 3,              // D
  CLIENT_ID: 4,                // E
  CONTRACT_BALANCE: 5,         // F
  DAYS_OVERDUE_MPF: 6,         // G
  DAYS_OVERDUE: 7,             // H
  LOAN_AMOUNT: 8,              // I
  LOAN_TERM: 9,                // J
  PAYOUT_DATE: 10,             // K
  PROGRESS: 11,                // L
  REMAINING_AMOUNT: 12,        // M
  STATE: 13,                   // N
  PAYDATE_DATE: 14,            // O
  PAYDATE_AMOUNT: 15,          // P
  TRANS_DATE: 16,              // Q
  TRANS_REFERENCE: 17,         // R
  TRANS_TYPE_ID: 18,           // S
  TRANS_TYPE_NAME: 19,         // T
  TRANS_DEBIT: 20,             // U
  TRANS_CREDIT: 21,            // V
  TRANS_BALANCE: 22,           // W
  PAYMENT_FREQUENCY: 23,       // X
  INSTALLMENT_AMOUNT: 24,      // Y
  LAST_INSTALLMENT_AMOUNT: 25, // Z
  CLIENT_DISPLAY_NAME: 26,     // AA
  CLIENT_INDUSTRY_SECTOR: 27,  // AB
  CLIENT_INDUSTRY_SUBSECTOR: 28, // AC
  CLIENT_DATE_FOUNDED: 29,     // AD
  CLIENT_ADDRESS_LINE_1: 30,   // AE
  CLIENT_ADDRESS_LINE_2: 31,   // AF
  CLIENT_ADDRESS_LINE_3: 32,   // AG
  CLIENT_CITY: 33,             // AH
  CLIENT_STATE: 34,            // AI
  CLIENT_COUNTRY: 35,          // AJ
  CLIENT_ZIP_CODE: 36,         // AK
  CLIENT_EMAIL: 37,            // AL
  CLIENT_PRIMARY_NO: 38,       // AM
  LEAD_ID: 39,                 // AN
  LEAD_FICO: 40,               // AO
  LEAD_AVG_MONTHLY_REVENUE: 41, // AP
  LEAD_AVG_MCA_DEBITS: 42,      // AQ
  // ... continue with rest of columns through BX (75)
  CONTRACT_INTEREST: 53,       // BB
  ORIGINATION_FEE: 54,         // BC
  FIRST_PAYMENT_DATE: 55,      // BD
  LEAD_CREATED_ON: 56,         // BE
  LEAD_CLOSED_DATE: 57,        // BF
  END_DATE: 58,                // BG
  LEAD_SELL_RATE: 59,          // BH
  COMPOUND_DATE: 60,           // BI
  DAYS_OVERDUE_ON_WRITEOFF: 61, // BJ
  AMOUNT_OVERDUE_ON_WRITEOFF: 62, // BK
  AMOUNT_OVERDUE: 63,          // BL
  LEAD_AVG_NUM_DEPOSITS: 64,   // BM
  LEAD_AVG_NUM_CREDITS: 65,    // BN
  LEAD_AVG_DEPOSITS: 66,       // BO
  LEAD_AVG_CREDITS: 67,        // BP
  LEAD_AVG_DAILY_BALANCE: 68,  // BQ
  LEAD_AVG_NSFS: 69,           // BR
  LEAD_AVG_NEGATIVE_DAYS: 70,  // BS
  LEAD_AVG_REVENUE: 71,        // BT
  LOAN_RESTRUCTURED: 72,       // BU
  LEAD_UNDERWRITER: 73,        // BV
  LEAD_SALESPERSON: 74,        // BW
  LEAD_POD_LEADER: 75          // BX
};

// Default Values
export const DEFAULTS = {
  FICO_SCORE: 650,
  INSTALLMENT_AMOUNT: 1000,
  COUNTRY: 'United States',
  STATE: 'Unknown',
  INDUSTRY_SECTOR: 'Unknown',
  CLIENT_NAME: 'Unknown'
};

// Excel specific constants
export const EXCEL_CONFIG = {
  EXCEL_EPOCH: new Date(1899, 11, 30), // December 30, 1899
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  LEAP_YEAR_BUG_THRESHOLD: 60 // Excel 1900 leap year bug
};