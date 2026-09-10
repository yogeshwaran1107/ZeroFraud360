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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                isHoldActive
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : isResolved
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isHoldActive ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-mono">{alert.alertId}</h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isHoldActive
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isResolved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {alert.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">{alert.patternType} &bull; Money-Flow Anomaly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Visual Money Flow Chain */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Money-Flow Transit Chain (A &rarr; B &rarr; C)</span>
              <span className="text-amber-700 flex items-center gap-1 font-mono normal-case">
                <Clock className="h-3.5 w-3.5" /> &Delta;t = {alert.timeDifferenceSeconds}s (&le; 180s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 text-center text-xs">
              {/* Account A */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Account A (Origin)</div>
                <div className="font-mono font-bold text-slate-800 mt-1">{alert.sourceAccountId}</div>
              </div>

              {/* Leg 1 */}
              <div className="flex flex-col items-center justify-center text-[10px] text-slate-500">
                <span className="font-mono text-emerald-600 font-bold">
                  ₹{Number(alert.firstAmount).toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1 w-full justify-center text-slate-400">
                  <span className="h-[1px] bg-slate-300 flex-1"></span>
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                </div>
                <span className="font-mono text-[9px] text-slate-400 truncate max-w-[90px]">
                  {alert.firstTransactionId}
                </span>
              </div>

              {/* Account B */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div className="text-[10px] text-amber-700 uppercase font-semibold">Account B (Mule)</div>
                <div className="font-mono font-bold text-amber-900 mt-1">{alert.intermediateAccountId}</div>
              </div>

              {/* Leg 2 */}
              <div className="flex flex-col items-center justify-center text-[10px] text-slate-500">
                <span className="font-mono text-rose-600 font-bold">
                  ₹{Number(alert.secondAmount).toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1 w-full justify-center text-slate-400">
                  <span className="h-[1px] bg-slate-300 flex-1"></span>
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                </div>
                <span className="font-mono text-[9px] text-slate-400 truncate max-w-[90px]">
                  {alert.secondTransactionId}
                </span>
              </div>

              {/* Account C */}
              <div className="rounded-lg border border-rose-300 bg-rose-50/70 p-3 shadow-xs">
                <div className="text-[10px] text-rose-700 uppercase font-bold">Account C (Held)</div>
                <div className="font-mono font-bold text-rose-900 mt-1">{alert.destinationAccountId}</div>
              </div>
            </div>
          </div>

          {/* External Decision Engine Verification Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5 text-blue-600" />
                External Decision Engine Verdict
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                  alert.decision === 'STOP'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {alert.decision || 'PENDING'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400">Decision Request ID:</span>
                <div className="font-mono text-slate-700 truncate font-medium">
                  {alert.externalDecisionRequestId || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Core Bank Hold Reference:</span>
                <div className="font-mono text-amber-700 truncate font-medium">
                  {alert.holdRequestId || 'N/A'}
                </div>
              </div>
            </div>

            {alert.decisionReason && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 text-xs">Verdict Rationale:</span>
                <div className="mt-1 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                  {alert.decisionReason}
                </div>
              </div>
            )}
          </div>

          {/* Audit & Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <span className="text-slate-400 block">Created At</span>
              <span className="font-mono text-slate-700 font-medium">
                {new Date(alert.createdAt).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <span className="text-slate-400 block">Last Updated</span>
              <span className="font-mono text-slate-700 font-medium">
                {new Date(alert.updatedAt).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <span className="text-slate-400 block">Resolved At</span>
              <span className="font-mono text-emerald-700 font-semibold">
                {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString('en-IN') : 'Not Resolved'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="text-xs text-slate-400">
            Deduplication Key: <code className="text-slate-600">{alert.dedupKey}</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Close
            </button>
            {isHoldActive && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRelease(alert);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
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
