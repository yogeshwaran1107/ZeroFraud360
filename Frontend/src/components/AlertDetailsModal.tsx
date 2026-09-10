import React from 'react';
import type { FraudAlert } from '../types';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Clock,
  Unlock,
  GitCommit,
} from 'lucide-react';


interface AlertDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: FraudAlert | null;
  onOpenRelease: (alert: FraudAlert) => void;
}

export const AlertDetailsModal: React.FC<AlertDetailsModalProps> = ({
  isOpen,
  onClose,
  alert,
  onOpenRelease,
}) => {
  if (!isOpen || !alert) return null;

  const isHoldActive = alert.status === 'HOLD_ACTIVE';
  const isResolved = alert.status === 'RESOLVED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-direction-column flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                isHoldActive
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : isResolved
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {isHoldActive ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{alert.alertId}</h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isHoldActive
                      ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                      : isResolved
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {alert.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{alert.patternType} &bull; Money-Flow Anomaly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Visual Money Flow Chain */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Money-Flow Transit Chain (A &rarr; B &rarr; C)</span>
              <span className="text-amber-400 flex items-center gap-1 font-mono normal-case">
                <Clock className="h-3.5 w-3.5" /> &Delta;t = {alert.timeDifferenceSeconds}s (&le; 180s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 text-center text-xs">
              {/* Account A */}
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div className="text-[10px] text-slate-500 uppercase">Account A (Origin)</div>
                <div className="font-mono font-bold text-slate-200 mt-1">{alert.sourceAccountId}</div>
              </div>

              {/* Leg 1 */}
              <div className="flex flex-col items-center justify-center text-[10px] text-slate-400">
                <span className="font-mono text-emerald-400 font-bold">
                  ₹{Number(alert.firstAmount).toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1 w-full justify-center text-slate-500">
                  <span className="h-[1px] bg-slate-700 flex-1"></span>
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                </div>
                <span className="font-mono text-[9px] text-slate-500 truncate max-w-[90px]">
                  {alert.firstTransactionId}
                </span>
              </div>

              {/* Account B */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
                <div className="text-[10px] text-amber-400 uppercase font-semibold">Account B (Mule)</div>
                <div className="font-mono font-bold text-amber-200 mt-1">{alert.intermediateAccountId}</div>
              </div>

              {/* Leg 2 */}
              <div className="flex flex-col items-center justify-center text-[10px] text-slate-400">
                <span className="font-mono text-rose-400 font-bold">
                  ₹{Number(alert.secondAmount).toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1 w-full justify-center text-slate-500">
                  <span className="h-[1px] bg-slate-700 flex-1"></span>
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                </div>
                <span className="font-mono text-[9px] text-slate-500 truncate max-w-[90px]">
                  {alert.secondTransactionId}
                </span>
              </div>

              {/* Account C */}
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 shadow-md shadow-rose-950/30">
                <div className="text-[10px] text-rose-400 uppercase font-bold">Account C (Held)</div>
                <div className="font-mono font-bold text-white mt-1">{alert.destinationAccountId}</div>
              </div>
            </div>
          </div>

          {/* External Decision Engine Verification Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5 text-blue-400" />
                External Decision Engine Verdict
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                  alert.decision === 'STOP'
                    ? 'bg-rose-950 text-rose-400 border-rose-700 shadow-sm shadow-rose-900/40'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-700'
                }`}
              >
                {alert.decision || 'PENDING'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500">Decision Request ID:</span>
                <div className="font-mono text-slate-300 truncate">
                  {alert.externalDecisionRequestId || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Core Bank Hold Reference:</span>
                <div className="font-mono text-amber-400 truncate">
                  {alert.holdRequestId || 'N/A'}
                </div>
              </div>
            </div>

            {alert.decisionReason && (
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-500 text-xs">Verdict Rationale:</span>
                <div className="mt-1 text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono">
                  {alert.decisionReason}
                </div>
              </div>
            )}
          </div>

          {/* Audit & Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <span className="text-slate-500 block">Created At</span>
              <span className="font-mono text-slate-300">
                {new Date(alert.createdAt).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <span className="text-slate-500 block">Last Updated</span>
              <span className="font-mono text-slate-300">
                {new Date(alert.updatedAt).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <span className="text-slate-500 block">Resolved At</span>
              <span className="font-mono text-emerald-400">
                {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString('en-IN') : 'Not Resolved'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="text-xs text-slate-500">
            Deduplication Key: <code className="text-slate-400">{alert.dedupKey}</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Close
            </button>
            {isHoldActive && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRelease(alert);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-900/30 transition-all"
              >
                <Unlock className="h-4 w-4" />
                Release Hold Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
