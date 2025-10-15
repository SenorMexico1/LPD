// src/services/etl/ETLService.js

/**
 * ETLService - Facade Pattern
 * Orchestrates all ETL modules while maintaining backward compatibility
 */

import { ExcelParser } from './modules/ExcelParser';
import { DataTransformer } from './modules/DataTransformer';
import { DateUtility } from './modules/DateUtility';
import { StatusCalculator } from './modules/StatusCalculator';
import { RiskCalculator } from './modules/RiskCalculator';
import { TransactionProcessor } from './modules/TransactionProcessor';
import { PaymentAnalyzer } from './modules/PaymentAnalyzer';
import { SharedUtilities } from './modules/SharedUtilities';

export class ETLService {
  constructor() {
    // Initialize all modules
    this.excelParser = new ExcelParser();
    this.dataTransformer = new DataTransformer();
    this.dateUtil = new DateUtility();
    this.statusCalculator = new StatusCalculator();
    this.riskCalculator = new RiskCalculator();
    this.transactionProcessor = new TransactionProcessor();
    this.paymentAnalyzer = new PaymentAnalyzer();
    this.utils = new SharedUtilities();
    
    // Store for processed data
    this.lastProcessedData = null;
  }

  /**
   * Main entry point - Extract data from Excel file
   * Maintains backward compatibility
   * @param {File} file - Excel file to process
   * @returns {Promise<Array>} Raw data rows from Excel
   */
  async extractFromExcel(file) {
    try {
      // Use ExcelParser module
      const rawData = await this.excelParser.extractFromExcel(file);
      
      // Store for potential reprocessing
      this.lastProcessedData = rawData;
      
      return rawData;
    } catch (error) {
      console.error('ETL Service - Excel extraction failed:', error);
      throw new Error(`Failed to extract data from Excel: ${error.message}`);
    }
  }

  /**
   * Transform raw data to loan objects
   * Maintains backward compatibility
   * @param {Array} rawData - Raw data from Excel
   * @returns {Array} Transformed loan objects with all calculations
   */
  transformToLoans(rawData) {
    try {
      // Step 1: Use DataTransformer to create base loan objects
      const loans = this.dataTransformer.transformToLoans(rawData);
      
      // Step 2: Process each loan through all modules
      const processedLoans = loans.map(loan => this.processLoan(loan));
      
      // Step 3: Post-processing and validation
      return this.postProcessLoans(processedLoans);
    } catch (error) {
      console.error('ETL Service - Transformation failed:', error);
      throw new Error(`Failed to transform data: ${error.message}`);
    }
  }

  /**
   * Process individual loan through all modules
   * @private
   * @param {Object} loan - Base loan object
   * @returns {Object} Fully processed loan
   */
  processLoan(loan) {
    try {
      // Process transactions first
      if (loan.transactions && loan.transactions.length > 0) {
        const processedTransactions = this.transactionProcessor.processTransactions(
          loan.transactions,
          loan
        );
        loan.transactions = processedTransactions.transactions;
        loan.transactionSummary = processedTransactions.summary;
      }
      
      // Calculate status
      const statusCalculation = this.statusCalculator.calculate(loan);
      loan.statusCalculation = statusCalculation;
      loan.status = statusCalculation.status;
      loan.missedPayments = statusCalculation.missedPayments;
      loan.daysDelinquent = this.statusCalculator.calculateDaysDelinquent(loan);
      
      // Detect catch-up payments
      loan.catchUpPayments = this.statusCalculator.detectCatchUpPayments(loan);
      
      // Analyze payments
      const paymentAnalysis = this.paymentAnalyzer.analyze(loan);
      loan.paymentMatching = paymentAnalysis.paymentMatching;
      loan.paymentVelocity = paymentAnalysis.paymentVelocity;
      loan.collectionMetrics = paymentAnalysis.collectionMetrics;
      loan.paymentPatterns = paymentAnalysis.paymentPatterns;
      loan.paymentAnomalies = paymentAnalysis.anomalies;
      loan.paymentForecast = paymentAnalysis.forecast;
      
      // Calculate risk score
      const riskAssessment = this.riskCalculator.calculate(loan);
      loan.riskScore = riskAssessment.score;
      loan.riskLevel = riskAssessment.level;
      loan.riskBreakdown = riskAssessment.breakdown;
      loan.riskFactors = riskAssessment.factors;
      loan.riskRecommendation = riskAssessment.recommendation;
      
      // Calculate additional metrics
      loan.dscr = this.riskCalculator.calculateDSCR(loan);
      
      // Add processing metadata
      loan.processedAt = new Date().toISOString();
      loan.etlVersion = '2.0.0';
      
      return loan;
    } catch (error) {
      console.error(`ETL Service - Failed to process loan ${loan.loanNumber}:`, error);
      // Return loan with error flag rather than throwing
      loan.processingError = error.message;
      return loan;
    }
  }

