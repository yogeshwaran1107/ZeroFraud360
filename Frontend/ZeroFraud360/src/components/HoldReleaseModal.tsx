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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Release Financial Hold</h3>
              <p className="text-xs text-slate-500">
                Officer Audit Action &bull; Unlocks held funds on target account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Case Metadata Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Alert Identifier:</span>
              <span className="font-mono font-bold text-slate-800">{alert.alertId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Hold Reference:</span>
              <span className="font-mono font-semibold text-amber-700">{holdReferenceId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Frozen Recipient (Account C):</span>
              <span className="font-mono font-semibold text-rose-700">
                {alert.destinationAccountId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Frozen Amount:</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                ₹{Number(alert.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <User className="h-3 w-3 text-slate-400" /> Authorized Officer:
              </span>
              <span className="font-bold text-blue-700">
                {user?.username} ({user?.role?.replace('ROLE_', '')})
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Investigation Clearance Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide clear justification for unlocking the frozen funds..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              required
            />
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Quick-Fill Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setReason(p)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 transition-colors text-left font-medium cursor-pointer"
                >
                  {p.length > 38 ? p.slice(0, 38) + '...' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
