// src/components/AIAnalytics/PatternDiscovery/PatternDiscoveryCore.jsx
import React, { useState, useEffect } from 'react';
import { externalDataService } from '../../../services/ExternalDataService';

// Import AI components
import { PromptBuilder } from './ai/PromptBuilder';
import { ResponseParser } from './ai/ResponseParser';
import { PatternValidator } from './ai/PatternValidator';
import { InsightRanker } from './ai/InsightRanker';

// Import visualization components (if they exist)
// import { RiskMatrix } from './visualizations/RiskMatrix';
// import { PatternHeatmap } from './visualizations/PatternHeatmap';

// Import insight components (if they exist)
// import { InsightCard } from './insights/InsightCard';
// import { ImpactCalculator } from './insights/ImpactCalculator';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ANALYSIS_TYPES = [
  { 
    id: 'comprehensive', 
    name: 'Comprehensive Multi-Pattern',
    description: 'Find 5-10 patterns across all dimensions',
    icon: '',
    color: 'purple'
  },
  { 
    id: 'opportunities', 
    name: 'Hidden Opportunities',
    description: 'Underexploited profitable segments',
    icon: '',
    color: 'green'
  },
  {
    id: 'risks',
    name: 'Risk Patterns',
    description: 'Early warning signals and risk clusters',
    icon: '',
    color: 'red'
  },
  {
    id: 'geographic',
    name: 'Geographic Intelligence',
    description: 'Location-based performance patterns',
    icon: '',
    color: 'blue'
  },
  {
    id: 'industry',
    name: 'Industry Correlations',
    description: 'Cross-industry insights',
    icon: '',
    color: 'orange'
  },
  {
    id: 'temporal',
    name: 'Temporal Patterns',
    description: 'Time-based and seasonal trends',
    icon: '',
    color: 'indigo'
  }
];

