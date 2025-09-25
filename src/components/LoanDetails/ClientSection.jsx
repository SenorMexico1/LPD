import React from 'react';

export const ClientSection = ({ loan }) => {
  // Helper function to format currency safely
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'number') return `$${value.toLocaleString()}`;
    return 'N/A';
  };

  // Helper function to format FICO score with color coding
  const formatFICO = (score) => {
    if (!score || score === 0) return { text: 'N/A', color: 'text-gray-500' };
    if (score >= 720) return { text: score, color: 'text-green-600 font-semibold' };
    if (score >= 650) return { text: score, color: 'text-yellow-600 font-semibold' };
    return { text: score, color: 'text-red-600 font-semibold' };
  };

  const ficoData = formatFICO(loan.lead?.fico);

  // Calculate business age if date founded exists
  const getBusinessAge = () => {
    if (!loan.client?.dateFounded) return 'N/A';
    
    const founded = new Date(loan.client.dateFounded);
    const now = new Date();
    const years = Math.floor((now - founded) / (1000 * 60 * 60 * 24 * 365));
    
    if (years < 1) {
      const months = Math.floor((now - founded) / (1000 * 60 * 60 * 24 * 30));
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  // Calculate debt to revenue ratio if both values exist
  const getDebtToRevenueRatio = () => {
    const revenue = loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue;
    const debt = loan.lead?.avgMCADebits || loan.lead?.avgMcaDebits || loan.lead?.avgMCADebts;
    
    if (!revenue || !debt || revenue === 0) return 'N/A';
    
    const ratio = (debt / revenue) * 100;
    const color = ratio > 50 ? 'text-red-600' : ratio > 30 ? 'text-yellow-600' : 'text-green-600';
    
    return (
      <span className={`${color} font-semibold`}>
        {ratio.toFixed(1)}%
      </span>
    );
  };

  // Get full address
  const getFullAddress = () => {
    const parts = [];
    if (loan.client?.addressLine1) parts.push(loan.client.addressLine1);
    if (loan.client?.addressLine2) parts.push(loan.client.addressLine2);
    if (loan.client?.addressLine3) parts.push(loan.client.addressLine3);
    
    const cityStateZip = [];
    if (loan.client?.city) cityStateZip.push(loan.client.city);
    if (loan.client?.state) cityStateZip.push(loan.client.state);
    if (loan.client?.zipCode) cityStateZip.push(loan.client.zipCode);
    
    if (cityStateZip.length > 0) parts.push(cityStateZip.join(', '));
    
    return parts.length > 0 ? parts.join('\n') : 'N/A';
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Client Information</h3>
      
      {/* Business Information Section */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Business Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Business Name</p>
            <p className="font-semibold">{loan.client?.displayName || loan.client?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Client ID</p>
            <p className="font-semibold">{loan.clientId || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Industry Sector</p>
            <p className="font-semibold">{loan.client?.industrySector || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Industry Subsector</p>
            <p className="font-semibold">{loan.client?.industrySubsector || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date Founded</p>
            <p className="font-semibold">
              {loan.client?.dateFounded || 'N/A'}
              {loan.client?.dateFounded && (
                <span className="text-sm text-gray-500 ml-1">
                  ({getBusinessAge()})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Country</p>
            <p className="font-semibold">{loan.client?.country || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Contact Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-sm text-gray-600">Full Address</p>
            <p className="font-semibold whitespace-pre-line">{getFullAddress()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold">
              {loan.client?.email ? (
                <a href={`mailto:${loan.client.email}`} className="text-blue-600 hover:underline">
                  {loan.client.email}
                </a>
              ) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Primary Phone</p>
            <p className="font-semibold">
              {loan.client?.primaryNo ? (
                <a href={`tel:${loan.client.primaryNo}`} className="text-blue-600 hover:underline">
                  {loan.client.primaryNo}
                </a>
              ) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Lead/Financial Information Section */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Financial Profile</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">FICO Score</p>
            <p className={ficoData.color}>{ficoData.text}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Monthly Revenue</p>
            <p className="font-semibold">
              {formatCurrency(loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average MCA Debts</p>
            <p className="font-semibold">
              {formatCurrency(loan.lead?.avgMCADebits || loan.lead?.avgMcaDebts || loan.lead?.avgMCADebts)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Debt to Revenue Ratio</p>
            <p className="font-semibold">{getDebtToRevenueRatio()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">NAICS Code</p>
            <p className="font-semibold">{loan.lead?.naicsCode || loan.client?.naicsCode || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">SIC Code</p>
            <p className="font-semibold">{loan.lead?.sicCode || loan.client?.sicCode || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Banking Metrics if available */}
      {loan.lead && (loan.lead.avgNSFs !== undefined || loan.lead.avgNegativeDays !== undefined || 
                     loan.lead.avgDailyBalance !== undefined || loan.lead.avgDeposits !== undefined) && (
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Banking Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            {loan.lead.avgDailyBalance !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg Daily Balance</p>
                <p className="font-semibold">{formatCurrency(loan.lead.avgDailyBalance)}</p>
              </div>
            )}
            {loan.lead.avgDeposits !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg Deposits</p>
                <p className="font-semibold">{formatCurrency(loan.lead.avgDeposits)}</p>
              </div>
            )}
            {loan.lead.avgCredits !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg Credits</p>
                <p className="font-semibold">{formatCurrency(loan.lead.avgCredits)}</p>
              </div>
            )}
            {loan.lead.avgNumDeposits !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg # of Deposits</p>
                <p className="font-semibold">{loan.lead.avgNumDeposits}</p>
              </div>
            )}
            {loan.lead.avgNumCredits !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg # of Credits</p>
                <p className="font-semibold">{loan.lead.avgNumCredits}</p>
              </div>
            )}
            {loan.lead.avgNSFs !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg NSFs</p>
                <p className={`font-semibold ${loan.lead.avgNSFs > 2 ? 'text-red-600' : loan.lead.avgNSFs > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {loan.lead.avgNSFs}
                </p>
              </div>
            )}
            {loan.lead.avgNegativeDays !== undefined && (
              <div>
                <p className="text-sm text-gray-600">Avg Negative Days</p>
                <p className={`font-semibold ${loan.lead.avgNegativeDays > 5 ? 'text-red-600' : loan.lead.avgNegativeDays > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {loan.lead.avgNegativeDays}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Lead Data if available */}
      {loan.lead && (loan.lead.leadSource || loan.lead.leadDate || loan.lead.contactName || loan.lead.position) && (
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Lead Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {loan.lead.leadSource && (
              <div>
                <p className="text-sm text-gray-600">Lead Source</p>
                <p className="font-semibold">{loan.lead.leadSource}</p>
              </div>
            )}
            {loan.lead.leadDate && (
              <div>
                <p className="text-sm text-gray-600">Lead Date</p>
                <p className="font-semibold">{loan.lead.leadDate}</p>
              </div>
            )}
            {loan.lead.contactName && (
              <div>
                <p className="text-sm text-gray-600">Contact Name</p>
                <p className="font-semibold">{loan.lead.contactName}</p>
              </div>
            )}
            {loan.lead.position && (
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-semibold">{loan.lead.position}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Assignment if available */}
      {loan.lead && (loan.lead.underwriter || loan.lead.salesperson || loan.lead.podleader) && (
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Team Assignment</h4>
          <div className="grid grid-cols-2 gap-4">
            {loan.lead.underwriter && (
              <div>
                <p className="text-sm text-gray-600">Underwriter</p>
                <p className="font-semibold">{loan.lead.underwriter}</p>
              </div>
            )}
            {loan.lead.salesperson && (
              <div>
                <p className="text-sm text-gray-600">Salesperson</p>
                <p className="font-semibold">{loan.lead.salesperson}</p>
              </div>
            )}
            {loan.lead.podleader && (
              <div>
                <p className="text-sm text-gray-600">Pod Leader</p>
                <p className="font-semibold">{loan.lead.podleader}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Source Information */}
      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold text-sm text-gray-700 mb-3">Data Source</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Loan Number</p>
            <p className="font-semibold">{loan.loanNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">External ID</p>
            <p className="font-semibold">{loan.externalId || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Excel Row Number</p>
            <p className="font-semibold">Row {loan.rowNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data Completeness</p>
            <p className="font-semibold">
              {(() => {
                let fieldsPresent = 0;
                const totalFields = 10; // Count of important fields
                
                if (loan.client?.displayName || loan.client?.name) fieldsPresent++;
                if (loan.client?.industrySector) fieldsPresent++;
                if (loan.client?.city) fieldsPresent++;
                if (loan.client?.state) fieldsPresent++;
                if (loan.client?.email) fieldsPresent++;
                if (loan.client?.primaryNo) fieldsPresent++;
                if (loan.lead?.fico) fieldsPresent++;
                if (loan.lead?.avgMonthlyRevenue || loan.lead?.avgRevenue) fieldsPresent++;
                if (loan.lead?.avgMCADebits || loan.lead?.avgMcaDebits || loan.lead?.avgMCADebts) fieldsPresent++;
                if (loan.client?.dateFounded) fieldsPresent++;
                
                const percentage = Math.round((fieldsPresent / totalFields) * 100);
                const color = percentage >= 80 ? 'text-green-600' : 
                             percentage >= 50 ? 'text-yellow-600' : 'text-red-600';
                
                return <span className={color}>{percentage}% Complete</span>;
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};