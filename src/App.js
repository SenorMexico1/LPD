import React, { useState, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoanListTab } from './components/LoanList';
import { LoanDetailsView } from './components/LoanDetails';
import { FileUploadButton } from './components/FileUpload';
import { ETLService } from './services/ETLService';

function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const etl = new ETLService();
      const rawData = await etl.extractFromExcel(file);
      const transformedLoans = etl.transformToLoans(rawData);
      
      setLoans(transformedLoans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (selectedLoan && activeTab === 'loans') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <LoanDetailsView 
            loan={selectedLoan} 
            onBack={() => setSelectedLoan(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Loan Performance Dashboard
          </h1>
        </header>
        
        <FileUploadButton onFileSelect={handleFileUpload} />
        
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
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'summary'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  Portfolio Summary
                </button>
                <button
                  onClick={() => setActiveTab('loans')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'loans'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  Loan Details
                </button>
              </nav>
            </div>
            
            {activeTab === 'summary' ? (
              <Dashboard loans={loans} />
            ) : (
              <LoanListTab loans={loans} onSelectLoan={setSelectedLoan} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;