// src/components/AIAnalytics/PatternDiscovery/analyzers/GeographicAnalyzer.js
export class GeographicAnalyzer {
  constructor(loans, portfolioMetrics, externalData) {
    this.loans = loans;
    this.metrics = portfolioMetrics;
    this.external = externalData;
  }

  analyze() {
    const patterns = [];
    
    // State-level analysis
    const statePatterns = this.analyzeStatePerformance();
    patterns.push(...statePatterns);
    
    // City clusters
    const cityPatterns = this.analyzeCityClusters();
    patterns.push(...cityPatterns);
    
    // Regional correlations
    const regionalPatterns = this.findRegionalCorrelations();
    patterns.push(...regionalPatterns);
    
    return patterns;
  }

  analyzeStatePerformance() {
    const patterns = [];
    const stateData = {};
    
    this.loans.forEach(loan => {
      const state = loan.client?.state;
      if (!state) return;
      
      if (!stateData[state]) {
        stateData[state] = {
          loans: [],
          totalAmount: 0,
          defaults: 0,
          avgDSCR: 0,
          avgFICO: 0
        };
      }
      
      stateData[state].loans.push(loan);
      stateData[state].totalAmount += loan.remainingAmount || 0;
      stateData[state].avgDSCR += loan.dscr || 0;
      stateData[state].avgFICO += loan.creditScore || 0;
      
      if (loan.status === 'default' || loan.status === 'charged_off') {
        stateData[state].defaults++;
      }
    });
    
    // Analyze each state
    Object.entries(stateData).forEach(([state, data]) => {
      if (data.loans.length < 3) return;
      
      data.avgDSCR = data.avgDSCR / data.loans.length;
      data.avgFICO = data.avgFICO / data.loans.length;
      const defaultRate = (data.defaults / data.loans.length) * 100;
      
      // Find exceptional performers
      if (defaultRate < this.metrics.summary.defaultRate * 0.5 || 
          defaultRate > this.metrics.summary.defaultRate * 2) {
        patterns.push({
          type: 'geographic',
          title: `${state} ${defaultRate < this.metrics.summary.defaultRate ? 'outperforms' : 'underperforms'}`,
          description: `${state} shows ${defaultRate.toFixed(1)}% default rate vs ${this.metrics.summary.defaultRate.toFixed(1)}% average`,
          confidence: this.calculateConfidence(data.loans.length),
          impact: data.totalAmount * Math.abs(defaultRate - this.metrics.summary.defaultRate) / 100,
          affectedLoans: data.loans.slice(0, 10).map(l => l.loanNumber),
          metrics: {
            stateLoans: data.loans.length,
            defaultRate: defaultRate,
            avgDSCR: data.avgDSCR.toFixed(2),
            avgFICO: Math.round(data.avgFICO),
            totalExposure: data.totalAmount
          }
        });
      }
    });
    
    return patterns;
  }

  analyzeCityClusters() {
    const patterns = [];
    const cityData = {};
    
    this.loans.forEach(loan => {
      const city = loan.client?.city;
      const state = loan.client?.state;
      if (!city || !state) return;
      
      const key = `${city}, ${state}`;
      if (!cityData[key]) {
        cityData[key] = {
          loans: [],
          industries: {}
        };
      }
      
      cityData[key].loans.push(loan);
      const industry = loan.client?.industrySector || 'Unknown';
      cityData[key].industries[industry] = (cityData[key].industries[industry] || 0) + 1;
    });
    
    // Find city-specific patterns
    Object.entries(cityData).forEach(([city, data]) => {
      if (data.loans.length >= 5) {
        const dominantIndustry = Object.entries(data.industries)
          .sort((a, b) => b[1] - a[1])[0];
        
        if (dominantIndustry && dominantIndustry[1] / data.loans.length > 0.4) {
          patterns.push({
            type: 'city_cluster',
            title: `${city} ${dominantIndustry[0]} cluster`,
            description: `${city} has concentration of ${dominantIndustry[0]} loans (${dominantIndustry[1]} of ${data.loans.length})`,
            confidence: 70,
            impact: data.loans.reduce((s, l) => s + l.remainingAmount, 0) * 0.1,
            affectedLoans: data.loans.map(l => l.loanNumber)
          });
        }
      }
    });
    
    return patterns;
  }

  findRegionalCorrelations() {
    const patterns = [];
    
    // Group states by region
    const regions = {
      'Northeast': ['NY', 'NJ', 'CT', 'MA', 'PA', 'VT', 'NH', 'ME', 'RI'],
      'Southeast': ['FL', 'GA', 'SC', 'NC', 'VA', 'TN', 'AL', 'MS', 'KY', 'WV'],
      'Midwest': ['IL', 'OH', 'MI', 'IN', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
      'Southwest': ['TX', 'AZ', 'NM', 'OK', 'AR', 'LA'],
      'West': ['CA', 'WA', 'OR', 'NV', 'UT', 'CO', 'ID', 'MT', 'WY', 'AK', 'HI']
    };
    
    const regionalData = {};
    
    Object.entries(regions).forEach(([region, states]) => {
      const regionalLoans = this.loans.filter(l => states.includes(l.client?.state));
      if (regionalLoans.length > 0) {
        const defaults = regionalLoans.filter(l => l.status === 'default').length;
        regionalData[region] = {
          loans: regionalLoans,
          defaultRate: (defaults / regionalLoans.length) * 100,
          avgDSCR: regionalLoans.reduce((s, l) => s + (l.dscr || 0), 0) / regionalLoans.length
        };
      }
    });
    
    // Find regional patterns
    Object.entries(regionalData).forEach(([region, data]) => {
      if (data.loans.length >= 10 && 
          Math.abs(data.defaultRate - this.metrics.summary.defaultRate) > 5) {
        patterns.push({
          type: 'regional',
          title: `${region} region performance`,
          description: `${region} shows distinct performance pattern`,
          confidence: 80,
          impact: data.loans.reduce((s, l) => s + l.remainingAmount, 0) * 0.05,
          affectedLoans: data.loans.slice(0, 20).map(l => l.loanNumber),
          metrics: {
            regionDefaultRate: data.defaultRate,
            avgDSCR: data.avgDSCR
          }
        });
      }
    });
    
    return patterns;
  }

  calculateConfidence(sampleSize) {
    if (sampleSize >= 30) return 95;
    if (sampleSize >= 20) return 85;
    if (sampleSize >= 10) return 75;
    return 65;
  }
}