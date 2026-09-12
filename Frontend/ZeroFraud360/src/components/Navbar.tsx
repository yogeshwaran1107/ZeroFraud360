import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Cpu, LogOut, Radio, Terminal } from 'lucide-react';


interface NavbarProps {
  activeTab: 'alerts' | 'transactions' | 'simulator';
  setActiveTab: (tab: 'alerts' | 'transactions' | 'simulator') => void;
  onOpenSystemInfo: () => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSystemInfo,
  isBackendConnected,
}) => {
  const { user, logout, role } = useAuth();

  const getRoleBadgeStyle = (userRole?: string | null) => {
    switch (userRole) {
      case 'ROLE_POLICE':
        return 'bg-blue-900/60 text-blue-300 border-blue-500/50 shadow-blue-900/20';
      case 'ROLE_CYBER':
        return 'bg-purple-900/60 text-purple-300 border-purple-500/50 shadow-purple-900/20';
      case 'ROLE_BANK':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50 shadow-emerald-900/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getRoleLabel = (userRole?: string | null) => {
    switch (userRole) {
      case 'ROLE_POLICE':
        return 'POLICE OFFICER';
      case 'ROLE_CYBER':
        return 'CYBER CELL ANALYST';
      case 'ROLE_BANK':
        return 'BANK COMPLIANCE';
      default:
        return userRole || 'OFFICER';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-md overflow-hidden shrink-0">
            <img src="/ZeroFraud360.png" alt="ZeroFraud360 Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                ZeroFraud<span className="text-red-500">360</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                Port 8081
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Autonomous Money-Flow Fraud Detection & Hold Enforcement
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Fraud Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Observed Transactions</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Mule Simulator</span>
          </button>
        </nav>

        {/* Right: Officer Profile & Status */}
        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <button
            onClick={onOpenSystemInfo}
            title="System Info & Documentation"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-500 animate-ping' : 'bg-red-500'
              }`}
            />
            <Cpu className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden md:inline">Arch & Docs</span>
          </button>

          {/* User badge */}
          {user && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-medium text-slate-200">{user.username}</div>
                <div
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                    role
                  )}`}
                >
                  {getRoleLabel(role)}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