  /**
   * Post-process all loans for portfolio-level calculations
   * @private
   * @param {Array} loans - Processed loans
   * @returns {Array} Loans with portfolio metrics
   */
  postProcessLoans(loans) {
    // Calculate portfolio-level metrics
    const portfolioMetrics = this.calculatePortfolioMetrics(loans);
    
    // Add relative metrics to each loan
    loans.forEach(loan => {
      // Add portfolio position
      loan.portfolioPosition = {
        riskPercentile: this.calculatePercentile(
          loans.map(l => l.riskScore),
          loan.riskScore
        ),
        sizePercentile: this.calculatePercentile(
          loans.map(l => l.loanAmount),
          loan.loanAmount
        ),
        performancePercentile: this.calculatePercentile(
          loans.map(l => l.collectionMetrics?.collectionRate || 0),
          loan.collectionMetrics?.collectionRate || 0
        )
      };
      
      // Add portfolio metrics reference
      loan.portfolioMetrics = portfolioMetrics;
    });
    
    return loans;
  }

  /**
   * Calculate portfolio-wide metrics
   * @private
   * @param {Array} loans - All loans
   * @returns {Object} Portfolio metrics
   */
  calculatePortfolioMetrics(loans) {
    const metrics = {
      totalLoans: loans.length,
      totalAmount: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      averageRiskScore: 0,
      statusDistribution: {},
      industryDistribution: {},
      riskDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      collectionRate: 0,
      defaultRate: 0
    };
    
    // Calculate distributions and totals
    loans.forEach(loan => {
      // Amounts
      metrics.totalAmount += loan.loanAmount || 0;
      metrics.totalCollected += loan.collectionMetrics?.collectedToDate || 0;
      metrics.totalOutstanding += loan.collectionMetrics?.outstanding || 0;
      
      // Risk score
      metrics.averageRiskScore += loan.riskScore || 0;
      
      // Status distribution
      const status = loan.status || 'unknown';
      metrics.statusDistribution[status] = (metrics.statusDistribution[status] || 0) + 1;
      
      // Risk distribution
      const riskLevel = (loan.riskLevel || 'medium').toLowerCase();
      if (metrics.riskDistribution[riskLevel] !== undefined) {
        metrics.riskDistribution[riskLevel]++;
      }
      
      // Industry distribution
      const industry = loan.client?.industrySector || 'Unknown';
      metrics.industryDistribution[industry] = (metrics.industryDistribution[industry] || 0) + 1;
    });
    
    // Calculate rates and averages
    metrics.averageRiskScore = loans.length > 0 ? 
      metrics.averageRiskScore / loans.length : 0;
    
    metrics.collectionRate = metrics.totalAmount > 0 ?
      (metrics.totalCollected / metrics.totalAmount) * 100 : 0;
    
    metrics.defaultRate = loans.length > 0 ?
      ((metrics.statusDistribution.default || 0) / loans.length) * 100 : 0;
    
    return metrics;
  }

