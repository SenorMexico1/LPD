import React, { useState } from 'react';
import { OverviewSection, calculateRiskScore } from './OverviewSection';
import { ScheduleSection } from './ScheduleSection';
import { CalculationSection } from './CalculationSection';
import { ClientSection } from './ClientSection';

export const LoanDetailsView = ({ loan, onBack }) => {
  const [activeSection, setActiveSection] = useState('overview');
  
  // Calculate the risk score using the shared function
  const { totalScore: riskScore } = calculateRiskScore(loan);
  
  const getStatusColor = (status) => {
    if (status === 'current') return 'bg-green-100 text-green-800';
    if (status.includes('delinquent')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  // Get risk score color and label
  const getRiskScoreDisplay = (score) => {
    let color = '';
    let label = '';
    
    if (score <= 25) {
      color = 'text-green-600 bg-green-100';
      label = 'Low';
    } else if (score <= 50) {
      color = 'text-yellow-600 bg-yellow-100';
      label = 'Medium';
    } else if (score <= 75) {
      color = 'text-orange-600 bg-orange-100';
      label = 'High';
    } else {
      color = 'text-red-600 bg-red-100';
      label = 'Critical';
    }
    
    return { color, label };
  };
  
  const riskDisplay = getRiskScoreDisplay(riskScore);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to list
          </button>
          <h2 className="text-2xl font-bold">Loan #{loan.loanNumber}</h2>
          <p className="text-gray-600">{loan.client?.displayName || loan.client?.name || 'N/A'}</p>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(loan.status)}`}>
            {loan.status.replace('_', ' ').toUpperCase()}
          </span>
          <div className="mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${riskDisplay.color}`}>
              Risk: {riskDisplay.label}
            </span>
          </div>
        </div>
      </div>
      
      {/* Key Metrics - Updated to show new risk score */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Contract Balance</p>
          <p className="text-xl font-bold">${(loan.contractBalance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Installment</p>
          <p className="text-xl font-bold">${(loan.installmentAmount || loan.instalmentAmount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Days Overdue</p>
          <p className="text-xl font-bold">{loan.daysOverdue || 0}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Collection Rate</p>
          <p className="text-xl font-bold">
            {(() => {
              const totalExpected = loan.paydates.filter(p => {
                const paydateStr = p.date.split('T')[0];
                const todayStr = new Date().toISOString().split('T')[0];
                return paydateStr < todayStr;
              }).length * (loan.installmentAmount || loan.instalmentAmount || 0);
              
              const totalReceived = loan.statusCalculation?.totalReceived || 0;
              const rate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;
              return `${rate.toFixed(0)}%`;
            })()}
          </p>
        </div>
        <div className={`p-3 rounded ${riskDisplay.color}`}>
          <p className="text-sm font-medium">Risk Score</p>
          <p className="text-2xl font-bold">{riskScore}/100</p>
          <p className="text-xs">{riskDisplay.label} Risk</p>
        </div>
      </div>
      
      {/* Additional Risk Information Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-xs text-gray-600">FICO Score</p>
              <p className="text-sm font-semibold">{loan.lead?.fico || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Industry</p>
              <p className="text-sm font-semibold">
                {loan.client?.industrySector || 'Not Specified'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Business Age</p>
              <p className="text-sm font-semibold">
                {(() => {
                  if (!loan.client?.dateFounded) return 'N/A';
                  const founded = new Date(loan.client.dateFounded);
                  const now = new Date();
                  const years = Math.floor((now - founded) / (1000 * 60 * 60 * 24 * 365));
                  return `${years} year${years !== 1 ? 's' : ''}`;
                })()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Debt/Revenue</p>
              <p className="text-sm font-semibold">
                {(() => {
                  const revenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue || 0;
                  const debt = loan.lead?.avgMCADebits || loan.lead?.avgMcaDebts || loan.lead?.avgMCADebts || 0;
                  if (revenue === 0) return 'N/A';
                  return `${((debt / revenue) * 100).toFixed(1)}%`;
                })()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Risk Trend:</span>
              <div className="flex space-x-1">
                {/* Simple risk trend visualization */}
                <div className={`w-2 h-4 rounded ${riskScore <= 25 ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-4 rounded ${riskScore > 25 && riskScore <= 50 ? 'bg-yellow-400' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-4 rounded ${riskScore > 50 && riskScore <= 75 ? 'bg-orange-400' : 'bg-gray-300'}`}></div>
                <div className={`w-2 h-4 rounded ${riskScore > 75 ? 'bg-red-400' : 'bg-gray-300'}`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section Tabs */}
      <div className="border-b mb-4">
        <nav className="flex space-x-6">
          {['overview', 'schedule', 'calculation', 'client'].map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeSection === section
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {section}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Section Content */}
      {activeSection === 'overview' && <OverviewSection loan={loan} />}
      {activeSection === 'schedule' && <ScheduleSection loan={loan} />}
      {activeSection === 'calculation' && <CalculationSection loan={loan} />}
      {activeSection === 'client' && <ClientSection loan={loan} />}
    </div>
  );
};