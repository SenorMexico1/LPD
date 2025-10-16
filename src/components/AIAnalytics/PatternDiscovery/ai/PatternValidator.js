// src/components/AIAnalytics/PatternDiscovery/ai/PatternValidator.js
export class PatternValidator {
  constructor(confidenceThreshold = 70) {
    this.confidenceThreshold = confidenceThreshold;
  }

  validatePattern(pattern, loans) {
    const validations = {
      hasRequiredFields: this.checkRequiredFields(pattern),
      hasValidConfidence: this.checkConfidence(pattern),
      hasAffectedLoans: this.checkAffectedLoans(pattern, loans),
      hasReasonableImpact: this.checkImpact(pattern, loans),
      isStatisticallySignificant: this.checkSignificance(pattern)
    };
    
    const isValid = Object.values(validations).every(v => v === true);
    
    return {
      isValid,
      validations,
      score: this.calculateValidationScore(validations)
    };
  }

  checkRequiredFields(pattern) {
    const required = ['title', 'description', 'confidence', 'type'];
    return required.every(field => pattern[field] !== undefined);
  }

  checkConfidence(pattern) {
    return pattern.confidence >= this.confidenceThreshold && pattern.confidence <= 100;
  }

  checkAffectedLoans(pattern, loans) {
    // If no affected loans listed, that's okay for some pattern types
    if (!pattern.affectedLoans) {
      return pattern.affectedCount > 0; // As long as there's a count
    }
    
    if (pattern.affectedLoans.length === 0 && pattern.affectedCount > 0) {
      return true; // Trust the count even if specific loans aren't listed
    }
    
    // If we have loan IDs, just check that they look valid (not that they exist in our array)
    // This is because the AI might reference loans by different IDs or formats
    const hasValidLoanIds = pattern.affectedLoans.some(id => 
      id && id.length > 0 && (id.startsWith('LA') || id.startsWith('L') || /\d/.test(id))
    );
    
    return hasValidLoanIds || pattern.affectedCount > 0;
  }

  checkImpact(pattern, loans) {
    if (!pattern.financialImpact) return false;
    
    const totalPortfolioValue = loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    
    // Impact should be reasonable relative to portfolio size
    return pattern.financialImpact > 0 && 
           pattern.financialImpact < totalPortfolioValue * 2;
  }

  checkSignificance(pattern) {
    if (pattern.statisticalSignificance !== undefined) {
      return pattern.statisticalSignificance <= 0.05;
    }
    
    // Use confidence as proxy if no p-value
    return pattern.confidence >= 70;
  }

  calculateValidationScore(validations) {
    const weights = {
      hasRequiredFields: 0.2,
      hasValidConfidence: 0.3,
      hasAffectedLoans: 0.2,
      hasReasonableImpact: 0.15,
      isStatisticallySignificant: 0.15
    };
    
    let score = 0;
    Object.entries(validations).forEach(([key, value]) => {
      if (value === true) {
        score += weights[key] || 0;
      }
    });
    
    return Math.round(score * 100);
  }

  validateBatch(patterns, loans) {
    return patterns
      .map(pattern => ({
        ...pattern,
        validation: this.validatePattern(pattern, loans)
      }))
      .filter(p => p.validation.isValid)
      .sort((a, b) => b.validation.score - a.validation.score);
  }
}