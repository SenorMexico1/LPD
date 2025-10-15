// src/services/etl/modules/ExcelParser.js

/**
 * ExcelParser Module
 * Handles all Excel file operations and raw data extraction
 */

import * as XLSX from 'xlsx';
import { COLUMN_MAP, EXCEL_CONFIG } from '../utils/constants';
import { validateExcelHeaders } from '../utils/validators';

export class ExcelParser {
  constructor() {
    // Store column mappings for easy access
    this.columnMap = COLUMN_MAP;
  }

  /**
   * Main entry point - Extract data from Excel file
   * @param {File} file - Excel file to parse
   * @returns {Promise<Array>} Raw data rows from Excel
   */
  async extractFromExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = this.parseWorkbook(data);
          const rawData = this.extractSheetData(workbook);
          
          // Validate the data structure
          const validation = this.validateDataStructure(rawData);
          if (!validation.isValid) {
            console.warn('Excel validation warnings:', validation.warnings);
          }
          
          resolve(rawData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse workbook from binary data
   * @private
   */
  parseWorkbook(data) {
    try {
      return XLSX.read(data, {
        type: 'array',
        cellDates: false,  // Don't auto-parse dates to avoid timezone issues
        cellNF: false,
        cellText: false,
        raw: true,  // Get raw values to handle dates ourselves
        sheetStubs: true  // Include empty cells
      });
    } catch (error) {
      throw new Error(`Invalid Excel file format: ${error.message}`);
    }
  }

  /**
   * Extract data from the first sheet
   * @private
   */
  extractSheetData(workbook) {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      throw new Error(`Cannot read sheet: ${sheetName}`);
    }
    
    // Convert to JSON array (array of arrays)
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: true,  // Get raw values including Excel serial dates
      dateNF: 'yyyy-mm-dd',
      blankrows: false  // Skip blank rows
    });
    
    if (!rawData || rawData.length < 2) {
      throw new Error('Excel file contains no data rows');
    }
    
    return rawData;
  }

  /**
   * Validate the structure of extracted data
   * @private
   */
  validateDataStructure(rawData) {
    const warnings = [];
    const errors = [];
    
    // Check header row
    const headers = rawData[0];
    if (!headers) {
      errors.push('Missing header row');
      return { isValid: false, errors, warnings };
    }
    
    // Check for minimum required columns
    const requiredColumns = [
      'EXTERNAL_ID',
      'LOAN_NUMBER', 
      'LOAN_AMOUNT',
      'CLIENT_ID'
    ];
    
    for (const colName of requiredColumns) {
      const colIndex = this.columnMap[colName];
      if (colIndex !== undefined && !headers[colIndex]) {
        warnings.push(`Missing expected column at index ${colIndex}: ${colName}`);
      }
    }
    
    // Check data rows
    if (rawData.length < 2) {
      warnings.push('No data rows found (only headers)');
    }
    
    // Check for completely empty rows
    let emptyRowCount = 0;
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => cell === null || cell === '')) {
        emptyRowCount++;
      }
    }
    
    if (emptyRowCount > 0) {
      warnings.push(`Found ${emptyRowCount} empty rows that will be skipped`);
    }
    
    // Check column count consistency
    const headerColCount = headers.length;
    let inconsistentRows = 0;
    
    for (let i = 1; i < Math.min(10, rawData.length); i++) {
      if (rawData[i] && rawData[i].length !== headerColCount) {
        inconsistentRows++;
      }
    }
    
    if (inconsistentRows > 0) {
      warnings.push(`${inconsistentRows} rows have different column counts than header`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalRows: rawData.length - 1,  // Exclude header
        totalColumns: headerColCount,
        emptyRows: emptyRowCount
      }
    };
  }

  /**
   * Get a preview of the data (for debugging)
   * @param {Array} rawData - Raw data array
   * @param {number} rows - Number of rows to preview
   */
  getDataPreview(rawData, rows = 5) {
    const preview = {
      headers: rawData[0],
      sampleRows: [],
      stats: {
        totalRows: rawData.length - 1,
        totalColumns: rawData[0] ? rawData[0].length : 0
      }
    };
    
    // Get sample rows (skip header)
    for (let i = 1; i <= Math.min(rows, rawData.length - 1); i++) {
      preview.sampleRows.push({
        rowNumber: i + 1,  // Excel row number (1-indexed, including header)
        data: rawData[i]
      });
    }
    
    return preview;
  }

  /**
   * Extract specific column by name
   * @param {Array} rawData - Raw data array
   * @param {string} columnName - Name from COLUMN_MAP
   * @returns {Array} Column values (excluding header)
   */
  extractColumn(rawData, columnName) {
    const colIndex = this.columnMap[columnName];
    if (colIndex === undefined) {
      throw new Error(`Unknown column name: ${columnName}`);
    }
    
    const values = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < rawData.length; i++) {
      if (rawData[i]) {
        values.push(rawData[i][colIndex]);
      }
    }
    
    return values;
  }

  /**
   * Get unique values from a column (useful for debugging)
   * @param {Array} rawData - Raw data array  
   * @param {string} columnName - Name from COLUMN_MAP
   * @returns {Array} Unique values in column
   */
  getUniqueColumnValues(rawData, columnName) {
    const values = this.extractColumn(rawData, columnName);
    return [...new Set(values)].filter(v => v !== null && v !== '');
  }

  /**
   * Check if file is valid Excel format
   * @param {File} file - File to check
   * @returns {boolean}
   */
  static isValidExcelFile(file) {
    if (!file || !file.name) return false;
    
    const validExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb'];
    const fileName = file.name.toLowerCase();
    
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Get file info (for logging/debugging)
   * @param {File} file - Excel file
   * @returns {Object} File metadata
   */
  static getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
      isValid: ExcelParser.isValidExcelFile(file)
    };
  }
}

/**
 * Export singleton instance for convenience
 * But also export class for testing
 */
export const excelParser = new ExcelParser();