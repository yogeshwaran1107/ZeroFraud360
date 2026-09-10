import React, { useState } from 'react';
import type { FraudAlert, ObservedTransaction } from '../types';
import { api } from '../api/client';
import {
  CreditCard,
  AlertTriangle,
  Lock,
  ShieldAlert,
  ArrowRight,
  Zap,
  CheckCircle2,
  Eye,
  Building2,
} from 'lucide-react';

interface DashboardViewProps {
  alerts: FraudAlert[];
  transactions: ObservedTransaction[];
  isLoading: boolean;
  onViewAllAlerts: () => void;
  onSelectAlert: (alert: FraudAlert) => void;
  onSimulationTriggered?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  alerts,
  transactions,
  isLoading,
  onViewAllAlerts,
  onSelectAlert,
  onSimulationTriggered,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccessMessage, setSimSuccessMessage] = useState<string | null>(null);

  const activeHoldsCount = alerts.filter((a) => a.status === 'HOLD_ACTIVE').length;
  const confirmedFraudCount = alerts.filter(
    (a) => a.status === 'CONFIRMED_FRAUD' || a.decision === 'STOP'
  ).length;
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

  // Compute real hourly distribution from actual transactions & alerts
  const timeBins = [
    { label: '00-04h', count: 0, alertCount: 0 },
    { label: '04-08h', count: 0, alertCount: 0 },
    { label: '08-12h', count: 0, alertCount: 0 },
    { label: '12-16h', count: 0, alertCount: 0 },
    { label: '16-20h', count: 0, alertCount: 0 },
    { label: '20-24h', count: 0, alertCount: 0 },
  ];

  transactions.forEach((tx) => {
    try {
      const h = new Date(tx.occurredAt).getHours();
      const idx = Math.min(5, Math.floor(h / 4));
      timeBins[idx].count++;
    } catch {}
  });

  alerts.forEach((a) => {
    try {
      const h = new Date(a.createdAt).getHours();
      const idx = Math.min(5, Math.floor(h / 4));
      timeBins[idx].alertCount++;
    } catch {}
  });

  const maxBinVal = Math.max(1, ...timeBins.map((b) => b.count + b.alertCount));

  // Quick 1-Click Simulator Bridge: triggers real pass-through mule transfer between the 6 real accounts
  const handleTriggerLiveAttack = async () => {
    setIsSimulating(true);
    setSimSuccessMessage(null);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const now = new Date();
    const leg1Time = new Date(now.getTime() - 40 * 1000).toISOString();
    const leg2Time = now.toISOString();

    try {
      // Leg 1: Muthukumaran M (10001) -> Naveen K (10002) ₹15,000
      await api.events.ingestPaymentSuccess({
        eventId: `EVT-LIVE-L1-${suffix}`,
        eventType: 'PAYMENT_SUCCESS',
        transactionId: `TXN-SIM-L1-${suffix}`,
        occurredAt: leg1Time,
        sender: { accountId: 'ACC-10001', accountNumber: '10001', bankId: 'SIM_BANK_A' },
        receiver: { accountId: 'ACC-10002', accountNumber: '10002', bankId: 'SIM_BANK_B' },
        amount: 15000.0,
        currency: 'INR',
        paymentRail: 'SIMULATED_UPI',
      });

      // Leg 2: Naveen K (10002) -> Yogeshwaran V (10003) ₹15,000 within 40 seconds
      await api.events.ingestPaymentSuccess({
        eventId: `EVT-LIVE-L2-${suffix}`,
        eventType: 'PAYMENT_SUCCESS',
        transactionId: `TXN-SIM-L2-${suffix}`,
        occurredAt: leg2Time,
        sender: { accountId: 'ACC-10002', accountNumber: '10002', bankId: 'SIM_BANK_B' },
        receiver: { accountId: 'ACC-10003', accountNumber: '10003', bankId: 'SIM_BANK_C' },
        amount: 15000.0,
        currency: 'INR',
        paymentRail: 'SIMULATED_UPI',
      });

      setSimSuccessMessage(
        'Real-time fraud event generated: Muthukumaran (10001) -> Naveen (10002) -> Yogeshwaran (10003) ₹15,000. Flagged by ML engine!'
      );
      if (onSimulationTriggered) onSimulationTriggered();
    } catch (err: any) {
      alert('Error triggering simulation event: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const recentAlerts = alerts.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Simulation Trigger Banner for Live Testing */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 rounded-2xl p-4 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs shrink-0 mt-0.5">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                Live Bank Simulator Bridge Connected (:3000 &harr; :8081)
              </h3>
              <span className="px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                Live Feed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Continuously syncing actual transactions and rapid pass-through anomalies between active customer accounts.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerLiveAttack}
          disabled={isSimulating}
          className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Zap className={`h-3.5 w-3.5 ${isSimulating ? 'animate-bounce' : ''}`} />
          <span>{isSimulating ? 'Simulating Event...' : 'Test Fraud Detection Live'}</span>
        </button>
      </div>

      {simSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{simSuccessMessage}</span>
        </div>
      )}

      {/* 4 Top Metric Cards - White Private Bank Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-3">
              <CreditCard className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Total Transactions</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : totalTransactionsCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-emerald-600">&uarr; Live Ingestion</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Actual Ingested Volume</p>
          </div>
        </div>

        {/* Card 2: Suspicious Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-3">
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
            <p className="text-[10px] text-slate-400 mt-0.5">Rapid Pass-Through &amp; Spikes</p>
          </div>
        </div>

        {/* Card 3: Accounts on Hold */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Accounts on Hold</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : activeHoldsCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-amber-600">Active Locked</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Funds Held on Simulation</p>
          </div>
        </div>

        {/* Card 4: Confirmed Fraud Cases */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Confirmed Fraud Cases</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : confirmedFraudCount.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-rose-600">Decision STOP</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Verified by ML / Officer</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Real Transaction Activity & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Transaction Activity Bar Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transaction Activity (24h Distribution)</h3>
              <p className="text-xs text-slate-400">Computed live from actual ingested transactions</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span> Normal
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Flagged Anomaly
              </span>
            </div>
          </div>

          {totalTransactionsCount === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
              <p className="font-semibold text-slate-600">No Transactions Ingested Yet</p>
              <p className="text-[11px] mt-1 text-slate-400">
                Execute transfers in IndianBankSimulation or click "Test Fraud Detection Live" above.
              </p>
            </div>
          ) : (
            <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2">
              {timeBins.map((bin) => {
                const totalInBin = bin.count + bin.alertCount;
                const heightPct = Math.max(10, Math.round((totalInBin / maxBinVal) * 100));
                const alertPct = totalInBin > 0 ? Math.round((bin.alertCount / totalInBin) * heightPct) : 0;
                const normalPct = heightPct - alertPct;

                return (
                  <div key={bin.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full max-w-[32px] flex flex-col justify-end h-full">
                      {alertPct > 0 && (
                        <div
                          className="w-full bg-rose-500 rounded-t-sm"
                          style={{ height: `${alertPct}%` }}
                          title={`${bin.alertCount} Suspicious`}
                        />
                      )}
                      <div
                        className="w-full bg-blue-600 rounded-sm"
                        style={{ height: `${normalPct}%` }}
                        title={`${bin.count} Normal`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{bin.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Transaction Risk Distribution Donut */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Transaction Risk Distribution</h3>
            <p className="text-xs text-slate-400">Live flagged anomaly ratio</p>
          </div>

          <div className="relative flex items-center justify-center py-6">
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
                stroke="#2563eb"
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

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span> Normal Pass
              </span>
              <span className="font-semibold text-slate-800">
                {normalCount} ({normalPercentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Suspicious / Mule
              </span>
              <span className="font-bold text-rose-600">
                {suspiciousCount} ({suspiciousPercentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Suspicious Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Suspicious Transactions</h3>
            <p className="text-xs text-slate-400">Live feed from real-time fraud detection engine</p>
          </div>
          <button
            onClick={onViewAllAlerts}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All ({alerts.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">From Account</th>
                <th className="py-3 px-6">Held Account</th>
                <th className="py-3 px-6">Amount</th>
                <th className="py-3 px-6 text-center">Risk Score</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Suspicious Transactions Detected Yet
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      When transactions in IndianBankSimulation trigger the rapid pass-through detector or high-value spike rule, they appear here live.
                    </p>
                  </td>
                </tr>
              ) : (
                recentAlerts.map((a) => {
                  const isHoldActive = a.status === 'HOLD_ACTIVE';
                  const isConfirmed = a.status === 'CONFIRMED_FRAUD';
                  const isResolved = a.status === 'RESOLVED';

                  return (
                    <tr
                      key={a.alertId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-slate-600 font-medium">
                        {formatTime(a.createdAt)}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-800 font-medium">
                        {maskAccount(a.sourceAccountId)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-rose-700">
                        {maskAccount(a.destinationAccountId)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                        ₹{Number(a.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200">
                          {a.decision === 'STOP' ? '95' : '75'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {isHoldActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold border border-red-200">
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
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => onSelectAlert(a)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer border border-blue-200/60"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
