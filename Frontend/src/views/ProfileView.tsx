import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Key, Server, CheckCircle2, LogOut } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, role, logout } = useAuth();

  const getRoleDisplayName = (r?: string | null) => {
    switch (r) {
      case 'ROLE_BANK':
        return 'Bank Compliance Officer';
      case 'ROLE_POLICE':
        return 'Law Enforcement Police Officer';
      case 'ROLE_CYBER':
        return 'Cyber Crime Cell Analyst';
      default:
        return 'Authorized Officer';
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white font-extrabold text-xl shadow-lg shadow-blue-600/30">
            {user?.username?.slice(0, 2).toUpperCase() || 'OF'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{getRoleDisplayName(role)}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Username: <span className="font-mono font-bold text-slate-700">{user?.username}</span></p>
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Authenticated Session
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Shield className="h-3.5 w-3.5 text-blue-500" /> Security Role
            </span>
            <div className="font-mono font-bold text-slate-800 text-sm">{role}</div>
            <p className="text-[11px] text-slate-500">Authorized to review alerts and release fund holds</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Server className="h-3.5 w-3.5 text-blue-500" /> Service Target
            </span>
            <div className="font-mono font-bold text-slate-800 text-sm">Port 8081</div>
            <p className="text-[11px] text-slate-500">Database: <code className="text-slate-700">zerofraud360_db</code></p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Key className="h-3.5 w-3.5 text-amber-500" /> Token Expiry
            </span>
            <div className="font-mono font-bold text-slate-800 text-sm">3600 Seconds (1 Hour)</div>
            <p className="text-[11px] text-slate-500">Stateless HMAC-SHA256 JWT</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <User className="h-3.5 w-3.5 text-purple-500" /> Account Status
            </span>
            <div className="font-mono font-bold text-emerald-600 text-sm">Enabled</div>
            <p className="text-[11px] text-slate-500">Security locking active after 5 failed attempts</p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end">
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out of Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
