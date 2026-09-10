import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, Radio, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  alertsCount: number;
  onAlertsClick: () => void;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  alertsCount,
  onAlertsClick,
  isBackendConnected,
}) => {
  const { user, logout, role } = useAuth();

  const getRoleDisplayName = (r?: string | null) => {
    switch (r) {
      case 'ROLE_BANK':
        return 'Bank Compliance Officer';
      case 'ROLE_POLICE':
        return 'Police Cyber Officer';
      case 'ROLE_CYBER':
        return 'Cyber Crime Analyst';
      default:
        return 'Bank Officer';
    }
  };

  const getInitials = (r?: string | null) => {
    switch (r) {
      case 'ROLE_BANK':
        return 'BO';
      case 'ROLE_POLICE':
        return 'PO';
      case 'ROLE_CYBER':
        return 'CY';
      default:
        return 'OF';
    }
  };

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Page Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
            <ShieldCheck className="h-3 w-3 text-blue-700" />
            Authorized View
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {/* Right User & Controls */}
      <div className="flex items-center gap-5">
        {/* Real-Time Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
            <Radio
              className={`h-3 w-3 ${
                isBackendConnected ? 'text-emerald-500 animate-pulse' : 'text-rose-500'
              }`}
            />
            <span className={isBackendConnected ? 'text-emerald-700 font-semibold text-xs' : 'text-rose-600 text-xs'}>
              {isBackendConnected ? 'Live Core Sync (:8081)' : 'Offline'}
            </span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">{formattedDate}</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onAlertsClick}
          className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors cursor-pointer border border-slate-200/60"
          title="Fraud Alerts"
        >
          <Bell className="h-4 w-4" />
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
              {alertsCount > 9 ? '9+' : alertsCount}
            </span>
          )}
        </button>

        {/* Officer Avatar & Details */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-black text-xs shadow-xs">
            {getInitials(role)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {getRoleDisplayName(role)}
            </div>
            <div className="text-[11px] text-slate-400 leading-tight font-mono">
              {user?.username || 'Officer'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1 cursor-pointer border border-transparent hover:border-rose-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
