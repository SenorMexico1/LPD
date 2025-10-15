// src/components/AIAnalytics/AIAnalytics.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { PatternDiscovery } from './PatternDiscovery';
import { ModelBuilder } from './ModelBuilder';
import { BacktestLab } from './BacktestLab';
import { PredictiveDashboard } from './PredictiveDashboard';
import { PortfolioReporting } from './PortfolioReporting';

export const AIAnalytics = ({ loans, apiKey }) => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [models, setModels] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Calculate portfolio metrics from actual data
  const portfolioMetrics = useMemo(() => {
    if (!loans || loans.length === 0) return null;

    // Portfolio composition
    const totalOutstanding = loans.reduce((sum, loan) => 
      sum + (loan.remainingAmount || loan.contractBalance || 0), 0
    );
    
    const totalOriginated = loans.reduce((sum, loan) => 
      sum + (loan.loanAmount || 0), 0
    );

    // Status distribution
    const statusCounts = loans.reduce((acc, loan) => {
      const status = loan.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Industry distribution
    const industryDistribution = loans.reduce((acc, loan) => {
      const industry = loan.client?.industrySector || 'Unknown';
      if (!acc[industry]) {
        acc[industry] = { count: 0, amount: 0, performance: [] };
      }
      acc[industry].count++;
      acc[industry].amount += loan.loanAmount || 0;
      acc[industry].performance.push(loan.status);
      return acc;
    }, {});

    // Geographic distribution
    const geoDistribution = loans.reduce((acc, loan) => {
      const state = loan.client?.state || 'Unknown';
      const city = loan.client?.city || 'Unknown';
      const key = `${city}, ${state}`;
      
      if (!acc[key]) {
        acc[key] = { 
          count: 0, 
          amount: 0, 
          defaultRate: 0,
          avgFICO: [],
          statuses: []
        };
      }
      
      acc[key].count++;
      acc[key].amount += loan.loanAmount || 0;
      acc[key].statuses.push(loan.status);
      if (loan.lead?.fico) acc[key].avgFICO.push(loan.lead.fico);
      
      return acc;
    }, {});

    // Calculate default rates by geography
    Object.keys(geoDistribution).forEach(key => {
      const geo = geoDistribution[key];
      const defaultCount = geo.statuses.filter(s => 
        s === 'default' || s === 'restructured'
      ).length;
      geo.defaultRate = geo.count > 0 ? (defaultCount / geo.count) * 100 : 0;
      geo.avgFICO = geo.avgFICO.length > 0 ? 
        geo.avgFICO.reduce((a, b) => a + b, 0) / geo.avgFICO.length : 0;
    });

    // Vintage analysis
    const vintages = loans.reduce((acc, loan) => {
      if (!loan.payoutDate) return acc;
      
      const date = new Date(loan.payoutDate);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const vintageKey = `${date.getFullYear()}-Q${quarter}`;
      
      if (!acc[vintageKey]) {
        acc[vintageKey] = {
          loans: [],
          totalAmount: 0,
          defaultRate: 0,
          avgDaysDelinquent: []
        };
      }
      
      acc[vintageKey].loans.push(loan);
      acc[vintageKey].totalAmount += loan.loanAmount || 0;
      if (loan.daysOverdue) acc[vintageKey].avgDaysDelinquent.push(loan.daysOverdue);
      
      return acc;
    }, {});

    // Calculate vintage performance
    Object.keys(vintages).forEach(key => {
      const vintage = vintages[key];
      const defaultCount = vintage.loans.filter(l => 
        l.status === 'default' || l.status === 'restructured'
      ).length;
      vintage.defaultRate = vintage.loans.length > 0 ? 
        (defaultCount / vintage.loans.length) * 100 : 0;
      vintage.avgDaysDelinquent = vintage.avgDaysDelinquent.length > 0 ?
        vintage.avgDaysDelinquent.reduce((a, b) => a + b, 0) / vintage.avgDaysDelinquent.length : 0;
    });

    // Risk indicators
    const avgFICO = loans.reduce((sum, loan) => 
      sum + (loan.lead?.fico || 0), 0) / loans.length;
    
    const avgDSCR = loans.reduce((sum, loan) => {
      const revenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue || 0;
      const debt = loan.lead?.avgMCADebts || 0;
      const dscr = debt > 0 ? revenue / debt : 0;
      return sum + dscr;
    }, 0) / loans.length;

    // Payment patterns
    const paymentPatterns = loans.reduce((acc, loan) => {
      if (loan.catchUpPayments && loan.catchUpPayments.length > 0) {
        acc.catchUpLoans++;
        acc.totalCatchUpAmount += loan.catchUpPayments.reduce((sum, cp) => 
          sum + cp.amount, 0
        );
      }
      
      if (loan.paymentVelocity?.isDecelerating) {
        acc.deceleratingLoans++;
      }
      
      return acc;
    }, { catchUpLoans: 0, totalCatchUpAmount: 0, deceleratingLoans: 0 });

    return {
      summary: {
        totalLoans: loans.length,
        totalOutstanding,
        totalOriginated,
        collectionRate: totalOriginated > 0 ? 
          ((totalOriginated - totalOutstanding) / totalOriginated) * 100 : 0,
        avgLoanSize: totalOriginated / loans.length,
        avgFICO,
        avgDSCR
      },
      statusDistribution: statusCounts,
      industryDistribution,
      geoDistribution,
      vintages,
      paymentPatterns,
      timestamp: new Date().toISOString()
    };
  }, [loans]);

  // Prepare data for AI analysis
  const prepareAnalysisData = useCallback(() => {
    if (!loans || loans.length === 0) return null;

    return loans.map(loan => ({
      // Core identifiers
      loanNumber: loan.loanNumber,
      
      // Performance metrics
      status: loan.status,
      daysOverdue: loan.daysOverdue || 0,
      missedPayments: loan.statusCalculation?.missedPayments || 0,
      
      // Financial metrics
      loanAmount: loan.loanAmount,
      remainingAmount: loan.remainingAmount || loan.contractBalance,
      installmentAmount: loan.installmentAmount,
      collectionRate: loan.collectionMetrics?.collectionRate || 0,
      
      // Client demographics
      industry: loan.client?.industrySector || 'Unknown',
      industrySubsector: loan.client?.industrySubsector,
      city: loan.client?.city,
      state: loan.client?.state,
      businessAge: loan.client?.dateFounded ? 
        Math.floor((new Date() - new Date(loan.client.dateFounded)) / (1000 * 60 * 60 * 24 * 365)) : null,
      
      // Credit metrics
      fico: loan.lead?.fico,
      dscr: loan.lead?.avgRevenue && loan.lead?.avgMCADebts ? 
        loan.lead.avgRevenue / loan.lead.avgMCADebts : null,
      avgRevenue: loan.lead?.avgRevenue || loan.lead?.avgMonthlyRevenue,
      
      // Risk indicators
      riskScore: loan.riskScore,
      paymentVelocity: loan.paymentVelocity?.avgDaysBetweenPayments,
      hasDeceleratingPayments: loan.paymentVelocity?.isDecelerating,
      hasCatchUpPayments: loan.catchUpPayments?.length > 0,
      
      // Temporal features
      loanTerm: loan.loanTerm,
      monthsSinceOrigination: loan.payoutDate ? 
        Math.floor((new Date() - new Date(loan.payoutDate)) / (1000 * 60 * 60 * 24 * 30)) : null,
      paymentFrequency: loan.paymentFrequency,
      
      // Calculated features for ML
      features: {
        isDefault: loan.status === 'default' || loan.status === 'restructured',
        isDelinquent: loan.status?.includes('delinquent'),
        isCurrent: loan.status === 'current',
        delinquencyBucket: loan.status?.includes('delinquent_1') ? 1 :
                          loan.status?.includes('delinquent_2') ? 2 :
                          loan.status?.includes('delinquent_3') ? 3 : 0
      }
    }));
  }, [loans]);

  // Save model to localStorage (in production, use backend)
  const saveModel = (model) => {
    const savedModels = JSON.parse(localStorage.getItem('aiModels') || '[]');
    savedModels.push({
      ...model,
      id: Date.now(),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('aiModels', JSON.stringify(savedModels));
    setModels(savedModels);
  };

  // Load saved models on mount
  useEffect(() => {
    const savedModels = JSON.parse(localStorage.getItem('aiModels') || '[]');
    setModels(savedModels);
  }, []);

  // Export model weights
  const exportModel = (model) => {
    const dataStr = JSON.stringify(model, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `model_${model.name}_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const tabs = [
    { id: 'portfolio', label: 'Portfolio Overview', icon: '📊' },
    { id: 'discover', label: 'AI Pattern Discovery', icon: '🔍' },
    { id: 'models', label: 'Model Builder', icon: '🤖' },
    { id: 'backtest', label: 'Backtest Lab', icon: '📈' },
    { id: 'predict', label: 'Predictions', icon: '🔮' }
  ];

  if (!loans || loans.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          AI Analytics Suite
        </h2>
        <p className="text-gray-600">
          Please upload loan data to begin AI analysis
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 p-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioReporting 
            loans={loans}
            metrics={portfolioMetrics}
          />
        )}

        {activeTab === 'discover' && (
          <PatternDiscovery 
            loans={loans}
            analysisData={prepareAnalysisData()}
            portfolioMetrics={portfolioMetrics}
            apiKey={apiKey}
            onDiscovery={(discovery) => {
              setDiscoveries([...discoveries, discovery]);
            }}
          />
        )}

        {activeTab === 'models' && (
          <ModelBuilder
            loans={loans}
            analysisData={prepareAnalysisData()}
            onModelSave={saveModel}
            onModelExport={exportModel}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestLab
            loans={loans}
            models={models}
            analysisData={prepareAnalysisData()}
            onModelUpdate={(updatedModel) => {
              const updatedModels = models.map(m => 
                m.id === updatedModel.id ? updatedModel : m
              );
              setModels(updatedModels);
              localStorage.setItem('aiModels', JSON.stringify(updatedModels));
            }}
          />
        )}

        {activeTab === 'predict' && (
          <PredictiveDashboard
            loans={loans}
            models={models}
            discoveries={discoveries}
            portfolioMetrics={portfolioMetrics}
          />
        )}
      </div>
    </div>
  );
};