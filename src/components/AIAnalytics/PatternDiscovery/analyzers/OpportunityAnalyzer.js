// src/components/AIAnalytics/PatternDiscovery/analyzers/OpportunityAnalyzer.js

/**
 * Opportunity Analyzer - Finds hidden revenue opportunities in actual loan data
 */

export class OpportunityAnalyzer {
  constructor(loans, portfolioMetrics) {
    this.loans = loans;
    this.metrics = portfolioMetrics;
  }

  /**
   * Analyze portfolio for revenue opportunities
   */
  analyze() {
    const opportunities = [];

    // 1. Underrepresented high-performing segments
    const segmentOpportunities = this.findUnderrepresentedSegments();
    opportunities.push(...segmentOpportunities);

    // 2. Refinancing opportunities
    const refiOpportunities = this.findRefinancingOpportunities();
    opportunities.push(...refiOpportunities);

    // 3. Geographic expansion opportunities
    const geoOpportunities = this.findGeographicOpportunities();
    opportunities.push(...geoOpportunities);

    // 4. Industry expansion opportunities
    const industryOpportunities = this.findIndustryOpportunities();
    opportunities.push(...industryOpportunities);

    // 5. Loan size optimization
    const sizeOpportunities = this.findLoanSizeOpportunities();
    opportunities.push(...sizeOpportunities);

    // 6. Cross-sell opportunities
    const crossSellOpportunities = this.findCrossSellOpportunities();
    opportunities.push(...crossSellOpportunities);

    return opportunities;
  }

