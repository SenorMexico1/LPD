// src/services/ExternalDataService.js

/**
 * Service for fetching and caching external economic and market data
 * Integrates multiple free API sources for comprehensive context
 */
export class ExternalDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour cache
    
    // Free API endpoints
    this.apis = {
      fred: {
        base: 'https://api.stlouisfed.org/fred/series/observations',
        key: process.env.REACT_APP_FRED_API_KEY || 'YOUR_FRED_KEY' // Free from https://fred.stlouisfed.org/docs/api/api_key.html
      },
      alphavantage: {
        base: 'https://www.alphavantage.co/query',
        key: process.env.REACT_APP_ALPHA_VANTAGE_KEY || 'YOUR_AV_KEY' // Free from https://www.alphavantage.co/support/#api-key
      },
      bls: {
        base: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        key: null // No key needed for basic access
      },
      census: {
        base: 'https://api.census.gov/data',
        key: process.env.REACT_APP_CENSUS_KEY || 'YOUR_CENSUS_KEY' // Free from https://api.census.gov/data/key_signup.html
      }
    };

    // Series IDs for economic indicators
    this.indicators = {
      fedFundsRate: 'DFF',           // Federal Funds Rate
      unemployment: 'UNRATE',         // Unemployment Rate
      cpi: 'CPIAUCSL',               // Consumer Price Index
      gdp: 'GDP',                    // Gross Domestic Product
      retailSales: 'RSAFS',          // Retail Sales
      businessInventory: 'BUSINV',   // Business Inventory
      consumerSentiment: 'UMCSENT',  // Consumer Sentiment
      smallBusinessOptimism: 'NFIB'  // Small Business Optimism Index
    };

    // Industry sector ETFs for performance tracking
    this.sectorETFs = {
      'Financials': 'XLF',
      'Consumer Discretionary': 'XLY',
      'Consumer Staples': 'XLP',
      'Energy': 'XLE',
      'Healthcare': 'XLV',
      'Industrials': 'XLI',
      'Materials': 'XLB',
      'Real Estate': 'XLRE',
      'Technology': 'XLK',
      'Utilities': 'XLU',
      'Communication': 'XLC'
    };
  }

  /**
   * Get all external context data for AI analysis
   */
  async getExternalContext(loans) {
    try {
      // Parallel fetch all data sources
      const [economic, industry, regional, news] = await Promise.all([
        this.getEconomicIndicators(),
        this.getIndustryTrends(loans),
        this.getRegionalData(loans),
        this.getRelevantNews(loans)
      ]);

      return {
        timestamp: new Date().toISOString(),
        economic,
        industry,
        regional,
        news,
        summary: this.generateContextSummary(economic, industry, regional)
      };
    } catch (error) {
      console.error('Error fetching external data:', error);
      // Return cached or default data if APIs fail
      return this.getCachedOrDefault();
    }
  }

  /**
   * Fetch key economic indicators from FRED API
   */
  async getEconomicIndicators() {
    const cacheKey = 'economic_indicators';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const indicators = {};
      
      // Federal Funds Rate (most recent)
      const fedRate = await this.fetchFREDSeries(this.indicators.fedFundsRate, 1);
      indicators.fedFundsRate = {
        value: fedRate[0]?.value || 5.5,
        date: fedRate[0]?.date,
        change: this.calculateChange(fedRate)
      };

      // Unemployment Rate
      const unemployment = await this.fetchFREDSeries(this.indicators.unemployment, 3);
      indicators.unemployment = {
        value: unemployment[0]?.value || 3.7,
        date: unemployment[0]?.date,
        trend: this.calculateTrend(unemployment),
        threeMonthAvg: this.calculateAverage(unemployment)
      };

      // Consumer Price Index (inflation indicator)
      const cpi = await this.fetchFREDSeries(this.indicators.cpi, 12);
      indicators.inflation = {
        yoy: this.calculateYoYChange(cpi),
        trend: this.calculateTrend(cpi.slice(0, 3))
      };

      // Small Business Optimism (critical for SMB lending)
      const smbOptimism = await this.fetchFREDSeries(this.indicators.smallBusinessOptimism, 6);
      indicators.smallBusinessSentiment = {
        value: smbOptimism[0]?.value || 90,
        sixMonthTrend: this.calculateTrend(smbOptimism),
        interpretation: this.interpretSMBSentiment(smbOptimism[0]?.value)
      };

      // GDP Growth
      const gdp = await this.fetchFREDSeries(this.indicators.gdp, 4);
      indicators.gdpGrowth = {
        quarterly: this.calculateQuarterlyGrowth(gdp),
        annual: this.calculateAnnualGrowth(gdp)
      };

      this.cache.set(cacheKey, {
        data: indicators,
        timestamp: Date.now()
      });

      return indicators;
    } catch (error) {
      console.error('Error fetching economic indicators:', error);
      return this.getDefaultEconomicIndicators();
    }
  }

  /**
   * Get industry-specific performance trends
   */
  async getIndustryTrends(loans) {
    const cacheKey = 'industry_trends';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const industries = {};
      
      // Get unique industries from loan portfolio
      const portfolioIndustries = [...new Set(loans.map(l => l.client?.industrySector).filter(Boolean))];
      
      // Map portfolio industries to sectors
      for (const industry of portfolioIndustries) {
        const sector = this.mapIndustryToSector(industry);
        if (sector && this.sectorETFs[sector]) {
          const performance = await this.fetchSectorPerformance(this.sectorETFs[sector]);
          
          industries[industry] = {
            sector,
            performance: {
              daily: performance.daily,
              weekly: performance.weekly,
              monthly: performance.monthly,
              quarterly: performance.quarterly
            },
            volatility: performance.volatility,
            trend: performance.trend,
            riskLevel: this.calculateSectorRisk(performance)
          };
        }
      }

      // Add sector-wide trends
      industries.sectorSummary = await this.getSectorSummary();

      this.cache.set(cacheKey, {
        data: industries,
        timestamp: Date.now()
      });

      return industries;
    } catch (error) {
      console.error('Error fetching industry trends:', error);
      return {};
    }
  }

  /**
   * Get regional economic data for states in portfolio
   */
  async getRegionalData(loans) {
    const cacheKey = 'regional_data';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const regional = {};
      
      // Get unique states from portfolio
      const states = [...new Set(loans.map(l => l.client?.state).filter(Boolean))];
      
      for (const state of states.slice(0, 10)) { // Limit to top 10 states
        regional[state] = await this.getStateEconomicData(state);
      }

      // Add comparative analysis
      regional.comparison = this.compareRegionalPerformance(regional);
      regional.opportunities = this.identifyRegionalOpportunities(regional, loans);

      this.cache.set(cacheKey, {
        data: regional,
        timestamp: Date.now()
      });

      return regional;
    } catch (error) {
      console.error('Error fetching regional data:', error);
      return {};
    }
  }

  /**
   * Fetch state-specific economic data
   */
  async getStateEconomicData(state) {
    try {
      // Use BLS API for state unemployment
      const stateCode = this.getStateCode(state);
      const unemploymentSeries = `LASST${stateCode}0000000000003`;
      
      const response = await fetch(`${this.apis.bls.base}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesid: [unemploymentSeries],
          startyear: new Date().getFullYear() - 1,
          endyear: new Date().getFullYear()
        })
      });

      const data = await response.json();
      const latestData = data.Results?.series[0]?.data[0];

      return {
        unemployment: latestData?.value || 'N/A',
        unemploymentTrend: this.calculateStateTrend(data.Results?.series[0]?.data),
        businessGrowth: await this.getStateBusinessGrowth(state),
        economicIndex: this.calculateStateEconomicIndex(state, latestData)
      };
    } catch (error) {
      console.error(`Error fetching data for ${state}:`, error);
      return {
        unemployment: 'N/A',
        unemploymentTrend: 'stable',
        businessGrowth: 'moderate',
        economicIndex: 50
      };
    }
  }

  /**
   * Get relevant news that might impact lending
   */
  async getRelevantNews(loans) {
    // In production, integrate with news API
    // For now, return structured placeholder
    return {
      majorEvents: [
        {
          date: new Date().toISOString().split('T')[0],
          event: 'Fed maintains interest rates',
          impact: 'neutral',
          affectedSectors: ['all']
        }
      ],
      industryNews: {},
      regionalNews: {}
    };
  }

  /**
   * Fetch FRED series data
   */
  async fetchFREDSeries(seriesId, observations = 12) {
    if (!this.apis.fred.key || this.apis.fred.key === 'YOUR_FRED_KEY') {
      return this.getMockFREDData(seriesId, observations);
    }

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (observations * 30 * 24 * 60 * 60 * 1000))
      .toISOString().split('T')[0];

    const url = `${this.apis.fred.base}?series_id=${seriesId}&api_key=${this.apis.fred.key}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=desc&limit=${observations}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.observations || [];
    } catch (error) {
      return this.getMockFREDData(seriesId, observations);
    }
  }

  /**
   * Fetch sector performance from Alpha Vantage
   */
  async fetchSectorPerformance(symbol) {
    if (!this.apis.alphavantage.key || this.apis.alphavantage.key === 'YOUR_AV_KEY') {
      return this.getMockSectorPerformance(symbol);
    }

    const url = `${this.apis.alphavantage.base}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apis.alphavantage.key}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      const quote = data['Global Quote'];
      return {
        daily: parseFloat(quote['10. change percent']?.replace('%', '') || 0),
        weekly: this.estimateWeeklyChange(quote),
        monthly: this.estimateMonthlyChange(quote),
        quarterly: this.estimateQuarterlyChange(quote),
        volatility: Math.abs(parseFloat(quote['10. change percent']?.replace('%', '') || 0)),
        trend: parseFloat(quote['10. change percent']?.replace('%', '') || 0) > 0 ? 'up' : 'down'
      };
    } catch (error) {
      return this.getMockSectorPerformance(symbol);
    }
  }

  /**
   * Generate context summary for AI prompt
   */
  generateContextSummary(economic, industry, regional) {
    const summary = {
      macroEnvironment: this.assessMacroEnvironment(economic),
      lendingConditions: this.assessLendingConditions(economic),
      sectorRisks: this.identifySectorRisks(industry),
      regionalOpportunities: this.summarizeRegionalOpportunities(regional),
      keyRiskFactors: [],
      keyOpportunities: []
    };

    // Identify key risk factors
    if (economic.fedFundsRate?.value > 5) {
      summary.keyRiskFactors.push('High interest rates increasing default probability');
    }
    if (economic.unemployment?.trend === 'increasing') {
      summary.keyRiskFactors.push('Rising unemployment may impact repayment capacity');
    }
    if (economic.smallBusinessSentiment?.value < 90) {
      summary.keyRiskFactors.push('Low small business optimism indicates challenging environment');
    }

    // Identify opportunities
    if (economic.gdpGrowth?.quarterly > 2) {
      summary.keyOpportunities.push('Strong GDP growth supports business expansion');
    }
    
    Object.entries(regional).forEach(([state, data]) => {
      if (data.unemployment < 3 && data.businessGrowth === 'strong') {
        summary.keyOpportunities.push(`${state} shows strong economic conditions`);
      }
    });

    return summary;
  }

  /**
   * Helper methods for calculations
   */
  calculateChange(series) {
    if (!series || series.length < 2) return 0;
    const current = parseFloat(series[0].value);
    const previous = parseFloat(series[1].value);
    return ((current - previous) / previous) * 100;
  }

  calculateTrend(series) {
    if (!series || series.length < 3) return 'stable';
    const values = series.map(s => parseFloat(s.value));
    const avgChange = values.slice(1).reduce((sum, val, i) => 
      sum + (val - values[i]) / values[i], 0) / (values.length - 1);
    
    if (avgChange > 0.02) return 'increasing';
    if (avgChange < -0.02) return 'decreasing';
    return 'stable';
  }

  calculateAverage(series) {
    if (!series || series.length === 0) return 0;
    const values = series.map(s => parseFloat(s.value));
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  calculateYoYChange(series) {
    if (!series || series.length < 12) return 0;
    const current = parseFloat(series[0].value);
    const yearAgo = parseFloat(series[11].value);
    return ((current - yearAgo) / yearAgo) * 100;
  }

  interpretSMBSentiment(value) {
    if (value >= 100) return 'optimistic';
    if (value >= 95) return 'neutral';
    if (value >= 90) return 'cautious';
    return 'pessimistic';
  }

  assessMacroEnvironment(economic) {
    const score = 
      (economic.fedFundsRate?.value > 5 ? -1 : 1) +
      (economic.unemployment?.value < 4 ? 1 : -1) +
      (economic.inflation?.yoy > 3 ? -1 : 1) +
      (economic.gdpGrowth?.quarterly > 2 ? 1 : -1);
    
    if (score >= 2) return 'favorable';
    if (score >= 0) return 'neutral';
    return 'challenging';
  }

  assessLendingConditions(economic) {
    const fedRate = economic.fedFundsRate?.value || 5.5;
    const unemployment = economic.unemployment?.value || 3.7;
    
    if (fedRate < 4 && unemployment < 4) return 'excellent';
    if (fedRate < 5.5 && unemployment < 5) return 'good';
    if (fedRate < 6 && unemployment < 6) return 'moderate';
    return 'tight';
  }

  /**
   * Map industry names to market sectors
   */
  mapIndustryToSector(industry) {
    const mapping = {
      'restaurants': 'Consumer Discretionary',
      'retail': 'Consumer Discretionary',
      'medical': 'Healthcare',
      'software': 'Technology',
      'construction': 'Industrials',
      'real estate': 'Real Estate',
      'manufacturing': 'Industrials',
      'transportation': 'Industrials',
      'utilities': 'Utilities',
      'finance': 'Financials'
    };

    const industryLower = industry.toLowerCase();
    for (const [key, sector] of Object.entries(mapping)) {
      if (industryLower.includes(key)) return sector;
    }
    return 'Industrials'; // Default
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  /**
   * Get default/mock data when APIs are unavailable
   */
  getDefaultEconomicIndicators() {
    return {
      fedFundsRate: { value: 5.5, date: new Date().toISOString(), change: 0 },
      unemployment: { value: 3.7, trend: 'stable', threeMonthAvg: 3.8 },
      inflation: { yoy: 3.2, trend: 'decreasing' },
      smallBusinessSentiment: { value: 92, sixMonthTrend: 'stable', interpretation: 'cautious' },
      gdpGrowth: { quarterly: 2.1, annual: 2.5 }
    };
  }

  getMockFREDData(seriesId, observations) {
    const data = [];
    for (let i = 0; i < observations; i++) {
      const date = new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000));
      let value;
      
      switch(seriesId) {
        case 'DFF': value = 5.5 - (i * 0.1); break;
        case 'UNRATE': value = 3.7 + (i * 0.05); break;
        default: value = 100 + (Math.random() * 10 - 5);
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: value.toString()
      });
    }
    return data;
  }

  getMockSectorPerformance(symbol) {
    return {
      daily: Math.random() * 4 - 2,
      weekly: Math.random() * 8 - 4,
      monthly: Math.random() * 15 - 7.5,
      quarterly: Math.random() * 30 - 15,
      volatility: Math.random() * 20,
      trend: Math.random() > 0.5 ? 'up' : 'down'
    };
  }

  getStateCode(state) {
    // Map state names to FIPS codes for BLS API
    const stateCodes = {
      'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05',
      'California': '06', 'Colorado': '08', 'Connecticut': '09', 'Delaware': '10',
      'Florida': '12', 'Georgia': '13', 'Hawaii': '15', 'Idaho': '16',
      'Illinois': '17', 'Indiana': '18', 'Iowa': '19', 'Kansas': '20',
      'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
      'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28',
      'Missouri': '29', 'Montana': '30', 'Nebraska': '31', 'Nevada': '32',
      'New Hampshire': '33', 'New Jersey': '34', 'New Mexico': '35', 'New York': '36',
      'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39', 'Oklahoma': '40',
      'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
      'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49',
      'Vermont': '50', 'Virginia': '51', 'Washington': '53', 'West Virginia': '54',
      'Wisconsin': '55', 'Wyoming': '56'
    };
    return stateCodes[state] || '00';
  }

  getCachedOrDefault() {
    return {
      timestamp: new Date().toISOString(),
      economic: this.getDefaultEconomicIndicators(),
      industry: {},
      regional: {},
      news: { majorEvents: [], industryNews: {}, regionalNews: {} },
      summary: {
        macroEnvironment: 'neutral',
        lendingConditions: 'moderate',
        sectorRisks: [],
        regionalOpportunities: [],
        keyRiskFactors: ['Limited external data available'],
        keyOpportunities: []
      }
    };
  }
}

// Export singleton instance
export const externalDataService = new ExternalDataService();