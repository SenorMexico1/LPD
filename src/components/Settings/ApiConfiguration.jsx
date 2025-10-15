// components/Settings/ApiConfiguration.jsx
import React, { useState, useEffect } from 'react';

const API_PROXY_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const ApiConfiguration = ({ onApiKeyUpdate }) => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendApiKey, setBackendApiKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5-20250929');
  const [availableModels, setAvailableModels] = useState({});
  
  useEffect(() => {
    checkBackendStatus();
    // Check every 5 seconds for backend status
    const interval = setInterval(checkBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_PROXY_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('connected');
        setBackendApiKey(data.hasApiKey);
        if (data.availableModels) {
          setAvailableModels(data.availableModels);
        }
        onApiKeyUpdate(data.hasApiKey); // Update parent with API key status
      } else {
        setBackendStatus('error');
      }
    } catch (err) {
      setBackendStatus('offline');
    }
  };
  
  const testAnalysis = async () => {
    setTestResult({ testing: true });
    
    try {
      const response = await fetch(`${API_PROXY_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test connection. Respond with just "Connection successful".',
          model: selectedModel,
          analysisType: 'test'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult({ 
          success: true, 
          message: `✓ Backend proxy and API key are working! Using ${data.model}` 
        });
      } else {
        const error = await response.json();
        setTestResult({ 
          success: false, 
          message: `Test failed: ${error.error}${error.details ? ' - ' + error.details : ''}` 
        });
      }
    } catch (err) {
      setTestResult({ 
        success: false, 
        message: `Connection failed: ${err.message}` 
      });
    }
  };

  // Save selected model preference
  useEffect(() => {
    localStorage.setItem('preferred_model', selectedModel);
  }, [selectedModel]);

  // Load saved model preference
  useEffect(() => {
    const savedModel = localStorage.getItem('preferred_model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Backend Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Backend Proxy Status</h3>
        
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Proxy Server</p>
              <p className="text-sm text-gray-600">{API_PROXY_URL}</p>
            </div>
            <div className="flex items-center space-x-2">
              {backendStatus === 'connected' && (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">Connected</span>
                </>
              )}
              {backendStatus === 'offline' && (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-600 font-medium">Offline</span>
                </>
              )}
              {backendStatus === 'checking' && (
                <>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-600 font-medium">Checking...</span>
                </>
              )}
              {backendStatus === 'error' && (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-600 font-medium">Error</span>
                </>
              )}
            </div>
          </div>
          
          {/* API Key Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Anthropic API Key</p>
              <p className="text-sm text-gray-600">Configured in backend .env file</p>
            </div>
            <div className="flex items-center space-x-2">
              {backendApiKey ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">Configured</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-600 font-medium">Not Set</span>
                </>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Latest - Sept 2025)</option>
              <option value="claude-opus-4-1-20250805">Claude Opus 4.1 (Aug 2025)</option>
              <option value="claude-sonnet-4-20250522">Claude Sonnet 4 (May 2025)</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Legacy)</option>
            </select>
            {availableModels[selectedModel] && (
              <p className="text-xs text-gray-500 mt-1">
                {availableModels[selectedModel].description}
              </p>
            )}
          </div>
          
          {/* Test Button */}
          <button
            onClick={testAnalysis}
            disabled={backendStatus !== 'connected' || !backendApiKey}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              backendStatus !== 'connected' || !backendApiKey
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Test API Connection
          </button>
          
          {testResult && !testResult.testing && (
            <p className={`text-sm mt-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.message}
            </p>
          )}
          
          {testResult?.testing && (
            <p className="text-blue-600 text-sm mt-2">Testing connection...</p>
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      {backendStatus === 'offline' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">Backend Proxy Setup Required</h3>
          
          <p className="text-sm text-blue-800 mb-4">
            The backend proxy server is not running. Follow these steps to set it up:
          </p>
          
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Create a new folder: <code className="bg-white px-1 py-0.5 rounded">loan-dashboard-backend</code></li>
            <li>Copy the updated <code className="bg-white px-1 py-0.5 rounded">anthropicProxy.js</code> file to this folder</li>
            <li>Run: <code className="bg-white px-1 py-0.5 rounded">npm install express cors dotenv</code></li>
            <li>Create a <code className="bg-white px-1 py-0.5 rounded">.env</code> file with:
              <pre className="bg-white p-2 rounded mt-1">ANTHROPIC_API_KEY=sk-ant-api03-your-key-here</pre>
            </li>
            <li>Start the server: <code className="bg-white px-1 py-0.5 rounded">node anthropicProxy.js</code></li>
          </ol>
        </div>
      )}
      
      {backendStatus === 'connected' && !backendApiKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-900">API Key Configuration Needed</h3>
          
          <p className="text-sm text-yellow-800 mb-4">
            The backend server is running but no API key is configured. Add your key to the backend:
          </p>
          
          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
            <li>Go to <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a></li>
            <li>Generate an API key</li>
            <li>Add to backend <code className="bg-white px-1 py-0.5 rounded">.env</code> file:
              <pre className="bg-white p-2 rounded mt-1">ANTHROPIC_API_KEY=sk-ant-api03-your-key-here</pre>
            </li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      )}

      {/* Model Information & Pricing - Updated for October 2025 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Available Claude Models (October 2025)</h3>
        
        <div className="space-y-3">
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">Claude Sonnet 4.5</h4>
                <p className="text-sm text-gray-600">Model: claude-sonnet-4-5-20250929</p>
                <p className="text-xs text-gray-500 mt-1">Best for coding and complex agents, 30+ hour autonomous operation</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Latest & Recommended</span>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Input pricing:</span>
                <span className="font-medium">$3 / million tokens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Output pricing:</span>
                <span className="font-medium">$15 / million tokens</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                <span className="text-gray-600">Est. per analysis:</span>
                <span className="font-medium text-green-600">~$0.02</span>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">Claude Opus 4.1</h4>
                <p className="text-sm text-gray-600">Model: claude-opus-4-1-20250805</p>
                <p className="text-xs text-gray-500 mt-1">Exceptional for specialized complex tasks requiring advanced reasoning</p>
              </div>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">Premium</span>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Input pricing:</span>
                <span className="font-medium">$15 / million tokens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Output pricing:</span>
                <span className="font-medium">$75 / million tokens</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                <span className="text-gray-600">Est. per analysis:</span>
                <span className="font-medium text-purple-600">~$0.10</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 opacity-75">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">Claude Sonnet 4</h4>
                <p className="text-sm text-gray-600">Model: claude-sonnet-4-20250522</p>
                <p className="text-xs text-gray-500 mt-1">Previous generation - consider upgrading to 4.5</p>
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">Previous Gen</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">
            <strong>💡 Tip:</strong> Sonnet 4.5 offers the best balance of performance and cost for most tasks. 
            It can handle 30+ hours of autonomous coding vs 7 hours for previous models. Use Opus 4.1 only for 
            the most complex analyses requiring deep reasoning.
          </p>
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Privacy & Security</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Data Protection</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ API key stored only on backend server</li>
              <li>✓ Never exposed to browser/frontend</li>
              <li>✓ API data NOT used for training</li>
              <li>✓ Your loan data stays private</li>
              <li>✓ CORS protection enabled</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Best Practices</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use environment variables for keys</li>
              <li>• Deploy proxy to secure server</li>
              <li>• Enable rate limiting in production</li>
              <li>• Monitor usage via Anthropic console</li>
              <li>• Rotate API keys periodically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};