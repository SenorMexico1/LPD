// src/components/AIAnalytics/PatternDiscovery/ai/InsightRanker.js
export class InsightRanker {
  constructor(weights = {}) {
    this.weights = {
      financialImpact: weights.financialImpact || 0.35,
      confidence: weights.confidence || 0.25,
      affectedLoans: weights.affectedLoans || 0.15,
      actionability: weights.actionability || 0.15,
      novelty: weights.novelty || 0.10,
      ...weights
    };
  }

  rankPatterns(patterns, portfolioMetrics) {
    const rankedPatterns = patterns.map(pattern => ({
      ...pattern,
      scores: this.calculateScores(pattern, portfolioMetrics),
      rank: 0
    }));
    
    // Calculate composite score
    rankedPatterns.forEach(pattern => {
      pattern.compositeScore = this.calculateCompositeScore(pattern.scores);
    });
    
    // Sort by composite score
    rankedPatterns.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // Assign ranks
    rankedPatterns.forEach((pattern, index) => {
      pattern.rank = index + 1;
    });
    
    return rankedPatterns;
  }

  calculateScores(pattern, metrics) {
    return {
      financialImpact: this.scoreFinancialImpact(pattern, metrics),
      confidence: this.scoreConfidence(pattern),
      affectedLoans: this.scoreAffectedLoans(pattern, metrics),
      actionability: this.scoreActionability(pattern),
      novelty: this.scoreNovelty(pattern)
    };
  }

  scoreFinancialImpact(pattern, metrics) {
    if (!pattern.financialImpact) return 0;
    
    const portfolioValue = metrics.summary.totalOutstanding || 1;
    const impactRatio = pattern.financialImpact / portfolioValue;
    
    // Score on logarithmic scale
    return Math.min(100, Math.log10(1 + impactRatio * 1000) * 25);
  }

  scoreConfidence(pattern) {
    return pattern.confidence || 0;
  }

  scoreAffectedLoans(pattern, metrics) {
    const totalLoans = metrics.summary.totalLoans || 1;
    const affectedCount = pattern.affectedCount || pattern.affectedLoans?.length || 0;
    const ratio = affectedCount / totalLoans;
    
    // Balance between too few (not significant) and too many (too broad)
    if (ratio < 0.01) return ratio * 5000; // Very few loans
    if (ratio > 0.5) return 50 + (1 - ratio) * 100; // Too many loans
    return 50 + ratio * 100; // Sweet spot
  }

  scoreActionability(pattern) {
    let score = 0;
    
    if (pattern.recommendation) {
      if (pattern.recommendation.immediate) score += 40;
      if (pattern.recommendation.shortTerm) score += 30;
      if (pattern.recommendation.longTerm) score += 20;
      if (pattern.recommendation.expectedROI) score += 10;
    }
    
    return score;
  }

  scoreNovelty(pattern) {
    // Score based on pattern type and uniqueness
    const noveltyScores = {
      'correlation': 80,
      'anomaly': 90,
      'opportunity': 70,
      'seasonal': 60,
      'geographic': 60,
      'industry': 50,
      'risk': 40
    };
    
    return noveltyScores[pattern.type] || 50;
  }

  calculateCompositeScore(scores) {
    let composite = 0;
    
    Object.entries(scores).forEach(([key, value]) => {
      composite += value * (this.weights[key] || 0);
    });
    
    return Math.round(composite);
  }

  getTopPatterns(patterns, portfolioMetrics, count = 5) {
    const ranked = this.rankPatterns(patterns, portfolioMetrics);
    return ranked.slice(0, count);
  }

  groupByPriority(patterns, portfolioMetrics) {
    const ranked = this.rankPatterns(patterns, portfolioMetrics);
    
    return {
      critical: ranked.filter(p => p.compositeScore >= 80),
      high: ranked.filter(p => p.compositeScore >= 60 && p.compositeScore < 80),
      medium: ranked.filter(p => p.compositeScore >= 40 && p.compositeScore < 60),
      low: ranked.filter(p => p.compositeScore < 40)
    };
  }
}