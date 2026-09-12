import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { AccountForensics, QuickAccount } from '../types';
import {
  MapPin,
  CreditCard,
  Smartphone,
  Store,
  Building2,
  Globe,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Navigation,
  RefreshCw,
  User,
} from 'lucide-react';

export const AccountForensicsView: React.FC = () => {
  const [quickAccounts, setQuickAccounts] = useState<QuickAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('10001');
  const [inputAccountId, setInputAccountId] = useState<string>('10001');
  const [forensics, setForensics] = useState<AccountForensics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quick accounts list on mount
  useEffect(() => {
    api.fraud.getQuickAccounts()
      .then((accs) => {
        if (accs && accs.length > 0) {
          setQuickAccounts(accs);
        }
      })
      .catch((err) => {
        console.warn('Could not load quick accounts:', err);
      });
  }, []);

  // Fetch forensics details for the selected account
  const loadForensics = useCallback(async (accId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.fraud.getAccountForensics(accId);
      setForensics(data);
    } catch (err: unknown) {
      console.error('Failed to load forensics:', err);
      setError('Unable to fetch account intelligence details. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadForensics(selectedAccountId);
    }
  }, [selectedAccountId, loadForensics]);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    setInputAccountId(accId);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAccountId.trim()) {
      setSelectedAccountId(inputAccountId.trim());
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
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

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'ATM_WITHDRAWAL':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'UPI_TRANSFER':
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      case 'POS_MERCHANT':
        return <Store className="h-4 w-4 text-amber-600" />;
      case 'NET_BANKING':
        return <Globe className="h-4 w-4 text-cyan-600" />;
      case 'BRANCH_COUNTER':
        return <Building2 className="h-4 w-4 text-emerald-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-700" />
              Account Forensics: Withdrawal Mode & Location Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an account button or enter an account number to inspect its physical withdrawal modes and geo-locations
            </p>
          </div>

          <form onSubmit={handleManualSearch} className="flex items-center gap-2 max-w-md w-full md:w-auto">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputAccountId}
                onChange={(e) => setInputAccountId(e.target.value)}
                placeholder="Enter Account No (e.g. 10001)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => loadForensics(selectedAccountId)}
              className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 transition-colors cursor-pointer"
              title="Refresh Forensics"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </form>
        </div>

        {/* Clickable Quick Account Buttons */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Click to Inspect Simulated Account:
          </div>
          <div className="flex flex-wrap gap-2">
            {quickAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.accountNumber;
              const isFrozen = acc.status === 'FROZEN';
              return (
                <button
                  key={acc.accountNumber}
                  type="button"
                  onClick={() => handleSelectAccount(acc.accountNumber)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-700 text-white border-blue-700 shadow-md shadow-blue-700/20'
                      : isFrozen
                      ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <User className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                  <span>{acc.customerName}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {acc.accountNumber}
                  </span>
                  {isFrozen && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-600 text-white rounded">
                      FROZEN
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !forensics ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading Account Forensics & Location Details...</p>
          <p className="text-xs text-slate-400 mt-1">Aggregating ATM terminals, withdrawal channels, and geographic audit trail.</p>
        </div>
      ) : forensics ? (
        <div className="space-y-6">
          {/* Account Profile Header Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-900/15">
                  {forensics.customerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-lg font-extrabold text-slate-900">{forensics.customerName}</h1>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                      A/C {forensics.accountNumber}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        forensics.status === 'FROZEN'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      }`}
                    >
                      {forensics.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{forensics.bankName}</span>
                    <span>•</span>
                    <span className="font-mono">Bank Code: {forensics.bankCode}</span>
                    <span>•</span>
                    <span>Currency: {forensics.currency}</span>
                  </div>
                </div>
              </div>

              {/* Balance & Risk Score Box */}
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {formatCurrency(forensics.availableBalance)}
                  </div>
                </div>

                <div
                  className={`rounded-2xl p-3.5 border min-w-[130px] text-right ${
                    forensics.riskLevel === 'CRITICAL'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : forensics.riskLevel === 'MEDIUM'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">AML Risk Score</div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="text-base font-black">{forensics.riskScore} / 100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">Total Withdrawals & Debits</div>
                <div className="text-sm font-extrabold text-rose-600 mt-1">
                  {formatCurrency(forensics.summary.totalWithdrawalsAmount)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {forensics.summary.totalWithdrawalsCount} debit transactions
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">Total Inflows & Deposits</div>
                <div className="text-sm font-extrabold text-emerald-600 mt-1">
                  {formatCurrency(forensics.summary.totalInflowAmount)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {forensics.summary.totalInflowCount} credit transactions
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">Primary Withdrawal Mode</div>
                <div className="text-sm font-bold text-slate-800 mt-1 truncate">
                  {forensics.summary.primaryWithdrawalMode}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Highest: {formatCurrency(forensics.summary.highestSingleWithdrawal)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">Primary Geo Hub</div>
                <div className="text-sm font-bold text-slate-800 mt-1 truncate">
                  {forensics.summary.primaryLocation}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {forensics.locations.length} distinct terminals mapped
                </div>
              </div>
            </div>
          </div>

          {/* Geo Velocity / Anomaly Alert Banner */}
          {forensics.velocityAlerts && forensics.velocityAlerts.length > 0 && (
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <div className="font-extrabold text-amber-900 text-sm">
                    Geographic Anomaly & Rapid Travel Velocity Alert
                  </div>
                  {forensics.velocityAlerts.map((alert) => (
                    <div key={alert.alertId} className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                      <div className="font-semibold">{alert.message}</div>
                      <div className="flex items-center gap-4 text-[11px] text-amber-700 mt-1 font-mono">
                        <span>Route: {alert.fromCity} ➔ {alert.toCity}</span>
                        <span>•</span>
                        <span>Distance: {alert.distanceKm} km</span>
                        <span>•</span>
                        <span>Time Gap: {alert.timeDifferenceMinutes} mins</span>
                        <span>•</span>
                        <span className="font-bold text-rose-700">Severity: {alert.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: Mode of Withdrawal Amount Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-700" />
                  Mode of Withdrawal Amount Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed distribution of amounts withdrawn across channels (ATM, UPI, POS, NetBanking, Branch)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Total Withdrawn: {formatCurrency(forensics.summary.totalWithdrawalsAmount)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forensics.modeBreakdowns.map((m) => (
                <div
                  key={m.mode}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-xl shadow-2xs border border-slate-200/60">
                        {getModeIcon(m.mode)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{m.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {m.count} transaction{m.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {m.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, m.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Amount</span>
                      <span className="font-extrabold text-slate-900">{formatCurrency(m.totalAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Average / Tx</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(m.averageAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Specific Locations & Terminals Mapped */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-600" />
                  Specific Locations & Terminal Intelligence
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Physical ATMs, merchant terminals, and bank branches where this account withdrew funds
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {forensics.locations.length} Locations Mapped
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forensics.locations.map((loc) => (
                <div
                  key={loc.locationId}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-white rounded-xl shadow-2xs border border-slate-200/60 mt-0.5">
                        <MapPin className="h-4 w-4 text-rose-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{loc.city}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{loc.state}</div>
                      </div>
                    </div>
                    {loc.riskTag === 'HIGH_VALUE' ? (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                        HIGH VALUE
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                        NORMAL
                      </span>
                    )}
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Terminal / Branch
                    </div>
                    <div className="font-semibold text-slate-800 mt-0.5 truncate" title={loc.terminalOrBranch}>
                      {loc.terminalOrBranch}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      Geo: {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Withdrawn</span>
                      <span className="font-extrabold text-slate-900">{formatCurrency(loc.totalAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Activity</span>
                      <span className="font-medium text-slate-600">{loc.count} txn ({formatDate(loc.lastActivityAt).split(',')[0]})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Detailed Forensic Audit Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-blue-700" />
                  Chronological Withdrawal & Transaction Audit Ledger
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete audit trail with payment rails, specific terminals, and risk flags
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Events: <span className="font-bold text-slate-900">{forensics.auditLedger.length}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                    <th className="py-3.5 px-5">Timestamp</th>
                    <th className="py-3.5 px-5">Mode & Channel</th>
                    <th className="py-3.5 px-5">Specific Location & Terminal</th>
                    <th className="py-3.5 px-5">Counterparty / Purpose</th>
                    <th className="py-3.5 px-5 text-right">Amount</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Risk Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forensics.auditLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    forensics.auditLedger.map((item) => {
                      const isDebit = item.type === 'DEBIT';
                      const isSuspicious = item.anomalyFlag && item.anomalyFlag !== 'NORMAL';
                      return (
                        <tr key={item.transactionId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            {formatDate(item.timestamp)}
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              {getModeIcon(item.mode)}
                              <span className="font-semibold text-slate-800">{item.modeLabel}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="font-semibold text-slate-900">{item.city}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]" title={item.terminal}>
                              {item.terminal}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-slate-700">
                            {item.counterparty}
                          </td>
                          <td className="py-3 px-5 text-right font-mono font-bold whitespace-nowrap">
                            <span className={isDebit ? 'text-rose-600' : 'text-emerald-600'}>
                              {isDebit ? '-' : '+'} {formatCurrency(item.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 whitespace-nowrap">
                            {isSuspicious ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                                {item.anomalyFlag.replace(/_/g, ' ')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                NORMAL
                              </span>
                            )}
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
      ) : null}
    </div>
  );
};