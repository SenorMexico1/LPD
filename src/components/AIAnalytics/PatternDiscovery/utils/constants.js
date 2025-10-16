// src/components/AIAnalytics/PatternDiscovery/utils/constants.js
export const ANALYSIS_TYPES = [
  { 
    id: 'comprehensive', 
    name: 'Comprehensive Multi-Pattern',
    description: 'Find 5-10 patterns across all dimensions',
    icon: '🎯',
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
    icon: '⚠️',
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

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
};

export const IMPACT_THRESHOLDS = {
  CRITICAL: 500000,
  HIGH: 200000,
  MEDIUM: 100000,
  LOW: 50000
};

export const PATTERN_TYPES = {
  OPPORTUNITY: 'opportunity',
  RISK: 'risk',
  CORRELATION: 'correlation',
  ANOMALY: 'anomaly',
  SEASONAL: 'seasonal',
  GEOGRAPHIC: 'geographic',
  INDUSTRY: 'industry'
};