  /**
   * Find underrepresented segments that perform well
   */
  findUnderrepresentedSegments() {
    const opportunities = [];
    const segments = this.segmentPortfolio();
    
    segments.forEach(segment => {
      const performance = this.calculateSegmentPerformance(segment);
      
      if (performance.defaultRate < this.metrics.summary.defaultRate * 0.5 && 
          segment.loans.length < this.loans.length * 0.05) {
        
        const potentialRevenue = this.calculateExpansionRevenue(segment, performance);
        
        opportunities.push({
          type: 'underrepresented_segment',
          title: `High-performing ${segment.description} segment`,
          description: `${segment.description} shows ${performance.defaultRate.toFixed(1)}% default rate vs ${this.metrics.summary.defaultRate.toFixed(1)}% portfolio average`,
          confidence: this.calculateConfidence(segment.loans.length),
          impact: potentialRevenue,
          affectedLoans: segment.loans.map(l => l.loanNumber),
          metrics: {
            currentSize: segment.loans.length,
            currentValue: segment.totalValue,
            performanceRatio: performance.defaultRate / this.metrics.summary.defaultRate,
            expansionPotential: Math.round(potentialRevenue / segment.totalValue * 100)
          },
          recommendation: {
            immediate: `Review the ${segment.loans.length} loans in this segment for patterns`,
            shortTerm: `Develop targeted marketing for ${segment.description}`,
            longTerm: `Increase allocation to this segment by ${Math.round(potentialRevenue / 100000) * 100}K`
          }
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Find refinancing opportunities
   */
  findRefinancingOpportunities() {
    const opportunities = [];
    const eligibleLoans = this.loans.filter(loan => {
      const monthsOld = loan.monthsSinceOrigination || 0;
      const hasGoodPayment = loan.delinquencyDays === 0 || loan.delinquencyDays < 30;
      const hasHighRate = loan.rate > (this.metrics.summary.avgRate || 10);
      
      return monthsOld > 12 && hasGoodPayment && hasHighRate;
    });
    
    if (eligibleLoans.length > 5) {
      const potentialSavings = eligibleLoans.reduce((sum, loan) => {
        const rateDiff = (loan.rate - (this.metrics.summary.avgRate || 10)) / 100;
        return sum + (loan.remainingAmount * rateDiff * 0.5); // Assume 50% take rate
      }, 0);
      
      opportunities.push({
        type: 'refinancing',
        title: 'Refinancing opportunity for performing loans',
        description: `${eligibleLoans.length} loans with good payment history have above-average rates`,
        confidence: 85,
        impact: potentialSavings,
        affectedLoans: eligibleLoans.slice(0, 20).map(l => l.loanNumber),
        metrics: {
          eligibleCount: eligibleLoans.length,
          avgCurrentRate: (eligibleLoans.reduce((s, l) => s + l.rate, 0) / eligibleLoans.length).toFixed(2),
          potentialNewRate: this.metrics.summary.avgRate || 10,
          totalEligibleBalance: eligibleLoans.reduce((s, l) => s + l.remainingAmount, 0)
        },
        recommendation: {
          immediate: 'Contact top 10 eligible borrowers with refinancing offers',
          shortTerm: 'Create automated refinancing eligibility system',
          longTerm: 'Implement proactive refinancing program'
        }
      });
    }
    
    return opportunities;
  }

  /**
   * Find geographic expansion opportunities
   */
  findGeographicOpportunities() {
    const opportunities = [];
    const geoPerformance = {};
    
    this.loans.forEach(loan => {
      const state = loan.client?.state;
      if (!state) return;
      
      if (!geoPerformance[state]) {
        geoPerformance[state] = {
          loans: [],
          defaults: 0,
          totalAmount: 0
        };
      }
      
      geoPerformance[state].loans.push(loan);
      geoPerformance[state].totalAmount += loan.remainingAmount || 0;
      if (loan.status === 'default' || loan.status === 'charged_off') {
        geoPerformance[state].defaults++;
      }
    });
    
    // Find high-performing states with low representation
    Object.entries(geoPerformance).forEach(([state, data]) => {
      const defaultRate = data.loans.length > 0 ? (data.defaults / data.loans.length) * 100 : 0;
      const representation = data.loans.length / this.loans.length;
      
      if (defaultRate < this.metrics.summary.defaultRate * 0.7 && 
          representation < 0.1 && 
          data.loans.length >= 3) {
        
        opportunities.push({
          type: 'geographic_expansion',
          title: `Expand lending in ${state}`,
          description: `${state} shows ${defaultRate.toFixed(1)}% default rate with only ${(representation * 100).toFixed(1)}% of portfolio`,
          confidence: this.calculateConfidence(data.loans.length),
          impact: data.totalAmount * 2, // Assume doubling presence
          affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber),
          metrics: {
            currentLoans: data.loans.length,
            defaultRate: defaultRate,
            portfolioShare: representation * 100,
            avgLoanSize: data.totalAmount / data.loans.length
          },
          recommendation: {
            immediate: `Analyze successful loans in ${state} for common factors`,
            shortTerm: `Develop targeted marketing campaign for ${state}`,
            longTerm: `Establish local partnerships in ${state}`
          }
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Find industry expansion opportunities
   */
  findIndustryOpportunities() {
    const opportunities = [];
    const industryPerformance = {};
    
    this.loans.forEach(loan => {
      const industry = loan.client?.industrySector;
      if (!industry) return;
      
      if (!industryPerformance[industry]) {
        industryPerformance[industry] = {
          loans: [],
          defaults: 0,
          totalAmount: 0,
          avgDSCR: 0
        };
      }
      
      industryPerformance[industry].loans.push(loan);
      industryPerformance[industry].totalAmount += loan.remainingAmount || 0;
      industryPerformance[industry].avgDSCR += loan.dscr || 0;
      
      if (loan.status === 'default' || loan.status === 'charged_off') {
        industryPerformance[industry].defaults++;
      }
    });
    
    // Analyze each industry
    Object.entries(industryPerformance).forEach(([industry, data]) => {
      data.avgDSCR = data.avgDSCR / data.loans.length;
      const defaultRate = (data.defaults / data.loans.length) * 100;
      
      if (defaultRate < this.metrics.summary.defaultRate * 0.6 && 
          data.avgDSCR > 1.5 &&
          data.loans.length >= 5) {
        
        opportunities.push({
          type: 'industry_expansion',
          title: `${industry} sector opportunity`,
          description: `${industry} shows exceptional performance with ${defaultRate.toFixed(1)}% defaults and ${data.avgDSCR.toFixed(2)} avg DSCR`,
          confidence: this.calculateConfidence(data.loans.length),
          impact: data.totalAmount * 1.5,
          affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber),
          metrics: {
            sectorLoans: data.loans.length,
            defaultRate: defaultRate,
            avgDSCR: data.avgDSCR,
            totalExposure: data.totalAmount
          },
          recommendation: {
            immediate: `Review successful ${industry} loans for best practices`,
            shortTerm: `Develop industry-specific underwriting criteria`,
            longTerm: `Build partnerships with ${industry} trade associations`
          }
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Find loan size optimization opportunities
   */
  findLoanSizeOpportunities() {
    const opportunities = [];
    const sizeBuckets = {
      small: { min: 0, max: 50000, loans: [], defaults: 0 },
      medium: { min: 50000, max: 150000, loans: [], defaults: 0 },
      large: { min: 150000, max: 500000, loans: [], defaults: 0 },
      jumbo: { min: 500000, max: Infinity, loans: [], defaults: 0 }
    };
    
    this.loans.forEach(loan => {
      const amount = loan.loanAmount || loan.remainingAmount;
      const bucket = Object.entries(sizeBuckets).find(([_, b]) => 
        amount >= b.min && amount < b.max
      );
      
      if (bucket) {
        bucket[1].loans.push(loan);
        if (loan.status === 'default' || loan.status === 'charged_off') {
          bucket[1].defaults++;
        }
      }
    });
    
    // Find optimal loan size
    Object.entries(sizeBuckets).forEach(([size, data]) => {
      if (data.loans.length > 0) {
        const defaultRate = (data.defaults / data.loans.length) * 100;
        const avgProfit = data.loans.reduce((sum, l) => 
          sum + ((l.rate || 10) / 100 * l.remainingAmount), 0
        ) / data.loans.length;
        
        if (defaultRate < this.metrics.summary.defaultRate && data.loans.length >= 10) {
          opportunities.push({
            type: 'loan_size_optimization',
            title: `Optimize ${size} loan segment ($${data.min / 1000}K-$${data.max === Infinity ? '∞' : data.max / 1000}K)`,
            description: `${size} loans show ${defaultRate.toFixed(1)}% default rate with avg profit of $${avgProfit.toFixed(0)}`,
            confidence: this.calculateConfidence(data.loans.length),
            impact: avgProfit * data.loans.length * 0.2, // 20% growth potential
            affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber),
            metrics: {
              bucketSize: data.loans.length,
              defaultRate: defaultRate,
              avgLoanSize: data.loans.reduce((s, l) => s + (l.loanAmount || 0), 0) / data.loans.length,
              profitPerLoan: avgProfit
            },
            recommendation: {
              immediate: `Focus marketing on ${size} loan segment`,
              shortTerm: `Streamline approval process for ${size} loans`,
              longTerm: `Develop specialized products for this segment`
            }
          });
        }
      }
    });
    
    return opportunities;
  }

  /**
   * Find cross-sell opportunities
   */
  findCrossSellOpportunities() {
    const opportunities = [];
    
    // Find businesses with single loans that could take additional financing
    const singleLoanClients = {};
    this.loans.forEach(loan => {
      const clientId = loan.client?.name || loan.client?.id;
      if (!clientId) return;
      
      if (!singleLoanClients[clientId]) {
        singleLoanClients[clientId] = [];
      }
      singleLoanClients[clientId].push(loan);
    });
    
    const eligibleClients = Object.entries(singleLoanClients)
      .filter(([_, loans]) => {
        return loans.length === 1 && 
               loans[0].status === 'current' &&
               loans[0].monthsSinceOrigination > 6 &&
               (loans[0].dscr || 0) > 1.5;
      });
    
    if (eligibleClients.length > 5) {
      const potentialRevenue = eligibleClients.reduce((sum, [_, loans]) => 
        sum + (loans[0].loanAmount || loans[0].remainingAmount) * 0.5, 0
      );
      
      opportunities.push({
        type: 'cross_sell',
        title: 'Cross-sell opportunity to performing clients',
        description: `${eligibleClients.length} clients with excellent payment history could take additional financing`,
        confidence: 75,
        impact: potentialRevenue,
        affectedLoans: eligibleClients.slice(0, 20).map(([_, loans]) => loans[0].loanNumber),
        metrics: {
          eligibleClients: eligibleClients.length,
          avgDSCR: eligibleClients.reduce((s, [_, l]) => s + (l[0].dscr || 0), 0) / eligibleClients.length,
          totalPotential: potentialRevenue
        },
        recommendation: {
          immediate: 'Contact top 10 performing clients about additional financing needs',
          shortTerm: 'Develop client expansion program',
          longTerm: 'Implement automated cross-sell identification system'
        }
      });
    }
    
    return opportunities;
  }

  /**
   * Segment portfolio for analysis
   */
  segmentPortfolio() {
    const segments = [];
    
    // Create various segments
    const segmentDefinitions = [
      { 
        name: 'high_fico_small_business',
        filter: l => l.creditScore > 750 && l.client?.yearInBusiness < 5,
        description: 'High FICO, new businesses'
      },
      {
        name: 'established_moderate_credit',
        filter: l => l.creditScore >= 650 && l.creditScore <= 700 && l.client?.yearInBusiness > 10,
        description: 'Established businesses with moderate credit'
      },
      {
        name: 'high_dscr_growth',
        filter: l => (l.dscr || 0) > 2.0 && l.monthsSinceOrigination < 12,
        description: 'High DSCR recent originations'
      }
    ];
    
    segmentDefinitions.forEach(def => {
      const segmentLoans = this.loans.filter(def.filter);
      if (segmentLoans.length > 0) {
        segments.push({
          name: def.name,
          description: def.description,
          loans: segmentLoans,
          totalValue: segmentLoans.reduce((s, l) => s + (l.remainingAmount || 0), 0)
        });
      }
    });
    
    return segments;
  }

  /**
   * Calculate segment performance
   */
  calculateSegmentPerformance(segment) {
    const defaults = segment.loans.filter(l => 
      l.status === 'default' || l.status === 'charged_off'
    ).length;
    
    return {
      defaultRate: segment.loans.length > 0 ? (defaults / segment.loans.length) * 100 : 0,
      avgDSCR: segment.loans.reduce((s, l) => s + (l.dscr || 0), 0) / segment.loans.length,
      avgRate: segment.loans.reduce((s, l) => s + (l.rate || 0), 0) / segment.loans.length,
      collectionRate: segment.loans.reduce((s, l) => s + (l.collectionRate || 0), 0) / segment.loans.length
    };
  }

  /**
   * Calculate potential expansion revenue
   */
  calculateExpansionRevenue(segment, performance) {
    const currentSize = segment.loans.length;
    const targetSize = Math.max(currentSize * 3, this.loans.length * 0.1);
    const avgLoanSize = segment.totalValue / currentSize;
    const expansionLoans = targetSize - currentSize;
    
    return expansionLoans * avgLoanSize * (performance.avgRate / 100) * (1 - performance.defaultRate / 100);
  }

  /**
   * Calculate confidence based on sample size
   */
  calculateConfidence(sampleSize) {
    if (sampleSize >= 30) return 95;
    if (sampleSize >= 20) return 90;
    if (sampleSize >= 10) return 80;
    if (sampleSize >= 5) return 70;
    return 60;
  }
}