export const PatternDiscoveryCore = ({ 
  loans, 
  analysisData, 
  portfolioMetrics, 
  apiKey, 
  onDiscovery 
}) => {
  // Core state management
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('comprehensive');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discoveries, setDiscoveries] = useState([]);
  const [activePatterns, setActivePatterns] = useState([]);
  const [error, setError] = useState(null);
  
  // Analysis configuration
  const [config, setConfig] = useState({
    minPatterns: 5,
    maxPatterns: 10,
    confidenceThreshold: 70,
    includeVisualizations: true,
    depthLevel: 'comprehensive'
  });
  
  // External data context
  const [externalContext, setExternalContext] = useState(null);
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  
  // Analysis progress tracking
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
    phase: '',
    patternsFound: 0
  });

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
    const interval = setInterval(fetchExternalContext, 3600000); // Refresh hourly
    return () => clearInterval(interval);
  }, [loans]);

  // Main analysis function - no dependencies on other callbacks
  const runAnalysis = async () => {
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
      // Phase 1: Prepare data
      setAnalysisProgress(prev => ({ ...prev, phase: 'Preprocessing data...' }));
      
      const preprocessedData = {
        loans: analysisData || [],
        metrics: portfolioMetrics,
        external: externalContext,
        statistics: {
          totalLoans: portfolioMetrics?.summary?.totalLoans || 0,
          avgFICO: portfolioMetrics?.summary?.avgFICO || 0,
          avgDSCR: portfolioMetrics?.summary?.avgDSCR || 0,
          defaultRate: portfolioMetrics?.summary?.defaultRate || 0,
          geoDistribution: portfolioMetrics?.geoDistribution || {},
          industryDistribution: portfolioMetrics?.industryDistribution || {}
        }
      };

      // Phase 2: Build prompt using PromptBuilder
      setAnalysisProgress(prev => ({ ...prev, phase: 'Building analysis prompt...', current: 1 }));
      
      const promptBuilder = new PromptBuilder({
        minPatterns: config.minPatterns,
        maxPatterns: config.maxPatterns,
        confidenceThreshold: config.confidenceThreshold,
        depthLevel: config.depthLevel
      });
      
      let prompt;
      if (selectedAnalysisType === 'comprehensive') {
        prompt = promptBuilder.buildComprehensivePrompt(preprocessedData, selectedAnalysisType);
      } else {
        prompt = promptBuilder.buildFocusedPrompt(preprocessedData, selectedAnalysisType);
      }
      
      console.log('Analysis type:', selectedAnalysisType);
      console.log('Prompt length:', prompt.length);

      // Phase 3: Call AI API
      setAnalysisProgress(prev => ({ ...prev, phase: 'Running AI analysis...' }));
      
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify({
          prompt,
          analysisType: selectedAnalysisType,
          model: 'claude-sonnet-4-5-20250929',
          maxTokens: 35000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('API Response:', responseData);

      // Phase 4: Parse response using ResponseParser
      setAnalysisProgress(prev => ({ ...prev, phase: 'Parsing patterns...' }));
      
      const parser = new ResponseParser();
      const parsedResponse = parser.parseResponse(responseData);
      
      console.log('Parsed Response:', parsedResponse);
      
      // Check if we have patterns or if the response was truncated
      if (responseData.stop_reason === 'max_tokens') {
        console.warn('Response was truncated due to max tokens limit');
        // Still try to use what we got
      }
      
      if (!parsedResponse.patterns || parsedResponse.patterns.length === 0) {
        console.warn('No patterns found in parsed response');
        // If response was truncated, try to extract partial patterns
        if (responseData.stop_reason === 'max_tokens' && responseData.content?.[0]?.text) {
          console.log('Attempting to extract partial patterns from truncated response');
        }
        setActivePatterns([]);
        setError('No complete patterns discovered. The response may have been truncated. Try reducing the number of expected patterns or simplifying the analysis.');
        return;
      }

      // Phase 5: Validate patterns
      setAnalysisProgress(prev => ({ ...prev, phase: 'Validating patterns...' }));
      
      const validator = new PatternValidator(config.confidenceThreshold);
      const validatedPatterns = validator.validateBatch(parsedResponse.patterns, loans || []);
      
      console.log('Validated patterns:', validatedPatterns);

      // Phase 6: Rank patterns
      const ranker = new InsightRanker();
      const rankedPatterns = ranker.rankPatterns(validatedPatterns, portfolioMetrics);
      const finalPatterns = rankedPatterns.slice(0, config.maxPatterns);
      
      console.log('Final patterns count:', finalPatterns.length);

      // Phase 7: Add visualizations if enabled
      let patternsToDisplay = finalPatterns;
      if (config.includeVisualizations) {
        setAnalysisProgress(prev => ({ ...prev, phase: 'Generating visualizations...' }));
        patternsToDisplay = finalPatterns.map(pattern => ({
          ...pattern,
          visualization: {
            type: pattern.type === 'geographic' ? 'heatmap' : 
                  pattern.type === 'risk' ? 'matrix' : 'chart',
            data: {
              labels: pattern.factors?.primary || [],
              values: [pattern.confidence, pattern.financialImpact / 10000]
            }
          }
        }));
      }
      
      // Phase 8: Set patterns and create discovery record
      setActivePatterns(patternsToDisplay);
      
      const discovery = {
        id: Date.now(),
        type: selectedAnalysisType,
        timestamp: new Date().toISOString(),
        patterns: patternsToDisplay,
        summary: parsedResponse.summary || generateSummary(patternsToDisplay),
        config: config,
        metrics: calculateMetrics(patternsToDisplay)
      };
      
      setDiscoveries(prev => [discovery, ...prev]);
      if (onDiscovery) onDiscovery(discovery);
      
      setAnalysisProgress(prev => ({ 
        ...prev, 
        phase: 'Analysis complete!', 
        current: config.maxPatterns,
        patternsFound: patternsToDisplay.length 
      }));
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Analysis failed');
      setAnalysisProgress(prev => ({ ...prev, phase: 'Error occurred' }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper functions - not callbacks, just regular functions
  const generateSummary = (patterns) => {
    const totalImpact = patterns.reduce((sum, p) => sum + (p.financialImpact || 0), 0);
    const avgConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;
    
    return {
      patternCount: patterns.length,
      totalFinancialImpact: totalImpact,
      averageConfidence: Math.round(avgConfidence),
      topPattern: patterns[0]?.title || 'No patterns found',
      immediateActions: patterns.slice(0, 3)
        .map(p => p.recommendation?.immediate)
        .filter(Boolean)
    };
  };

  const calculateMetrics = (patterns) => {
    if (!patterns || patterns.length === 0) {
      return {
        totalPatterns: 0,
        byType: {},
        totalLoansAffected: 0,
        confidenceRange: { min: 0, max: 0, avg: 0 }
      };
    }
    
    return {
      totalPatterns: patterns.length,
      byType: patterns.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {}),
      totalLoansAffected: new Set(patterns.flatMap(p => p.affectedLoans || [])).size,
      confidenceRange: {
        min: Math.min(...patterns.map(p => p.confidence || 0)),
        max: Math.max(...patterns.map(p => p.confidence || 0)),
        avg: patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / patterns.length
      }
    };
  };

  const impactMetrics = discoveries.length > 0 
    ? {
        totalPatterns: discoveries.reduce((sum, d) => sum + (d.patterns?.length || 0), 0),
        totalImpact: discoveries.reduce((sum, d) => 
          sum + (d.summary?.totalFinancialImpact || 0), 0
        ),
        avgConfidence: discoveries.reduce((sum, d) => 
          sum + (d.summary?.averageConfidence || 0), 0
        ) / discoveries.length
      }
    : { totalPatterns: 0, totalImpact: 0, avgConfidence: 0 };

  return (
    <div className="pattern-discovery-core space-y-6">
      {/* External Data Status */}
      {externalContext && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-900">
                🌐 External Market Intelligence Active
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

      {/* Main Control Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900">
            🚀 AI Pattern Discovery Engine v2.0
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
                  {type.icon} {type.name}
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
          className={`w-full px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] ${
            isAnalyzing 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg'
          }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center gap-3">
              <span className="animate-spin">⚙️</span>
              <span>{analysisProgress.phase}</span>
              {analysisProgress.patternsFound > 0 && (
                <span className="text-sm">
                  ({analysisProgress.patternsFound} patterns)
                </span>
              )}
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🔍</span>
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Active Patterns Display */}
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

          {/* Pattern Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePatterns.map((pattern, idx) => (
              <div 
                key={pattern.id || idx} 
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
              >
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
                      ${((pattern.financialImpact || 0) / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Affects:</span>
                    <span className="ml-1 font-medium text-blue-600">
                      {pattern.affectedCount || pattern.affectedLoans?.length || 0} loans
                    </span>
                  </div>
                </div>

                {pattern.recommendation && (
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <strong className="text-xs text-blue-900">Action:</strong>
                    <p className="text-xs text-blue-800 mt-1">
                      {pattern.recommendation.immediate || pattern.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {discoveries.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-800">
              {impactMetrics.totalPatterns}
            </div>
            <div className="text-sm text-blue-600">Total Patterns Found</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-800">
              ${(impactMetrics.totalImpact / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-green-600">Total Impact</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-800">
              {Math.round(impactMetrics.avgConfidence)}%
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

      {/* Empty State */}
      {!isAnalyzing && activePatterns.length === 0 && discoveries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg">Ready to discover hidden patterns in your portfolio</p>
          <p className="text-sm mt-2">Configure your analysis parameters and click "Discover Patterns"</p>
        </div>
      )}
    </div>
  );
};