  /**
   * Calculate percentile rank
   * @private
   * @param {Array<number>} values - All values
   * @param {number} value - Value to rank
   * @returns {number} Percentile (0-100)
   */
  calculatePercentile(values, value) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    if (index === 0) return 0;
    
    return (index / sorted.length) * 100;
  }

  // ============================================
  // BACKWARD COMPATIBILITY METHODS
  // These maintain the original interface
  // ============================================

  /**
   * Legacy method - Calculate loan status
   * @deprecated Use StatusCalculator.calculate() instead
   */
  calculateLoanStatus(loan) {
    return this.statusCalculator.calculate(loan);
  }

  /**
   * Legacy method - Match payments to schedule
   * @deprecated Use PaymentAnalyzer.matchPaymentsToSchedule() instead
   */
  matchPaymentsToSchedule(loan) {
    return this.paymentAnalyzer.matchPaymentsToSchedule(loan);
  }

  /**
   * Legacy method - Detect catch-up payments
   * @deprecated Use StatusCalculator.detectCatchUpPayments() instead
   */
  detectCatchUpPayments(loan) {
    return this.statusCalculator.detectCatchUpPayments(loan);
  }

  /**
   * Legacy method - Calculate risk score
   * @deprecated Use RiskCalculator.calculate() instead
   */
  calculateRiskScore(loan) {
    const assessment = this.riskCalculator.calculate(loan);
    return assessment.score;
  }

  /**
   * Legacy method - Parse date
   * @deprecated Use DateUtility.parseDate() instead
   */
  parseDate(value) {
    return this.dateUtil.parseDate(value);
  }

  /**
   * Legacy method - Parse number
   * @deprecated Use SharedUtilities.parseNumber() instead
   */
  parseNumber(value) {
    return this.utils.parseNumber(value);
  }

  /**
   * Legacy method - Process loan data
   * @deprecated Used internally for backward compatibility
   */
  processLoanData(loan) {
    return this.processLoan(loan);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get summary statistics for processed loans
   * @param {Array} loans - Processed loans
   * @returns {Object} Summary statistics
   */
  getSummaryStatistics(loans) {
    if (!loans || loans.length === 0) {
      return null;
    }
    
    return {
      portfolio: this.calculatePortfolioMetrics(loans),
      statusBreakdown: this.getStatusBreakdown(loans),
      riskAnalysis: this.getRiskAnalysis(loans),
      collectionAnalysis: this.getCollectionAnalysis(loans),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get status breakdown
   * @private
   */
  getStatusBreakdown(loans) {
    const breakdown = {
      current: { count: 0, amount: 0, percentage: 0 },
      delinquent_1: { count: 0, amount: 0, percentage: 0 },
      delinquent_2: { count: 0, amount: 0, percentage: 0 },
      delinquent_3: { count: 0, amount: 0, percentage: 0 },
      default: { count: 0, amount: 0, percentage: 0 },
      restructured: { count: 0, amount: 0, percentage: 0 }
    };
    
    loans.forEach(loan => {
      const status = loan.status || 'unknown';
      if (breakdown[status]) {
        breakdown[status].count++;
        breakdown[status].amount += loan.loanAmount || 0;
      }
    });
    
    // Calculate percentages
    Object.keys(breakdown).forEach(status => {
      breakdown[status].percentage = loans.length > 0 ?
        (breakdown[status].count / loans.length) * 100 : 0;
    });
    
    return breakdown;
  }

  /**
   * Get risk analysis
   * @private
   */
  getRiskAnalysis(loans) {
    const analysis = {
      averageScore: 0,
      distribution: { low: 0, medium: 0, high: 0, critical: 0 },
      topFactors: [],
      highestRiskLoans: []
    };
    
    // Calculate average and distribution
    loans.forEach(loan => {
      analysis.averageScore += loan.riskScore || 0;
      const level = (loan.riskLevel || 'medium').toLowerCase();
      if (analysis.distribution[level] !== undefined) {
        analysis.distribution[level]++;
      }
    });
    
    analysis.averageScore = loans.length > 0 ?
      analysis.averageScore / loans.length : 0;
    
    // Get highest risk loans
    analysis.highestRiskLoans = loans
      .filter(loan => loan.riskScore > 70)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map(loan => ({
        loanNumber: loan.loanNumber,
        merchantName: loan.client?.name || loan.merchantName,
        riskScore: loan.riskScore,
        status: loan.status,
        amount: loan.loanAmount
      }));
    
    // Aggregate top risk factors
    const factorCounts = {};
    loans.forEach(loan => {
      if (loan.riskFactors) {
        loan.riskFactors.forEach(factor => {
          const key = factor.factor;
          if (!factorCounts[key]) {
            factorCounts[key] = { count: 0, totalScore: 0 };
          }
          factorCounts[key].count++;
          factorCounts[key].totalScore += factor.score;
        });
      }
    });
    
    analysis.topFactors = Object.entries(factorCounts)
      .map(([factor, data]) => ({
        factor,
        frequency: data.count,
        averageScore: data.totalScore / data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    return analysis;
  }

  /**
   * Get collection analysis
   * @private
   */
  getCollectionAnalysis(loans) {
    const analysis = {
      totalExpected: 0,
      totalCollected: 0,
      collectionRate: 0,
      onTimePaymentRate: 0,
      averageDaysDelinquent: 0,
      loansWithCatchUps: 0,
      totalCatchUpAmount: 0
    };
    
    let onTimeCount = 0;
    let totalPayments = 0;
    let delinquentCount = 0;
    
    loans.forEach(loan => {
      // Collection amounts
      analysis.totalExpected += loan.collectionMetrics?.expectedToDate || 0;
      analysis.totalCollected += loan.collectionMetrics?.collectedToDate || 0;
      
      // On-time payments
      if (loan.collectionMetrics?.onTimePaymentRate) {
        onTimeCount += loan.collectionMetrics.onTimePaymentRate;
        totalPayments++;
      }
      
      // Delinquency
      if (loan.daysDelinquent > 0) {
        analysis.averageDaysDelinquent += loan.daysDelinquent;
        delinquentCount++;
      }
      
      // Catch-up payments
      if (loan.catchUpPayments && loan.catchUpPayments.length > 0) {
        analysis.loansWithCatchUps++;
        loan.catchUpPayments.forEach(catchUp => {
          analysis.totalCatchUpAmount += catchUp.amount;
        });
      }
    });
    
    // Calculate rates
    analysis.collectionRate = analysis.totalExpected > 0 ?
      (analysis.totalCollected / analysis.totalExpected) * 100 : 0;
    
    analysis.onTimePaymentRate = totalPayments > 0 ?
      onTimeCount / totalPayments : 0;
    
    analysis.averageDaysDelinquent = delinquentCount > 0 ?
      analysis.averageDaysDelinquent / delinquentCount : 0;
    
    return analysis;
  }

  /**
   * Export processed data to JSON
   * @param {Array} loans - Processed loans
   * @returns {string} JSON string
   */
  exportToJSON(loans) {
    const exportData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      summary: this.getSummaryStatistics(loans),
      loans: loans
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Validate loan data
   * @param {Object} loan - Loan to validate
   * @returns {Object} Validation result
   */
  validateLoan(loan) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!loan.loanNumber) errors.push('Missing loan number');
    if (!loan.loanAmount || loan.loanAmount <= 0) errors.push('Invalid loan amount');
    if (!loan.contractDate) errors.push('Missing contract date');
    
    // Data quality warnings
    if (!loan.client?.name) warnings.push('Missing client name');
    if (!loan.lead?.fico) warnings.push('Missing FICO score');
    if (!loan.paydates || loan.paydates.length === 0) warnings.push('No payment schedule');
    
    // Logical consistency
    if (loan.collectionMetrics?.collectedToDate > loan.loanAmount) {
      warnings.push('Collected amount exceeds loan amount');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export as default for backward compatibility
export default ETLService;