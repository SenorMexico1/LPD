// src/components/AIAnalytics/PatternDiscovery/index.jsx
/**
 * Main export for Pattern Discovery module
 * This file serves as the entry point for the modular pattern discovery system
 */

export { PatternDiscoveryCore as PatternDiscovery } from './PatternDiscoveryCore';

// Export individual analyzers for direct use if needed
export * from './analyzers';

// Export visualization components for reuse
export * from './visualizations';

// Export utility functions
export * from './utils';

// Export AI components
export * from './ai';

// Default export for backwards compatibility
export { PatternDiscoveryCore as default } from './PatternDiscoveryCore';