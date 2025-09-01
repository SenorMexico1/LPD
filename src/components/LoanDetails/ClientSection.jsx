import React from 'react';

export const ClientSection = ({ loan }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Client Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Business Name</p>
          <p className="font-semibold">{loan.client.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Industry</p>
          <p className="font-semibold">{loan.client?.industrySector} - {loan.client?.industrySubsector}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Location</p>
          <p className="font-semibold">{loan.client.city}, {loan.client.state} {loan.client.zipCode}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Founded</p>
          <p className="font-semibold">{loan.client.dateFounded || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">FICO Score</p>
          <p className="font-semibold">{loan.lead.fico}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Avg Monthly Revenue</p>
          <p className="font-semibold">${loan.lead.avgMonthlyRevenue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Avg MCA Debts</p>
          <p className="font-semibold">${loan.lead.avgMCADebts.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Excel Row</p>
          <p className="font-semibold">Row {loan.rowNumber}</p>
        </div>
      </div>
    </div>
  );
};