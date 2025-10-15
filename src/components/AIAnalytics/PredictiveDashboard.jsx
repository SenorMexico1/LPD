// src/components/AIAnalytics/PredictiveDashboard.jsx
import React, { useState, useMemo, useCallback } from 'react';

export const PredictiveDashboard = ({ loans, models, discoveries, portfolioMetrics }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [activeView, setActiveView] = useState('alerts');

  // Generate predictions based on current data
  const predictions = useMemo(() => {
    if (!loans || loans.length === 0) return null;

    // Early warning signals
    const earlyWarnings = loans.filter(loan => {
      const riskSignals = [];
      
      // Payment velocity decline
      if (loan.paymentVelocity?.isDecelerating) {
        riskSignals.push('Payment deceleration detected');
      }
      
      // High risk score with current status
      if (loan.riskScore > 70 && loan.status === 'current') {
        riskSignals.push('High risk despite current status');
      }
      
      // Multiple missed payments trending
      if (loan.missedPayments > 0 && loan.missedPayments < 3) {
        riskSignals.push('Early delinquency pattern');
      }
      
      // DSCR deterioration
      const dscr = loan.lead?.avgRevenue && loan.lead?.avgMCADebts ? 
        loan.lead.avgRevenue / loan.lead.avgMCADebts : null;
      if (dscr && dscr < 1.2) {
        riskSignals.push('Low debt service coverage');
      }
      
      return riskSignals.length > 0 ? { loan, riskSignals } : null;
    }).filter(Boolean);

    // Delinquency migration predictions
    const migrationPredictions = loans.map(loan => {
      let nextStatus = loan.status;
      let probability = 0;
      
      if (loan.status === 'current' && loan.missedPayments > 0) {
        nextStatus = 'delinquent_1';
        probability = 0.3 + (loan.riskScore / 100) * 0.4;
      } else if (loan.status === 'delinquent_1') {
        nextStatus = 'delinquent_2';
        probability = 0.4 + (loan.daysOverdue / 100) * 0.3;
      } else if (loan.status === 'delinquent_2') {
        nextStatus = 'delinquent_3';
        probability = 0.5 + (loan.daysOverdue / 150) * 0.3;
      } else if (loan.status === 'delinquent_3') {
        nextStatus = 'default';
        probability = 0.6 + (loan.daysOverdue / 200) * 0.3;
      }
      
      probability = Math.min(probability, 1);
      
      return {
        loanNumber: loan.loanNumber,
        currentStatus: loan.status,
        predictedStatus: nextStatus,
        migrationProbability: probability,
        timeframe: selectedTimeframe
      };
    }).filter(p => p.currentStatus !== p.predictedStatus && p.migrationProbability > 0.3);

    // Recovery predictions for defaulted loans
    const recoveryPredictions = loans
      .filter(loan => loan.status === 'default' || loan.status === 'restructured')
      .map(loan => {
        let recoveryProbability = 0.2; // Base probability
        
        if (loan.catchUpPayments?.length > 0) {
          recoveryProbability += 0.3;
        }
        if (loan.lead?.fico > 700) {
          recoveryProbability += 0.2;
        }
        if (loan.client?.industrySector && 
            ['Healthcare', 'Professional Services'].includes(loan.client.industrySector)) {
          recoveryProbability += 0.15;
        }
        
        const expectedRecovery = (loan.remainingAmount || loan.contractBalance || 0) * recoveryProbability;
        
        return {
          loanNumber: loan.loanNumber,
          clientName: loan.client?.name || 'Unknown',
          outstandingAmount: loan.remainingAmount || loan.contractBalance || 0,
          recoveryProbability: Math.min(recoveryProbability, 1),
          expectedRecovery,
          recommendedAction: recoveryProbability > 0.5 ? 'Negotiate settlement' : 
                            recoveryProbability > 0.3 ? 'Continue collections' : 
                            'Consider write-off'
        };
      });

    // Portfolio forecast
    const portfolioForecast = {
      expectedDefaults: migrationPredictions.filter(p => p.predictedStatus === 'default').length,
      expectedRecoveries: recoveryPredictions.reduce((sum, r) => sum + r.expectedRecovery, 0),
      atRiskAmount: earlyWarnings.reduce((sum, w) => 
        sum + (w.loan.remainingAmount || w.loan.contractBalance || 0), 0
      ),
      healthScore: 100 - (earlyWarnings.length / loans.length) * 100
    };

    return {
      earlyWarnings,
      migrationPredictions,
      recoveryPredictions,
      portfolioForecast
    };
  }, [loans, selectedTimeframe]);

  // Action recommendations
  const recommendations = useMemo(() => {
    if (!predictions) return [];
    
    const recs = [];
    
    // High priority warnings
    if (predictions.earlyWarnings.length > 5) {
      recs.push({
        priority: 'high',
        category: 'Collection',
        action: `Contact ${predictions.earlyWarnings.length} loans showing early warning signs`,
        impact: `Prevent potential losses of $${(predictions.portfolioForecast.atRiskAmount / 1000000).toFixed(2)}M`,
        loans: predictions.earlyWarnings.slice(0, 5).map(w => w.loan.loanNumber)
      });
    }
    
    // Migration prevention
    const highRiskMigrations = predictions.migrationPredictions
      .filter(m => m.migrationProbability > 0.7);
    if (highRiskMigrations.length > 0) {
      recs.push({
        priority: 'high',
        category: 'Risk Management',
        action: `${highRiskMigrations.length} loans likely to deteriorate in next ${selectedTimeframe} days`,
        impact: 'Proactive intervention could prevent status migration',
        loans: highRiskMigrations.slice(0, 5).map(m => m.loanNumber)
      });
    }
    
    // Recovery opportunities
    const highRecoveryOpps = predictions.recoveryPredictions
      .filter(r => r.recoveryProbability > 0.6);
    if (highRecoveryOpps.length > 0) {
      recs.push({
        priority: 'medium',
        category: 'Recovery',
        action: `${highRecoveryOpps.length} defaulted loans show high recovery potential`,
        impact: `Expected recovery: $${(highRecoveryOpps.reduce((sum, r) => 
          sum + r.expectedRecovery, 0) / 1000000).toFixed(2)}M`,
        loans: highRecoveryOpps.slice(0, 5).map(r => r.loanNumber)
      });
    }
    
    return recs;
  }, [predictions, selectedTimeframe]);

  if (!loans || loans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available for predictions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveView('alerts')}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeView === 'alerts' 
                  ? 'bg-red-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Early Warnings ({predictions?.earlyWarnings.length})
            </button>
            <button
              onClick={() => setActiveView('migration')}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeView === 'migration' 
                  ? 'bg-orange-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Migration Forecast
            </button>
            <button
              onClick={() => setActiveView('recovery')}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeView === 'recovery' 
                  ? 'bg-green-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Recovery Analysis
            </button>
            <button
              onClick={() => setActiveView('recommendations')}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeView === 'recommendations' 
                  ? 'bg-purple-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              AI Recommendations
            </button>
          </div>
          
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="30">Next 30 Days</option>
            <option value="60">Next 60 Days</option>
            <option value="90">Next 90 Days</option>
          </select>
        </div>
      </div>

      {/* Portfolio Health Score */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Health Forecast</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Health Score</p>
            <p className={`text-2xl font-bold ${
              predictions?.portfolioForecast.healthScore > 80 ? 'text-green-600' :
              predictions?.portfolioForecast.healthScore > 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {predictions?.portfolioForecast.healthScore.toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">At Risk Amount</p>
            <p className="text-2xl font-bold text-orange-600">
              ${(predictions?.portfolioForecast.atRiskAmount / 1000000).toFixed(2)}M
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Expected Defaults</p>
            <p className="text-2xl font-bold text-red-600">
              {predictions?.portfolioForecast.expectedDefaults}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">Expected Recovery</p>
            <p className="text-2xl font-bold text-green-600">
              ${(predictions?.portfolioForecast.expectedRecoveries / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
      </div>

      {/* Early Warnings View */}
      {activeView === 'alerts' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Early Warning Signals</h3>
          </div>
          <div className="divide-y">
            {predictions?.earlyWarnings.slice(0, 10).map(warning => (
              <div key={warning.loan.loanNumber} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {warning.loan.loanNumber} - {warning.loan.client?.name || 'Unknown'}
                    </p>
                    <div className="mt-1 space-y-1">
                      {warning.riskSignals.map((signal, idx) => (
                        <span key={idx} className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded mr-2">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      ${((warning.loan.remainingAmount || 0) / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-gray-500">Outstanding</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Forecast View */}
      {activeView === 'migration' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Delinquency Migration Forecast ({selectedTimeframe} days)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Predicted Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {predictions?.migrationPredictions.slice(0, 15).map(pred => (
                  <tr key={pred.loanNumber}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{pred.loanNumber}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pred.currentStatus === 'current' ? 'bg-green-100 text-green-800' :
                        pred.currentStatus.includes('delinquent') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pred.currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pred.predictedStatus.includes('delinquent_1') ? 'bg-yellow-100 text-yellow-800' :
                        pred.predictedStatus.includes('delinquent') ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pred.predictedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              pred.migrationProbability > 0.7 ? 'bg-red-500' :
                              pred.migrationProbability > 0.5 ? 'bg-orange-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${pred.migrationProbability * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">
                          {(pred.migrationProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recovery Analysis View */}
      {activeView === 'recovery' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recovery Analysis</h3>
          </div>
          <div className="divide-y">
            {predictions?.recoveryPredictions.slice(0, 10).map(recovery => (
              <div key={recovery.loanNumber} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {recovery.loanNumber} - {recovery.clientName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Outstanding: ${(recovery.outstandingAmount / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {recovery.recommendedAction}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      {(recovery.recoveryProbability * 100).toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      ~${(recovery.expectedRecovery / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-gray-500">Expected</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations View */}
      {activeView === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              rec.priority === 'high' ? 'border-red-500' :
              rec.priority === 'medium' ? 'border-yellow-500' :
              'border-green-500'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {rec.priority.toUpperCase()} PRIORITY
                </span>
                <span className="text-sm text-gray-500">{rec.category}</span>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-2">{rec.action}</h4>
              <p className="text-sm text-gray-600 mb-3">{rec.impact}</p>
              
              {rec.loans && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Affected Loans:</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.loans.map(loanNum => (
                      <span key={loanNum} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {loanNum}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {recommendations.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">No urgent recommendations at this time</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};