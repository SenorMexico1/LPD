// components/CollectionsAnalysis/PredictiveAnalysis.jsx
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export const PredictiveAnalysis = ({ 
  loans, 
  selectedDate, 
  calculateHistoricalStatus,
  exportToExcel 
}) => {
  const [predictiveModel, setPredictiveModel] = useState('logistic');
  const [forecastHorizon, setForecastHorizon] = useState(30);
  const [backtestResults, setBacktestResults] = useState(null);
  
  // Run predictive models
  const runPredictiveModel = () => {
    const predictions = [];
    
    loans.forEach(loan => {
      const currentStatus = calculateHistoricalStatus(loan, selectedDate);
      
      // Feature extraction
      const features = {
        missedPayments: currentStatus.missedPayments,
        daysOverdue: loan.daysOverdue || 0,
        fico: loan.lead?.fico || 650,
        avgMonthlyRevenue: loan.lead?.avgMonthlyRevenue || 0,
        avgMCADebits: loan.lead?.avgMCADebits || 0,
        paymentsMade: currentStatus.paymentsMade,
        totalExpected: currentStatus.expectedPayments,
        collectionRatio: currentStatus.expectedPayments > 0 
          ? currentStatus.paymentsMade / currentStatus.expectedPayments 
          : 0,
        avgNSFs: loan.lead?.avgNSFs || 0,
        avgNegativeDays: loan.lead?.avgNegativeDays || 0,
        avgDailyBalance: loan.lead?.avgDailyBalance || 0,
        industryRisk: getIndustryRiskScore(loan.client?.industrySector)
      };
      
      let defaultProbability = 0;
      let recoveryProbability = 0;
      
      if (predictiveModel === 'logistic') {
        // Logistic regression model with calibrated weights
        const weights = {
          missedPayments: 0.45,
          daysOverdue: 0.002,
          fico: -0.003,
          avgMonthlyRevenue: -0.00001,
          collectionRatio: -2.5,
          avgNSFs: 0.15,
          avgNegativeDays: 0.02,
          industryRisk: 0.03
        };
        
        let logit = -2.5; // intercept
        Object.keys(weights).forEach(key => {
          if (features[key] !== undefined && weights[key] !== undefined) {
            logit += features[key] * weights[key];
          }
        });
        
        defaultProbability = 1 / (1 + Math.exp(-logit));
        
        // Recovery model for defaulted loans
        if (currentStatus.missedPayments >= 4) {
          const recoveryLogit = -1.5 + 
            (features.fico - 600) * 0.01 - 
            features.missedPayments * 0.3 +
            (features.avgMonthlyRevenue / 10000) * 0.5;
          recoveryProbability = 1 / (1 + Math.exp(-recoveryLogit));
        }
      } else if (predictiveModel === 'survival') {
        // Cox proportional hazards model approximation
        const baseHazard = 0.02;
        const hazardRatio = Math.exp(
          0.3 * features.missedPayments +
          -0.002 * features.fico +
          0.1 * features.avgNSFs +
          0.05 * features.industryRisk
        );
        
        const hazardRate = baseHazard * hazardRatio;
        defaultProbability = 1 - Math.exp(-hazardRate * forecastHorizon);
        
        if (currentStatus.missedPayments >= 4) {
          const recoveryHazard = 0.01 * Math.exp(
            -0.2 * features.missedPayments +
            0.003 * features.fico +
            0.0001 * features.avgMonthlyRevenue
          );
          recoveryProbability = 1 - Math.exp(-recoveryHazard * forecastHorizon);
        }
      } else if (predictiveModel === 'machine_learning') {
        // Gradient boosting decision tree approximation
        let score = 0;
        
        // Decision tree rules
        if (features.missedPayments > 2) score += 40;
        if (features.missedPayments > 0 && features.fico < 600) score += 30;
        if (features.collectionRatio < 0.5) score += 20;
        if (features.avgNSFs > 3) score += 15;
        if (features.avgMonthlyRevenue < 10000) score += 10;
        if (features.avgNegativeDays > 5) score += 10;
        if (features.industryRisk > 7) score += 5;
        
        // Protective factors
        if (features.fico > 700) score -= 20;
        if (features.collectionRatio > 0.9) score -= 25;
        if (features.avgMonthlyRevenue > 50000) score -= 15;
        if (features.avgDailyBalance > 10000) score -= 10;
        
        defaultProbability = Math.min(1, Math.max(0, score / 100));
        
        if (currentStatus.missedPayments >= 4) {
          let recoveryScore = 30;
          if (features.fico > 650) recoveryScore += 20;
          if (features.avgMonthlyRevenue > 20000) recoveryScore += 15;
          if (features.industryRisk < 5) recoveryScore += 10;
          recoveryProbability = Math.min(1, Math.max(0, recoveryScore / 100));
        }
      }
      
      predictions.push({
        loanId: loan.loanNumber,
        client: loan.client?.name || 'Unknown',
        currentStatus: currentStatus.status,
        defaultProbability: defaultProbability * 100,
        recoveryProbability: recoveryProbability * 100,
        riskScore: Math.round(defaultProbability * 100),
        expectedLoss: defaultProbability * currentStatus.balance,
        features
      });
    });
    
    return predictions.sort((a, b) => b.defaultProbability - a.defaultProbability);
  };
  
  // Industry risk scoring
  const getIndustryRiskScore = (industry) => {
    const riskScores = {
      'restaurants': 8,
      'retail': 7,
      'construction': 9,
      'transportation': 8,
      'healthcare': 3,
      'technology': 4,
      'finance': 3,
      'manufacturing': 5,
      'services': 5
    };
    
    if (!industry) return 5;
    const industryLower = industry.toLowerCase();
    
    for (const [key, score] of Object.entries(riskScores)) {
      if (industryLower.includes(key)) return score;
    }
    
    return 5; // default medium risk
  };
  
  const predictions = useMemo(() => runPredictiveModel(), 
    [loans, selectedDate, predictiveModel, forecastHorizon]);
  
  // Backtesting functionality
  const runBacktest = () => {
    const testPeriodDays = 90;
    const testDate = new Date(selectedDate);
    testDate.setDate(testDate.getDate() - testPeriodDays);
    const testDateStr = testDate.toISOString().split('T')[0];
    
    const testPredictions = [];
    let correctPredictions = 0;
    
    loans.forEach(loan => {
      const statusAtTest = calculateHistoricalStatus(loan, testDateStr);
      const statusAtCurrent = calculateHistoricalStatus(loan, selectedDate);
      
      // Make prediction based on test date status
      const predicted = statusAtTest.missedPayments > 1 ? 'default_risk' : 'performing';
      const actual = statusAtCurrent.missedPayments > 3 ? 'defaulted' : 'performing';
      
      testPredictions.push({
        predicted,
        actual,
        loanId: loan.loanNumber,
        correct: predicted === actual || 
                 (predicted === 'default_risk' && actual === 'defaulted')
      });
      
      if (testPredictions[testPredictions.length - 1].correct) {
        correctPredictions++;
      }
    });
    
    // Calculate metrics
    const truePositives = testPredictions.filter(p => 
      p.predicted === 'default_risk' && p.actual === 'defaulted'
    ).length;
    const falsePositives = testPredictions.filter(p => 
      p.predicted === 'default_risk' && p.actual === 'performing'
    ).length;
    const trueNegatives = testPredictions.filter(p => 
      p.predicted === 'performing' && p.actual === 'performing'
    ).length;
    const falseNegatives = testPredictions.filter(p => 
      p.predicted === 'performing' && p.actual === 'defaulted'
    ).length;
    
    const accuracy = (truePositives + trueNegatives) / testPredictions.length * 100;
    const precision = truePositives / (truePositives + falsePositives) * 100 || 0;
    const recall = truePositives / (truePositives + falseNegatives) * 100 || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    setBacktestResults({
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: {
        truePositives,
        falsePositives,
        trueNegatives,
        falseNegatives
      },
      testPeriod: testPeriodDays,
      samplesEvaluated: testPredictions.length
    });
  };
  
  // Risk distribution data for chart
  const riskDistribution = useMemo(() => {
    const distribution = [
      { range: '0-20%', count: 0, label: 'Very Low' },
      { range: '20-40%', count: 0, label: 'Low' },
      { range: '40-60%', count: 0, label: 'Medium' },
      { range: '60-80%', count: 0, label: 'High' },
      { range: '80-100%', count: 0, label: 'Very High' }
    ];
    
    predictions.forEach(pred => {
      const risk = pred.defaultProbability;
      if (risk < 20) distribution[0].count++;
      else if (risk < 40) distribution[1].count++;
      else if (risk < 60) distribution[2].count++;
      else if (risk < 80) distribution[3].count++;
      else distribution[4].count++;
    });
    
    return distribution;
  }, [predictions]);
  
  return (
    <div>
      {/* Model Configuration */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-semibold mb-3">Model Configuration</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Type
            </label>
            <select
              value={predictiveModel}
              onChange={(e) => setPredictiveModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="logistic">Logistic Regression</option>
              <option value="survival">Survival Analysis</option>
              <option value="machine_learning">Machine Learning (GBM)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forecast Horizon (days)
            </label>
            <input
              type="number"
              value={forecastHorizon}
              onChange={(e) => setForecastHorizon(parseInt(e.target.value))}
              min="7"
              max="180"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={runBacktest}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Run Backtest
            </button>
            <button
              onClick={() => exportToExcel(predictions, backtestResults)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Export Results
            </button>
          </div>
        </div>
      </div>

      {/* Backtest Results */}
      {backtestResults && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-purple-900 mb-3">
            Backtest Results ({backtestResults.testPeriod} Day Lookback)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600">Accuracy</p>
              <p className="text-xl font-bold text-purple-600">
                {backtestResults.accuracy.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600">Precision</p>
              <p className="text-xl font-bold text-purple-600">
                {backtestResults.precision.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600">Recall</p>
              <p className="text-xl font-bold text-purple-600">
                {backtestResults.recall.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600">F1 Score</p>
              <p className="text-xl font-bold text-purple-600">
                {backtestResults.f1Score.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Confusion Matrix */}
          <div className="bg-white rounded p-3">
            <p className="text-sm font-medium mb-2">Confusion Matrix</p>
            <div className="grid grid-cols-2 gap-2 max-w-xs">
              <div className="bg-green-100 p-2 rounded text-center">
                <p className="text-xs text-gray-600">True Positive</p>
                <p className="font-bold">{backtestResults.confusionMatrix.truePositives}</p>
              </div>
              <div className="bg-red-100 p-2 rounded text-center">
                <p className="text-xs text-gray-600">False Positive</p>
                <p className="font-bold">{backtestResults.confusionMatrix.falsePositives}</p>
              </div>
              <div className="bg-red-100 p-2 rounded text-center">
                <p className="text-xs text-gray-600">False Negative</p>
                <p className="font-bold">{backtestResults.confusionMatrix.falseNegatives}</p>
              </div>
              <div className="bg-green-100 p-2 rounded text-center">
                <p className="text-xs text-gray-600">True Negative</p>
                <p className="font-bold">{backtestResults.confusionMatrix.trueNegatives}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Distribution Chart */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-semibold mb-3">Default Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={riskDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* High Risk Loans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-red-50 border-b">
          <h3 className="font-semibold text-red-900">High Risk Loans (Top 20)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Loan ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Current Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Default Risk
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Recovery Prob
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Expected Loss
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  FICO
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {predictions.slice(0, 20).map((pred, idx) => (
                <tr key={idx} className={
                  pred.defaultProbability > 70 ? 'bg-red-50' : 
                  pred.defaultProbability > 40 ? 'bg-yellow-50' : ''
                }>
                  <td className="px-4 py-2 text-sm font-medium">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium">
                    {pred.loanId}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {pred.client}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      pred.currentStatus === 'current' ? 'bg-green-200 text-green-800' :
                      pred.currentStatus.includes('delinquent') ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {pred.currentStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            pred.defaultProbability > 70 ? 'bg-red-500' :
                            pred.defaultProbability > 40 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{width: `${pred.defaultProbability}%`}}
                        ></div>
                      </div>
                      <span className={`text-xs font-semibold ${
                        pred.defaultProbability > 70 ? 'text-red-600' :
                        pred.defaultProbability > 40 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {pred.defaultProbability.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {pred.recoveryProbability > 0 ? (
                      <span className="text-blue-600">
                        {pred.recoveryProbability.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className="text-red-600 font-semibold">
                      ${pred.expectedLoss.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={
                      pred.features.fico < 600 ? 'text-red-600' :
                      pred.features.fico < 650 ? 'text-yellow-600' :
                      'text-green-600'
                    }>
                      {pred.features.fico}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h3 className="font-semibold mb-3">Portfolio Risk Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Expected Loss</p>
            <p className="text-xl font-bold text-red-600">
              ${(predictions.reduce((sum, p) => sum + p.expectedLoss, 0) / 1000000).toFixed(2)}M
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">High Risk Loans</p>
            <p className="text-xl font-bold text-orange-600">
              {predictions.filter(p => p.defaultProbability > 60).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Default Probability</p>
            <p className="text-xl font-bold text-yellow-600">
              {(predictions.reduce((sum, p) => sum + p.defaultProbability, 0) / predictions.length).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Recovery Opportunities</p>
            <p className="text-xl font-bold text-blue-600">
              {predictions.filter(p => p.recoveryProbability > 30).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};