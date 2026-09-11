import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  RotateCcw,
  Trash2,
  Unlock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const DeveloperView: React.FC = () => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [stats, setStats] = useState<{
    observedTransactionsCount: number;
    fraudAlertsCount: number;
    mediumRiskAlertsCount: number;
    criticalAlertsCount: number;
    holdRequestsCount: number;
    bankSimulationConnected: boolean;
    zeroFraudConnected: boolean;
    timestamp: string;
  } | null>(null);

  const [accounts, setAccounts] = useState<Array<{
    accountNumber: string;
    customerName: string;
    availableBalance: number;
    currency: string;
    status: string;
    bankCode: string;
  }>>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const refreshStatus = async () => {
    try {
      const [statusRes, accsRes] = await Promise.all([
        api.developer.getStatus().catch(() => null),
        api.developer.getBankAccounts().catch(() => []),
      ]);
      if (statusRes) setStats(statusRes);
      if (accsRes) setAccounts(accsRes);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Action: Reset All Systems
  const handleResetAll = async () => {
    if (!window.confirm('Are you sure you want to reset ALL databases? This will clear all transactions and alerts, and restore default balances.')) {
      return;
    }
    setLoadingAction('reset-all');
    try {
      const res = await api.developer.resetAll();
      showToast(res.message || 'All systems reset to clean pristine state!', 'success');
      await refreshStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset all systems', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Reset ZeroFraud360 Only
  const handleResetZeroFraud = async () => {
    setLoadingAction('reset-zf');
    try {
      const res = await api.developer.resetZeroFraud();
      showToast(res.message || 'ZeroFraud360 database cleared!', 'success');
      await refreshStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset ZeroFraud360', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Unfreeze All Accounts
  const handleUnfreezeAll = async () => {
    setLoadingAction('unfreeze-all');
    try {
      const res = await api.developer.unfreezeAll();
      showToast(res.message || 'All accounts unfrozen to ACTIVE!', 'success');
      await refreshStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to unfreeze accounts', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Unfreeze single account
  const handleUnfreezeSingle = async (accountId: string) => {
    setLoadingAction(`unfreeze-${accountId}`);
    try {
      await fetch(`http://localhost:8080/internal/v1/accounts/${accountId}/unfreeze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': 'sim-secret-token-360',
        },
        body: JSON.stringify({ reason: 'Developer UI manual unfreeze' }),
      });
      showToast(`Account ${accountId} successfully restored to ACTIVE!`, 'success');
      await refreshStatus();
    } catch (err: any) {
      showToast(`Failed to unfreeze account ${accountId}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Scenario 1: Hop 1 Normal Payment (10001 -> 10002, 10,000)
  const handleSimulateHop1 = async () => {
    setLoadingAction('sim-hop1');
    try {
      const res = await fetch('http://localhost:8080/api/payments/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAccountNumber: '10001',
          receiverAccountNumber: '10002',
          amount: 10000,
          currency: 'INR',
          upiPin: '123456',
          remarks: 'Hop 1 Payment',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Hop 1 Transfer Succeeded: ₹10,000 from 10001 to 10002 (Txn: ${data.transactionId || 'SUCCESS'})`, 'success');
      } else {
        showToast(`Hop 1 Failed: ${data.message || 'Error'}`, 'error');
      }
      await refreshStatus();
    } catch (err: any) {
      showToast(`Failed to simulate transfer: ${err.message}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Scenario 2: Hop 2 Medium Risk Pass-Through (10001 -> 10002 -> 10003, 10,000)
  const handleSimulateHop2 = async () => {
    setLoadingAction('sim-hop2');
    try {
      // Step A: 10001 -> 10002
      await fetch('http://localhost:8080/api/payments/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAccountNumber: '10001',
          receiverAccountNumber: '10002',
          amount: 10000,
          currency: 'INR',
          upiPin: '123456',
        }),
      });
      // Short pause
      await new Promise((r) => setTimeout(r, 1200));
      // Step B: 10002 -> 10003
      const resB = await fetch('http://localhost:8080/api/payments/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAccountNumber: '10002',
          receiverAccountNumber: '10003',
          amount: 10000,
          currency: 'INR',
          upiPin: '123456',
        }),
      });
      const dataB = await resB.json();
      if (resB.ok) {
        showToast('Hop 2 Simulated! Flagged as MEDIUM FRAUD CHANCE under surveillance.', 'success');
      } else {
        showToast(`Hop 2 Failed: ${dataB.message}`, 'error');
      }
      await refreshStatus();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Scenario 3: Hop 3 Critical Fraud Layering Chain (10002 -> 10003 -> 10004)
  const handleSimulateHop3 = async () => {
    setLoadingAction('sim-hop3');
    try {
      // Step C: 10003 -> 10004
      const res = await fetch('http://localhost:8080/api/payments/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAccountNumber: '10003',
          receiverAccountNumber: '10004',
          amount: 10000,
          currency: 'INR',
          upiPin: '123456',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Hop 3 Simulated! CRITICAL MULTI-HOP FRAUD detected. Accounts 10003 & 10004 FROZEN!', 'success');
      } else {
        showToast(`Hop 3: ${data.message || 'Error'}`, 'error');
      }
      await refreshStatus();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold transition-all transform animate-in slide-in-from-bottom duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-white" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-xs font-bold uppercase tracking-wider border border-blue-400/20">
                Developer &amp; Demo Studio
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ready for Video Recording
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              System Control &amp; Data Clean Center
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              One-click tools to wipe past simulation history, reset accounts to default balances, unfreeze accounts, and fire multi-hop test scenarios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors border border-white/10 backdrop-blur-sm"
              title="Refresh Live Metrics"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              <span>Open Bank Simulator (:3000)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Full Clean State */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              Clean Slate
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">Reset All Systems (Full Wipe)</h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Deletes all observed transactions, fraud alerts, outbox events, and unfreezes all accounts with default wallet balances.
          </p>
          <button
            onClick={handleResetAll}
            disabled={loadingAction !== null}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${loadingAction === 'reset-all' ? 'animate-spin' : ''}`} />
            <span>{loadingAction === 'reset-all' ? 'Resetting All...' : 'Reset All Databases Now'}</span>
          </button>
        </div>

        {/* Clear ZeroFraud360 Only */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <RotateCcw className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              ZeroFraud360 Only
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">Clear Fraud Alerts &amp; History</h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Clears the transactions stream and fraud alert log in ZeroFraud360 while leaving existing bank balances intact.
          </p>
          <button
            onClick={handleResetZeroFraud}
            disabled={loadingAction !== null}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className={`h-4 w-4 ${loadingAction === 'reset-zf' ? 'animate-spin' : ''}`} />
            <span>{loadingAction === 'reset-zf' ? 'Clearing...' : 'Clear ZeroFraud360'}</span>
          </button>
        </div>

        {/* Unfreeze All Accounts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Unlock className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Accounts
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">Unfreeze All Accounts</h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Releases any active fund holds and restores all bank accounts to ACTIVE status so they can transfer funds again.
          </p>
          <button
            onClick={handleUnfreezeAll}
            disabled={loadingAction !== null}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Unlock className={`h-4 w-4 ${loadingAction === 'unfreeze-all' ? 'animate-spin' : ''}`} />
            <span>{loadingAction === 'unfreeze-all' ? 'Unfreezing...' : 'Unfreeze All Accounts'}</span>
          </button>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observed Txns</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.observedTransactionsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Activity className="h-3 w-3 text-blue-600" />
            <span>ZeroFraud360 stream</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Alerts</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.fraudAlertsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-500" />
            <span>All detected flags</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Medium Risk</div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {stats?.mediumRiskAlertsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">2-Hop pass-through</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">Critical STOP</div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {stats?.criticalAlertsCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">3-Hop mule freeze</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Services Status</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> :8081
            </span>
            <span className="text-slate-300">|</span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${stats?.bankSimulationConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`h-2 w-2 rounded-full ${stats?.bankSimulationConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span> :8080
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Core &amp; Bank live</div>
        </div>
      </div>

      {/* Video Simulation Scenario Triggers */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Sparkles className="h-4 w-4" />
              <span>One-Click Video Demonstration Triggers</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">
              Automate Multi-Hop Scenarios For Video
            </h2>
          </div>
          <span className="text-xs text-slate-400">Default transfer amount: ₹10,000</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hop 1 */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Step 1: Normal Inflow
                </span>
                <span className="text-xs font-mono text-slate-400">10001 → 10002</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Muthu transfers ₹10,000 to Naveen. Stream records normal transaction; 0 alerts generated.
              </p>
            </div>
            <button
              onClick={handleSimulateHop1}
              disabled={loadingAction !== null}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Trigger Hop 1 (Normal)</span>
            </button>
          </div>

          {/* Hop 2 */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  Step 2: Medium Risk
                </span>
                <span className="text-xs font-mono text-slate-400">10002 → 10003</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Naveen immediately forwards ₹10,000 to Yogeshwaran. Flagged as Medium Fraud Chance.
              </p>
            </div>
            <button
              onClick={handleSimulateHop2}
              disabled={loadingAction !== null}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Trigger Hop 2 (Medium Risk)</span>
            </button>
          </div>

          {/* Hop 3 */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                  Step 3: Critical Freeze
                </span>
                <span className="text-xs font-mono text-slate-400">10003 → 10004</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Yogeshwaran transfers to Kanika. Escalated to Critical Multi-Hop Mule Fraud. Accounts Frozen!
              </p>
            </div>
            <button
              onClick={handleSimulateHop3}
              disabled={loadingAction !== null}
              className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Trigger Hop 3 (Critical Freeze)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Bank Accounts Inspector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Live Bank Simulation Accounts Inspector</h3>
            <p className="text-xs text-slate-500">Real-time status and balance of customer accounts in IndianBankSimulation</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {accounts.length} Accounts Loaded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Account ID</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Bank Code</th>
                <th className="py-2.5 px-3">Available Balance</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => {
                const isFrozen = acc.status === 'FROZEN';
                return (
                  <tr key={acc.accountNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{acc.accountNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{acc.customerName}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">{acc.bankCode}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ₹{Number(acc.availableBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide inline-flex items-center gap-1 ${
                          isFrozen
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isFrozen ? 'bg-rose-600' : 'bg-emerald-600'}`}></span>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isFrozen ? (
                        <button
                          onClick={() => handleUnfreezeSingle(acc.accountNumber)}
                          disabled={loadingAction !== null}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Unfreeze
                        </button>
                      ) : (
                        <span className="text-slate-400 font-normal">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Connecting to IndianBankSimulation (:8080)...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};