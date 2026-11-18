'use client';

import React, { useState, useMemo } from 'react';
import QRCode from 'qrcode.react';
import { DocumentDuplicateIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import type { Balance } from '@/lib/supabase';

interface SettlementQRProps {
  balances: Balance[];
  roomName: string;
}

interface Settlement {
  from: Balance;
  to: Balance;
  amount: number;
}

export const SettlementQR: React.FC<SettlementQRProps> = ({
  balances,
  roomName,
}) => {
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  // Calculate settlements (simplified: positive balance = owed money, negative = owes money)
  const settlements = useMemo<Settlement[]>(() => {
    const result: Settlement[] = [];
    const sorted = [...balances].sort((a, b) => b.balance - a.balance);

    let creditors = sorted.filter((b) => b.balance > 0);
    let debtors = sorted.filter((b) => b.balance < 0);

    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];
      const amount = Math.min(
        creditor.balance,
        Math.abs(debtor.balance)
      );

      result.push({
        from: debtor,
        to: creditor,
        amount,
      });

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance === 0) creditors.shift();
      if (debtor.balance === 0) debtors.shift();
    }

    return result;
  }, [balances]);

  const generateUPILink = (settlement: Settlement): string => {
    const creditorUPI = settlement.to.upi_id || 'missing@upi';
    const creditorName = settlement.to.display_name || 'SettleSync';
    const amount = settlement.amount.toFixed(2);

    // UPI intent URI format
    return `upi://pay?pa=${encodeURIComponent(creditorUPI)}&pn=${encodeURIComponent(creditorName)}&am=${amount}&cu=INR`;
  };

  const handleCopyUPI = () => {
    if (selectedSettlement) {
      const upiLink = generateUPILink(selectedSettlement);
      navigator.clipboard.writeText(upiLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDirectPayment = (settlement: Settlement) => {
    const upiLink = generateUPILink(settlement);
    // Open UPI app directly
    window.location.href = upiLink;
  };

  if (settlements.length === 0) {
    return (
      <div className="neo-card-lg bg-neo-lime border-3 sm:border-4 border-neo-black p-6 sm:p-8 text-center">
        <p className="text-neo-lg font-neo-black text-neo-black">All Settled Up! ✨</p>
        <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black mt-2 opacity-70">Everyone has paid their share.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Settlement List */}
      <div className="space-y-2 sm:space-y-3">
        {settlements.map((settlement, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedSettlement(settlement)}
            className={`w-full text-left p-3 sm:p-4 neo-card border-3 sm:border-4 border-neo-black transition-all ${
              selectedSettlement === settlement
                ? 'bg-neo-magenta text-neo-white border-neo-black'
                : 'bg-neo-white text-neo-black hover:shadow-neo-lg'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-xs sm:text-neo-sm font-neo-bold ${selectedSettlement === settlement ? 'text-neo-white' : 'text-neo-black'}`}>
                  {settlement.from.display_name}
                </p>
                <p className={`text-xs font-neo-bold opacity-70 ${selectedSettlement === settlement ? 'text-neo-white' : 'text-neo-black'}`}>
                  pays {settlement.to.display_name}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs sm:text-neo-sm font-neo-black ${selectedSettlement === settlement ? 'text-neo-white' : 'text-neo-black'}`}>
                  ₹{settlement.amount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* QR Code Display */}
      {selectedSettlement && (
        <div className="neo-card-lg bg-neo-cyan border-3 sm:border-4 border-neo-black p-4 sm:p-6 text-center">
          <h3 className="text-sm sm:text-neo-md font-neo-black text-neo-black mb-4 uppercase">Payment QR Code</h3>

          <div className="bg-neo-white p-3 sm:p-4 rounded-neo inline-block mb-4 border-2 sm:border-3 border-neo-black">
            <QRCode
              value={generateUPILink(selectedSettlement)}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <p className="text-xs sm:text-neo-sm font-neo-bold text-neo-black mb-4 opacity-80">
            {selectedSettlement.from.display_name} → ₹
            {selectedSettlement.amount.toLocaleString('en-IN')} to{' '}
            {selectedSettlement.to.display_name}
          </p>

          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => handleDirectPayment(selectedSettlement)}
              className="w-full neo-button-primary border-2 sm:border-3 text-xs sm:text-neo-sm px-3 sm:px-6 py-2 sm:py-3 font-neo-black uppercase"
            >
              🔗 Open UPI App
            </button>

            <button
              onClick={handleCopyUPI}
              className="w-full neo-button-secondary border-2 sm:border-3 text-xs sm:text-neo-sm px-3 sm:px-6 py-2 sm:py-3 font-neo-black uppercase flex items-center justify-center gap-2"
            >
              <DocumentDuplicateIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            <a
              href={`data:image/png;base64,${generateUPILink(selectedSettlement)}`}
              download={`settlement-${selectedSettlement.to.display_name}.png`}
              className="w-full neo-button-warning border-2 sm:border-3 text-xs sm:text-neo-sm px-3 sm:px-6 py-2 sm:py-3 font-neo-black uppercase flex items-center justify-center gap-2 block"
            >
              <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Download QR
            </a>
          </div>

          {!selectedSettlement.to.upi_id && (
            <div className="bg-neo-magenta border-2 sm:border-3 border-neo-black text-neo-white p-2 sm:p-3 rounded-neo mt-4 text-xs sm:text-neo-xs font-neo-bold">
              ⚠️ {selectedSettlement.to.display_name} hasn't set up their UPI ID
            </div>
          )}
        </div>
      )}
    </div>
  );
};
