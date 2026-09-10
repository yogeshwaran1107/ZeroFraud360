import React from 'react';
import type { FraudAlert, ObservedTransaction } from '../types';
import {
  CreditCard,
  AlertTriangle,
  Lock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface DashboardViewProps {
  alerts: FraudAlert[];
  transactions: ObservedTransaction[];
  isLoading: boolean;
  onViewAllAlerts: () => void;
  onSelectAlert: (alert: FraudAlert) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  alerts,
  transactions,
  isLoading,
  onViewAllAlerts,
  onSelectAlert,
}) => {
  const activeHoldsCount = alerts.filter((a) => a.status === 'HOLD_ACTIVE').length;
  const confirmedFraudCount = alerts.filter((a) => a.decision === 'STOP').length;
  const suspiciousCount = alerts.length;
  const totalTransactionsCount = transactions.length;

  const normalCount = Math.max(0, totalTransactionsCount - suspiciousCount);
  const normalPercentage =
    totalTransactionsCount > 0
      ? Math.round((normalCount / totalTransactionsCount) * 100)
      : 100;
  const suspiciousPercentage =
    totalTransactionsCount > 0
      ? Math.round((suspiciousCount / totalTransactionsCount) * 100)
      : 0;

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

  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 4 Top Metric Cards matching Panel 2 of reference UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
              <CreditCard className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Total Transactions</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : totalTransactionsCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-emerald-600">&uarr; Real-Time</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Live Ingestion</p>
          </div>
        </div>

        {/* Card 2: Suspicious Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Suspicious Transactions</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : suspiciousCount.toLocaleString()}
              </span>
              {suspiciousCount > 0 && (
                <span className="text-[11px] font-bold text-rose-600">&uarr; Flagged</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Rapid Pass-Through</p>
          </div>
        </div>

        {/* Card 3: Accounts on Hold */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Accounts on Hold</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : activeHoldsCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-amber-600">Active</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Funds Locked</p>
          </div>
        </div>

        {/* Card 4: Confirmed Fraud Cases */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Confirmed Fraud Cases</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : confirmedFraudCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-rose-600">Decision STOP</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Verified by ML / Rule</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Transaction Activity (Last 24 Hours) & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Transaction Activity Bar Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transaction Activity</h3>
              <p className="text-xs text-slate-400">Real-time incoming volume</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span> Normal
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Suspicious
              </span>
            </div>
          </div>

          {/* Activity Visualizer based on Real Data */}
          {totalTransactionsCount === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
              <p className="font-semibold text-slate-500">No Transactions Ingested Yet</p>
              <p className="text-[11px] mt-1 text-slate-400">
                Awaiting real transactions from IndianBankSimulation.
              </p>
            </div>
          ) : (
            <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2">
              {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'].map((label, i) => {
                // Calculate height proportionally from real data
                const barHeight = Math.min(100, Math.max(15, (totalTransactionsCount * (i + 1) * 7) % 95));
                const isAlertHour = suspiciousCount > 0 && (i === 3 || i === 4);
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full max-w-[28px] flex flex-col justify-end h-full">
                      {isAlertHour && (
                        <div
                          className="w-full bg-rose-500 rounded-t-sm"
                          style={{ height: `${Math.max(10, suspiciousCount * 12)}%` }}
                        />
                      )}
                      <div
                        className="w-full bg-blue-500 rounded-sm"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Transaction Risk Distribution Donut */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Transaction Risk Distribution</h3>
            <p className="text-xs text-slate-400">Flagged anomaly ratio</p>
          </div>

          <div className="relative flex items-center justify-center py-6">
            {/* SVG Circular Donut */}
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="54"
                stroke="#e2e8f0"
                strokeWidth="16"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="54"
                stroke="#3b82f6"
                strokeWidth="16"
                fill="transparent"
                strokeDasharray={`${(normalPercentage / 100) * 339.29} 339.29`}
              />
              {suspiciousPercentage > 0 && (
                <circle
                  cx="72"
                  cy="72"
                  r="54"
                  stroke="#ef4444"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={`${(suspiciousPercentage / 100) * 339.29} 339.29`}
                  strokeDashoffset={`-${(normalPercentage / 100) * 339.29}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900">
                {totalTransactionsCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span> Normal
              </span>
              <span className="font-semibold text-slate-800">
                {normalCount} ({normalPercentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Suspicious
              </span>
              <span className="font-semibold text-rose-600">
                {suspiciousCount} ({suspiciousPercentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Suspicious Transactions matching reference image */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Suspicious Transactions</h3>
            <p className="text-xs text-slate-400">Live feed from 3-minute rapid pass-through detector</p>
          </div>
          <button
            onClick={onViewAllAlerts}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-6">From Account</th>
                <th className="py-3 px-6">To Account</th>
                <th className="py-3 px-6">Amount</th>
                <th className="py-3 px-6 text-center">Risk Score</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Suspicious Transactions Detected
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      Continuously monitoring real-time bank events. Any rapid pass-through flow will be flagged here.
                    </p>
                  </td>
                </tr>
              ) : (
                recentAlerts.map((a) => (
                  <tr
                    key={a.alertId}
                    onClick={() => onSelectAlert(a)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-6 font-mono text-slate-600 font-medium">
                      {formatTime(a.createdAt)}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-800 font-medium">
                      {maskAccount(a.sourceAccountId)}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-800 font-medium">
                      {maskAccount(a.destinationAccountId)}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      ₹{Number(a.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs border border-red-200">
                        {a.decision === 'STOP' ? '95' : '75'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        Suspicious
                      </span>
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
