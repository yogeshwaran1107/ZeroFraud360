import React, { useState, useEffect } from 'react';
import type { FraudPattern } from '../types';
import { api } from '../api/client';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';

interface FraudPatternsViewProps {
  onPatternsUpdated?: () => void;
}

export const FraudPatternsView: React.FC<FraudPatternsViewProps> = ({ onPatternsUpdated }) => {
  const [patterns, setPatterns] = useState<FraudPattern[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Add Pattern form state
  const [name, setName] = useState('');
  const [patternType, setPatternType] = useState('RAPID_PASS_THROUGH');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState('CRITICAL');
  const [sourceAccount, setSourceAccount] = useState('');
  const [muleAccount, setMuleAccount] = useState('');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [minAmount, setMinAmount] = useState('10000');
  const [timeWindow, setTimeWindow] = useState('180');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatterns = async () => {
    setIsLoading(true);
    try {
      const data = await api.fraud.getPatterns();
      setPatterns(data || []);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a pattern name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.fraud.createPattern({
        patternName: name.trim(),
        patternType,
        description: description.trim(),
        riskLevel,
        sourceAccount: sourceAccount.trim() || undefined,
        muleAccount: muleAccount.trim() || undefined,
        destinationAccount: destinationAccount.trim() || undefined,
        minAmount: parseFloat(minAmount) || 0,
        timeWindowSeconds: parseInt(timeWindow, 10) || 180,
        actionTaken: 'CONFIRMED_FRAUD_BLOCK',
        confirmedByOfficer: 'OFFICER',
      });

      setIsAddModalOpen(false);
      setName('');
      setDescription('');
      setSourceAccount('');
      setMuleAccount('');
      setDestinationAccount('');
      await fetchPatterns();
      if (onPatternsUpdated) onPatternsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to save pattern.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    if (!confirm('Archive this pattern from active enforcement?')) return;
    try {
      await api.fraud.deletePattern(patternId);
      await fetchPatterns();
      if (onPatternsUpdated) onPatternsUpdated();
    } catch {
      // Ignore
    }
  };

  const filteredPatterns = patterns.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.patternName.toLowerCase().includes(term) ||
      p.patternId.toLowerCase().includes(term) ||
      p.patternType.toLowerCase().includes(term) ||
      (p.sourceAccount && p.sourceAccount.toLowerCase().includes(term)) ||
      (p.destinationAccount && p.destinationAccount.toLowerCase().includes(term))
    );
  });

  const activeCount = patterns.filter((p) => p.status === 'ACTIVE').length;
  const criticalCount = patterns.filter((p) => p.riskLevel === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-2">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Total Registered Patterns</p>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {isLoading ? '...' : patterns.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Persisted in Registry</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-2">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Active Enforcement Rules</p>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {isLoading ? '...' : activeCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Automated Pre-Hold Triggers</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-2">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Critical Risk Signatures</p>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {isLoading ? '...' : criticalCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Instant STOP Decision</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 mb-2">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Interbank Protection</p>
          <div className="text-2xl font-black text-indigo-900 mt-1">100%</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Consortium Broadcast Active</p>
        </div>
      </div>

      {/* Control Header with Search & Add Pattern Button */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pattern name, type, account ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-700/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Pattern</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3.5 px-6">Pattern Details</th>
                <th className="py-3.5 px-6">Type &amp; Risk</th>
                <th className="py-3.5 px-6">Monitored Flow</th>
                <th className="py-3.5 px-6">Thresholds</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading fraud patterns registry...
                  </td>
                </tr>
              ) : filteredPatterns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Patterns Match Your Query
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      When fraud is confirmed by officers or registered here, detection signatures are saved to this registry.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatterns.map((p) => {
                  const isCritical = p.riskLevel === 'CRITICAL';
                  const isActive = p.status === 'ACTIVE';

                  return (
                    <tr key={p.patternId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-xs">{p.patternName}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.patternId}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-500 mt-1 max-w-sm line-clamp-1">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] text-slate-700 font-medium">
                          {p.patternType}
                        </span>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isCritical
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {p.riskLevel}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        {p.sourceAccount || p.destinationAccount ? (
                          <div className="space-y-0.5">
                            {p.sourceAccount && (
                              <div className="text-slate-600">Origin: <span className="text-slate-900 font-semibold">{p.sourceAccount}</span></div>
                            )}
                            {p.muleAccount && (
                              <div className="text-amber-700">Mule: <span className="font-semibold">{p.muleAccount}</span></div>
                            )}
                            {p.destinationAccount && (
                              <div className="text-rose-700 font-bold">Dest: {p.destinationAccount}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Any Account</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px]">
                        <div>Amount: <span className="font-bold text-slate-800">₹{Number(p.minAmount || 0).toLocaleString('en-IN')}</span>+</div>
                        <div className="text-slate-500">Window: {p.timeWindowSeconds || 180}s</div>
                      </td>
                      <td className="py-4 px-6">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isActive && (
                          <button
                            onClick={() => handleDeletePattern(p.patternId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Archive Pattern"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Add Pattern Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                <span>Register New Fraud Prevention Pattern</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreatePattern} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pattern Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mule Account Cluster Detection #4"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pattern Type</label>
                  <select
                    value={patternType}
                    onChange={(e) => setPatternType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="RAPID_PASS_THROUGH">RAPID_PASS_THROUGH</option>
                    <option value="HIGH_VALUE_SPIKE">HIGH_VALUE_SPIKE</option>
                    <option value="STRUCTURING_SMURFING">STRUCTURING_SMURFING</option>
                    <option value="MULE_BURST">MULE_BURST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Risk Level</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="CRITICAL">CRITICAL (Instant STOP)</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 text-[11px] font-semibold mb-1">Origin Account</label>
                  <input
                    type="text"
                    value={sourceAccount}
                    onChange={(e) => setSourceAccount(e.target.value)}
                    placeholder="Optional (e.g. 10001)"
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] font-semibold mb-1">Mule Account</label>
                  <input
                    type="text"
                    value={muleAccount}
                    onChange={(e) => setMuleAccount(e.target.value)}
                    placeholder="Optional (e.g. 10002)"
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] font-semibold mb-1">Dest. Account</label>
                  <input
                    type="text"
                    value={destinationAccount}
                    onChange={(e) => setDestinationAccount(e.target.value)}
                    placeholder="Optional (e.g. 10003)"
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Threshold (₹)</label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Time Window (seconds)</label>
                  <input
                    type="number"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pattern Analysis Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Account repeatedly receives high-value transfers and relays within 2 minutes to third-party bank."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-blue-700/20"
                >
                  {isSubmitting ? 'Saving Pattern...' : 'Save & Enforce'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
