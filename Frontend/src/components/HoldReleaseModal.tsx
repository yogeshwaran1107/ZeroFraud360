import React, { useState } from 'react';
import type { FraudAlert } from '../types';
import { api } from '../api/client';

import { useAuth } from '../context/AuthContext';
import { X, Unlock, AlertTriangle, CheckCircle2, ShieldCheck, User } from 'lucide-react';

interface HoldReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: FraudAlert | null;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  'Verified legitimate commercial payment with both counterparties.',
  'Beneficiary customer identity confirmed via phone & PAN verification.',
  'Routine corporate vendor disbursement; false-positive rapid chain.',
  'Simulation test completed; officer clearance approved.',
];

export const HoldReleaseModal: React.FC<HoldReleaseModalProps> = ({
  isOpen,
  onClose,
  alert,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !alert) return null;

  const holdReferenceId = alert.holdRequestId || `HOLD-${alert.alertId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a mandatory clearance reason for the audit log.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // releaseHold accepts either holdRequestId or alertId
      const targetHoldId = alert.holdRequestId || alert.alertId;
      await api.officer.releaseHold(targetHoldId, reason.trim(), user?.username);
      setSuccessMessage('Hold successfully released on IndianBankSimulation!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMessage(null);
        setReason('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to release hold. Ensure backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Release Financial Hold</h3>
              <p className="text-xs text-slate-400">
                Officer Audit Action &bull; Unlocks held funds on target account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Case Metadata Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Alert Identifier:</span>
              <span className="font-mono font-bold text-slate-200">{alert.alertId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Hold Reference:</span>
              <span className="font-mono text-amber-400">{holdReferenceId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Frozen Recipient (Account C):</span>
              <span className="font-mono font-semibold text-rose-400">
                {alert.destinationAccountId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Frozen Amount:</span>
              <span className="font-mono font-extrabold text-white text-sm">
                ₹{Number(alert.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400" /> Authorized Officer:
              </span>
              <span className="font-semibold text-blue-400">
                {user?.username} ({user?.role?.replace('ROLE_', '')})
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Investigation Clearance Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide clear justification for unlocking the frozen funds..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              required
            />
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Quick-Fill Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setReason(p)}
                  className="rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition-colors text-left"
                >
                  {p.length > 38 ? p.slice(0, 38) + '...' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {isSubmitting ? 'Dispatching Release...' : 'Confirm & Release Hold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
