// src/services/etl/modules/DateUtility.js

/**
 * DateUtility Module
 * Handles all date parsing, formatting, and calculations for ETL
 */

export class DateUtility {
  constructor() {
    // Excel epoch starts at December 30, 1899
    this.EXCEL_EPOCH = new Date(1899, 11, 30);
    this.MS_PER_DAY = 24 * 60 * 60 * 1000;
    this.EXCEL_LEAP_YEAR_BUG = 60; // Excel incorrectly treats 1900 as leap year
  }

  /**
   * Parse date from various formats
   * @param {*} value - Date value in various formats
   * @returns {string|null} Date in YYYY-MM-DD format
   */
  parseDate(value) {
    if (!value) return null;
    
    // Handle different input types
    if (typeof value === 'number') {
      return this.parseExcelSerialDate(value);
    }
    
    if (value instanceof Date) {
      return this.formatToISODate(value);
    }
    
    if (typeof value === 'string') {
      return this.parseStringDate(value);
    }
    
    // Last resort - convert to string
    return String(value);
  }

  /**
   * Parse Excel serial date numbers
   * @param {number} serialNumber - Excel date serial number
   * @returns {string} Date in YYYY-MM-DD format
   */
  parseExcelSerialDate(serialNumber) {
    // Adjust for Excel's leap year bug
    // Excel incorrectly treats 1900 as a leap year
    // Dates after Feb 28, 1900 need to be adjusted by -1
    const adjustedValue = serialNumber > this.EXCEL_LEAP_YEAR_BUG 
      ? serialNumber - 1 
      : serialNumber;
    
    // Calculate the actual date
    const resultDate = new Date(
      this.EXCEL_EPOCH.getTime() + adjustedValue * this.MS_PER_DAY
    );
    
    // Use UTC methods to avoid timezone issues
    const year = resultDate.getUTCFullYear();
    const month = String(resultDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(resultDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse string dates in various formats
   * @param {string} dateString - Date string
   * @returns {string} Date in YYYY-MM-DD format
   */
  parseStringDate(dateString) {
    // Already in correct format?
    if (this.isISOFormat(dateString)) {
      return dateString;
    }
    
    // Try common date formats
    const patterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      // DD/MM/YYYY or DD-MM-YYYY (European)
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      // YYYY/MM/DD or YYYY-MM-DD
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
    ];
    
    // Try JavaScript's built-in parser
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return this.formatToISODate(parsed);
    }
    
    // If all else fails, return the original string
    return dateString;
  }

  /**
   * Format Date object to ISO date string
   * @param {Date} date - JavaScript Date object
   * @returns {string} Date in YYYY-MM-DD format
   */
  formatToISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if string is already in ISO format
   * @param {string} dateString - Date string to check
   * @returns {boolean}
   */
  isISOFormat(dateString) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  }

