// src/components/AIAnalytics/PatternDiscovery/PatternDiscoveryCore.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { externalDataService } from '../../../services/ExternalDataService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ANALYSIS_TYPES = [
  { 
    id: 'comprehensive', 
    name: 'Comprehensive Multi-Pattern',
    description: 'Find 5-10 patterns across all dimensions'
  },
  { 
    id: 'opportunities', 
    name: 'Hidden Opportunities',
    description: 'Underexploited profitable segments'
  },
  {
    id: 'risks',
    name: 'Risk Patterns',
    description: 'Early warning signals and risk clusters'
  },
  {
    id: 'geographic',
    name: 'Geographic Intelligence',
    description: 'Location-based performance patterns'
  },
  {
    id: 'industry',
    name: 'Industry Correlations',
    description: 'Cross-industry insights'
  },
  {
    id: 'temporal',
    name: 'Temporal Patterns',
    description: 'Time-based and seasonal trends'
  }
];

export const PatternDiscoveryCore = ({ 
  loans, 
  analysisData, 
  portfolioMetrics, 
  apiKey, 
  onDiscovery 
}) => {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('comprehensive');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discoveries, setDiscoveries] = useState([]);
  const [activePatterns, setActivePatterns] = useState([]);
  const [error, setError] = useState(null);
  
  const [config, setConfig] = useState({
    minPatterns: 5,
    maxPatterns: 10,
    confidenceThreshold: 70,
    includeVisualizations: true,
    depthLevel: 'comprehensive'
  });
  
  const [externalContext, setExternalContext] = useState(null);
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
    phase: '',
    patternsFound: 0
  });

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
    const interval = setInterval(fetchExternalContext, 3600000);
    return () => clearInterval(interval);
  }, [loans]);

  const buildEnhancedPrompt = useCallback((data) => {
    const analysisType = ANALYSIS_TYPES.find(t => t.id === selectedAnalysisType);
    
    return `You are an expert financial analyst discovering hidden patterns in loan portfolio data.

CRITICAL INSTRUCTIONS:
1. Find between ${config.minPatterns} and ${config.maxPatterns} DISTINCT, NON-OBVIOUS patterns
2. Each pattern must be statistically significant and actionable
3. Focus on ${analysisType.name}: ${analysisType.description}
4. Respond with ONLY valid JSON, no markdown, no backticks

PORTFOLIO DATA:
- Total Loans: ${data.statistics.totalLoans}
- Average FICO: ${Math.round(data.statistics.avgFICO)}
- Average DSCR: ${data.statistics.avgDSCR}
- Geographic Distribution: ${JSON.stringify(data.statistics.geoDistribution)}
- Industry Distribution: ${JSON.stringify(data.statistics.industryDistribution)}
- Loan Details: ${JSON.stringify(data.loans.slice(0, 100))}

EXTERNAL CONTEXT:
${data.external ? JSON.stringify(data.external.summary) : 'Not available'}

ANALYSIS REQUIREMENTS:
- Patterns must affect at least 5 loans or 5% of portfolio value
- Each pattern must have confidence score based on statistical significance
- Include cross-correlations between factors (geography + industry + credit metrics)
- Identify both risks AND opportunities
- Quantify financial impact in dollars
- Provide specific, actionable recommendations

OUTPUT FORMAT (JSON only):
{
  "patterns": [
    {
      "id": "pattern_1",
      "type": "opportunity|risk|correlation|anomaly",
      "title": "Concise descriptive title",
      "description": "Detailed explanation with specific metrics",
      "confidence": 85,
      "statisticalSignificance": 0.03,
      "affectedLoans": ["loan_id_1", "loan_id_2"],
      "affectedCount": 25,
      "financialImpact": 450000,
      "impactType": "revenue_opportunity|cost_savings|risk_mitigation",
      "factors": {
        "primary": ["geography:Texas", "industry:Technology"],
        "secondary": ["FICO:720-740", "loanSize:<150000"],
        "correlation": 0.73
      },
      "metrics": {
        "performanceImprovement": "31%",
        "comparedTo": "portfolio average",
        "timeframe": "next 6 months"
      },
      "recommendation": {
        "immediate": "Contact these 5 borrowers today",
        "shortTerm": "Adjust underwriting criteria for this segment",
        "longTerm": "Expand lending in this category by 20%"
      },
      "evidence": "Based on 24 months of historical data showing consistent pattern"
    }
  ],
  "summary": {
    "totalPatternsFound": 7,
    "highConfidencePatterns": 5,
    "totalFinancialImpact": 2500000,
    "topInsight": "Key finding that executives should know"
  },
  "methodology": "Statistical methods used for pattern discovery"
}`;
  }, [config, selectedAnalysisType]);

  const preprocessPortfolioData = useCallback(() => {
    return {
      loans: analysisData,
      metrics: portfolioMetrics,
      external: externalContext,
      statistics: {
        totalLoans: portfolioMetrics.summary.totalLoans,
        avgFICO: portfolioMetrics.summary.avgFICO,
        avgDSCR: portfolioMetrics.summary.avgDSCR,
        defaultRate: portfolioMetrics.summary.defaultRate || 0,
        geoDistribution: portfolioMetrics.geoDistribution,
        industryDistribution: portfolioMetrics.industryDistribution
      }
    };
  }, [analysisData, portfolioMetrics, externalContext]);

  const callAIAnalysis = async (prompt) => {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        prompt,
        analysisType: 'pattern_discovery_multi',
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 6000
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    let analysisText = result.result || result.content?.[0]?.text || result;
    
    analysisText = analysisText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    if (analysisText.startsWith('"') && analysisText.endsWith('"')) {
      analysisText = analysisText.slice(1, -1);
    }
    analysisText = analysisText.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    
    try {
      const parsed = JSON.parse(analysisText);
      return parsed.patterns || [];
    } catch (e) {
      console.error('Failed to parse patterns:', e);
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.patterns || [];
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', innerError);
        }
      }
      return [];
    }
  };

  const validatePatterns = (patterns) => {
    return patterns
      .filter(p => p.confidence >= config.confidenceThreshold)
      .sort((a, b) => b.financialImpact - a.financialImpact)
      .slice(0, config.maxPatterns);
  };

  const generateExecutiveSummary = (patterns) => {
    const totalImpact = patterns.reduce((sum, p) => sum + (p.financialImpact || 0), 0);
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    
    return {
      patternCount: patterns.length,
      totalFinancialImpact: totalImpact,
      averageConfidence: avgConfidence,
      topPattern: patterns[0]?.title || 'No patterns found',
      immediateActions: patterns.slice(0, 3).map(p => p.recommendation?.immediate).filter(Boolean)
    };
  };

  const calculateDiscoveryMetrics = (patterns) => {
    return {
      totalPatterns: patterns.length,
      byType: patterns.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {}),
      totalLoansAffected: new Set(patterns.flatMap(p => p.affectedLoans || [])).size,
      confidenceRange: {
        min: Math.min(...patterns.map(p => p.confidence)),
        max: Math.max(...patterns.map(p => p.confidence)),
        avg: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      }
    };
  };

  const runAnalysis = useCallback(async () => {
    if (!apiKey && (!API_URL || API_URL.includes('localhost'))) {
      setError('Please configure API key or backend URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({
      current: 0,
      total: config.maxPatterns,
      phase: 'Initializing analysis...',
      patternsFound: 0
    });

    try {
      setAnalysisProgress(prev => ({ ...prev, phase: 'Preprocessing data...' }));
      const preprocessedData = preprocessPortfolioData();
      
      setAnalysisProgress(prev => ({ ...prev, phase: 'Building analysis prompt...', current: 1 }));
      const prompt = buildEnhancedPrompt(preprocessedData);
      
      setAnalysisProgress(prev => ({ ...prev, phase: 'Running AI analysis...' }));
      const patterns = await callAIAnalysis(prompt);
      
      setAnalysisProgress(prev => ({ ...prev, phase: 'Validating patterns...' }));
      const validatedPatterns = validatePatterns(patterns);
      
      setActivePatterns(validatedPatterns);
      
      const discovery = {
        id: Date.now(),
        type: selectedAnalysisType,
        timestamp: new Date().toISOString(),
        patterns: validatedPatterns,
        summary: generateExecutiveSummary(validatedPatterns),
        config: config,
        metrics: calculateDiscoveryMetrics(validatedPatterns)
      };
      
      setDiscoveries(prev => [discovery, ...prev]);
      if (onDiscovery) onDiscovery(discovery);
      
      setAnalysisProgress(prev => ({ 
        ...prev, 
        phase: 'Analysis complete!', 
        current: prev.total,
        patternsFound: validatedPatterns.length 
      }));
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
      setAnalysisProgress(prev => ({ ...prev, phase: 'Error occurred' }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [config, selectedAnalysisType, apiKey, buildEnhancedPrompt, preprocessPortfolioData, onDiscovery]);

  return (
    <div className="pattern-discovery-core space-y-6">
      {externalContext && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-900">
                External Market Intelligence Active
              </h4>
              <p className="text-sm text-green-700 mt-1">
                Fed Rate: {externalContext.economic?.fedFundsRate?.value}% | 
                Unemployment: {externalContext.economic?.unemployment?.value}% | 
                Macro: {externalContext.summary?.macroEnvironment}
              </p>
            </div>
            <div className="text-sm text-green-600">
              Updated: {new Date(externalContext.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900">
            AI Pattern Discovery Engine v2.0
          </h3>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            Multi-Pattern Mode
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Type
            </label>
            <select
              value={selectedAnalysisType}
              onChange={(e) => setSelectedAnalysisType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              disabled={isAnalyzing}
            >
              {ANALYSIS_TYPES.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Patterns: {config.minPatterns}-{config.maxPatterns}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="3"
                max="15"
                value={config.maxPatterns}
                onChange={(e) => setConfig({...config, maxPatterns: parseInt(e.target.value)})}
                className="flex-1"
                disabled={isAnalyzing}
              />
              <span className="text-sm font-medium w-8">{config.maxPatterns}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Confidence: {config.confidenceThreshold}%
            </label>
            <input
              type="range"
              min="50"
              max="95"
              value={config.confidenceThreshold}
              onChange={(e) => setConfig({...config, confidenceThreshold: parseInt(e.target.value)})}
              className="w-full"
              disabled={isAnalyzing}
            />
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeVisualizations}
              onChange={(e) => setConfig({...config, includeVisualizations: e.target.checked})}
              disabled={isAnalyzing}
            />
            <span className="text-sm">Include Visualizations</span>
          </label>
          
          <select
            value={config.depthLevel}
            onChange={(e) => setConfig({...config, depthLevel: e.target.value})}
            className="text-sm border rounded px-2"
            disabled={isAnalyzing}
          >
            <option value="basic">Basic Depth</option>
            <option value="standard">Standard Depth</option>
            <option value="comprehensive">Comprehensive Depth</option>
          </select>
        </div>

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
            isAnalyzing 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg'
          }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center gap-3">
              <span className="animate-spin">⚙️</span>
              <span>{analysisProgress.phase}</span>
              <span className="text-sm">
                ({analysisProgress.patternsFound} patterns found)
              </span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Discover Patterns</span>
              <span className="text-sm opacity-90">
                (Find {config.minPatterns}-{config.maxPatterns} insights)
              </span>
            </span>
          )}
        </button>

        {isAnalyzing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {activePatterns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Discovered Patterns ({activePatterns.length})
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                Export All
              </button>
              <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                Compare
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePatterns.map((pattern, idx) => (
              <div 
                key={pattern.id || idx} 
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{pattern.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pattern.confidence >= 80 ? 'bg-green-100 text-green-800' :
                      pattern.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pattern.confidence}% confidence
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{pattern.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Impact:</span>
                      <span className="ml-1 font-medium text-green-600">
                        ${(pattern.financialImpact / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Affects:</span>
                      <span className="ml-1 font-medium text-blue-600">
                        {pattern.affectedCount || pattern.affectedLoans?.length || 0} loans
                      </span>
                    </div>
                  </div>

                  {config.includeVisualizations && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-center text-gray-400 text-sm">
                      [visualization placeholder]
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100">
                      View Details
                    </button>
                    <button className="flex-1 px-3 py-1 bg-green-50 text-green-700 rounded text-sm hover:bg-green-100">
                      Take Action
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {discoveries.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-800">
              {discoveries.reduce((sum, d) => sum + (d.patterns?.length || 0), 0)}
            </div>
            <div className="text-sm text-blue-600">Total Patterns Found</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-800">
              ${(discoveries.reduce((sum, d) => 
                sum + (d.summary?.totalFinancialImpact || 0), 0
              ) / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-green-600">Total Impact</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-800">
              {Math.round(discoveries.reduce((sum, d) => 
                sum + (d.summary?.averageConfidence || 0), 0
              ) / discoveries.length)}%
            </div>
            <div className="text-sm text-purple-600">Avg Confidence</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-800">
              {discoveries.length}
            </div>
            <div className="text-sm text-orange-600">Analyses Run</div>
          </div>
        </div>
      )}

      {!isAnalyzing && activePatterns.length === 0 && discoveries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Ready to discover hidden patterns in your portfolio</p>
          <p className="text-sm mt-2">Configure your analysis parameters and click "Discover Patterns"</p>
        </div>
      )}
    </div>
  );
};