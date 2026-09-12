import React from 'react';
import type { FraudAlert, ObservedTransaction } from '../types';
import { ShieldAlert, ShieldCheck, IndianRupee, Layers, Clock } from 'lucide-react';


interface StatsCardsProps {
  alerts: FraudAlert[];
  transactions: ObservedTransaction[];
  isLoading: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ alerts, transactions, isLoading }) => {
  const activeHolds = alerts.filter((a) => a.status === 'HOLD_ACTIVE');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');

  const totalIntercepted = alerts.reduce((acc, curr) => {
    // If status is HOLD_ACTIVE or RESOLVED, sum the amount
    if (curr.status === 'HOLD_ACTIVE' || curr.status === 'RESOLVED') {
      const amount = Number(curr.secondAmount) || 0;
      return acc + amount;
    }
    return acc;
  }, 0);

  const activeHoldAmount = activeHolds.reduce((acc, curr) => {
    return acc + (Number(curr.secondAmount) || 0);
  }, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Active Financial Holds */}
      <div className="relative overflow-hidden rounded-xl border border-rose-900/50 bg-gradient-to-br from-slate-900/90 to-rose-950/20 p-5 shadow-lg shadow-rose-950/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            Active Holds Frozen
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {isLoading ? '...' : activeHolds.length}
          </span>
          <span className="text-xs text-rose-400 font-mono">
            {formatCurrency(activeHoldAmount)} held
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Account C funds locked pending investigation
        </p>
      </div>

      {/* 2. Resolved Alerts */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-900/50 bg-gradient-to-br from-slate-900/90 to-emerald-950/20 p-5 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Cleared & Released
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {isLoading ? '...' : resolvedAlerts.length}
          </span>
          <span className="text-xs text-emerald-400">Officer Approved</span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Holds unlocked after verified audit clearance
        </p>
      </div>

      {/* 3. Total Intercepted Fraud */}
      <div className="relative overflow-hidden rounded-xl border border-blue-900/50 bg-gradient-to-br from-slate-900/90 to-blue-950/20 p-5 shadow-lg shadow-blue-950/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Total Intercepted
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {isLoading ? '...' : formatCurrency(totalIntercepted)}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Cumulative value intercepted across all mule rings
        </p>
      </div>

      {/* 4. Total Observed Transactions */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Observed Bank Events
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            <Layers className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {isLoading ? '...' : transactions.length}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3 text-amber-400" /> &le; 180s Window
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Inbound payment events from core banking
        </p>
      </div>
    </div>
  );
};
