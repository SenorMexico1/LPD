// src/components/AIAnalytics/PatternDiscovery.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { externalDataService } from '../../services/ExternalDataService';

// Backend URL - update for production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const PatternDiscovery = ({ loans, analysisData, portfolioMetrics, apiKey, onDiscovery }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discoveries, setDiscoveries] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState('opportunities');
  const [confidence, setConfidence] = useState(70);
  const [error, setError] = useState(null);

  const analysisTypes = [
    { 
      id: 'opportunities', 
      name: 'Hidden Revenue Opportunities',
      description: 'Find underexploited profitable segments',
      icon: '💰'
    },
    {
      id: 'geographic',
      name: 'Geographic Patterns',
      description: 'Discover location-based performance patterns',
      icon: '🗺️'
    },
    {
      id: 'industry',
      name: 'Industry Correlations',
      description: 'Cross-industry performance insights',
      icon: '🏭'
    },
    {
      id: 'risk',
      name: 'Early Warning Signals',
      description: 'Identify leading indicators of default',
      icon: '⚠️'
    },
    {
      id: 'seasonal',
      name: 'Seasonal & Temporal',
      description: 'Time-based patterns and cycles',
      icon: '📅'
    },
    {
      id: 'recovery',
      name: 'Recovery Patterns',
      description: 'What drives successful recovery',
      icon: '🔄'
    }
  ];

  // State for external data
  const [externalContext, setExternalContext] = useState(null);
  const [isFetchingContext, setIsFetchingContext] = useState(false);

  // Fetch external context on mount and periodically
  useEffect(() => {
    const fetchExternalContext = async () => {
      if (!loans || loans.length === 0) return;
      
      setIsFetchingContext(true);
      try {
        const context = await externalDataService.getExternalContext(loans);
        setExternalContext(context);
      } catch (error) {
        console.error('Failed to fetch external context:', error);
      } finally {
        setIsFetchingContext(false);
      }
    };

    fetchExternalContext();
    // Refresh every hour
    const interval = setInterval(fetchExternalContext, 3600000);
    return () => clearInterval(interval);
  }, [loans]);

  // Build comprehensive prompt with actual data AND external context
  const buildAnalysisPrompt = useCallback((type) => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get top performing segments
    const topPerformingGeos = Object.entries(portfolioMetrics.geoDistribution)
      .sort((a, b) => a[1].defaultRate - b[1].defaultRate)
      .slice(0, 5)
      .map(([location, data]) => ({
        location,
        defaultRate: data.defaultRate.toFixed(1),
        avgFICO: Math.round(data.avgFICO),
        count: data.count
      }));

    const topPerformingIndustries = Object.entries(portfolioMetrics.industryDistribution)
      .map(([industry, data]) => {
        const defaultCount = data.performance.filter(s => 
          s === 'default' || s === 'restructured'
        ).length;
        const defaultRate = data.count > 0 ? (defaultCount / data.count) * 100 : 0;
        return { industry, defaultRate, count: data.count, amount: data.amount };
      })
      .sort((a, b) => a.defaultRate - b.defaultRate)
      .slice(0, 5);

    // Build the prompt based on analysis type with EXTERNAL CONTEXT
    let prompt = `You are analyzing loan portfolio data to discover patterns. Respond ONLY with a valid JSON object - no markdown, no backticks, no explanatory text before or after the JSON.

PORTFOLIO OVERVIEW:
- Total Loans: ${portfolioMetrics.summary.totalLoans}
- Total Outstanding: ${(portfolioMetrics.summary.totalOutstanding / 1000000).toFixed(2)}M
- Average Loan Size: ${(portfolioMetrics.summary.avgLoanSize / 1000).toFixed(1)}K
- Average FICO: ${Math.round(portfolioMetrics.summary.avgFICO)}
- Average DSCR: ${portfolioMetrics.summary.avgDSCR.toFixed(2)}
- Collection Rate: ${portfolioMetrics.summary.collectionRate.toFixed(1)}%
- Analysis Date: ${currentDate}

EXTERNAL ECONOMIC CONTEXT:
${externalContext ? `
- Federal Funds Rate: ${externalContext.economic.fedFundsRate?.value}% (${externalContext.economic.fedFundsRate?.change > 0 ? 'increasing' : 'decreasing'})
- Unemployment Rate: ${externalContext.economic.unemployment?.value}% (trend: ${externalContext.economic.unemployment?.trend})
- Inflation (YoY): ${externalContext.economic.inflation?.yoy?.toFixed(1)}%
- Small Business Sentiment: ${externalContext.economic.smallBusinessSentiment?.interpretation} (${externalContext.economic.smallBusinessSentiment?.value})
- GDP Growth: ${externalContext.economic.gdpGrowth?.quarterly}% quarterly
- Macro Environment: ${externalContext.summary?.macroEnvironment}
- Lending Conditions: ${externalContext.summary?.lendingConditions}

KEY EXTERNAL RISK FACTORS:
${externalContext.summary?.keyRiskFactors?.join('\n- ') || 'None identified'}

KEY EXTERNAL OPPORTUNITIES:
${externalContext.summary?.keyOpportunities?.join('\n- ') || 'None identified'}

INDUSTRY SECTOR PERFORMANCE:
${Object.entries(externalContext.industry || {}).slice(0, 5).map(([ind, data]) => 
  `- ${ind}: ${data.performance?.monthly?.toFixed(1)}% monthly, trend: ${data.trend}, risk: ${data.riskLevel}`
).join('\n')}

REGIONAL ECONOMIC CONDITIONS:
${Object.entries(externalContext.regional || {}).slice(0, 5).map(([state, data]) => 
  `- ${state}: Unemployment ${data.unemployment}%, Business Growth: ${data.businessGrowth}, Economic Index: ${data.economicIndex}`
).join('\n')}
` : 'External data temporarily unavailable - use portfolio patterns only'}

STATUS DISTRIBUTION:
${Object.entries(portfolioMetrics.statusDistribution)
  .map(([status, count]) => `- ${status}: ${count} loans (${((count/portfolioMetrics.summary.totalLoans)*100).toFixed(1)}%)`)
  .join('\n')}

TOP PERFORMING GEOGRAPHIES:
${topPerformingGeos.map(g => 
  `- ${g.location}: ${g.defaultRate}% default rate, ${g.count} loans, Avg FICO: ${g.avgFICO}`
).join('\n')}

TOP PERFORMING INDUSTRIES:
${topPerformingIndustries.map(i => 
  `- ${i.industry}: ${i.defaultRate.toFixed(1)}% default rate, ${i.count} loans, $${(i.amount/1000).toFixed(0)}K total`
).join('\n')}

DETAILED LOAN DATA (sample):
${JSON.stringify(analysisData.slice(0, 50), null, 2)}

ANALYSIS REQUIREMENTS:
1. Identify specific, actionable patterns with confidence scores
2. Quantify the financial impact of each discovery
3. Provide concrete recommendations
4. Focus on patterns that appear in at least 5 loans
5. Minimum confidence threshold: ${confidence}%
`;

    // Add type-specific instructions
    switch(type) {
      case 'opportunities':
        prompt += `
        
SPECIFIC FOCUS: Find hidden revenue opportunities
- Identify high-performing segments that are underrepresented
- Find combinations of factors (geography + industry + FICO) that outperform
- Look for "hidden gems" - small segments with exceptional performance
- Calculate potential revenue if these segments were expanded
- Identify underserved markets with good performance history`;
        break;
        
      case 'geographic':
        prompt += `

SPECIFIC FOCUS: Geographic performance patterns
- Identify cities/states with unusual performance patterns
- Find geographic clusters of success or failure
- Correlate location with industry performance
- Look for expansion opportunities in specific regions
- Identify regional economic factors affecting performance`;
        break;
        
      case 'industry':
        prompt += `

SPECIFIC FOCUS: Industry correlation analysis
- Find industries that consistently outperform
- Identify cross-industry correlations
- Discover industry-specific risk factors
- Find seasonal patterns by industry
- Identify emerging industry opportunities`;
        break;
        
      case 'risk':
        prompt += `

SPECIFIC FOCUS: Early warning signals
- Identify patterns that predict default 2-3 months in advance
- Find combinations of factors that indicate high risk
- Look for changes in payment velocity as indicators
- Identify which specific loans are likely to default in next 30-60 days
- Calculate probability scores for each risk pattern`;
        break;
        
      case 'seasonal':
        prompt += `

SPECIFIC FOCUS: Seasonal and temporal patterns
- Identify monthly/quarterly payment patterns
- Find seasonal business cycles by industry
- Discover time-based risk factors
- Identify optimal origination timing
- Find patterns in payment delays by time of year`;
        break;
        
      case 'recovery':
        prompt += `

SPECIFIC FOCUS: Recovery optimization patterns
- Identify what drives successful recovery from delinquency
- Find patterns in successful restructuring
- Discover factors that predict recovery success
- Identify optimal intervention timing
- Calculate recovery probability scores`;
        break;
    }

    prompt += `

CRITICAL: You must respond with ONLY a valid JSON object in exactly this format, with no markdown formatting, no backticks, and no text before or after:
{
  "discoveries": [
    {
      "pattern": "Specific pattern description with clear metrics",
      "confidence": 85,
      "affectedLoans": ["loan1", "loan2", "loan3"],
      "financialImpact": "150000",
      "recommendation": "Specific action to take immediately",
      "evidence": "Clear data supporting this pattern with numbers"
    }
  ],
  "summary": "Executive summary of key findings in 2-3 sentences",
  "immediateActions": ["Action 1 to take today", "Action 2 to implement this week", "Action 3 for next month"]
}`;

    return prompt;
  }, [portfolioMetrics, analysisData, confidence, externalContext]);

  // Run AI analysis
  const runAnalysis = useCallback(async () => {
    if (!apiKey && (!API_URL || API_URL.includes('localhost'))) {
      setError('Please configure API key or backend URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = buildAnalysisPrompt(selectedAnalysis);
      
      console.log('Sending analysis request for:', selectedAnalysis);
      
      // Call backend API
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify({
          prompt,
          analysisType: selectedAnalysis,
          model: 'claude-sonnet-4-5-20250929', // Correct model name for Sonnet 4.5
          maxTokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Received response:', responseData);
      
      // Handle different response structures from backend
      let analysisText;
      if (responseData.result) {
        // Backend returns {result: "..."}
        analysisText = responseData.result;
      } else if (responseData.content && Array.isArray(responseData.content)) {
        // Direct Claude API response structure
        analysisText = responseData.content[0].text;
      } else if (typeof responseData === 'string') {
        // Direct string response
        analysisText = responseData;
      } else {
        console.error('Unexpected response structure:', responseData);
        throw new Error('Unexpected response format from API');
      }
      
      console.log('Analysis text to parse:', analysisText);
      
      // Clean the response text - handle various markdown and formatting issues
      let cleanedText = analysisText;
      
      console.log('Raw response before cleaning:', cleanedText.substring(0, 200));
      
      // More aggressive cleaning for markdown and special characters
      // Remove backticks with or without json designation
      cleanedText = cleanedText.replace(/^```json\s*/i, '');
      cleanedText = cleanedText.replace(/^```\s*/gm, '');
      cleanedText = cleanedText.replace(/```$/gm, '');
      cleanedText = cleanedText.replace(/```json\s*/gi, '');
      cleanedText = cleanedText.replace(/```\s*/g, '');
      
      // Remove any leading/trailing quotes that might wrap the entire response
      cleanedText = cleanedText.trim();
      if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
        cleanedText = cleanedText.slice(1, -1);
      }
      
      // Handle escaped quotes and newlines that might be in the string
      cleanedText = cleanedText.replace(/\\"/g, '"');
      cleanedText = cleanedText.replace(/\\n/g, '\n');
      cleanedText = cleanedText.replace(/\\\\/g, '\\');
      
      console.log('Cleaned text:', cleanedText.substring(0, 200));
      
      // Extract JSON from the response
      let parsed;
      
      // First, try to parse the cleaned text directly
      try {
        parsed = JSON.parse(cleanedText);
        console.log('Successfully parsed JSON directly');
      } catch (directError) {
        console.log('Direct parse failed, trying to extract JSON object...');
        
        // Try to find JSON object in the text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed extracted JSON');
          } catch (parseError) {
            console.error('Failed to parse extracted JSON:', parseError);
            console.log('Attempted to parse:', jsonMatch[0].substring(0, 200));
            
            // Try even more aggressive cleaning
            let ultraClean = jsonMatch[0]
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
              .replace(/\r\n/g, '\n') // Normalize line endings
              .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
              .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
              .trim();
            
            try {
              parsed = JSON.parse(ultraClean);
              console.log('Successfully parsed after ultra-aggressive cleaning');
            } catch (finalError) {
              console.error('Final parse attempt failed:', finalError);
              
              // Last resort: try to manually extract the data from the visible pattern
              // This handles cases where the JSON is valid but wrapped in extra formatting
              const patternMatch = cleanedText.match(/"pattern":\s*"([^"]+)"/);
              const confidenceMatch = cleanedText.match(/"confidence":\s*(\d+)/);
              const loansMatch = cleanedText.match(/"affectedLoans":\s*\[(.*?)\]/);
              const impactMatch = cleanedText.match(/"financialImpact":\s*"([^"]+)"/);
              const recommendationMatch = cleanedText.match(/"recommendation":\s*"([^"]+)"/);
              
              if (patternMatch && confidenceMatch) {
                console.log('Manually extracting pattern data from malformed JSON');
                
                // Extract loan IDs
                let affectedLoans = [];
                if (loansMatch && loansMatch[1]) {
                  affectedLoans = loansMatch[1]
                    .split(',')
                    .map(l => l.trim().replace(/["']/g, ''))
                    .filter(l => l.length > 0);
                }
                
                parsed = {
                  discoveries: [{
                    pattern: patternMatch[1],
                    confidence: parseInt(confidenceMatch[1]),
                    affectedLoans: affectedLoans,
                    financialImpact: impactMatch ? impactMatch[1] : "0",
                    recommendation: recommendationMatch ? recommendationMatch[1] : "Review identified patterns",
                    evidence: "Pattern detected in portfolio analysis"
                  }],
                  summary: "Analysis completed - patterns identified in portfolio",
                  immediateActions: ["Review identified loans", "Implement recommended monitoring"]
                };
              } else {
                throw new Error('Could not extract pattern data from response');
              }
            }
          }
        } else {
          console.error('No JSON object found in response');
          // Create a fallback structure with the raw response
          parsed = {
            discoveries: [{
              pattern: "Analysis completed but response format was unexpected. Check console for details.",
              confidence: 50,
              affectedLoans: [],
              financialImpact: "0",
              recommendation: "Review the analysis manually in console logs",
              evidence: cleanedText.substring(0, 100) + "..."
            }],
            summary: "Analysis completed with parsing errors. Raw response logged to console.",
            immediateActions: ["Check browser console for full response", "Verify backend API configuration"]
          };
          console.log('Full raw response for manual review:', analysisText);
        }
      }
      
      // Ensure the parsed object has the expected structure
      if (!parsed.discoveries || !Array.isArray(parsed.discoveries)) {
        console.warn('Discoveries not found or not an array, creating default structure');
        parsed.discoveries = [];
      }
      
      // Clean up the discoveries data
      parsed.discoveries = parsed.discoveries.map(disc => ({
        pattern: disc.pattern || 'Pattern description missing',
        confidence: typeof disc.confidence === 'number' ? disc.confidence : 70,
        affectedLoans: Array.isArray(disc.affectedLoans) ? disc.affectedLoans : [],
        financialImpact: disc.financialImpact ? String(disc.financialImpact) : '0',
        recommendation: disc.recommendation || 'No recommendation provided',
        evidence: disc.evidence || 'No evidence provided'
      }));
      
      const discovery = {
        id: Date.now(),
        type: selectedAnalysis,
        timestamp: new Date().toISOString(),
        discoveries: parsed.discoveries,
        summary: parsed.summary || 'Analysis completed',
        immediateActions: parsed.immediateActions || []
      };

      console.log('Final discovery object:', discovery);
      
      setDiscoveries(prev => [discovery, ...prev]);
      if (onDiscovery) onDiscovery(discovery);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAnalysis, apiKey, buildAnalysisPrompt, onDiscovery]);

  // Calculate impact metrics for display
  const calculateImpactMetrics = (discoveries) => {
    let totalImpact = 0;
    let totalLoansAffected = new Set();
    
    discoveries.forEach(d => {
      d.discoveries?.forEach(disc => {
        if (disc.financialImpact) {
          const impact = parseFloat(String(disc.financialImpact).replace(/[^0-9.-]/g, ''));
          if (!isNaN(impact)) totalImpact += impact;
        }
        if (disc.affectedLoans && Array.isArray(disc.affectedLoans)) {
          disc.affectedLoans.forEach(loan => totalLoansAffected.add(loan));
        }
      });
    });

    return {
      totalImpact,
      loansAffected: totalLoansAffected.size,
      discoveryCount: discoveries.reduce((sum, d) => sum + (d.discoveries?.length || 0), 0)
    };
  };

  const impactMetrics = calculateImpactMetrics(discoveries);

  return (
    <div className="space-y-6">
      {/* External Data Status */}
      {externalContext && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-900">External Market Data Active</h4>
              <p className="text-sm text-green-700 mt-1">
                Fed Rate: {externalContext.economic?.fedFundsRate?.value}% | 
                Unemployment: {externalContext.economic?.unemployment?.value}% | 
                Environment: {externalContext.summary?.macroEnvironment}
              </p>
            </div>
            <div className="text-sm text-green-600">
              Updated: {new Date(externalContext.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
      
      {isFetchingContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">Fetching latest economic indicators...</p>
        </div>
      )}

      {/* Analysis Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          AI Pattern Discovery Engine
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Type
            </label>
            <select
              value={selectedAnalysis}
              onChange={(e) => setSelectedAnalysis(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              disabled={isAnalyzing}
            >
              {analysisTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Confidence
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="95"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="flex-1"
                disabled={isAnalyzing}
              />
              <span className="text-sm font-medium w-12">{confidence}%</span>
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className={`w-full px-6 py-2 rounded-lg font-medium transition-colors ${
                isAnalyzing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  Analyzing...
                </span>
              ) : (
                'Run Analysis'
              )}
            </button>
          </div>
        </div>

        {/* Selected Analysis Description */}
        <div className="bg-white/50 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            <strong>{analysisTypes.find(a => a.id === selectedAnalysis)?.name}:</strong>{' '}
            {analysisTypes.find(a => a.id === selectedAnalysis)?.description}
          </p>
        </div>
      </div>

      {/* Impact Summary */}
      {discoveries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-800">
              ${(impactMetrics.totalImpact / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-green-600">Potential Impact</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-800">
              {impactMetrics.loansAffected}
            </div>
            <div className="text-sm text-blue-600">Loans Affected</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-800">
              {impactMetrics.discoveryCount}
            </div>
            <div className="text-sm text-purple-600">Patterns Found</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Discoveries List */}
      <div className="space-y-4">
        {discoveries.map((discovery) => (
          <div key={discovery.id} className="bg-white border border-gray-200 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    {analysisTypes.find(a => a.id === discovery.type)?.icon}
                    {analysisTypes.find(a => a.id === discovery.type)?.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {new Date(discovery.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {discovery.discoveries?.length || 0} patterns
                </span>
              </div>
            </div>
            
            <div className="p-4">
              {/* Summary */}
              {discovery.summary && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <h5 className="font-semibold text-sm mb-1">Executive Summary</h5>
                  <p className="text-sm text-gray-700">{discovery.summary}</p>
                </div>
              )}
              
              {/* Individual Discoveries */}
              <div className="space-y-3">
                {discovery.discoveries?.map((disc, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900">{disc.pattern}</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        disc.confidence >= 80 ? 'bg-green-100 text-green-800' :
                        disc.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {disc.confidence}% confidence
                      </span>
                    </div>
                    
                    {disc.evidence && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Evidence:</strong> {disc.evidence}
                      </p>
                    )}
                    
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">
                        Impact: ${parseFloat(String(disc.financialImpact).replace(/[^0-9.-]/g, '')) ? 
                          (parseFloat(String(disc.financialImpact).replace(/[^0-9.-]/g, '')) / 1000).toFixed(0) + 'K' : 
                          '0'}
                      </span>
                      <span className="text-blue-600">
                        Affects: {disc.affectedLoans?.length || 0} loans
                      </span>
                    </div>
                    
                    {disc.recommendation && (
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <strong className="text-sm text-blue-900">Action:</strong>
                        <p className="text-sm text-blue-800">{disc.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Immediate Actions */}
              {discovery.immediateActions?.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded">
                  <h5 className="font-semibold text-sm mb-2">Immediate Actions Required</h5>
                  <ul className="list-disc list-inside text-sm text-yellow-900 space-y-1">
                    {discovery.immediateActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {discoveries.length === 0 && !isAnalyzing && (
          <div className="text-center py-8 text-gray-500">
            <p>No discoveries yet. Run an analysis to find patterns in your portfolio.</p>
          </div>
        )}
      </div>
    </div>
  );
};