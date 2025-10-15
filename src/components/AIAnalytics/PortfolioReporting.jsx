// src/components/AIAnalytics/PortfolioReporting.jsx
import React, { useMemo } from 'react';

export const PortfolioReporting = ({ loans, metrics }) => {
  // Calculate additional portfolio insights
  const insights = useMemo(() => {
    if (!loans || loans.length === 0) return null;

    // Top performing segments
    const topIndustries = Object.entries(metrics?.industryDistribution || {})
      .map(([industry, data]) => {
        const performing = data.performance.filter(s => s === 'current').length;
        const performanceRate = data.performance.length > 0 ? 
          (performing / data.performance.length) * 100 : 0;
        return { industry, ...data, performanceRate };
      })
      .sort((a, b) => b.performanceRate - a.performanceRate)
      .slice(0, 5);

    // Geographic performance
    const topGeographies = Object.entries(metrics?.geoDistribution || {})
      .map(([location, data]) => ({
        location,
        ...data,
        performanceScore: 100 - (data.defaultRate || 0)
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5);

    // Risk concentration
    const riskConcentration = loans.reduce((acc, loan) => {
      if (loan.riskScore > 70) {
        acc.high.push(loan);
        acc.highAmount += loan.loanAmount || 0;
      } else if (loan.riskScore > 40) {
        acc.medium.push(loan);
        acc.mediumAmount += loan.loanAmount || 0;
      } else {
        acc.low.push(loan);
        acc.lowAmount += loan.loanAmount || 0;
      }
      return acc;
    }, { 
      high: [], highAmount: 0,
      medium: [], mediumAmount: 0,
      low: [], lowAmount: 0
    });

    return {
      topIndustries,
      topGeographies,
      riskConcentration
    };
  }, [loans, metrics]);

  if (!metrics) {
    return <div>Loading portfolio metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Executive Portfolio Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Portfolio</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(metrics.summary.totalOriginated / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.summary.totalLoans} loans
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(metrics.summary.totalOutstanding / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.summary.collectionRate.toFixed(1)}% collected
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Avg FICO</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(metrics.summary.avgFICO)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Portfolio average
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Avg DSCR</p>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.summary.avgDSCR.toFixed(2)}x
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Debt coverage
            </p>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Status Distribution</h3>
        
        <div className="space-y-3">
          {Object.entries(metrics.statusDistribution).map(([status, count]) => {
            const percentage = (count / metrics.summary.totalLoans) * 100;
            const colorClass = status === 'current' ? 'bg-green-500' :
                              status === 'restructured' ? 'bg-yellow-500' :
                              status.includes('delinquent') ? 'bg-orange-500' :
                              status === 'default' ? 'bg-red-500' : 'bg-gray-500';
            
            return (
              <div key={status} className="flex items-center">
                <div className="w-32 text-sm text-gray-700 capitalize">
                  {status.replace('_', ' ')}
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className={`${colorClass} h-6 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 w-20 text-right">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Industry Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Industries</h3>
          
          <div className="space-y-3">
            {insights?.topIndustries.map((industry, idx) => (
              <div key={industry.industry} className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{industry.industry}</p>
                    <p className="text-xs text-gray-500">
                      {industry.count} loans • ${(industry.amount / 1000000).toFixed(2)}M
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {industry.performanceRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">performing</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Geographic Markets</h3>
          
          <div className="space-y-3">
            {insights?.topGeographies.map((geo, idx) => (
              <div key={geo.location} className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{geo.location}</p>
                    <p className="text-xs text-gray-500">
                      {geo.count} loans • Avg FICO: {Math.round(geo.avgFICO || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    {geo.performanceScore.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vintage Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vintage Performance</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vintage</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loans</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Default Rate</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Days Delinquent</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(metrics.vintages || {})
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 8)
                .map(([vintage, data]) => (
                  <tr key={vintage}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{vintage}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.loans.length}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      ${(data.totalAmount / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        data.defaultRate < 5 ? 'bg-green-100 text-green-800' :
                        data.defaultRate < 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {data.defaultRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {data.avgDaysDelinquent.toFixed(0)} days
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Concentration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Concentration Analysis</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
              {insights?.riskConcentration.low.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Low Risk</p>
            <p className="text-xs text-gray-500 mt-1">
              ${(insights?.riskConcentration.lowAmount / 1000000).toFixed(2)}M
            </p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">
              {insights?.riskConcentration.medium.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Medium Risk</p>
            <p className="text-xs text-gray-500 mt-1">
              ${(insights?.riskConcentration.mediumAmount / 1000000).toFixed(2)}M
            </p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">
              {insights?.riskConcentration.high.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">High Risk</p>
            <p className="text-xs text-gray-500 mt-1">
              ${(insights?.riskConcentration.highAmount / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};