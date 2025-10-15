// src/components/AIAnalytics/BacktestLab.jsx
import React, { useState, useCallback, useMemo } from 'react';

export const BacktestLab = ({ loans, models, analysisData, onModelUpdate }) => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testConfig, setTestConfig] = useState({
    testSplit: 0.2, // 20% test set
    randomSeed: 42,
    crossValidation: false,
    kFolds: 5
  });

  // Split data into training and test sets
  const splitData = useCallback((data, testRatio) => {
    if (!data || data.length === 0) return { train: [], test: [] };
    
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * (1 - testRatio));
    
    return {
      train: shuffled.slice(0, splitIndex),
      test: shuffled.slice(splitIndex)
    };
  }, []);

  // Run backtest simulation
  const runBacktest = useCallback(async () => {
    if (!selectedModel || !analysisData) return;
    
    setIsRunning(true);
    setTestResults(null);
    
    try {
      // Simulate async model evaluation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { train, test } = splitData(analysisData, testConfig.testSplit);
      
      // Simulate model predictions based on type
      const predictions = test.map(loan => {
        let predicted = false;
        let probability = Math.random();
        
        // Simple rule-based predictions for demonstration
        if (selectedModel.type === 'default_prediction') {
          // Default prediction logic
          if (loan.daysOverdue > 60) probability += 0.3;
          if (loan.missedPayments > 2) probability += 0.3;
          if (loan.fico < 650) probability += 0.2;
          if (loan.dscr && loan.dscr < 1.2) probability += 0.2;
          
          probability = Math.min(probability, 1);
          predicted = probability > 0.5;
        } else if (selectedModel.type === 'delinquency_migration') {
          // Delinquency progression logic
          if (loan.status === 'current' && loan.paymentVelocity < 20) {
            probability = 0.7;
            predicted = true;
          }
        } else if (selectedModel.type === 'recovery_likelihood') {
          // Recovery prediction logic
          if (loan.status === 'default' || loan.status === 'restructured') {
            if (loan.hasCatchUpPayments) probability += 0.4;
            if (loan.fico > 700) probability += 0.3;
            predicted = probability > 0.5;
          }
        }
        
        return {
          loanNumber: loan.loanNumber,
          actual: loan.features?.isDefault || false,
          predicted,
          probability,
          correct: (loan.features?.isDefault || false) === predicted
        };
      });
      
      // Calculate metrics
      const tp = predictions.filter(p => p.actual && p.predicted).length;
      const tn = predictions.filter(p => !p.actual && !p.predicted).length;
      const fp = predictions.filter(p => !p.actual && p.predicted).length;
      const fn = predictions.filter(p => p.actual && !p.predicted).length;
      
      const accuracy = predictions.length > 0 ? 
        ((tp + tn) / predictions.length) * 100 : 0;
      const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
      const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
      const f1Score = (precision + recall) > 0 ? 
        (2 * precision * recall) / (precision + recall) : 0;
      
      const results = {
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        timestamp: new Date().toISOString(),
        dataStats: {
          totalSamples: analysisData.length,
          trainingSamples: train.length,
          testSamples: test.length
        },
        metrics: {
          accuracy,
          precision,
          recall,
          f1Score,
          confusionMatrix: { tp, tn, fp, fn }
        },
        predictions: predictions.slice(0, 10), // Show first 10 for review
        performanceBySegment: calculateSegmentPerformance(predictions, test)
      };
      
      setTestResults(results);
      
      // Update model with backtest results
      if (onModelUpdate) {
        onModelUpdate({
          ...selectedModel,
          backtestResults: results
        });
      }
    } catch (error) {
      console.error('Backtest failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  }, [selectedModel, analysisData, testConfig, splitData, onModelUpdate]);

  // Calculate performance by segment
  const calculateSegmentPerformance = (predictions, testData) => {
    const segments = {};
    
    predictions.forEach((pred, idx) => {
      const loan = testData[idx];
      if (!loan) return;
      
      const industry = loan.industry || 'Unknown';
      if (!segments[industry]) {
        segments[industry] = {
          total: 0,
          correct: 0,
          accuracy: 0
        };
      }
      
      segments[industry].total++;
      if (pred.correct) segments[industry].correct++;
    });
    
    // Calculate accuracy for each segment
    Object.keys(segments).forEach(key => {
      segments[key].accuracy = segments[key].total > 0 ?
        (segments[key].correct / segments[key].total) * 100 : 0;
    });
    
    return segments;
  };

  // Performance visualization data
  const performanceChart = useMemo(() => {
    if (!testResults?.metrics) return null;
    
    return [
      { metric: 'Accuracy', value: testResults.metrics.accuracy, color: 'bg-blue-500' },
      { metric: 'Precision', value: testResults.metrics.precision, color: 'bg-green-500' },
      { metric: 'Recall', value: testResults.metrics.recall, color: 'bg-yellow-500' },
      { metric: 'F1 Score', value: testResults.metrics.f1Score, color: 'bg-purple-500' }
    ];
  }, [testResults]);

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Model to Backtest</h3>
        
        {models && models.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedModel?.id === model.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h4 className="font-medium text-gray-900">{model.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{model.type}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(model.createdAt).toLocaleDateString()}
                </p>
                {model.backtestResults && (
                  <p className="text-xs text-green-600 mt-1">
                    Last accuracy: {model.backtestResults.metrics.accuracy.toFixed(1)}%
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No models available. Create a model in the Model Builder first.</p>
        )}
      </div>

      {/* Test Configuration */}
      {selectedModel && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Split Ratio
              </label>
              <select
                value={testConfig.testSplit}
                onChange={(e) => setTestConfig({...testConfig, testSplit: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="0.1">10% Test / 90% Train</option>
                <option value="0.2">20% Test / 80% Train</option>
                <option value="0.3">30% Test / 70% Train</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cross Validation
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testConfig.crossValidation}
                    onChange={(e) => setTestConfig({...testConfig, crossValidation: e.target.checked})}
                    className="mr-2"
                  />
                  Enable
                </label>
                {testConfig.crossValidation && (
                  <input
                    type="number"
                    value={testConfig.kFolds}
                    onChange={(e) => setTestConfig({...testConfig, kFolds: parseInt(e.target.value)})}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                    min="2"
                    max="10"
                  />
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={runBacktest}
            disabled={isRunning}
            className={`mt-4 px-6 py-2 rounded-lg font-medium ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isRunning ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>
      )}

      {/* Test Results */}
      {testResults && !testResults.error && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {performanceChart?.map(item => (
                <div key={item.metric} className="text-center">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block uppercase text-gray-600">
                          {item.metric}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                      <div 
                        style={{ width: `${item.value}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${item.color}`}
                      />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {item.value.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confusion Matrix</h3>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="text-center p-4 bg-green-50 rounded">
                <p className="text-xs text-gray-600">True Positive</p>
                <p className="text-2xl font-bold text-green-600">
                  {testResults.metrics.confusionMatrix.tp}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <p className="text-xs text-gray-600">False Positive</p>
                <p className="text-2xl font-bold text-red-600">
                  {testResults.metrics.confusionMatrix.fp}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <p className="text-xs text-gray-600">False Negative</p>
                <p className="text-2xl font-bold text-red-600">
                  {testResults.metrics.confusionMatrix.fn}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <p className="text-xs text-gray-600">True Negative</p>
                <p className="text-2xl font-bold text-green-600">
                  {testResults.metrics.confusionMatrix.tn}
                </p>
              </div>
            </div>
          </div>

          {/* Segment Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Industry</h3>
            
            <div className="space-y-2">
              {Object.entries(testResults.performanceBySegment)
                .sort((a, b) => b[1].accuracy - a[1].accuracy)
                .slice(0, 10)
                .map(([segment, data]) => (
                  <div key={segment} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-700">{segment}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500">
                        {data.correct}/{data.total} correct
                      </span>
                      <span className={`text-sm font-semibold ${
                        data.accuracy > 80 ? 'text-green-600' :
                        data.accuracy > 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {data.accuracy.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {testResults?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Backtest Error:</p>
          <p>{testResults.error}</p>
        </div>
      )}
    </div>
  );
};