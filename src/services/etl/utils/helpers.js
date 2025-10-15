/**
 * General Helper Functions
 * Pure functions for common operations
 */

// Parse numeric values from various formats
export const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

// Parse fields and handle FALSE values from Excel
export const parseField = (value, defaultValue = '') => {
  if (!value || 
      value === 'FALSE' || 
      value === 'false' || 
      value === false ||
      value === '' ||
      value === null ||
      value === undefined) {
    return defaultValue;
  }
  return String(value);
};

// Parse boolean values from Excel
export const parseBoolean = (value) => {
  return value === true || 
         value === 'TRUE' || 
         value === 1 || 
         value === 'Yes' ||
         value === 'YES';
};

// Format currency values
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  if (typeof amount === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  return 'N/A';
};

// Calculate percentage safely
export const calculatePercentage = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return (numerator / denominator) * 100;
};

// Safe division to avoid divide by zero
export const safeDivide = (numerator, denominator, defaultValue = 0) => {
  if (!denominator || denominator === 0) return defaultValue;
  return numerator / denominator;
};

// Round to specified decimal places
export const roundTo = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Get safe property from nested object
export const getNestedProperty = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

// Group array by property
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
};

// Remove duplicates from array
export const uniqueBy = (array, key) => {
  const seen = new Set();
  return array.filter(item => {
    const k = item[key];
    return seen.has(k) ? false : seen.add(k);
  });
};