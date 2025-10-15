/**
 * Date Helper Functions
 * Specialized date parsing and calculations
 */

import { EXCEL_CONFIG } from './constants';

// Parse dates from various formats including Excel serial numbers
export const parseDate = (value) => {
  if (!value) return null;
  
  // Handle Excel serial numbers
  if (typeof value === 'number') {
    return parseExcelDate(value);
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return formatDateString(value);
  }
  
  // Handle strings
  if (typeof value === 'string') {
    // Already in YYYY-MM-DD format
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }
    
    // Try to parse other formats
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return formatDateString(parsed);
    }
  }
  
  // If we can't parse it, return as string
  return String(value);
};

// Parse Excel serial date numbers
export const parseExcelDate = (serialNumber) => {
  // Excel incorrectly treats 1900 as a leap year
  // Dates after Feb 28, 1900 need to be adjusted by 1
  const adjustedValue = serialNumber > EXCEL_CONFIG.LEAP_YEAR_BUG_THRESHOLD 
    ? serialNumber - 1 
    : serialNumber;
  
  // Calculate the date
  const resultDate = new Date(
    EXCEL_CONFIG.EXCEL_EPOCH.getTime() + adjustedValue * EXCEL_CONFIG.MS_PER_DAY
  );
  
  // Extract components using UTC to avoid timezone shifts
  const year = resultDate.getUTCFullYear();
  const month = String(resultDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(resultDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Format Date object to YYYY-MM-DD string
export const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate days between two dates
export const getDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / EXCEL_CONFIG.MS_PER_DAY);
  return diffDays;
};

// Calculate months between two dates
export const getMonthsBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  let months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  
  return months <= 0 ? 0 : months;
};

// Get today's date in YYYY-MM-DD format
export const getTodayString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateString(today);
};

// Add days to a date
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDateString(result);
};

// Calculate business age from founding date
export const calculateBusinessAge = (dateFounded) => {
  if (!dateFounded) return 0;
  
  const founded = new Date(dateFounded);
  const now = new Date();
  const years = Math.floor((now - founded) / (1000 * 60 * 60 * 24 * 365));
  
  return Math.max(0, years);
};

// Get cohort key from date (e.g., "2024-Q1")
export const getCohortKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const quarter = Math.ceil((d.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
};