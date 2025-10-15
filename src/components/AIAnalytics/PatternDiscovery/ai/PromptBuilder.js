// src/components/AIAnalytics/PatternDiscovery/ai/PromptBuilder.js

/**
 * Advanced prompt builder for multi-pattern discovery
 * Creates sophisticated prompts that extract maximum insights from actual loan data
 */

export class PromptBuilder {
  constructor(config = {}) {
    this.minPatterns = config.minPatterns || 5;
    this.maxPatterns = config.maxPatterns || 10;
    this.confidenceThreshold = config.confidenceThreshold || 70;
    this.depthLevel = config.depthLevel || 'comprehensive';
  }

  /**
   * Build comprehensive multi-pattern discovery prompt
   */
  buildComprehensivePrompt(data, analysisType = 'comprehensive') {
    const { loans, metrics, external, statistics } = data;
    
    // Calculate actual statistics from user's data
    const actualStats = this.calculateRealStatistics(loans, metrics);
    
    return `You are an expert financial analyst discovering hidden patterns in loan portfolio data.

CRITICAL INSTRUCTIONS:
1. Find between ${this.minPatterns} and ${this.maxPatterns} DISTINCT, NON-OBVIOUS patterns
2. Each pattern must be statistically significant (p < 0.05) and actionable
3. DO NOT state obvious patterns like "delinquent loans are risky"
4. Focus on unexpected correlations and hidden opportunities
5. Use ONLY the actual loan data provided - no hypothetical examples
6. Respond with ONLY valid JSON, no markdown, no backticks

ACTUAL PORTFOLIO STATISTICS:
- Total Loans: ${actualStats.totalLoans}
- Portfolio Value: $${actualStats.totalValue.toLocaleString()}
- Average Loan Size: $${actualStats.avgLoanSize.toLocaleString()}
- Default Rate: ${actualStats.defaultRate.toFixed(2)}%
- Average FICO: ${actualStats.avgFICO}
- Average DSCR: ${actualStats.avgDSCR.toFixed(2)}
- Top Industries: ${actualStats.topIndustries.join(', ')}
- Top Locations: ${actualStats.topLocations.join(', ')}
- Date Range: ${actualStats.dateRange}

${external ? `
EXTERNAL MARKET CONTEXT:
- Fed Rate: ${external.economic?.fedFundsRate?.value}%
- Unemployment: ${external.economic?.unemployment?.value}%
- Economic Environment: ${external.summary?.macroEnvironment}
- Key Risks: ${external.summary?.keyRiskFactors?.join(', ') || 'None identified'}
` : ''}

DETAILED LOAN DATA (${loans.length} loans):
${this.formatLoanDataForAnalysis(loans)}

PATTERN DISCOVERY REQUIREMENTS:
${this.getAnalysisRequirements(analysisType)}

STATISTICAL VALIDATION:
- Each pattern must show statistical significance
- Include correlation coefficients where applicable
- Provide confidence intervals
- Show sample size for each pattern
- Calculate exact financial impact based on actual loan amounts

OUTPUT FORMAT (JSON only):
${this.getOutputFormat()}`;
  }

  /**
   * Build focused prompt for specific analysis type
   */
  buildFocusedPrompt(data, analysisType) {
    const basePrompt = this.buildComprehensivePrompt(data, analysisType);
    const focusInstructions = this.getFocusInstructions(analysisType);
    
    return basePrompt.replace('PATTERN DISCOVERY REQUIREMENTS:', 
      `PATTERN DISCOVERY REQUIREMENTS:\n${focusInstructions}\n`);
  }

