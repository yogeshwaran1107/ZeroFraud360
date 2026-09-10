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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

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
  const isResolved = alert.status === 'RESOLVED';

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseReason.trim()) {
      setReleaseError('Please enter a clearance reason.');
      return;
    }

    setIsSubmitting(true);
    setReleaseError(null);

    try {
      const holdTarget = alert.holdRequestId || alert.alertId;
      await api.officer.releaseHold(holdTarget, releaseReason.trim(), user?.username);
      setIsReleaseModalOpen(false);
      onHoldReleased();
    } catch (err: any) {
      setReleaseError(err.message || 'Failed to release hold.');
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

        {/* Release Hold Button for Officer */}
        {isHoldActive && (
          <button
            onClick={() => setIsReleaseModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
          >
            <Unlock className="h-4 w-4" />
            <span>Release Account Hold</span>
          </button>
        )}
        {isResolved && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Hold Released & Cleared
          </span>
        )}
      </div>

      {/* Red Suspicious Banner matching reference image */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-md shadow-red-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">
              This transaction is flagged as Suspicious
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              High risk detected based on money flow pattern (A &rarr; B &rarr; C within 3 minutes).
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-red-700 tracking-wider">
            Risk Score
          </div>
          <div className="text-2xl font-black text-red-600">
            {alert.decision === 'STOP' ? '95' : '75'}
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

      {/* Release Hold Modal */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Unlock className="h-4 w-4 text-amber-600" />
                <span>Release Account Hold</span>
              </div>
              <button
                onClick={() => setIsReleaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {releaseError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs border border-red-200">
                {releaseError}
              </div>
            )}

            <form onSubmit={handleReleaseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Account</label>
                <input
                  type="text"
                  value={alert.destinationAccountId}
                  readOnly
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Investigation Clearance Reason *
                </label>
                <textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Legitimate transaction verified with customer."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Releasing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
