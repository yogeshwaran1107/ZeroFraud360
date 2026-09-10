import React, { useState } from 'react';
import type { FraudAlert } from '../types';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert, Eye, Search } from 'lucide-react';

interface FraudAlertsViewProps {
  alerts: FraudAlert[];
  isLoading: boolean;
  onSelectAlert: (alert: FraudAlert) => void;
}

export const FraudAlertsView: React.FC<FraudAlertsViewProps> = ({
  alerts,
  isLoading,
  onSelectAlert,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'holds' | 'confirmed' | 'cleared'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'holds' && a.status !== 'HOLD_ACTIVE') return false;
    if (filterStatus === 'confirmed' && a.status !== 'CONFIRMED_FRAUD') return false;
    if (filterStatus === 'cleared' && a.status !== 'RESOLVED') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        a.alertId.toLowerCase().includes(term) ||
        a.sourceAccountId.toLowerCase().includes(term) ||
        a.destinationAccountId.toLowerCase().includes(term) ||
        a.patternType.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const maskAccount = (acc?: string) => {
    if (!acc) return '10001';
    if (acc.length <= 5) return acc;
    return `..${acc.slice(-5)}`;
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const activeHoldCount = alerts.filter((a) => a.status === 'HOLD_ACTIVE').length;
  const confirmedCount = alerts.filter((a) => a.status === 'CONFIRMED_FRAUD').length;
  const clearedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-5">
      {/* Top Filter Tabs & Search Header - White Bank Theme */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilterStatus('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => {
              setFilterStatus('holds');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'holds'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Active Holds ({activeHoldCount})
          </button>
          <button
            onClick={() => {
              setFilterStatus('confirmed');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'confirmed'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Confirmed Fraud ({confirmedCount})
          </button>
          <button
            onClick={() => {
              setFilterStatus('cleared');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'cleared'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Cleared False Positives ({clearedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search account, alert ID..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3.5 px-6">Alert / Time</th>
                <th className="py-3.5 px-6">Origin Account</th>
                <th className="py-3.5 px-6">Held Account</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6 text-center">Score</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Investigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading live fraud alerts from ZeroFraud360 (:8081)...
                  </td>
                </tr>
              ) : paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Fraud Alerts in Selected Filter
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      Incoming rapid pass-through sequences and high-value spikes will automatically appear here in real time.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedAlerts.map((a) => {
                  const score = a.decision === 'STOP' ? 95 : 72;
                  const isHoldActive = a.status === 'HOLD_ACTIVE';
                  const isConfirmed = a.status === 'CONFIRMED_FRAUD';
                  const isResolved = a.status === 'RESOLVED';

                  return (
                    <tr
                      key={a.alertId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 px-6 font-mono text-slate-800">
                        <div className="font-bold text-slate-900">{a.alertId}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(a.createdAt)} {formatTime(a.createdAt)}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-800 font-medium">
                        {maskAccount(a.sourceAccountId)}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-rose-700">
                        {maskAccount(a.destinationAccountId)}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        ₹{Number(a.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200">
                          {score}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {isHoldActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            Active Hold
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200">
                            <ShieldAlert className="h-3 w-3 text-rose-600" />
                            Confirmed Fraud
                          </span>
                        ) : isResolved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Cleared
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {a.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => onSelectAlert(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer border border-blue-200/60 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review &amp; Clear</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {filteredAlerts.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg font-bold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div>
              Showing {Math.min(filteredAlerts.length, (currentPage - 1) * itemsPerPage + 1)}-
              {Math.min(filteredAlerts.length, currentPage * itemsPerPage)} of {filteredAlerts.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
