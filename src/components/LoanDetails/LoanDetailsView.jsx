import React, { useState } from 'react';
import { OverviewSection } from './OverviewSection';
import { ScheduleSection } from './ScheduleSection';
import { CalculationSection } from './CalculationSection';
import { ClientSection } from './ClientSection';

export const LoanDetailsView = ({ loan, onBack }) => {
  const [activeSection, setActiveSection] = useState('overview');
  
  const getStatusColor = (status) => {
    if (status === 'current') return 'bg-green-100 text-green-800';
    if (status.includes('delinquent')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
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
          <p className="text-gray-600">{loan.merchantName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(loan.status)}`}>
          {loan.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Contract Balance</p>
          <p className="text-xl font-bold">${loan.contractBalance.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Installment Amount</p>
          <p className="text-xl font-bold">${loan.installmentAmount.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Days Overdue</p>
          <p className="text-xl font-bold">{loan.daysOverdue}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">Risk Score</p>
          <p className="text-xl font-bold">{loan.riskScore.toFixed(0)}</p>
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