import React, { useState } from 'react';
import type { FraudAlert } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Ban,
  CheckCircle2,
  UserCheck,
  Unlock,
  X,
} from 'lucide-react';

interface AccountHoldsViewProps {
  alerts: FraudAlert[];
  isLoading: boolean;
  onHoldReleased: () => void;
}

export const AccountHoldsView: React.FC<AccountHoldsViewProps> = ({
  alerts,
  isLoading,
  onHoldReleased,
}) => {
  const { user } = useAuth();
  const [selectedHoldAlert, setSelectedHoldAlert] = useState<FraudAlert | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Alerts that involved a hold (either HOLD_ACTIVE, RESOLVED, or have holdRequestId)
  const holdAlerts = alerts.filter(
    (a) => a.status === 'HOLD_ACTIVE' || a.status === 'RESOLVED' || !!a.holdRequestId
  );

  const activeHolds = holdAlerts.filter((a) => a.status === 'HOLD_ACTIVE');
  const releasedHolds = holdAlerts.filter((a) => a.status === 'RESOLVED');

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
      });
    } catch {
      return dateStr;
    }
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoldAlert || !releaseReason.trim()) {
      setReleaseError('Please provide a clearance reason.');
      return;
    }

    setIsSubmitting(true);
    setReleaseError(null);

    try {
      const holdTarget = selectedHoldAlert.holdRequestId || selectedHoldAlert.alertId;
      await api.officer.releaseHold(holdTarget, releaseReason.trim(), user?.username);
      setSelectedHoldAlert(null);
      setReleaseReason('');
      onHoldReleased();
    } catch (err: any) {
      setReleaseError(err.message || 'Failed to release hold.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 3 Top Metric Cards matching Panel 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Hold Requests */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-2">
              <Ban className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Total Hold Requests</p>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {isLoading ? '...' : holdAlerts.length}
            </div>
          </div>
        </div>

        {/* Card 2: Active Holds */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Active Holds</p>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {isLoading ? '...' : activeHolds.length}
            </div>
          </div>
        </div>

        {/* Card 3: Released */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2">
              <UserCheck className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Released</p>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {isLoading ? '...' : releasedHolds.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table matching Panel 5 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3.5 px-6">Account Number</th>
                <th className="py-3.5 px-6">Account Holder</th>
                <th className="py-3.5 px-6">Requested On</th>
                <th className="py-3.5 px-6">Reason</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holdAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Accounts Placed on Hold Yet
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      When a rapid pass-through anomaly is confirmed with a STOP decision,
                      funds are locked on IndianBankSimulation and listed here.
                    </p>
                  </td>
                </tr>
              ) : (
                holdAlerts.map((a, idx) => {
                  const isActive = a.status === 'HOLD_ACTIVE';
                  const isReleased = a.status === 'RESOLVED';
                  return (
                    <tr key={a.alertId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-900 font-bold">
                        {maskAccount(a.destinationAccountId)}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        User {String.fromCharCode(67 + (idx % 4))}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="py-4 px-6 text-slate-600 max-w-[220px] truncate">
                        {a.decisionReason || 'Suspicious rapid money flow (A -> B -> C)'}
                      </td>
                      <td className="py-4 px-6">
                        {isActive ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-600 font-bold text-xs border border-red-200">
                            Active
                          </span>
                        ) : isReleased ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                            Released
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                            {a.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isActive ? (
                          <button
                            onClick={() => setSelectedHoldAlert(a)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span>Release</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Cleared</span>
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

      {/* Release Hold Modal */}
      {selectedHoldAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Unlock className="h-4 w-4 text-amber-600" />
                <span>Release Account Hold</span>
              </div>
              <button
                onClick={() => setSelectedHoldAlert(null)}
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
                  value={selectedHoldAlert.destinationAccountId}
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
                  onClick={() => setSelectedHoldAlert(null)}
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
