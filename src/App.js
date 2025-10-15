// src/App.js
import React, { useState, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoanListTab } from './components/LoanList';
import { LoanDetailsView } from './components/LoanDetails';
import { FileUploadButton } from './components/FileUpload';
import { TrendDiscoveryTab } from './components/TrendDiscovery/TrendDiscoveryTab';
import { ApiConfiguration } from './components/Settings/ApiConfiguration';

// CORRECTED IMPORT PATH - Import from the etl folder
import { ETLService } from './services/etl/ETLService';
// Or if you have an index.js that exports ETLService:
// import { ETLService } from './services/etl';

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
      const transformedLoans = etl.transformToLoans(rawData);
      
      setLoans(transformedLoans);
      setActiveTab('summary'); // Switch to summary after upload
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoanSelect = useCallback((loan) => {
    setSelectedLoan(loan);
    setActiveTab('loan-details');
  }, []);

  const handleApiKeyUpdate = useCallback((key) => {
    setApiKey(key);
  }, []);

  // Show file upload if no data
  if (loans.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Loan Performance Dashboard
            </h1>
            <p className="text-gray-600">Upload your loan data to begin analysis</p>
          </header>
          
          <div className="flex justify-center">
            <FileUploadButton onFileSelect={handleFileUpload} />
          </div>
          
          {error && (
            <div className="max-w-md mx-auto mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Loan Performance Dashboard
            </h1>
            <button
              onClick={() => {
                setLoans([]);
                setSelectedLoan(null);
                setActiveTab('summary');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Upload New File
            </button>
          </div>
        </header>
        
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            Processing file...
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {loans.length > 0 && (
          <>
            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'summary'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Portfolio Summary
                </button>
                <button
                  onClick={() => setActiveTab('loans')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'loans'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Loan List
                </button>
                {selectedLoan && (
                  <button
                    onClick={() => setActiveTab('loan-details')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'loan-details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Loan Details
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'trends'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Trend Discovery
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Settings
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow">
              {activeTab === 'summary' && (
                <Dashboard loans={loans} />
              )}
              
              {activeTab === 'loans' && (
                <div className="p-6">
                  <LoanListTab 
                    loans={loans} 
                    onSelectLoan={handleLoanSelect}
                  />
                </div>
              )}
              
              {activeTab === 'loan-details' && selectedLoan && (
                <div className="p-6">
                  <LoanDetailsView 
                    loan={selectedLoan} 
                    onBack={() => setActiveTab('loans')}
                  />
                </div>
              )}
              
              {activeTab === 'trends' && (
                <TrendDiscoveryTab 
                  loans={loans}
                  apiKey={apiKey}
                />
              )}
              
              {activeTab === 'settings' && (
                <div className="p-6">
                  <ApiConfiguration onApiKeyUpdate={handleApiKeyUpdate} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;