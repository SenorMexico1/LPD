// src/App.js
import React, { useState, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoanListTab } from './components/LoanList';
import { LoanDetailsView } from './components/LoanDetails';
import { FileUploadButton } from './components/FileUpload';
import { TrendDiscoveryTab } from './components/TrendDiscovery/TrendDiscoveryTab';
import { ApiConfiguration } from './components/Settings/ApiConfiguration';
import { AIAnalytics as AIAnalyticsTab } from './components/AIAnalytics/AIAnalytics';

// Import from the etl folder with the compartmentalized structure
import { ETLService } from './services/etl/ETLService';

function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');

  const handleFileUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const etl = new ETLService();
      const rawData = await etl.extractFromExcel(file);
      const processedLoans = etl.transformToLoans(rawData);
      
      setLoans(processedLoans);
      setActiveTab('summary');
      
      // Log summary statistics
      const stats = etl.getSummaryStatistics(processedLoans);
      console.log('Portfolio Summary:', stats);
      
    } catch (err) {
      console.error('Failed to process file:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoanSelect = useCallback((loan) => {
    setSelectedLoan(loan);
    setActiveTab('details');
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab !== 'details') {
      setSelectedLoan(null);
    }
  }, []);

  const handleApiKeyUpdate = useCallback((key) => {
    setApiKey(key);
    localStorage.setItem('openai_api_key', key);
  }, []);

  // Load API key from localStorage on mount
  React.useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Show upload screen when no data is loaded
  if (loans.length === 0 && activeTab !== 'settings') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Loan Performance Analytics
            </h1>
            <p className="text-lg text-gray-600">
              Upload your Excel file to begin analysis
            </p>
          </div>

          <FileUploadButton onFileSelect={handleFileUpload} />

          {loading && (
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-600">Processing file...</p>
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-md">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={() => setActiveTab('settings')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Configure Settings
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {activeTab === 'settings' && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Settings</h2>
                <button
                  onClick={() => setActiveTab('summary')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ApiConfiguration 
                apiKey={apiKey}
                onApiKeyUpdate={handleApiKeyUpdate}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main app view when data is loaded
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Loan Performance Analytics
              </h1>
              <span className="ml-3 text-sm text-gray-500">
                {loans.length} loans loaded
              </span>
            </div>
            <button
              onClick={() => {
                setLoans([]);
                setSelectedLoan(null);
                setActiveTab('summary');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Upload New File
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Loan List
            </button>
            <button
              onClick={() => handleTabChange('trends')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trends'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trend Discovery
            </button>
            <button
              onClick={() => handleTabChange('ai-analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ai-analytics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              AI Analytics
              {!apiKey && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Setup Required
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
            {selectedLoan && (
              <button
                onClick={() => handleTabChange('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Loan Details
                <span className="ml-2 text-xs text-gray-400">
                  ({selectedLoan.loanNumber})
                </span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {!loading && activeTab === 'summary' && (
          <Dashboard loans={loans} onLoanSelect={handleLoanSelect} />
        )}

        {!loading && activeTab === 'list' && (
          <LoanListTab loans={loans} onLoanSelect={handleLoanSelect} />
        )}

        {!loading && activeTab === 'trends' && (
          <TrendDiscoveryTab loans={loans} />
        )}

        {!loading && activeTab === 'ai-analytics' && (
          <AIAnalyticsTab 
            loans={loans} 
            apiKey={apiKey}
            onApiKeyRequired={() => handleTabChange('settings')}
          />
        )}

        {!loading && activeTab === 'settings' && (
          <ApiConfiguration 
            apiKey={apiKey}
            onApiKeyUpdate={handleApiKeyUpdate}
          />
        )}

        {!loading && activeTab === 'details' && selectedLoan && (
          <LoanDetailsView 
            loan={selectedLoan} 
            onClose={() => handleTabChange('list')}
          />
        )}
      </main>
    </div>
  );
}

export default App;