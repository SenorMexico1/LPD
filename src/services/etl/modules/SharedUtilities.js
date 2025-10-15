// src/services/etl/modules/SharedUtilities.js

/**
 * SharedUtilities Module
 * Common utility functions used across ETL modules
 */

export class SharedUtilities {
  /**
   * Parse numeric values from various formats
   * @param {*} value - Value to parse
   * @param {number} defaultValue - Default if parsing fails
   * @returns {number}
   */
  parseNumber(value, defaultValue = 0) {
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }
    
    if (typeof value === 'string') {
      // Remove common formatting characters
      const cleaned = value.replace(/[$,\s%]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    
    return defaultValue;
  }

  /**
   * Parse integer values
   * @param {*} value - Value to parse
   * @param {number} defaultValue - Default if parsing fails
   * @returns {number}
   */
  parseInt(value, defaultValue = 0) {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Parse boolean values from various formats
   * @param {*} value - Value to parse
   * @returns {boolean}
   */
  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    
    // Check for truthy string values
    const truthyValues = ['true', 'yes', '1', 'y', 't', 'on', 'active'];
    const stringValue = String(value).toLowerCase().trim();
    
    return truthyValues.includes(stringValue) || value === 1;
  }

  /**
   * Parse field values and handle FALSE/null from Excel
   * @param {*} value - Field value
   * @param {*} defaultValue - Default value
   * @returns {string}
   */
  parseField(value, defaultValue = '') {
    // Handle Excel FALSE values and other nullish values
    if (value === false || 
        value === 'FALSE' || 
        value === 'false' ||
        value === null ||
        value === undefined ||
        value === '') {
      return defaultValue;
    }
    
    return String(value).trim();
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @param {Object} options - Formatting options
   * @returns {string}
   */
  formatCurrency(amount, options = {}) {
    const {
      currency = 'USD',
      decimals = 2,
      locale = 'en-US'
    } = options;
    
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'N/A';
    }
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  }

  /**
   * Format number for display
   * @param {number} value - Number to format
   * @param {Object} options - Formatting options
   * @returns {string}
   */
  formatNumber(value, options = {}) {
    const {
      decimals = 0,
      locale = 'en-US'
    } = options;
    
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Format percentage for display
   * @param {number} value - Decimal value (0.15 = 15%)
   * @param {number} decimals - Decimal places
   * @returns {string}
   */
  formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Calculate percentage safely
   * @param {number} numerator - Numerator
   * @param {number} denominator - Denominator
   * @param {number} decimals - Decimal places
   * @returns {number}
   */
  calculatePercentage(numerator, denominator, decimals = 2) {
    if (!denominator || denominator === 0) return 0;
    
    const percentage = (numerator / denominator) * 100;
    return this.roundTo(percentage, decimals);
  }

  /**
   * Safe division to avoid divide by zero
   * @param {number} numerator - Numerator
   * @param {number} denominator - Denominator
   * @param {number} defaultValue - Default if division invalid
   * @returns {number}
   */
  safeDivide(numerator, denominator, defaultValue = 0) {
    if (!denominator || denominator === 0 || isNaN(denominator)) {
      return defaultValue;
    }
    
    const result = numerator / denominator;
    return isNaN(result) ? defaultValue : result;
  }

  /**
   * Round to specific decimal places
   * @param {number} value - Value to round
   * @param {number} decimals - Decimal places
   * @returns {number}
   */
  roundTo(value, decimals = 2) {
    if (isNaN(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Clamp value between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Group array of objects by key
   * @param {Array} array - Array to group
   * @param {string|Function} key - Key to group by or function
   * @returns {Object}
   */
  groupBy(array, key) {
    if (!Array.isArray(array)) return {};
    
    return array.reduce((result, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      
      result[groupKey].push(item);
      return result;
    }, {});
  }

  /**
   * Get unique values from array
   * @param {Array} array - Array to process
   * @param {string} key - Optional key for objects
   * @returns {Array}
   */
  unique(array, key = null) {
    if (!Array.isArray(array)) return [];
    
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    }
    
    return [...new Set(array)];
  }

  /**
   * Sort array of objects by key
   * @param {Array} array - Array to sort
   * @param {string} key - Key to sort by
   * @param {string} direction - 'asc' or 'desc'
   * @returns {Array}
   */
  sortBy(array, key, direction = 'asc') {
    if (!Array.isArray(array)) return [];
    
    const sorted = [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }

  /**
   * Sum array of numbers or objects
   * @param {Array} array - Array to sum
   * @param {string} key - Optional key for objects
   * @returns {number}
   */
  sum(array, key = null) {
    if (!Array.isArray(array)) return 0;
    
    return array.reduce((total, item) => {
      const value = key ? item[key] : item;
      return total + (this.parseNumber(value, 0));
    }, 0);
  }

  /**
   * Calculate average of array
   * @param {Array} array - Array to average
   * @param {string} key - Optional key for objects
   * @returns {number}
   */
  average(array, key = null) {
    if (!Array.isArray(array) || array.length === 0) return 0;
    
    const total = this.sum(array, key);
    return total / array.length;
  }

  /**
   * Get min value from array
   * @param {Array} array - Array to process
   * @param {string} key - Optional key for objects
   * @returns {*}
   */
  min(array, key = null) {
    if (!Array.isArray(array) || array.length === 0) return null;
    
    return array.reduce((min, item) => {
      const value = key ? item[key] : item;
      return value < min ? value : min;
    }, key ? array[0][key] : array[0]);
  }

  /**
   * Get max value from array
   * @param {Array} array - Array to process
   * @param {string} key - Optional key for objects
   * @returns {*}
   */
  max(array, key = null) {
    if (!Array.isArray(array) || array.length === 0) return null;
    
    return array.reduce((max, item) => {
      const value = key ? item[key] : item;
      return value > max ? value : max;
    }, key ? array[0][key] : array[0]);
  }

  /**
   * Get nested property safely
   * @param {Object} obj - Object to traverse
   * @param {string} path - Property path (e.g., 'client.address.city')
   * @param {*} defaultValue - Default if not found
   * @returns {*}
   */
  getNestedProperty(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  }

  /**
   * Set nested property safely
   * @param {Object} obj - Object to modify
   * @param {string} path - Property path
   * @param {*} value - Value to set
   * @returns {Object}
   */
  setNestedProperty(obj, path, value) {
    if (!obj || !path) return obj;
    
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    let current = obj;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
  }

  /**
   * Deep clone an object
   * @param {*} obj - Object to clone
   * @returns {*}
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  /**
   * Merge objects deeply
   * @param {Object} target - Target object
   * @param {Object} sources - Source objects to merge
   * @returns {Object}
   */
  deepMerge(target, ...sources) {
    if (!sources.length) return target;
    
    const source = sources.shift();
    
    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return this.deepMerge(target, ...sources);
  }

  /**
   * Check if value is a plain object
   * @param {*} value - Value to check
   * @returns {boolean}
   */
  isObject(value) {
    return value && typeof value === 'object' && value.constructor === Object;
  }

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function}
   */
  debounce(func, wait = 300) {
    let timeoutId;
    
    return function debounced(...args) {
      const context = this;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in ms
   * @returns {Function}
   */
  throttle(func, limit = 300) {
    let inThrottle;
    
    return function throttled(...args) {
      const context = this;
      
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Generate unique ID
   * @param {string} prefix - Optional prefix
   * @returns {string}
   */
  generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone to validate
   * @returns {boolean}
   */
  isValidPhone(phone) {
    // Remove all non-digits
    const digits = String(phone).replace(/\D/g, '');
    
    // Check for valid US phone number (10 or 11 digits)
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }

  /**
   * Format phone number for display
   * @param {string} phone - Phone number
   * @returns {string}
   */
  formatPhone(phone) {
    const cleaned = String(phone).replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phone;
  }

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} length - Max length
   * @param {string} suffix - Suffix to add
   * @returns {string}
   */
  truncate(str, length = 50, suffix = '...') {
    if (!str || str.length <= length) return str;
    
    return str.slice(0, length - suffix.length) + suffix;
  }

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string}
   */
  titleCase(str) {
    if (!str) return '';
    
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Convert string to slug
   * @param {string} str - String to convert
   * @returns {string}
   */
  toSlug(str) {
    if (!str) return '';
    
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate data completeness
   * @param {Object} obj - Object to check
   * @param {Array} requiredFields - Required field names
   * @returns {number} Percentage complete (0-100)
   */
  calculateCompleteness(obj, requiredFields) {
    if (!obj || !requiredFields || requiredFields.length === 0) return 0;
    
    const filledFields = requiredFields.filter(field => {
      const value = this.getNestedProperty(obj, field);
      return value !== null && 
             value !== undefined && 
             value !== '' &&
             value !== 'Unknown' &&
             value !== 'N/A';
    });
    
    return Math.round((filledFields.length / requiredFields.length) * 100);
  }
}

// Export singleton instance and class
export const sharedUtilities = new SharedUtilities();