import React, { useState } from 'react';
import type { FraudAlert } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Unlock,
  Ban,
  Bell,
  X,
} from 'lucide-react';


interface TransactionDetailsViewProps {
  alert: FraudAlert;
  onBack: () => void;
  onHoldReleased: () => void;
}

export const TransactionDetailsView: React.FC<TransactionDetailsViewProps> = ({
  alert,
  onBack,
  onHoldReleased,
}) => {
  const { user } = useAuth();
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmReason, setConfirmReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const time1 = new Date(alert.createdAt).toLocaleTimeString('en-IN');
  const isHoldActive = alert.status === 'HOLD_ACTIVE';
  const isMediumRisk = alert.status === 'MEDIUM_RISK';
  const isResolved = alert.status === 'RESOLVED';
  const isConfirmedFraud = alert.status === 'CONFIRMED_FRAUD';

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseReason.trim()) {
      setActionError('Please enter a clearance reason.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const holdTarget = alert.holdRequestId || alert.alertId;
      await api.officer.releaseHold(holdTarget, releaseReason.trim(), user?.username);
      setIsReleaseModalOpen(false);
      onHoldReleased();
    } catch (err: any) {
      setActionError(err.message || 'Failed to release hold.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmFraudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmReason.trim()) {
      setActionError('Please enter a confirmation reason.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const holdTarget = alert.holdRequestId || alert.alertId;
      await api.officer.confirmFraud(holdTarget, confirmReason.trim(), user?.username);
      setIsConfirmModalOpen(false);
      onHoldReleased();
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm fraud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Back button matching Panel 4 */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Transaction Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction information and fraud analysis
          </p>
        </div>

        {/* Action Buttons for Authorized Officers */}
        <div className="flex items-center gap-2">
          {(isHoldActive || isMediumRisk) && (
            <>
              <button
                onClick={() => {
                  setActionError(null);
                  setIsConfirmModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                <Ban className="h-4 w-4" />
                <span>Confirm Fraud &amp; Store Pattern</span>
              </button>
              <button
                onClick={() => {
                  setActionError(null);
                  setIsReleaseModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <Unlock className="h-4 w-4" />
                <span>Clear Alert (False Positive)</span>
              </button>
            </>
          )}
          {isConfirmedFraud && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              <Ban className="h-4 w-4" />
              Fraud Confirmed &amp; Funds Blocked
            </span>
          )}
          {isResolved && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              False Positive &amp; Hold Released
            </span>
          )}
        </div>
      </div>

      {/* Banner matching alert status and severity */}
      <div className={`border rounded-2xl p-5 flex items-center justify-between ${
        isMediumRisk ? 'bg-amber-50 border-amber-200' : isResolved ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${
            isMediumRisk ? 'bg-amber-500 shadow-amber-500/20' : isResolved ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-red-500 shadow-red-500/20'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${
              isMediumRisk ? 'text-amber-900' : isResolved ? 'text-emerald-900' : 'text-red-900'
            }`}>
              {isMediumRisk
                ? 'This transaction is flagged as Medium Fraud Chance'
                : isResolved
                ? 'This alert has been Cleared (False Positive)'
                : 'This transaction is flagged as Critical Fraud (STOP & HOLD)'}
            </h3>
            <p className={`text-xs mt-0.5 ${
              isMediumRisk ? 'text-amber-700' : isResolved ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {alert.decisionReason || 'Rapid multi-hop funds movement pattern detected across participating bank accounts.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[10px] uppercase font-bold tracking-wider ${
            isMediumRisk ? 'text-amber-700' : isResolved ? 'text-emerald-700' : 'text-red-700'
          }`}>
            Risk Score
          </div>
          <div className={`text-2xl font-black ${
            isMediumRisk ? 'text-amber-600' : isResolved ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {isMediumRisk ? '65' : isResolved ? '10' : '98'}
          </div>
        </div>
      </div>

      {/* Middle Two Cards: Transaction Details & Money Flow Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Transaction Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Transaction Details
          </h3>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Transaction ID</span>
            <span className="font-mono font-bold text-slate-800">{alert.secondTransactionId}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Date & Time</span>
            <span className="font-mono text-slate-700">{formatDate(alert.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Amount</span>
            <span className="font-mono font-extrabold text-slate-900 text-sm">
              ₹ {Number(alert.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">From Account</span>
            <span className="font-mono text-slate-800">
              {maskAccount(alert.intermediateAccountId)} (User B)
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">To Account</span>
            <span className="font-mono font-bold text-rose-600">
              {maskAccount(alert.destinationAccountId)} (User C - Held)
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Payment Method</span>
            <span className="font-mono text-slate-800">SIMULATED_UPI</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Status</span>
            <span className="font-semibold text-emerald-600">Success</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-2">
            <span className="text-slate-500">Risk Score</span>
            <span className="font-bold text-red-600">
              {alert.decision === 'STOP' ? '95 (High)' : '75 (Medium)'}
            </span>
          </div>
        </div>

        {/* Right Card: Money Flow Analysis matching reference diagram */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Money Flow Analysis</h3>
            <p className="text-xs text-slate-400 mt-0.5">Detected rapid fund movement pattern</p>

            {/* Diagram: Node A -> Node B -> Node C */}
            <div className="flex items-center justify-between my-7 px-2 text-center text-xs">
              {/* Node A */}
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center font-bold text-blue-700 text-sm">
                  A
                </div>
                <span className="font-mono text-[10px] text-slate-500 mt-1.5 font-medium">
                  {maskAccount(alert.sourceAccountId)}
                </span>
              </div>

              {/* Arrow 1 */}
              <div className="flex flex-col items-center flex-1 px-1">
                <span className="text-[10px] font-mono text-slate-400 font-semibold mb-0.5">
                  &lt; 1 min
                </span>
                <div className="flex items-center w-full justify-center">
                  <div className="h-[2px] bg-slate-300 flex-1"></div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </div>
                <span className="text-[9px] font-mono text-emerald-600 font-bold">
                  ₹{Number(alert.firstAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>

              {/* Node B */}
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-700 text-sm">
                  B
                </div>
                <span className="font-mono text-[10px] text-slate-500 mt-1.5 font-medium">
                  {maskAccount(alert.intermediateAccountId)}
                </span>
              </div>

              {/* Arrow 2 */}
              <div className="flex flex-col items-center flex-1 px-1">
                <span className="text-[10px] font-mono text-rose-500 font-semibold mb-0.5">
                  {alert.timeDifferenceSeconds}s
                </span>
                <div className="flex items-center w-full justify-center">
                  <div className="h-[2px] bg-red-300 flex-1"></div>
                  <ArrowRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                </div>
                <span className="text-[9px] font-mono text-rose-600 font-bold">
                  ₹{Number(alert.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>

              {/* Node C */}
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center font-bold text-red-700 text-sm shadow-sm">
                  C
                </div>
                <span className="font-mono text-[10px] text-red-600 mt-1.5 font-bold">
                  {maskAccount(alert.destinationAccountId)}
                </span>
              </div>
            </div>
          </div>

          {/* Red Matched Banner matching reference image */}
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-3 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-red-800">Pattern Matched</div>
              <div className="text-[11px] text-red-600">
                A &rarr; B &rarr; C within 3 minutes ({alert.timeDifferenceSeconds} seconds elapsed)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Two Cards: Processing Timeline & System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Processing Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Processing Timeline
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Transaction Initiated</div>
                  <div className="text-[11px] text-slate-400">Payment completed on core banking</div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{time1}</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Fraud Analysis (ZeroFraud360)</div>
                  <div className="text-[11px] text-slate-400">Rapid pass-through pattern detected</div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{time1}</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">
                    Decision Received (External ML/Rule)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Flagged as {alert.decision || 'STOP'}
                  </div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{time1}</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Account Hold Triggered</div>
                  <div className="text-[11px] text-slate-400">
                    Hold request sent to IndianBankSimulation
                  </div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{time1}</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Completed</div>
                  <div className="text-[11px] text-slate-400">
                    {isResolved ? 'Hold released by officer' : 'Transaction marked for review'}
                  </div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{time1}</span>
            </div>
          </div>
        </div>

        {/* Right Card: System Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            System Information
          </h3>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Event ID</span>
            <span className="font-mono text-slate-800 font-semibold truncate max-w-[200px]">
              {alert.secondTransactionId}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Decision Source</span>
            <span className="font-mono text-slate-800">External ML / Rule</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Model Version</span>
            <span className="font-mono text-slate-800">v1.0</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Rule Matched</span>
            <span className="font-mono font-semibold text-slate-900">
              Rapid Movement (&le; 3 min)
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Hold Triggered</span>
            <span className="font-bold text-red-600">Yes</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Remarks</span>
            <span className="font-medium text-slate-700">Possible mule account activity</span>
          </div>
        </div>
      </div>

      {/* Broadcast Notifications Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Bell className="h-4 w-4 text-blue-600" />
            <span>Urgent Broadcast Notifications</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Multi-Agency Dispatch Active
          </span>
        </div>
        <p className="text-xs text-slate-500">
          When this transaction pattern was detected, urgent real-time alerts were dispatched automatically to designated authorities and the victim account.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">POLICE</div>
            <div>
              <div className="text-xs font-bold text-slate-900">State Police Cyber/Fraud Cell</div>
              <div className="text-[11px] text-slate-500">Dispatched via Secure Police Alert Feed</div>
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs">CYBER</div>
            <div>
              <div className="text-xs font-bold text-slate-900">National Cyber Crime Unit</div>
              <div className="text-[11px] text-slate-500">Incident logged under Rapid Pass-Through rule</div>
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs">BANK</div>
            <div>
              <div className="text-xs font-bold text-slate-900">Interbank Security Consortium</div>
              <div className="text-[11px] text-slate-500">Accounts {alert.intermediateAccountId} &amp; {alert.destinationAccountId} restrictions notified</div>
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 font-bold text-xs">VICTIM</div>
            <div>
              <div className="text-xs font-bold text-slate-900">Victim Account ({alert.sourceAccountId})</div>
              <div className="text-[11px] text-slate-500">Urgent SMS &amp; app alert: outgoing transactions muted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Fraud Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Ban className="h-4 w-4 text-red-600" />
                <span>Confirm Fraud &amp; Store Pattern</span>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs border border-red-200">
                {actionError}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirming this transaction as actual fraud will <strong>permanently block</strong> the ₹{alert.secondAmount} in target account <span className="font-mono font-bold text-slate-900">{alert.destinationAccountId}</span> AND save this money mule pattern into the <strong>Fraud Patterns Registry</strong> for prevention.
            </p>

            <form onSubmit={handleConfirmFraudSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Official Confirmation Finding / FIR Number *
                </label>
                <textarea
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Confirmed unauthorized mule transfer. Cyber Cell case ref #9823."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-red-600/20"
                >
                  {isSubmitting ? 'Blocking & Storing...' : 'Confirm Fraud & Store Pattern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Hold Modal */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Unlock className="h-4 w-4 text-emerald-600" />
                <span>Clear Alert &amp; Unfreeze Account (False Positive)</span>
              </div>
              <button
                onClick={() => setIsReleaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs border border-red-200">
                {actionError}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Clearing this alert will release the hold on account <span className="font-mono font-bold text-slate-900">{alert.destinationAccountId}</span>, restoring full fund access and marking the investigation resolved.
            </p>

            <form onSubmit={handleReleaseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Account</label>
                <input
                  type="text"
                  value={alert.destinationAccountId}
                  readOnly
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Investigation Clearance Rationale *
                </label>
                <textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Verified with customer as genuine vendor transfer; no mule indicators found."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-700/20"
                >
                  {isSubmitting ? 'Clearing...' : 'Clear Alert & Unfreeze Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
