import React, { useState } from 'react';
import type { ObservedTransaction } from '../types';
import { Search, RefreshCw, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';


interface TransactionsTableProps {
  transactions: ObservedTransaction[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  isLoading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.transactionId.toLowerCase().includes(term) ||
      tx.eventId.toLowerCase().includes(term) ||
      tx.senderAccountId.toLowerCase().includes(term) ||
      tx.receiverAccountId.toLowerCase().includes(term) ||
      tx.senderBankId.toLowerCase().includes(term) ||
      tx.receiverBankId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header / Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 p-4 bg-slate-950/40">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            Observed Banking Transactions Ledger
          </h3>
          <p className="text-xs text-slate-400">
            Real-time feed of durable payment events monitored by ZeroFraud360
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search txn ID, account, bank..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Transaction Reference</th>
              <th className="py-3 px-4">Event ID</th>
              <th className="py-3 px-4">Sender &rarr; Receiver</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Payment Rail</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Occurred At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  {transactions.length === 0
                    ? 'No observed transactions in zerofraud360_db yet.'
                    : 'No transactions match search criteria.'}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id || tx.transactionId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {tx.transactionId}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {tx.eventId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-semibold">{tx.senderAccountId}</span>
                        <span className="text-[10px] text-slate-500">{tx.senderBankId}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-500 mx-1 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-semibold">{tx.receiverAccountId}</span>
                        <span className="text-[10px] text-slate-500">{tx.receiverBankId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                      {tx.paymentRail}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(tx.occurredAt).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
