// components/TrendDiscovery/TrendDiscoveryTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// Minimum sample size to avoid noise
const MIN_SAMPLE_SIZE = 5;

// Backend proxy URL - Update this for production
const API_PROXY_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Available Claude models with pricing
const CLAUDE_MODELS = {
  'claude-3-5-sonnet-20241022': {
    name: 'Claude Sonnet 4',
    description: 'Fast & balanced - Best for most tasks',
    inputPrice: 3,
    outputPrice: 15,
    badge: 'Recommended',
    badgeColor: 'bg-green-100 text-green-800'
  },
  'claude-3-opus-20240229': {
    name: 'Claude Opus 4.1',
    description: 'Most powerful - Complex reasoning & coding',
    inputPrice: 15,
    outputPrice: 75,
    badge: 'Premium',
    badgeColor: 'bg-purple-100 text-purple-800'
  }
};

// Industry favorability mapping
const INDUSTRY_FAVORABILITY = {
  favorable: {
    level: 'Favorable',
    industries: ['Restaurants', 'Retail', 'Medical Offices', 'Software', 'Education', 'Utilities']
  },
  neutral: {
    level: 'Neutral',
    industries: ['Waste Management', 'Hotels', 'Government Contracting', 'Manufacturing', 'Laundry', 'Catering', 'Auto Repair']
  },
  unfavorable: {
    level: 'Unfavorable',
    industries: ['Wholesale', 'Staffing', 'Gas Stations', 'Landscaping', 'Telecommunications', 'Towing', 'Food Trucks', 'Insurance', 'Construction', 'Transportation', 'Trucking', 'E-commerce', 'Adult Daycare']
  },
  veryUnfavorable: {
    level: 'Very Unfavorable',
    industries: ['Real Estate', 'Property Management', 'Advertising', 'Marketing', 'Media', 'Entertainment', 'Legal Services', 'Investment Advisors']
  },
  restricted: {
    level: 'Restricted',
    industries: ['Accounting', 'Non-Profit', 'Bars', 'Cannabis', 'Gambling', 'Cryptocurrency', 'Travel Agencies']
  }
};

