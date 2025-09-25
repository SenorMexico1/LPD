import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const SummaryTab = ({ loans, analytics }) => {
  const portfolioSummary = {
    totalLoans: analytics.totalLoans,
    totalValue: analytics.totalValue,
    currentCount: analytics.statusCounts.current,
    delinquentCount: analytics.statusCounts.delinquent_1 + 
                     analytics.statusCounts.delinquent_2 + 
                     analytics.statusCounts.delinquent_3,
    defaultCount: analytics.statusCounts.default,
    restructuredCount: analytics.statusCounts.restructured,
    collectionRate: analytics.collectionRate || 0,
    avgRiskScore: analytics.avgRiskScore || 0
  };

  // Status distribution chart data
  const delinquencyData = {
    labels: ['Current', '1 Missed', '2 Missed', '3 Missed', 'Default (>3)', 'Restructured'],
    datasets: [{
      label: 'Loan Count (Accurate)',
      data: [
        analytics.statusCounts.current,
        analytics.statusCounts.delinquent_1,
        analytics.statusCounts.delinquent_2,
        analytics.statusCounts.delinquent_3,
        analytics.statusCounts.default,
        analytics.statusCounts.restructured
      ],
      backgroundColor: [
        '#10b981',  // green
        '#fbbf24',  // yellow
        '#fb923c',  // orange
        '#f87171',  // light red
        '#dc2626',  // red
        '#7c3aed'   // purple
      ],
      borderWidth: 1,
      borderColor: '#fff'
    }]
  };

  // Portfolio health pie chart
  const portfolioData = {
    labels: ['Current', 'Delinquent (1-3)', 'Default/Restructured'],
    datasets: [{
      data: [
        portfolioSummary.currentCount,
        portfolioSummary.delinquentCount,
        portfolioSummary.defaultCount + portfolioSummary.restructuredCount
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Risk distribution chart
  const riskDistributionData = {
    labels: ['Low (0-25)', 'Medium (26-50)', 'High (51-75)', 'Critical (76-100)'],
    datasets: [{
      label: 'Loan Count by Risk Score',
      data: [
        analytics.riskDistribution?.low || 0,
        analytics.riskDistribution?.medium || 0,
        analytics.riskDistribution?.high || 0,
        analytics.riskDistribution?.critical || 0
      ],
      backgroundColor: ['#10b981', '#fbbf24', '#fb923c', '#ef4444'],
      borderWidth: 1,
      borderColor: '#fff'
    }]
  };

  // DSCR distribution chart
  const dscrData = {
    labels: ['Very Strong (No Debt)', 'Strong (>15x)', 'Moderate (6.67-15x)', 'Weak (≤6.67x)'],
    datasets: [{
      label: 'DSCR Distribution',
      data: [
        analytics.dscrDistribution?.veryStrong || 0,
        analytics.dscrDistribution?.strong || 0,
        analytics.dscrDistribution?.moderate || 0,
        analytics.dscrDistribution?.weak || 0
      ],
      backgroundColor: ['#3b82f6', '#10b981', '#fbbf24', '#ef4444'],
      borderWidth: 1,
      borderColor: '#fff'
    }]
  };

  // Calculate additional KPIs
  const totalAtRisk = portfolioSummary.delinquentCount + portfolioSummary.defaultCount + portfolioSummary.restructuredCount;
  const atRiskPercentage = ((totalAtRisk / portfolioSummary.totalLoans) * 100).toFixed(1);
  const healthyPercentage = ((portfolioSummary.currentCount / portfolioSummary.totalLoans) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Primary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Portfolio"
          value={portfolioSummary.totalLoans}
          subtitle={`Value: $${(portfolioSummary.totalValue / 1000000).toFixed(2)}M`}
          trend={`Collection Rate: ${portfolioSummary.collectionRate.toFixed(1)}%`}
        />
        <MetricCard
          title="Current (Accurate)"
          value={portfolioSummary.currentCount}
          subtitle={`${healthyPercentage}% of portfolio`}
          className="text-green-600"
          trend="Excludes reversed ACH & fees"
        />
        <MetricCard
          title="At Risk"
          value={totalAtRisk}
          subtitle={`${atRiskPercentage}% of portfolio`}
          className="text-yellow-600"
          trend={`Delinquent: ${portfolioSummary.delinquentCount}`}
        />
        <MetricCard
          title="Avg Risk Score"
          value={portfolioSummary.avgRiskScore.toFixed(1)}
          subtitle="Out of 100"
          className={
            portfolioSummary.avgRiskScore <= 25 ? 'text-green-600' :
            portfolioSummary.avgRiskScore <= 50 ? 'text-yellow-600' :
            portfolioSummary.avgRiskScore <= 75 ? 'text-orange-600' :
            'text-red-600'
          }
          trend={
            portfolioSummary.avgRiskScore <= 25 ? 'Low Risk' :
            portfolioSummary.avgRiskScore <= 50 ? 'Medium Risk' :
            portfolioSummary.avgRiskScore <= 75 ? 'High Risk' :
            'Critical Risk'
          }
        />
      </div>

      {/* Secondary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="NPL Rate"
          value={`${(analytics.nplRate * 100).toFixed(2)}%`}
          subtitle="Default + Restructured"
          className={analytics.nplRate > 0.1 ? 'text-red-600' : 'text-gray-600'}
        />
        <MetricCard
          title="Delinquency Rate"
          value={`${(analytics.delinquencyRate * 100).toFixed(2)}%`}
          subtitle="1-3 Missed Payments"
          className={analytics.delinquencyRate > 0.15 ? 'text-orange-600' : 'text-gray-600'}
        />
        <MetricCard
          title="ACH Reversals"
          value={analytics.achReversalCount || 0}
          subtitle="NSF/Reversed payments"
          className="text-red-600"
        />
        <MetricCard
          title="Collection Rate"
          value={`${portfolioSummary.collectionRate.toFixed(1)}%`}
          subtitle="Received vs Expected"
          className={
            portfolioSummary.collectionRate >= 90 ? 'text-green-600' :
            portfolioSummary.collectionRate >= 70 ? 'text-yellow-600' :
            'text-red-600'
          }
        />
      </div>
      
      {/* Main Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Portfolio Health (Accurate)</h3>
          <p className="text-xs text-gray-500 mb-2">Based on actual missed payments after excluding reversals & fees</p>
          <Doughnut 
            data={portfolioData} 
            options={{
              plugins: {
                legend: {
                  position: 'bottom'
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `${label}: ${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Delinquency Waterfall (Accurate)</h3>
          <p className="text-xs text-gray-500 mb-2">Distribution of loans by missed payment count</p>
          <Bar 
            data={delinquencyData} 
            options={{ 
              responsive: true,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const value = context.parsed.y || 0;
                      const total = portfolioSummary.totalLoans;
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `Count: ${value} (${percentage}% of portfolio)`;
                    }
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Risk Analysis Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Risk Score Distribution</h3>
          <p className="text-xs text-gray-500 mb-2">100-point risk assessment scale</p>
          <Bar 
            data={riskDistributionData}
            options={{ 
              responsive: true,
              indexAxis: 'y',
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const value = context.parsed.x || 0;
                      const total = portfolioSummary.totalLoans;
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `${value} loans (${percentage}%)`;
                    }
                  }
                }
              }
            }} 
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">DSCR Analysis</h3>
          <p className="text-xs text-gray-500 mb-2">Debt Service Coverage Ratio distribution</p>
          <Doughnut 
            data={dscrData}
            options={{
              plugins: {
                legend: {
                  position: 'bottom'
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const percentage = ((value / portfolioSummary.totalLoans) * 100).toFixed(1);
                      return `${label}: ${value} loans (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Data Quality Alert */}
      {analytics.achReversalCount > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Data Quality Notice
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {analytics.achReversalCount} ACH reversals/NSFs detected. These failed payments have been excluded from the accurate status calculations shown above.
                  The original status field in your data may not reflect these reversals.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, className = "", trend }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${className}`}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    {trend && (
      <p className="text-xs text-gray-400 mt-1">{trend}</p>
    )}
  </div>
);