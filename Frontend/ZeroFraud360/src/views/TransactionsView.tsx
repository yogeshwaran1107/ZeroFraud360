import React, { useState } from 'react';
import type { ObservedTransaction } from '../types';
import { Search, CheckCircle2 } from 'lucide-react';



interface TransactionsViewProps {
  transactions: ObservedTransaction[];
  isLoading: boolean;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.transactionId.toLowerCase().includes(term) ||
      tx.senderAccountId.toLowerCase().includes(term) ||
      tx.receiverAccountId.toLowerCase().includes(term) ||
      tx.senderBankId.toLowerCase().includes(term) ||
      tx.receiverBankId.toLowerCase().includes(term)
    );
  });

  const maskAccount = (acc?: string) => {
    if (!acc) return 'XXXX0000';
    if (acc.length <= 4) return `XXXX${acc}`;
    return `XXXX${acc.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transaction ID, account, bank..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Ingested: <span className="text-slate-900 font-bold">{transactions.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3.5 px-6">Transaction ID</th>
                <th className="py-3.5 px-6">From Account</th>
                <th className="py-3.5 px-6">To Account</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Payment Rail</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Occurred At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading observed transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Observed Transactions Yet
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      When transactions are executed in IndianBankSimulation, payment events are
                      ingested in real time and displayed here.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.transactionId || tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {tx.transactionId}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-800">
                      <div>{maskAccount(tx.senderAccountId)}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{tx.senderBankId}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-800">
                      <div>{maskAccount(tx.receiverAccountId)}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{tx.receiverBankId}</div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] text-slate-600 font-medium">
                        {tx.paymentRail}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      {formatDate(tx.occurredAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
