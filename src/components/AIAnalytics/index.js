// src/components/AIAnalytics/index.js

// Import main component
import { AIAnalytics } from './AIAnalytics';

// Export as AIAnalyticsTab to match App.js import
export const AIAnalyticsTab = AIAnalytics;

// Also export individual components if needed elsewhere
export { PatternDiscovery } from './PatternDiscovery';
export { ModelBuilder } from './ModelBuilder';
export { BacktestLab } from './BacktestLab';
export { PredictiveDashboard } from './PredictiveDashboard';
export { PortfolioReporting } from './PortfolioReporting';