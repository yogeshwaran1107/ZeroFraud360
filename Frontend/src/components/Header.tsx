import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, Radio } from 'lucide-react';

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
        return 'Bank Officer';
      case 'ROLE_POLICE':
        return 'Police Officer';
      case 'ROLE_CYBER':
        return 'Cyber Analyst';
      default:
        return 'Officer';
    }
  };

  const getInitials = (r?: string | null) => {
    switch (r) {
      case 'ROLE_BANK':
        return 'BA';
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {/* Right User & Controls matching reference image */}
      <div className="flex items-center gap-6">
        {/* Real-Time Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
            <Radio
              className={`h-3 w-3 ${
                isBackendConnected ? 'text-emerald-500 animate-pulse' : 'text-rose-500'
              }`}
            />
            <span className={isBackendConnected ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
              {isBackendConnected ? 'Real-Time Sync (:8081)' : 'Offline'}
            </span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">{formattedDate}</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onAlertsClick}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Fraud Alerts"
        >
          <Bell className="h-5 w-5" />
          {alertsCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Officer Avatar & Details matching reference design */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
            {getInitials(role)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {getRoleDisplayName(role)}
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              {user?.username || 'Officer'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