  /**
   * Get today's date in ISO format
   * @returns {string} Today's date as YYYY-MM-DD
   */
  getTodayISO() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.formatToISODate(today);
  }

  /**
   * Calculate days between two dates
   * @param {string|Date} date1 - First date
   * @param {string|Date} date2 - Second date
   * @returns {number} Number of days between dates
   */
  getDaysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / this.MS_PER_DAY);
  }

  /**
   * Calculate months between two dates
   * @param {string|Date} date1 - Start date
   * @param {string|Date} date2 - End date
   * @returns {number} Number of months between dates
   */
  getMonthsBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    let months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    
    return months <= 0 ? 0 : months;
  }

  /**
   * Calculate years between two dates (useful for business age)
   * @param {string|Date} date1 - Start date
   * @param {string|Date} date2 - End date (defaults to today)
   * @returns {number} Number of years between dates
   */
  getYearsBetween(date1, date2 = new Date()) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    const years = d2.getFullYear() - d1.getFullYear();
    const monthDiff = d2.getMonth() - d1.getMonth();
    const dayDiff = d2.getDate() - d1.getDate();
    
    // Adjust if anniversary hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      return years - 1;
    }
    
    return years;
  }

  /**
   * Add days to a date
   * @param {string|Date} date - Base date
   * @param {number} days - Days to add (can be negative)
   * @returns {string} New date in YYYY-MM-DD format
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return this.formatToISODate(result);
  }

  /**
   * Add months to a date
   * @param {string|Date} date - Base date
   * @param {number} months - Months to add (can be negative)
   * @returns {string} New date in YYYY-MM-DD format
   */
  addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return this.formatToISODate(result);
  }

  /**
   * Get the quarter for a date (Q1-Q4)
   * @param {string|Date} date - Date to check
   * @returns {number} Quarter number (1-4)
   */
  getQuarter(date) {
    const d = new Date(date);
    return Math.ceil((d.getMonth() + 1) / 3);
  }

  /**
   * Get cohort key for vintage analysis (YYYY-Q#)
   * @param {string|Date} date - Date to process
   * @returns {string} Cohort key like "2024-Q1"
   */
  getCohortKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const quarter = this.getQuarter(d);
    return `${year}-Q${quarter}`;
  }

  /**
   * Get month key for monthly analysis (YYYY-MM)
   * @param {string|Date} date - Date to process
   * @returns {string} Month key like "2024-03"
   */
  getMonthKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Check if date is weekend
   * @param {string|Date} date - Date to check
   * @returns {boolean}
   */
  isWeekend(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Get next business day
   * @param {string|Date} date - Starting date
   * @returns {string} Next business day in YYYY-MM-DD format
   */
  getNextBusinessDay(date) {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (this.isWeekend(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return this.formatToISODate(nextDay);
  }

  /**
   * Calculate business days between two dates
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @returns {number} Number of business days
   */
  getBusinessDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    
    const current = new Date(start);
    while (current <= end) {
      if (!this.isWeekend(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @param {string} format - Format type ('short', 'long', 'numeric')
   * @returns {string} Formatted date string
   */
  formatForDisplay(date, format = 'short') {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    
    switch (format) {
      case 'long':
        // "January 15, 2024"
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
      case 'short':
        // "Jan 15, 2024"
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
      case 'numeric':
        // "01/15/2024"
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
      default:
        return this.formatToISODate(d);
    }
  }

  /**
   * Get age-related label (e.g., "2 years, 3 months")
   * @param {string|Date} fromDate - Start date
   * @param {string|Date} toDate - End date (defaults to today)
   * @returns {string} Human-readable age string
   */
  getAgeLabel(fromDate, toDate = new Date()) {
    if (!fromDate) return 'Unknown';
    
    const years = this.getYearsBetween(fromDate, toDate);
    
    if (years === 0) {
      const months = this.getMonthsBetween(fromDate, toDate);
      if (months === 0) {
        const days = this.getDaysBetween(fromDate, toDate);
        return `${days} day${days !== 1 ? 's' : ''}`;
      }
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  /**
   * Validate if a string can be parsed as a date
   * @param {string} dateString - String to validate
   * @returns {boolean}
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Get date range labels for reporting
   * @param {string} period - Period type ('week', 'month', 'quarter', 'year')
   * @param {Date} referenceDate - Reference date (defaults to today)
   * @returns {Object} Start and end dates for the period
   */
  getPeriodRange(period, referenceDate = new Date()) {
    const date = new Date(referenceDate);
    let start, end;
    
    switch (period) {
      case 'week':
        // Get Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(date.setDate(diff));
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
        
      case 'month':
        start = new Date(date.getFullYear(), date.getMonth(), 1);
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        break;
        
      case 'quarter':
        const quarter = this.getQuarter(date);
        const startMonth = (quarter - 1) * 3;
        start = new Date(date.getFullYear(), startMonth, 1);
        end = new Date(date.getFullYear(), startMonth + 3, 0);
        break;
        
      case 'year':
        start = new Date(date.getFullYear(), 0, 1);
        end = new Date(date.getFullYear(), 11, 31);
        break;
        
      default:
        start = date;
        end = date;
    }
    
    return {
      start: this.formatToISODate(start),
      end: this.formatToISODate(end),
      label: this.getPeriodLabel(period, start)
    };
  }

  /**
   * Get period label for display
   * @private
   */
  getPeriodLabel(period, startDate) {
    const date = new Date(startDate);
    
    switch (period) {
      case 'week':
        return `Week of ${this.formatForDisplay(date, 'short')}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'quarter':
        return `Q${this.getQuarter(date)} ${date.getFullYear()}`;
      case 'year':
        return String(date.getFullYear());
      default:
        return this.formatForDisplay(date, 'short');
    }
  }
}

// Export singleton instance and class
export const dateUtility = new DateUtility();