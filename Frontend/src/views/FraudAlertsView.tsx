import React, { useState } from 'react';
import type { FraudAlert } from '../types';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter alerts by risk score
  const filteredAlerts = alerts.filter((a) => {
    const score = a.decision === 'STOP' ? 95 : 70;
    if (filterRisk === 'high') return score >= 80;
    if (filterRisk === 'medium') return score >= 60 && score < 80;
    if (filterRisk === 'low') return score < 60;
    return true;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const maskAccount = (acc?: string) => {
    if (!acc) return 'XXXX0000';
    if (acc.length <= 4) return `XXXX${acc}`;
    return `XXXX${acc.slice(-4)}`;
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const highRiskCount = alerts.filter((a) => (a.decision === 'STOP' ? 95 : 70) >= 80).length;
  const mediumRiskCount = alerts.filter((a) => {
    const s = a.decision === 'STOP' ? 95 : 70;
    return s >= 60 && s < 80;
  }).length;
  const lowRiskCount = alerts.filter((a) => (a.decision === 'STOP' ? 95 : 70) < 60).length;

  return (
    <div className="space-y-5">
      {/* Top Filter Tabs matching Panel 3 of reference UI */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setFilterRisk('all');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterRisk === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => {
            setFilterRisk('high');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterRisk === 'high'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          High Risk ({highRiskCount})
        </button>
        <button
          onClick={() => {
            setFilterRisk('medium');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterRisk === 'medium'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Medium Risk ({mediumRiskCount})
        </button>
        <button
          onClick={() => {
            setFilterRisk('low');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterRisk === 'low'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Low Risk ({lowRiskCount})
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3.5 px-6">Time</th>
                <th className="py-3.5 px-6">From Account</th>
                <th className="py-3.5 px-6">To Account</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6 text-center">Risk Score</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading live fraud alerts from ZeroFraud360...
                  </td>
                </tr>
              ) : paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Fraud Alerts Found
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      When transactions match rapid pass-through (A &rarr; B &rarr; C within &le; 180s),
                      they will appear here in real time.
                    </p>

                  </td>
                </tr>
              ) : (
                paginatedAlerts.map((a) => {
                  const score = a.decision === 'STOP' ? 95 : 72;
                  return (
                    <tr
                      key={a.alertId}
                      onClick={() => onSelectAlert(a)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6 font-mono text-slate-600 font-medium">
                        {formatTime(a.createdAt)}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-800 font-medium">
                        {maskAccount(a.sourceAccountId)}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-800 font-medium">
                        {maskAccount(a.destinationAccountId)}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        ₹{Number(a.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs border border-red-200">
                          {score}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold border border-red-200">
                          <AlertTriangle className="h-3 w-3" />
                          Suspicious
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row matching reference design */}
        {filteredAlerts.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
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
