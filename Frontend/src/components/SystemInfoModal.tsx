import React from 'react';
import { X, Cpu, Server, Key, ArrowRight } from 'lucide-react';


interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                ZeroFraud360 — Architecture & Endpoints Reference
              </h3>
              <p className="text-xs text-slate-400">
                Specification Guide for Port 8081 &bull; Isolated Database <code className="text-amber-400">zerofraud360_db</code>
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Microservices Separation Notice */}
          <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
              <Server className="h-4 w-4" />
              Microservice Boundaries: Decoupled Architecture
            </div>
            <p className="text-slate-300 leading-relaxed">
              This frontend connects specifically to the <strong className="text-white">ZeroFraud360</strong> fraud-monitoring service
              running on port <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">8081</code>.
              It does NOT connect directly to <strong className="text-slate-400">IndianBankSimulation</strong> (:8080);
              all hold enforcements and releases are executed securely via machine-to-machine internal service tokens (<code className="text-slate-400">sim-secret-token-360</code>).
            </p>
          </div>

          {/* Anomaly Detection Rule */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Rapid Pass-Through Anomaly Rule ($A \rightarrow B \rightarrow C$)
            </div>
            <p className="text-slate-400">
              ZeroFraud360 monitors confirmed payment events (<code className="text-slate-300">PAYMENT_SUCCESS</code>).
              When money moves from Account A to B, then from Account B to C within &le; 180 seconds for matching amounts,
              the sliding window scanner flags a suspected mule transit.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-emerald-400">Leg 1: A &rarr; B (₹X)</span>
              <ArrowRight className="h-3 w-3 text-slate-500" />
              <span className="text-amber-400">Leg 2: B &rarr; C (₹X)</span>
              <span className="text-rose-400 font-bold ml-auto">&Delta;t &le; 180s &rarr; HOLD C</span>
            </div>
          </div>

          {/* Endpoints Reference Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Endpoints in ZeroFraud360 (:8081)
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5">Path</th>
                    <th className="p-2.5">Access</th>
                    <th className="p-2.5">Function</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  <tr>
                    <td className="p-2 text-emerald-400 font-bold">POST</td>
                    <td className="p-2 text-slate-200">/api/auth/login</td>
                    <td className="p-2 text-slate-400">Public</td>
                    <td className="p-2 text-slate-300 font-sans">Officer sign-in, returns JWT</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-blue-400 font-bold">GET</td>
                    <td className="p-2 text-slate-200">/api/auth/me</td>
                    <td className="p-2 text-purple-400">Bearer JWT</td>
                    <td className="p-2 text-slate-300 font-sans">Current officer profile</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-blue-400 font-bold">GET</td>
                    <td className="p-2 text-slate-200">/api/fraud/alerts</td>
                    <td className="p-2 text-purple-400">Bearer JWT</td>
                    <td className="p-2 text-slate-300 font-sans">All detected fraud alerts</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-blue-400 font-bold">GET</td>
                    <td className="p-2 text-slate-200">/api/fraud/transactions</td>
                    <td className="p-2 text-purple-400">Bearer JWT</td>
                    <td className="p-2 text-slate-300 font-sans">Observed bank events store</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-emerald-400 font-bold">POST</td>
                    <td className="p-2 text-slate-200">/api/officer/holds/&#123;id&#125;/release</td>
                    <td className="p-2 text-purple-400">Officer Roles</td>
                    <td className="p-2 text-slate-300 font-sans">Audited hold release on Bank</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-emerald-400 font-bold">POST</td>
                    <td className="p-2 text-slate-200">/internal/v1/events/payment-success</td>
                    <td className="p-2 text-slate-400">Public / Bus</td>
                    <td className="p-2 text-slate-300 font-sans">Ingests confirmed payment event</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pre-Seeded Officer Credentials */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              Pre-Seeded Officer Credentials (BCrypt Protected)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-3 space-y-1">
                <div className="font-bold text-blue-400">👮 Police Officer</div>
                <div>User: <code className="text-white font-bold">police</code></div>
                <div>Pass: <code className="text-slate-300">Police@12345</code></div>
                <div className="text-[10px] text-slate-400">ROLE_POLICE</div>
              </div>
              <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-3 space-y-1">
                <div className="font-bold text-purple-400">💻 Cyber Cell Analyst</div>
                <div>User: <code className="text-white font-bold">cyber</code></div>
                <div>Pass: <code className="text-slate-300">Cyber@12345</code></div>
                <div className="text-[10px] text-slate-400">ROLE_CYBER</div>
              </div>
              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 space-y-1">
                <div className="font-bold text-emerald-400">🏦 Bank Compliance</div>
                <div>User: <code className="text-white font-bold">bank</code></div>
                <div>Pass: <code className="text-slate-300">Bank@12345</code></div>
                <div className="text-[10px] text-slate-400">ROLE_BANK</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 px-6 py-4 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
