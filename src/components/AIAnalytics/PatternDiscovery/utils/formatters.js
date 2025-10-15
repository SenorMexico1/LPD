// src/components/AIAnalytics/PatternDiscovery/utils/formatters.js
export function formatCurrency(amount, decimals = 0) {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(decimals)}K`;
  } else {
    return `$${amount.toFixed(decimals)}`;
  }
}

export function formatPercentage(value, decimals = 1) {
  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value, decimals = 0) {
  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }
  return value.toLocaleString('en-US', { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

export function formatDate(dateStr, format = 'short') {
  const date = new Date(dateStr);
  if (isNaN(date)) return 'N/A';
  
  if (format === 'short') {
    return date.toLocaleDateString();
  } else if (format === 'long') {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } else {
    return date.toISOString().split('T')[0];
  }
}