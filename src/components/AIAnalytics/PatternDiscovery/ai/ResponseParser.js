// src/components/AIAnalytics/PatternDiscovery/ai/ResponseParser.js

/**
 * Robust parser for AI responses
 * Handles various response formats and ensures clean pattern extraction
 */

export class ResponseParser {
  constructor() {
    this.maxRetries = 3;
  }

  /**
   * Parse AI response with multiple fallback strategies
   */
  parseResponse(response) {
    // Handle different response structures
    let textContent = this.extractTextContent(response);
    
    if (!textContent) {
      console.error('No text content found in response');
      return this.getEmptyResponse();
    }

    // Try multiple parsing strategies
    const strategies = [
      () => this.parseCleanJSON(textContent),
      () => this.parseWithMarkdownRemoval(textContent),
      () => this.parseWithAggressiveCleaning(textContent),
      () => this.parseWithRegexExtraction(textContent),
      () => this.parseWithManualExtraction(textContent)
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && result.patterns && result.patterns.length > 0) {
          return this.validateAndEnhanceResponse(result);
        }
      } catch (error) {
        continue; // Try next strategy
      }
    }

    // If all strategies fail, return structured error response
    return this.getErrorResponse(textContent);
  }

  /**
   * Extract text content from various response formats
   */
  extractTextContent(response) {
    // Handle different response structures from backend
    if (typeof response === 'string') {
      return response;
    }
    
    if (response?.result) {
      return response.result;
    }
    
    if (response?.content && Array.isArray(response.content)) {
      return response.content[0]?.text || '';
    }
    
    if (response?.text) {
      return response.text;
    }
    
    if (response?.data) {
      return this.extractTextContent(response.data);
    }
    
    return JSON.stringify(response);
  }

  /**
   * Parse clean JSON directly
   */
  parseCleanJSON(text) {
    return JSON.parse(text);
  }

  /**
   * Parse after removing markdown formatting
   */
  parseWithMarkdownRemoval(text) {
    let cleaned = text;
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/gim, '');
    cleaned = cleaned.replace(/^```\s*/gm, '');
    cleaned = cleaned.replace(/```$/gm, '');
    
    // Remove any quotes wrapping the entire response
    cleaned = cleaned.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    
    // Unescape JSON string escapes
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\n/g, '\n');
    cleaned = cleaned.replace(/\\t/g, '\t');
    cleaned = cleaned.replace(/\\\\/g, '\\');
    
    return JSON.parse(cleaned);
  }

  /**
   * Parse with aggressive text cleaning
   */
  parseWithAggressiveCleaning(text) {
    let cleaned = text;
    
    // Remove markdown code blocks but keep the content
    cleaned = cleaned.replace(/```json\s*/gi, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    
    // Remove control characters
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Fix common JSON issues
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(:)/g, '$1"$2"$3'); // Quote unquoted keys
    cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"'); // Convert single quotes to double
    
    // Try to extract and fix truncated JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*/); // Match from opening brace to end
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      
      // Handle truncated JSON by attempting to close it properly
      if (!this.isCompleteJSON(jsonStr)) {
        jsonStr = this.attemptToCompleteJSON(jsonStr);
      }
      
      return JSON.parse(jsonStr);
    }
    
    throw new Error('No JSON object found');
  }
  
  /**
   * Check if JSON is complete
   */
  isCompleteJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Attempt to complete truncated JSON
   */
  attemptToCompleteJSON(jsonStr) {
    // Count open and close braces/brackets
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }
    
    // Close any unclosed strings
    if (inString) {
      jsonStr += '"';
    }
    
    // Close any unclosed arrays
    while (bracketCount > 0) {
      jsonStr += ']';
      bracketCount--;
    }
    
    // Close any unclosed objects
    while (braceCount > 0) {
      jsonStr += '}';
      braceCount--;
    }
    
    return jsonStr;
  }

  /**
   * Parse using regex extraction for each field
   */
  parseWithRegexExtraction(text) {
    const patterns = [];
    
    // Extract pattern blocks
    const patternRegex = /"pattern":\s*"([^"]+)"/g;
    const confidenceRegex = /"confidence":\s*(\d+)/g;
    const loansRegex = /"affectedLoans":\s*\[(.*?)\]/g;
    const impactRegex = /"financialImpact":\s*"?(\d+)"?/g;
    const recommendationRegex = /"recommendation":\s*\{([^}]+)\}/g;
    
    let patternMatch;
    while ((patternMatch = patternRegex.exec(text)) !== null) {
      const pattern = {
        pattern: patternMatch[1],
        confidence: 70,
        affectedLoans: [],
        financialImpact: 0,
        recommendation: {}
      };
      
      // Find associated confidence
      const confMatch = confidenceRegex.exec(text);
      if (confMatch) pattern.confidence = parseInt(confMatch[1]);
      
      // Find affected loans
      const loansMatch = loansRegex.exec(text);
      if (loansMatch) {
        pattern.affectedLoans = loansMatch[1]
          .split(',')
          .map(l => l.trim().replace(/['"]/g, ''))
          .filter(l => l.length > 0);
      }
      
      // Find financial impact
      const impactMatch = impactRegex.exec(text);
      if (impactMatch) pattern.financialImpact = parseInt(impactMatch[1]);
      
      patterns.push(pattern);
    }
    
    if (patterns.length > 0) {
      return {
        patterns: patterns.map((p, idx) => ({
          id: `pattern_${idx + 1}`,
          type: 'discovered',
          title: p.pattern.substring(0, 50),
          description: p.pattern,
          ...p
        })),
        summary: {
          totalPatternsFound: patterns.length
        }
      };
    }
    
    throw new Error('No patterns extracted via regex');
  }

  /**
   * Manual extraction as last resort
   */
  parseWithManualExtraction(text) {
    // Look for pattern-like content in the text
    const lines = text.split('\n');
    const patterns = [];
    
    lines.forEach(line => {
      if (line.includes('pattern') || line.includes('Pattern')) {
        // Try to extract meaningful pattern information
        const pattern = {
          id: `pattern_${patterns.length + 1}`,
          type: 'extracted',
          title: 'Extracted Pattern',
          description: line.substring(0, 200),
          confidence: 60,
          affectedLoans: [],
          financialImpact: 0,
          recommendation: {
            immediate: 'Review this pattern manually'
          }
        };
        patterns.push(pattern);
      }
    });
    
    if (patterns.length > 0) {
      return { patterns, summary: { totalPatternsFound: patterns.length } };
    }
    
    throw new Error('Manual extraction failed');
  }

  /**
   * Validate and enhance parsed response
   */
  validateAndEnhanceResponse(response) {
    if (!response.patterns) {
      response.patterns = [];
    }
    
    // Ensure each pattern has required fields
    response.patterns = response.patterns.map((pattern, idx) => ({
      id: pattern.id || `pattern_${idx + 1}`,
      type: pattern.type || 'general',
      title: pattern.title || pattern.pattern?.substring(0, 50) || 'Discovered Pattern',
      description: pattern.description || pattern.pattern || '',
      confidence: typeof pattern.confidence === 'number' ? pattern.confidence : 70,
      statisticalSignificance: pattern.statisticalSignificance || 0.05,
      affectedLoans: Array.isArray(pattern.affectedLoans) ? pattern.affectedLoans : [],
      affectedCount: pattern.affectedCount || pattern.affectedLoans?.length || 0,
      financialImpact: this.parseFinancialImpact(pattern.financialImpact),
      impactType: pattern.impactType || 'general',
      factors: pattern.factors || { primary: [], secondary: [] },
      metrics: pattern.metrics || {},
      evidence: pattern.evidence || {},
      recommendation: this.parseRecommendation(pattern.recommendation),
      visualization: pattern.visualization || { recommendedType: 'chart' }
    }));
    
    // Ensure summary exists
    if (!response.summary) {
      response.summary = this.generateSummary(response.patterns);
    }
    
    return response;
  }

  /**
   * Parse financial impact to number
   */
  parseFinancialImpact(impact) {
    if (typeof impact === 'number') return impact;
    if (typeof impact === 'string') {
      const cleaned = impact.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  /**
   * Parse recommendation object
   */
  parseRecommendation(rec) {
    if (!rec) return { immediate: 'Review this pattern' };
    
    if (typeof rec === 'string') {
      return { immediate: rec };
    }
    
    return {
      immediate: rec.immediate || 'Take action on this pattern',
      shortTerm: rec.shortTerm || '',
      longTerm: rec.longTerm || '',
      expectedROI: rec.expectedROI || ''
    };
  }

  /**
   * Generate summary from patterns
   */
  generateSummary(patterns) {
    const totalImpact = patterns.reduce((sum, p) => sum + (p.financialImpact || 0), 0);
    const avgConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;
    
    return {
      totalPatternsFound: patterns.length,
      highConfidencePatterns: patterns.filter(p => p.confidence >= 80).length,
      totalFinancialImpact: totalImpact,
      averageConfidence: Math.round(avgConfidence),
      topInsight: patterns[0]?.title || 'No patterns found',
      immediateActionRequired: patterns.some(p => p.confidence >= 90)
    };
  }

  /**
   * Get empty response structure
   */
  getEmptyResponse() {
    return {
      patterns: [],
      summary: {
        totalPatternsFound: 0,
        error: 'No patterns discovered'
      }
    };
  }

  /**
   * Get error response with debugging info
   */
  getErrorResponse(originalText) {
    console.error('Failed to parse response:', originalText.substring(0, 500));
    
    return {
      patterns: [{
        id: 'error_pattern',
        type: 'error',
        title: 'Pattern Discovery Error',
        description: 'Failed to parse AI response. Check console for details.',
        confidence: 0,
        affectedLoans: [],
        financialImpact: 0,
        recommendation: {
          immediate: 'Check API configuration and response format'
        },
        debug: originalText.substring(0, 200)
      }],
      summary: {
        totalPatternsFound: 0,
        error: 'Response parsing failed'
      }
    };
  }

  /**
   * Parse streaming response (for future implementation)
   */
  parseStreamingResponse(chunk) {
    // Handle streaming responses for real-time pattern discovery
    return this.parseResponse(chunk);
  }
}