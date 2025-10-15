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
import { Bar, Doughnut } from 'react-chartjs-2';

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
    restructuredCount: analytics.statusCounts.restructured
  };

  const delinquencyData = {
    labels: ['Current', '1 Missed', '2 Missed', '3 Missed', 'Default', 'Restructured'],
    datasets: [{
      label: 'Loan Count',
      data: [
        analytics.statusCounts.current,
        analytics.statusCounts.delinquent_1,
        analytics.statusCounts.delinquent_2,
        analytics.statusCounts.delinquent_3,
        analytics.statusCounts.default,
        analytics.statusCounts.restructured
      ],
      backgroundColor: [
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#dc2626',
        '#991b1b',
        '#7c2d12'
      ]
    }]
  };

  const portfolioData = {
    labels: ['Current', 'Delinquent', 'Default/Restructured'],
    datasets: [{
      data: [
        portfolioSummary.currentCount,
        portfolioSummary.delinquentCount,
        portfolioSummary.defaultCount + portfolioSummary.restructuredCount
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
    }]
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Loans"
          value={portfolioSummary.totalLoans}
          subtitle={`Value: $${(portfolioSummary.totalValue / 1000000).toFixed(2)}M`}
        />
        <MetricCard
          title="Current"
          value={portfolioSummary.currentCount}
          subtitle={`${((portfolioSummary.currentCount / portfolioSummary.totalLoans) * 100).toFixed(1)}%`}
          className="text-green-600"
        />
        <MetricCard
          title="Delinquent (1-3)"
          value={portfolioSummary.delinquentCount}
          subtitle={`${((portfolioSummary.delinquentCount / portfolioSummary.totalLoans) * 100).toFixed(1)}%`}
          className="text-yellow-600"
        />
        <MetricCard
          title="Default/Restructured"
          value={portfolioSummary.defaultCount + portfolioSummary.restructuredCount}
          subtitle={`Restructured: ${portfolioSummary.restructuredCount}`}
          className="text-red-600"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Portfolio Composition</h3>
          <Doughnut data={portfolioData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Delinquency Waterfall</h3>
          <Bar data={delinquencyData} options={{ responsive: true }} />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, className = "" }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className={`text-2xl font-bold mt-1 ${className}`}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
  </div>
);