  /**
   * Calculate real statistics from actual loan data
   */
  calculateRealStatistics(loans, metrics) {
    if (!loans || loans.length === 0) {
      return {
        totalLoans: 0,
        totalValue: 0,
        avgLoanSize: 0,
        defaultRate: 0,
        avgFICO: 0,
        avgDSCR: 0,
        topIndustries: [],
        topLocations: [],
        dateRange: 'No data'
      };
    }

    const totalValue = loans.reduce((sum, loan) => sum + (loan.remainingAmount || loan.loanAmount || 0), 0);
    const defaultCount = loans.filter(loan => 
      loan.status === 'default' || loan.status === 'charged_off'
    ).length;
    
    const industries = {};
    const locations = {};
    
    loans.forEach(loan => {
      if (loan.client?.industrySector) {
        industries[loan.client.industrySector] = (industries[loan.client.industrySector] || 0) + 1;
      }
      if (loan.client?.state) {
        locations[loan.client.state] = (locations[loan.client.state] || 0) + 1;
      }
    });

    const topIndustries = Object.entries(industries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([industry]) => industry);

    const topLocations = Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location]) => location);

    const dates = loans
      .map(loan => new Date(loan.payoutDate || loan.originationDate))
      .filter(date => !isNaN(date));
    
    const minDate = dates.length ? new Date(Math.min(...dates)) : new Date();
    const maxDate = dates.length ? new Date(Math.max(...dates)) : new Date();

    return {
      totalLoans: loans.length,
      totalValue,
      avgLoanSize: totalValue / loans.length,
      defaultRate: (defaultCount / loans.length) * 100,
      avgFICO: metrics?.summary?.avgFICO || 
        loans.reduce((sum, loan) => sum + (loan.creditScore || 0), 0) / loans.length,
      avgDSCR: metrics?.summary?.avgDSCR || 
        loans.reduce((sum, loan) => sum + (loan.dscr || 0), 0) / loans.length,
      topIndustries,
      topLocations,
      dateRange: `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`
    };
  }

  /**
   * Format loan data for AI analysis
   */
  formatLoanDataForAnalysis(loans) {
    // Take a representative sample if too many loans
    const sampleSize = Math.min(loans.length, 100);
    const sampledLoans = loans.slice(0, sampleSize);
    
    return JSON.stringify(sampledLoans.map(loan => ({
      loanNumber: loan.loanNumber,
      status: loan.status,
      amount: loan.loanAmount || loan.remainingAmount,
      remainingAmount: loan.remainingAmount,
      industry: loan.client?.industrySector,
      location: `${loan.client?.city}, ${loan.client?.state}`,
      creditScore: loan.creditScore,
      dscr: loan.dscr,
      paymentVelocity: loan.paymentVelocity,
      monthsSinceOrigination: loan.monthsSinceOrigination,
      delinquencyDays: loan.delinquencyDays || 0,
      term: loan.term,
      rate: loan.rate,
      collectionRate: loan.collectionRate,
      yearInBusiness: loan.client?.yearInBusiness,
      payoutDate: loan.payoutDate,
      lastPaymentDate: loan.lastPaymentDate
    })), null, 2);
  }

  /**
   * Get analysis-specific requirements
   */
  getAnalysisRequirements(analysisType) {
    const requirements = {
      comprehensive: `
- Find patterns across ALL dimensions: geographic, industry, credit, temporal, behavioral
- Identify both opportunities AND risks
- Look for surprising correlations between unrelated factors
- Find segments that outperform/underperform expectations
- Discover early warning signals that predict future problems
- Identify expansion opportunities based on successful patterns`,
      
      opportunities: `
- Focus on HIGH-PERFORMING segments that are UNDERREPRESENTED in portfolio
- Find combinations of factors that lead to exceptional performance
- Identify geographic or industry niches with untapped potential
- Calculate revenue opportunity if these segments were expanded
- Look for loans that could be refinanced or upsold
- Find patterns of early payoff that indicate strong businesses`,
      
      risks: `
- Identify EARLY WARNING signals that appear 30-90 days before default
- Find combinations of factors that create hidden risk
- Discover geographic or industry concentrations of risk
- Identify loans showing deteriorating payment patterns
- Find correlations between external factors and loan performance
- Predict which specific loans are most likely to default soon`,
      
      geographic: `
- Find city/state clusters with unusual performance patterns
- Identify geographic expansion opportunities
- Discover correlations between location and industry performance
- Find weather/economic events affecting specific regions
- Identify best and worst performing metropolitan areas
- Calculate optimal geographic portfolio distribution`,
      
      industry: `
- Discover industry sectors with changing risk profiles
- Find industries affected by recent economic changes
- Identify seasonal patterns by industry
- Discover industry combinations that reduce portfolio risk
- Find emerging industries with strong performance
- Identify industries requiring adjusted underwriting`,
      
      temporal: `
- Find day-of-week, month, quarter payment patterns
- Identify seasonal business cycles by industry/location
- Discover optimal loan origination timing
- Find patterns in payment delays by time of year
- Identify vintage cohorts with unusual performance
- Discover time-based early warning signals`
    };
    
    return requirements[analysisType] || requirements.comprehensive;
  }

  /**
   * Get detailed output format
   */
  getOutputFormat() {
    return `{
  "patterns": [
    {
      "id": "pattern_[number]",
      "type": "opportunity|risk|correlation|anomaly|seasonal|geographic|industry",
      "title": "Specific, actionable pattern title",
      "description": "Detailed explanation using actual loan numbers and data",
      "confidence": [70-100],
      "statisticalSignificance": [0.001-0.05],
      "affectedLoans": ["actual_loan_id_1", "actual_loan_id_2", ...],
      "affectedCount": [number],
      "affectedPercentage": [percentage of portfolio],
      "financialImpact": [exact dollar amount],
      "impactType": "revenue_opportunity|cost_savings|risk_mitigation|loss_prevention",
      "factors": {
        "primary": ["specific factor like 'state:Texas' or 'industry:Restaurant'"],
        "secondary": ["additional factors"],
        "correlation": [0.0-1.0]
      },
      "metrics": {
        "performanceMetric": "[specific percentage or value]",
        "comparedTo": "portfolio average|industry benchmark|historical performance",
        "sampleSize": [number of loans in pattern],
        "timeframe": "historical|current|projected timeframe"
      },
      "evidence": {
        "dataPoints": "Specific evidence from the data",
        "statisticalTest": "t-test|chi-square|regression|correlation",
        "pValue": [0.001-0.05],
        "confidenceInterval": "[lower, upper]"
      },
      "recommendation": {
        "immediate": "Specific action to take within 24-48 hours",
        "shortTerm": "Actions for next 1-4 weeks",
        "longTerm": "Strategic changes for next quarter",
        "expectedROI": "Quantified return if recommendation followed"
      },
      "visualization": {
        "recommendedType": "heatmap|scatter|trend|matrix|network",
        "keyDataPoints": ["data points to highlight in visualization"]
      }
    }
  ],
  "summary": {
    "totalPatternsFound": [number],
    "highConfidencePatterns": [number with confidence > 80%],
    "totalFinancialImpact": [sum of all pattern impacts],
    "portfolioCoverage": "[percentage of portfolio affected by patterns]",
    "topInsight": "Most important finding for executives",
    "immediateActionRequired": [true/false],
    "criticalLoans": ["loans requiring immediate attention"]
  },
  "methodology": {
    "analysisDepth": "${this.depthLevel}",
    "dataQuality": [0.0-1.0 score],
    "statisticalMethods": ["methods used"],
    "limitations": ["any data limitations noticed"]
  }
}`;
  }

  /**
   * Get focus instructions for specific analysis types
   */
  getFocusInstructions(analysisType) {
    const instructions = {
      opportunities: 'FOCUS: Find hidden revenue opportunities and underexploited segments',
      risks: 'FOCUS: Identify early warning signals and risk concentrations',
      geographic: 'FOCUS: Discover location-based patterns and regional opportunities',
      industry: 'FOCUS: Find industry-specific insights and sector correlations',
      temporal: 'FOCUS: Identify time-based patterns and seasonal trends',
      recovery: 'FOCUS: Discover what drives successful loan recovery'
    };
    
    return instructions[analysisType] || '';
  }

  /**
   * Build comparison prompt for pattern validation
   */
  buildValidationPrompt(pattern, loans) {
    return `Validate this discovered pattern against the loan data:
Pattern: ${JSON.stringify(pattern)}
Affected Loans: ${JSON.stringify(loans)}

Confirm:
1. Statistical significance (calculate actual p-value)
2. Financial impact accuracy
3. Affected loan count is correct
4. Pattern holds true for the specified loans

Return validation result as JSON.`;
  }
}