// src/components/AIAnalytics/PatternDiscovery/utils/statisticalHelpers.js
export function calculatePValue(sample1, sample2) {
  // Simplified t-test for pattern significance
  if (!sample1.length || !sample2.length) return 1;
  
  const mean1 = sample1.reduce((s, v) => s + v, 0) / sample1.length;
  const mean2 = sample2.reduce((s, v) => s + v, 0) / sample2.length;
  
  const var1 = sample1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / (sample1.length - 1);
  const var2 = sample2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / (sample2.length - 1);
  
  const pooledSE = Math.sqrt(var1 / sample1.length + var2 / sample2.length);
  const t = Math.abs(mean1 - mean2) / pooledSE;
  
  // Simplified p-value approximation
  return Math.max(0.001, Math.min(1, 2 * (1 - normalCDF(t))));
}

export function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const sumY2 = y.reduce((s, v) => s + v * v, 0);
  
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return isNaN(correlation) ? 0 : correlation;
}

export function calculateConfidenceInterval(mean, stdDev, sampleSize, confidence = 0.95) {
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.58 : 1.645;
  const margin = z * (stdDev / Math.sqrt(sampleSize));
  
  return [mean - margin, mean + margin];
}

function normalCDF(x) {
  // Approximation of the cumulative distribution function for the standard normal distribution
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2.0);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}