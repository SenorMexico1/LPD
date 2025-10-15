// src/components/AIAnalytics/ModelBuilder.jsx
import React, { useState, useCallback, useMemo } from 'react';

export const ModelBuilder = ({ loans, analysisData, onModelSave, onModelExport }) => {
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState('default_prediction');
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainedModel, setTrainedModel] = useState(null);
  const [trainingResults, setTrainingResults] = useState(null);

  // Available model types
  const modelTypes = [
    {
      id: 'default_prediction',
      name: 'Default Prediction',
      description: 'Predict likelihood of default in next 30-90 days',
      targetVariable: 'isDefault',
      requiredFeatures: ['fico', 'dscr', 'missedPayments', 'daysOverdue']
    },
    {
      id: 'delinquency_migration',
      name: 'Delinquency Migration',
      description: 'Predict movement between delinquency buckets',
      targetVariable: 'delinquencyBucket',
      requiredFeatures: ['status', 'missedPayments', 'paymentVelocity']
    },
    {
      id: 'recovery_likelihood',
      name: 'Recovery Likelihood',
      description: 'Predict successful recovery from delinquency',
      targetVariable: 'willRecover',
      requiredFeatures: ['daysOverdue', 'industry', 'hasCatchUpPayments']
    },
    {
      id: 'optimal_terms',
      name: 'Optimal Loan Terms',
      description: 'Predict best loan terms for new applicants',
      targetVariable: 'optimalTerm',
      requiredFeatures: ['fico', 'industry', 'businessAge', 'avgRevenue']
    }
  ];

  // Available features from actual data
  const availableFeatures = useMemo(() => {
    if (!analysisData || analysisData.length === 0) return [];
    
    const firstLoan = analysisData[0];
    const features = [];
    
    // Numeric features
    const numericFields = [
      'fico', 'dscr', 'missedPayments', 'daysOverdue', 
      'loanAmount', 'remainingAmount', 'installmentAmount',
      'collectionRate', 'businessAge', 'avgRevenue', 
      'riskScore', 'paymentVelocity', 'monthsSinceOrigination'
    ];
    
    numericFields.forEach(field => {
      if (firstLoan[field] !== undefined) {
        features.push({
          name: field,
          type: 'numeric',
          available: analysisData.filter(l => l[field] !== null).length,
          coverage: ((analysisData.filter(l => l[field] !== null).length / analysisData.length) * 100).toFixed(1)
        });
      }
    });
    
    // Categorical features
    const categoricalFields = [
      'status', 'industry', 'state', 'city', 'paymentFrequency'
    ];
    
    categoricalFields.forEach(field => {
      if (firstLoan[field] !== undefined) {
        const uniqueValues = [...new Set(analysisData.map(l => l[field]))].filter(v => v);
        features.push({
          name: field,
          type: 'categorical',
          uniqueValues: uniqueValues.length,
          available: analysisData.filter(l => l[field] !== null).length,
          coverage: ((analysisData.filter(l => l[field] !== null).length / analysisData.length) * 100).toFixed(1)
        });
      }
    });
    
    // Boolean features
    const booleanFields = [
      'hasDeceleratingPayments', 'hasCatchUpPayments'
    ];
    
    booleanFields.forEach(field => {
      if (firstLoan[field] !== undefined) {
        features.push({
          name: field,
          type: 'boolean',
          available: analysisData.filter(l => l[field] !== null).length,
          coverage: ((analysisData.filter(l => l[field] !== null).length / analysisData.length) * 100).toFixed(1)
        });
      }
    });
    
    return features;
  }, [analysisData]);

  // Split data into training and testing sets
  const splitData = useCallback((data, testRatio = 0.2) => {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const testSize = Math.floor(data.length * testRatio);
    
    return {
      train: shuffled.slice(testSize),
      test: shuffled.slice(0, testSize)
    };
  }, []);

  // Simple logistic regression implementation (in production, use TensorFlow.js or similar)
  const trainLogisticRegression = useCallback((features, labels) => {
    // Normalize features
    const means = {};
    const stds = {};
    
    Object.keys(features[0]).forEach(key => {
      const values = features.map(f => f[key] || 0);
      means[key] = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - means[key], 2), 0) / values.length;
      stds[key] = Math.sqrt(variance) || 1;
    });
    
    const normalizedFeatures = features.map(f => {
      const normalized = {};
      Object.keys(f).forEach(key => {
        normalized[key] = (f[key] - means[key]) / stds[key];
      });
      return normalized;
    });
    
    // Simple gradient descent
    const weights = {};
    const learningRate = 0.01;
    const iterations = 100;
    
    Object.keys(features[0]).forEach(key => {
      weights[key] = Math.random() - 0.5;
    });
    weights.bias = 0;
    
    for (let iter = 0; iter < iterations; iter++) {
      const gradients = {};
      Object.keys(weights).forEach(key => gradients[key] = 0);
      
      for (let i = 0; i < normalizedFeatures.length; i++) {
        const prediction = sigmoid(
          Object.keys(normalizedFeatures[i]).reduce((sum, key) => 
            sum + normalizedFeatures[i][key] * weights[key], weights.bias
          )
        );
        
        const error = prediction - labels[i];
        
        Object.keys(normalizedFeatures[i]).forEach(key => {
          gradients[key] += error * normalizedFeatures[i][key];
        });
        gradients.bias += error;
      }
      
      // Update weights
      Object.keys(weights).forEach(key => {
        weights[key] -= (learningRate * gradients[key]) / normalizedFeatures.length;
      });
    }
    
    return { weights, means, stds };
    
    function sigmoid(x) {
      return 1 / (1 + Math.exp(-x));
    }
  }, []);

  // Train the model
  const trainModel = useCallback(async () => {
    if (!modelName || selectedFeatures.length === 0) {
      alert('Please enter a model name and select features');
      return;
    }
    
    setIsTraining(true);
    setTrainingResults(null);
    
    try {
      const currentModelType = modelTypes.find(m => m.id === modelType);
      
      // Prepare training data
      const trainingData = analysisData.filter(loan => {
        // Only use loans with all selected features
        return selectedFeatures.every(feature => 
          loan[feature] !== null && loan[feature] !== undefined
        );
      });
      
      if (trainingData.length < 20) {
        throw new Error('Not enough data for training. Need at least 20 complete records.');
      }
      
      // Split data
      const { train, test } = splitData(trainingData);
      
      // Prepare features and labels
      const trainFeatures = train.map(loan => {
        const features = {};
        selectedFeatures.forEach(f => {
          const feature = availableFeatures.find(af => af.name === f);
          if (feature?.type === 'categorical') {
            // One-hot encode categorical features
            features[f] = loan[f] === 'current' ? 1 : 0; // Simplified
          } else if (feature?.type === 'boolean') {
            features[f] = loan[f] ? 1 : 0;
          } else {
            features[f] = loan[f] || 0;
          }
        });
        return features;
      });
      
      const trainLabels = train.map(loan => {
        if (modelType === 'default_prediction') {
          return loan.features.isDefault ? 1 : 0;
        } else if (modelType === 'delinquency_migration') {
          return loan.features.delinquencyBucket;
        } else if (modelType === 'recovery_likelihood') {
          return loan.status === 'current' && loan.features.delinquencyBucket > 0 ? 1 : 0;
        }
        return 0;
      });
      
      // Train model
      const model = trainLogisticRegression(trainFeatures, trainLabels);
      
      // Evaluate on test set
      const testFeatures = test.map(loan => {
        const features = {};
        selectedFeatures.forEach(f => {
          const feature = availableFeatures.find(af => af.name === f);
          if (feature?.type === 'categorical') {
            features[f] = loan[f] === 'current' ? 1 : 0;
          } else if (feature?.type === 'boolean') {
            features[f] = loan[f] ? 1 : 0;
          } else {
            features[f] = loan[f] || 0;
          }
        });
        return features;
      });
      
      const testLabels = test.map(loan => {
        if (modelType === 'default_prediction') {
          return loan.features.isDefault ? 1 : 0;
        } else if (modelType === 'delinquency_migration') {
          return loan.features.delinquencyBucket;
        } else if (modelType === 'recovery_likelihood') {
          return loan.status === 'current' && loan.features.delinquencyBucket > 0 ? 1 : 0;
        }
        return 0;
      });
      
      // Calculate accuracy
      let correct = 0;
      const predictions = testFeatures.map((features, i) => {
        const normalized = {};
        Object.keys(features).forEach(key => {
          normalized[key] = (features[key] - model.means[key]) / model.stds[key];
        });
        
        const prediction = 1 / (1 + Math.exp(-(
          Object.keys(normalized).reduce((sum, key) => 
            sum + normalized[key] * model.weights[key], model.weights.bias
          )
        )));
        
        const predicted = prediction > 0.5 ? 1 : 0;
        if (predicted === testLabels[i]) correct++;
        
        return { predicted, actual: testLabels[i], probability: prediction };
      });
      
      const accuracy = (correct / test.length) * 100;
      
      // Calculate additional metrics
      const truePositives = predictions.filter(p => p.predicted === 1 && p.actual === 1).length;
      const falsePositives = predictions.filter(p => p.predicted === 1 && p.actual === 0).length;
      const falseNegatives = predictions.filter(p => p.predicted === 0 && p.actual === 1).length;
      
      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / (truePositives + falseNegatives) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
      
      const modelData = {
        name: modelName,
        type: modelType,
        features: selectedFeatures,
        model: model,
        metrics: {
          accuracy,
          precision: precision * 100,
          recall: recall * 100,
          f1Score: f1Score * 100,
          trainSize: train.length,
          testSize: test.length
        },
        createdAt: new Date().toISOString()
      };
      
      setTrainedModel(modelData);
      setTrainingResults({
        accuracy,
        precision: precision * 100,
        recall: recall * 100,
        f1Score: f1Score * 100,
        confusionMatrix: {
          truePositives,
          falsePositives,
          falseNegatives,
          trueNegatives: test.length - truePositives - falsePositives - falseNegatives
        }
      });
      
    } catch (error) {
      console.error('Training error:', error);
      alert(`Training failed: ${error.message}`);
    } finally {
      setIsTraining(false);
    }
  }, [modelName, modelType, selectedFeatures, analysisData, availableFeatures, splitData, trainLogisticRegression]);

  return (
    <div className="space-y-6">
      {/* Model Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Build Predictive Model</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., Q4 2024 Default Predictor"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Type
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              {modelTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">
            <strong>Description:</strong>{' '}
            {modelTypes.find(m => m.id === modelType)?.description}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <strong>Target Variable:</strong>{' '}
            {modelTypes.find(m => m.id === modelType)?.targetVariable}
          </p>
        </div>
        
        {/* Feature Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Features ({selectedFeatures.length} selected)
          </label>
          <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableFeatures.map(feature => {
                const isRequired = modelTypes.find(m => m.id === modelType)
                  ?.requiredFeatures?.includes(feature.name);
                
                return (
                  <label key={feature.name} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(feature.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFeatures([...selectedFeatures, feature.name]);
                        } else {
                          setSelectedFeatures(selectedFeatures.filter(f => f !== feature.name));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="font-medium">
                        {feature.name}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {feature.type} • {feature.coverage}% coverage
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Train Button */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={trainModel}
            disabled={isTraining || selectedFeatures.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isTraining || selectedFeatures.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isTraining ? 'Training...' : 'Train Model'}
          </button>
          
          {trainedModel && (
            <>
              <button
                onClick={() => onModelSave(trainedModel)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Save Model
              </button>
              <button
                onClick={() => onModelExport(trainedModel)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                Export Weights
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Training Results */}
      {trainingResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Training Results</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-800">
                {trainingResults.accuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-green-600">Accuracy</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-800">
                {trainingResults.precision.toFixed(1)}%
              </div>
              <div className="text-sm text-blue-600">Precision</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-800">
                {trainingResults.recall.toFixed(1)}%
              </div>
              <div className="text-sm text-purple-600">Recall</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-800">
                {trainingResults.f1Score.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-600">F1 Score</div>
            </div>
          </div>
          
          {/* Confusion Matrix */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Confusion Matrix</h4>
            <div className="grid grid-cols-3 gap-2 max-w-sm">
              <div></div>
              <div className="text-center text-sm font-medium">Predicted 0</div>
              <div className="text-center text-sm font-medium">Predicted 1</div>
              <div className="text-sm font-medium">Actual 0</div>
              <div className="bg-green-100 p-2 text-center rounded">
                {trainingResults.confusionMatrix.trueNegatives}
              </div>
              <div className="bg-red-100 p-2 text-center rounded">
                {trainingResults.confusionMatrix.falsePositives}
              </div>
              <div className="text-sm font-medium">Actual 1</div>
              <div className="bg-red-100 p-2 text-center rounded">
                {trainingResults.confusionMatrix.falseNegatives}
              </div>
              <div className="bg-green-100 p-2 text-center rounded">
                {trainingResults.confusionMatrix.truePositives}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};