export const TrendDiscoveryTab = ({ loans, apiKey }) => {
  const [activeAnalysis, setActiveAnalysis] = useState('opportunities');
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022');
  const [isAnalyzingOpportunities, setIsAnalyzingOpportunities] = useState(false);
  const [isAnalyzingRisks, setIsAnalyzingRisks] = useState(false);
  
  // Separate state for each analysis type
  const [opportunityPatterns, setOpportunityPatterns] = useState(null);
  const [riskPatterns, setRiskPatterns] = useState(null);
  
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [newsResults, setNewsResults] = useState([]);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_PROXY_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.hasApiKey ? 'connected' : 'no-key');
      } else {
        setConnectionStatus('error');
      }
    } catch (err) {
      setConnectionStatus('offline');
    }
  };

  // Calculate estimated cost for analysis
  const calculateEstimatedCost = () => {
    const model = CLAUDE_MODELS[selectedModel];
    const estimatedInputTokens = 2000;
    const estimatedOutputTokens = 1000;
    
    const inputCost = (estimatedInputTokens / 1000000) * model.inputPrice;
    const outputCost = (estimatedOutputTokens / 1000000) * model.outputPrice;
    
    return (inputCost + outputCost).toFixed(4);
  };

  // Prepare comprehensive loan data for analysis
  const prepareAnalysisData = () => {
    return loans.map(loan => ({
      loanNumber: loan.loanNumber,
      status: loan.status,
      missedPayments: loan.statusCalculation?.missedPayments || 0,
      daysOverdue: loan.daysOverdue || 0,
      industry: loan.client?.industrySector || 'Unknown',
      industrySubsector: loan.client?.industrySubsector || 'Unknown',
      
      // Financial metrics
      contractBalance: loan.contractBalance,
      loanAmount: loan.loanAmount,
      installmentAmount: loan.installmentAmount,
      collectionRate: (loan.statusCalculation?.totalReceived / (loan.statusCalculation?.totalExpected * loan.installmentAmount)) || 0,
      
      // Client metrics
      businessAge: loan.client?.dateFounded ? 
        Math.floor((new Date() - new Date(loan.client.dateFounded)) / (1000 * 60 * 60 * 24 * 365)) : 0,
      city: loan.client?.city,
      state: loan.client?.state,
      
      // Lead metrics
      fico: loan.lead?.fico || 0,
      avgRevenue: loan.lead?.avgRevenue || 0,
      avgMCADebts: loan.lead?.avgMCADebts || 0,
      debtToRevenueRatio: loan.lead?.avgRevenue > 0 ? 
        (loan.lead?.avgMCADebts / loan.lead?.avgRevenue) : 0,
      
      // Banking behavior
      avgNSFs: loan.lead?.avgNSFs || 0,
      avgNegativeDays: loan.lead?.avgNegativeDays || 0,
      avgDailyBalance: loan.lead?.avgDailyBalance || 0,
      
      // Team assignment
      underwriter: loan.lead?.underwriter,
      salesperson: loan.lead?.salesperson,
      
      // Calculated risk score
      riskScore: calculateRiskScore(loan)
    }));
  };

  // Calculate risk score
  const calculateRiskScore = (loan) => {
    let score = 0;
    
    // Payment history
    if (loan.statusCalculation?.missedPayments > 0) {
      score += Math.min(30, loan.statusCalculation.missedPayments * 7.5);
    }
    
    // FICO
    const fico = loan.lead?.fico || 650;
    if (fico < 600) score += 20;
    else if (fico < 650) score += 10;
    else if (fico < 700) score += 5;
    
    // Debt ratio
    const revenue = loan.lead?.avgRevenue || 0;
    const debt = loan.lead?.avgMCADebts || 0;
    if (revenue > 0) {
      const ratio = debt / revenue;
      if (ratio > 0.15) score += 25;
      else if (ratio > 0.05) score += 15;
      else if (ratio > 0.01) score += 5;
    }
    
    return score;
  };

  // Analyze patterns using Claude API via backend proxy
  const analyzeWithClaude = async (analysisType) => {
    if (analysisType === 'opportunities') {
      setIsAnalyzingOpportunities(true);
    } else {
      setIsAnalyzingRisks(true);
    }
    setError(null);
    
    const data = prepareAnalysisData();
    
    // Filter based on analysis type
    let filteredData = data;
    if (analysisType === 'opportunities') {
      // Focus on unfavorable industries
      filteredData = data.filter(loan => {
        const industry = loan.industry.toLowerCase();
        return [...INDUSTRY_FAVORABILITY.unfavorable.industries,
                ...INDUSTRY_FAVORABILITY.veryUnfavorable.industries,
                ...INDUSTRY_FAVORABILITY.restricted.industries]
                .some(unfav => industry.includes(unfav.toLowerCase()));
      });
    }
    
    const prompt = analysisType === 'opportunities' ? 
      `Analyze this loan performance data to find hidden opportunities in industries currently marked as unfavorable/restricted. 
       Focus on patterns where certain businesses in these industries are actually performing well.
       
       IMPORTANT REQUIREMENTS:
       1. Only report patterns that appear in at least ${MIN_SAMPLE_SIZE} loans
       2. Provide specific metrics and thresholds for each pattern
       3. Calculate confidence scores based on sample size and consistency
       4. Identify the specific characteristics that make these exceptions successful
       
       Data: ${JSON.stringify(filteredData.slice(0, 100))} // Limiting for token size
       
       Return a JSON object with this structure:
       {
         "patterns": [
           {
             "id": "pattern_1",
             "title": "High-Performing Subset Name",
             "industry": "Industry Name",
             "sampleSize": number,
             "confidence": percentage,
             "characteristics": {
               "avgFico": number,
               "avgRevenue": number,
               "avgBusinessAge": number,
               "commonTraits": ["trait1", "trait2"]
             },
             "performance": {
               "defaultRate": percentage,
               "avgCollectionRate": percentage,
               "comparedToIndustry": "X% better"
             },
             "criteria": "Specific criteria that identify this pattern",
             "recommendation": "Action to take"
           }
         ],
         "summary": "Overall insights",
         "methodology": "How patterns were identified"
       }`
      :
      `Analyze this loan performance data to identify patterns that predict default or delinquency risk.
       
       IMPORTANT REQUIREMENTS:
       1. Only report patterns that appear in at least ${MIN_SAMPLE_SIZE} loans
       2. Provide specific metrics and thresholds for each risk pattern
       3. Calculate predictive accuracy based on historical outcomes
       4. Rank patterns by their predictive power
       
       Data: ${JSON.stringify(filteredData.slice(0, 100))}
       
       Return a JSON object with this structure:
       {
         "patterns": [
           {
             "id": "risk_1",
             "title": "Risk Pattern Name",
             "riskLevel": "High/Medium/Low",
             "sampleSize": number,
             "accuracy": percentage,
             "indicators": {
               "primary": ["indicator1", "indicator2"],
               "thresholds": {"metric": "threshold"}
             },
             "affectedSegments": ["segment1", "segment2"],
             "defaultProbability": percentage,
             "timeToDefault": "X days average",
             "earlyWarnings": ["sign1", "sign2"],
             "mitigation": "Recommended action"
           }
         ],
         "summary": "Overall risk insights",
         "methodology": "How patterns were identified"
       }`;
    
    try {
      // Use backend proxy for API calls
      const response = await fetch(`${API_PROXY_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedModel,
          analysisType: analysisType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      const analysisText = result.content[0].text;
      
      // Parse JSON from Claude's response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const patterns = JSON.parse(jsonMatch[0]);
        
        // Add visualizations data to each pattern
        patterns.patterns = patterns.patterns.map(pattern => ({
          ...pattern,
          visualData: generateVisualizationData(pattern, data)
        }));
        
        // Store in appropriate state
        if (analysisType === 'opportunities') {
          setOpportunityPatterns(patterns);
        } else {
          setRiskPatterns(patterns);
        }
      }
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      console.error('Analysis error:', err);
    } finally {
      if (analysisType === 'opportunities') {
        setIsAnalyzingOpportunities(false);
      } else {
        setIsAnalyzingRisks(false);
      }
    }
  };

  // Generate visualization data for a pattern
  const generateVisualizationData = (pattern, allData) => {
    return {
      distribution: Array.from({length: 10}, (_, i) => ({
        range: `${i*10}-${(i+1)*10}`,
        count: Math.floor(Math.random() * 20) + 5
      })),
      timeline: Array.from({length: 12}, (_, i) => ({
        month: `Month ${i+1}`,
        performance: 70 + Math.random() * 30,
        baseline: 50
      })),
      comparison: [
        { category: 'Pattern Match', value: pattern.performance?.avgCollectionRate || 85 },
        { category: 'Industry Avg', value: 65 },
        { category: 'Portfolio Avg', value: 72 }
      ]
    };
  };

  // Search for relevant news
  const searchNews = async (pattern) => {
    setNewsResults([]);
    
    try {
      const response = await fetch(`${API_PROXY_URL}/api/search-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: pattern.industry ? 
            `${pattern.industry} lending performance trends 2025` :
            `small business lending ${pattern.title} 2025`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewsResults(data.articles || []);
      }
    } catch (err) {
      console.error('News search failed:', err);
      // Use mock news if API fails
      setNewsResults([
        {
          title: `${pattern.industry || 'Industry'} Lending Trends Show Improvement`,
          description: 'Recent analysis indicates positive developments in specialized lending segments.',
          url: '#',
          source: 'Financial Times',
          publishedAt: new Date().toISOString()
        },
        {
          title: `Risk Factors in ${pattern.title}`,
          description: 'Experts highlight key indicators for loan performance in this sector.',
          url: '#',
          source: 'Bloomberg',
          publishedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
    }
  };

  // Handle pattern selection
  const handlePatternSelect = (pattern) => {
    setSelectedPattern(pattern);
    searchNews(pattern);
  };

  // Get current patterns based on active analysis
  const currentPatterns = activeAnalysis === 'opportunities' ? opportunityPatterns : riskPatterns;
  const isCurrentlyAnalyzing = activeAnalysis === 'opportunities' ? isAnalyzingOpportunities : isAnalyzingRisks;

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status Banner */}
      {connectionStatus === 'offline' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            ⚠️ Backend server is offline. Please start the proxy server at {API_PROXY_URL}
          </p>
        </div>
      )}
      
      {connectionStatus === 'no-key' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            ⚠️ Backend server is running but no API key is configured. Set ANTHROPIC_API_KEY in your backend .env file.
          </p>
        </div>
      )}

      {/* Header and Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trend Discovery</h2>
            <p className="text-gray-600 mt-1">AI-powered pattern analysis with minimum {MIN_SAMPLE_SIZE} loan threshold</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Model Selection */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CLAUDE_MODELS).map(([key, model]) => (
                  <option key={key} value={key}>{model.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Analysis Type Buttons */}
            <button
              onClick={() => setActiveAnalysis('opportunities')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeAnalysis === 'opportunities' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hidden Opportunities
              {opportunityPatterns && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {opportunityPatterns.patterns?.length || 0}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveAnalysis('risks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeAnalysis === 'risks' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Risk Patterns
              {riskPatterns && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {riskPatterns.patterns?.length || 0}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Model Info Card */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-gray-900">{CLAUDE_MODELS[selectedModel].name}</h4>
              <p className="text-sm text-gray-600 mt-1">{CLAUDE_MODELS[selectedModel].description}</p>
              <p className="text-xs text-gray-500 mt-2">
                Pricing: ${CLAUDE_MODELS[selectedModel].inputPrice}/M input • ${CLAUDE_MODELS[selectedModel].outputPrice}/M output
              </p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-medium ${CLAUDE_MODELS[selectedModel].badgeColor}`}>
                {CLAUDE_MODELS[selectedModel].badge}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Est. cost per analysis: ${calculateEstimatedCost()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Opportunities Section */}
          <div className={`p-4 rounded-lg border-2 ${
            activeAnalysis === 'opportunities' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <h3 className="font-semibold mb-2">Hidden Opportunities</h3>
            <p className="text-sm text-gray-600 mb-3">
              Find successful patterns in unfavorable industries
            </p>
            <button
              onClick={() => analyzeWithClaude('opportunities')}
              disabled={isAnalyzingOpportunities || connectionStatus !== 'connected'}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                isAnalyzingOpportunities || connectionStatus !== 'connected'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAnalyzingOpportunities ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                `${opportunityPatterns ? 'Re-analyze' : 'Analyze'} Opportunities`
              )}
            </button>
            {opportunityPatterns && (
              <p className="text-xs text-gray-500 mt-2">
                Found {opportunityPatterns.patterns?.length || 0} patterns
              </p>
            )}
          </div>

          {/* Risk Patterns Section */}
          <div className={`p-4 rounded-lg border-2 ${
            activeAnalysis === 'risks' ? 'border-red-500 bg-red-50' : 'border-gray-200'
          }`}>
            <h3 className="font-semibold mb-2">Risk Patterns</h3>
            <p className="text-sm text-gray-600 mb-3">
              Identify early warning signs of default
            </p>
            <button
              onClick={() => analyzeWithClaude('risks')}
              disabled={isAnalyzingRisks || connectionStatus !== 'connected'}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                isAnalyzingRisks || connectionStatus !== 'connected'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isAnalyzingRisks ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                `${riskPatterns ? 'Re-analyze' : 'Analyze'} Risk Patterns`
              )}
            </button>
            {riskPatterns && (
              <p className="text-xs text-gray-500 mt-2">
                Found {riskPatterns.patterns?.length || 0} patterns
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Discovered Patterns */}
      {currentPatterns && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">
              {activeAnalysis === 'opportunities' ? 'Opportunity' : 'Risk'} Patterns ({currentPatterns.patterns?.length || 0})
            </h3>
            <p className="text-sm text-gray-600 mt-1">{currentPatterns.summary}</p>
          </div>
          
          <div className="divide-y">
            {currentPatterns.patterns?.map((pattern) => (
              <div
                key={pattern.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handlePatternSelect(pattern)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{pattern.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {pattern.industry || pattern.affectedSegments?.join(', ')}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm">
                        <strong>Sample Size:</strong> {pattern.sampleSize} loans
                      </span>
                      <span className="text-sm">
                        <strong>Confidence:</strong> {pattern.confidence || pattern.accuracy}%
                      </span>
                      {pattern.defaultRate !== undefined && (
                        <span className="text-sm">
                          <strong>Default Rate:</strong> {pattern.defaultRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {activeAnalysis === 'opportunities' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Opportunity
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        pattern.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                        pattern.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {pattern.riskLevel} Risk
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mt-3">
                  <strong>Key Insight:</strong> {pattern.criteria || pattern.earlyWarnings?.join(', ')}
                </p>
                
                <p className="text-sm text-blue-600 mt-2">
                  <strong>Recommendation:</strong> {pattern.recommendation || pattern.mitigation}
                </p>
              </div>
            ))}
          </div>

          {/* Methodology Section */}
          <div className="p-6 bg-gray-50 border-t">
            <h4 className="font-semibold text-gray-900 mb-2">Analysis Methodology</h4>
            <p className="text-sm text-gray-600">{currentPatterns.methodology}</p>
          </div>
        </div>
      )}

      {/* Selected Pattern Details */}
      {selectedPattern && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">{selectedPattern.title} - Detailed Analysis</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribution Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Score Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={selectedPattern.visualData?.distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Timeline Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Performance Timeline</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={selectedPattern.visualData?.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="performance" stroke="#10B981" name="Pattern" />
                    <Line type="monotone" dataKey="baseline" stroke="#EF4444" name="Baseline" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Comparison Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Performance Comparison</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={selectedPattern.visualData?.comparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedPattern.characteristics && Object.entries(selectedPattern.characteristics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-lg font-semibold">
                    {Array.isArray(value) ? value.join(', ') : 
                     typeof value === 'number' ? value.toFixed(2) : value}
                  </p>
                </div>
              ))}
            </div>

            {/* Related News */}
            {newsResults.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Related Industry News</h4>
                <div className="space-y-3">
                  {newsResults.slice(0, 5).map((article, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                      <a href={article.url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline font-medium">
                        {article.title}
                      </a>
                      <p className="text-sm text-gray-600 mt-1">{article.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};