import React, { useState } from 'react';
import type { FraudAlert } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  Unlock,
  ArrowRight,
  Clock,
  Radio,
  Zap,
} from 'lucide-react';


interface AlertsTableProps {
  alerts: FraudAlert[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAlert: (alert: FraudAlert) => void;
  onReleaseHold: (alert: FraudAlert) => void;
  onOpenSimulator: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  isLoading,
  onRefresh,
  onSelectAlert,
  onReleaseHold,
  onOpenSimulator,
  autoRefresh,
  setAutoRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HOLD_ACTIVE' | 'RESOLVED'>('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    // Status filter
    if (statusFilter !== 'ALL' && alert.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        alert.alertId.toLowerCase().includes(term) ||
        alert.sourceAccountId.toLowerCase().includes(term) ||
        alert.intermediateAccountId.toLowerCase().includes(term) ||
        alert.destinationAccountId.toLowerCase().includes(term) ||
        alert.firstTransactionId.toLowerCase().includes(term) ||
        alert.secondTransactionId.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HOLD_ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-950/80 text-rose-400 border border-rose-800 shadow-sm shadow-rose-950">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            HOLD ACTIVE
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <ShieldCheck className="h-3 w-3" />
            RESOLVED
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            DISMISSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getDecisionBadge = (decision?: string) => {
    if (decision === 'STOP') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white shadow-xs">
          STOP
        </span>
      );
    }
    if (decision === 'ALLOW') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white">
          ALLOW
        </span>
      );
    }
    return <span className="text-xs text-slate-500 font-mono">PENDING</span>;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 p-4 bg-slate-950/40">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search alert, account, txn..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setStatusFilter('HOLD_ACTIVE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'HOLD_ACTIVE'
                  ? 'bg-rose-900/60 text-rose-300 font-bold border border-rose-700/50'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Active ({alerts.filter((a) => a.status === 'HOLD_ACTIVE').length})
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'RESOLVED'
                  ? 'bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700/50'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Resolved ({alerts.filter((a) => a.status === 'RESOLVED').length})
            </button>
          </div>
        </div>

        {/* Right Actions: Auto refresh & Refresh button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1">
              <Radio className={`h-3 w-3 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              Auto-Poll (5s)
            </span>
          </label>

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

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Alert ID</th>
              <th className="py-3 px-4">Pattern</th>
              <th className="py-3 px-4">Money-Flow Chain (A &rarr; B &rarr; C)</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Time Delta</th>
              <th className="py-3 px-4">Decision</th>
              <th className="py-3 px-4">Hold Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="mx-auto max-w-sm flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-3">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">
                      {alerts.length === 0 ? 'No Fraud Alerts Detected Yet' : 'No Matching Alerts Found'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {alerts.length === 0
                        ? 'The 3-minute rapid pass-through detector is active and scanning all bank transactions.'
                        : 'Try adjusting your search criteria or status filter.'}
                    </p>
                    {alerts.length === 0 && (
                      <button
                        onClick={onOpenSimulator}
                        className="mt-4 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-950/40 hover:from-amber-500 hover:to-rose-500 transition-all"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Simulate Rapid Pass-Through Now
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => {
                const isHoldActive = alert.status === 'HOLD_ACTIVE';
                return (
                  <tr
                    key={alert.id || alert.alertId}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Alert ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[130px]">{alert.alertId}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        {new Date(alert.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Pattern */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">
                        {alert.patternType}
                      </span>
                    </td>

                    {/* Flow Chain */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {alert.sourceAccountId}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
                          {alert.intermediateAccountId}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="text-rose-300 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/60 font-bold">
                          {alert.destinationAccountId}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      ₹{Number(alert.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Time Delta */}
                    <td className="py-3.5 px-4 font-mono text-amber-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        {alert.timeDifferenceSeconds}s
                      </span>
                    </td>

                    {/* Decision */}
                    <td className="py-3.5 px-4">{getDecisionBadge(alert.decision)}</td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(alert.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectAlert(alert)}
                          title="View Details"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isHoldActive && (
                          <button
                            onClick={() => onReleaseHold(alert)}
                            className="flex items-center gap-1 rounded-lg bg-amber-600/90 hover:bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm shadow-amber-900/30 transition-colors"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span>Release</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
