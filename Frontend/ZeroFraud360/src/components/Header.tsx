import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  LogOut,
  Calendar,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { FraudAlert } from '../types';

interface HeaderProps {
  title: string;
  subtitle: string;
  alertsCount: number;
  recentAlerts?: FraudAlert[];
  onAlertsClick: () => void;
  onSelectAlert?: (alert: FraudAlert) => void;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  alertsCount,
  recentAlerts = [],
  onAlertsClick,
  onSelectAlert,
  isBackendConnected,
}) => {
  const { user, logout, role } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const getRoleDisplayName = (r?: string | null) => {
    switch (r) {
      case 'ROLE_BANK':
        return 'Bank Compliance Officer';
      case 'ROLE_POLICE':
        return 'Police Cyber Officer';
      case 'ROLE_CYBER':
        return 'Cyber Crime Analyst';
      default:
        return 'Police Cyber Officer';
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
        return 'PO';
    }
  };

  // Format: "Sat, 12 Sept, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(currentDate);

  // Format: "05:10 am"
  const formattedTime = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(currentDate).toLowerCase();

  const formatRelativeTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <header className="px-8 pt-6 pb-2 sticky top-0 z-30 pointer-events-none">
      <div className="bg-white rounded-3xl p-3.5 px-6 border border-slate-100 shadow-sm flex items-center justify-between gap-4 pointer-events-auto backdrop-blur-md bg-white/95">
        {/* Left: Shield Logo Badge + Title + Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Shield with Padlock Icon */}
          <div className="h-11 w-11 rounded-2xl bg-[#EEF4FF] flex items-center justify-center text-[#1877F2] shrink-0 shadow-xs">
            <svg className="h-6 w-6 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
              <path
                d="M12 7c-1.38 0-2.5 1.12-2.5 2.5V11H9c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1h-.5V9.5C14.5 8.12 13.38 7 12 7zm1.2 4h-2.4V9.5c0-.66.54-1.2 1.2-1.2s1.2.54 1.2 1.2V11z"
                fill="#ffffff"
              />
            </svg>
          </div>

          {/* Title and Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                {title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-4 sm:gap-5 shrink-0">
          {/* Live Core Sync Status Pill */}
          {/* <div className="hidden xl:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F0FDF4] text-[#15803D] font-bold text-xs border border-[#DCFCE7]">
            <span className="text-sm font-black leading-none tracking-tighter text-[#16A34A]">((•))</span>
            <span>{isBackendConnected ? 'Live Core Sync (:8081)' : 'Offline'}</span>
          </div> */}

          {/* Date & Time Calendar Widget */}
          <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-slate-100">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-xs font-bold text-slate-600">{formattedDate}</div>
              <div className="text-[11px] text-slate-400 font-medium">{formattedTime}</div>
            </div>
          </div>

          {/* Notification Bell with Real Counter & Interactive Dropdown */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className={`relative h-10 w-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                isNotificationsOpen
                  ? 'bg-blue-50 border-blue-200 text-[#1877F2]'
                  : 'bg-[#F8FAFC] hover:bg-slate-100 border-slate-100 text-slate-600'
              }`}
              title="Notifications & Alerts"
            >
              <Bell className="h-4 w-4" />
              {/* Badge shown ONLY if alertsCount > 0 */}
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-[#FF2D55] text-[10px] font-black text-white ring-2 ring-white animate-pulse">
                  {alertsCount > 9 ? '9+' : alertsCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2.5 w-84 rounded-3xl bg-white border border-slate-100 shadow-2xl shadow-slate-300/60 p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {alertsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#FF2D55] text-[10px] font-bold border border-rose-100">
                        {alertsCount} unread
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                        All clear
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      onAlertsClick();
                    }}
                    className="text-[11px] font-bold text-[#1877F2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="py-2">
                  {recentAlerts.length === 0 && alertsCount === 0 ? (
                    <div className="py-7 text-center">
                      <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2.5">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">No New Notifications</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All core payment streams are operating normally with no active holds.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 divide-y divide-slate-50">
                      {recentAlerts.slice(0, 5).map((alert) => {
                        const isHold = alert.status === 'HOLD_ACTIVE';
                        return (
                          <div
                            key={alert.alertId}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              if (onSelectAlert) onSelectAlert(alert);
                            }}
                            className="pt-2 first:pt-0 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isHold
                                    ? 'bg-rose-50 text-[#FF2D55]'
                                    : 'bg-amber-50 text-amber-600'
                                }`}
                              >
                                {isHold ? (
                                  <ShieldAlert className="h-4 w-4" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {alert.patternType === 'MULTI_HOP_FRAUD_CHAIN'
                                      ? 'Mule Chain Detected'
                                      : 'Rapid Pass-Through'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {formatRelativeTime(alert.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  Held: {alert.destinationAccountId} · ₹
                                  {Number(alert.secondAmount).toLocaleString('en-IN')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Officer Avatar & Details */}
          <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-100">
            <div className="h-10 w-10 rounded-full bg-[#1E3A8A] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {getInitials(role)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1 leading-tight">
                <span>{getRoleDisplayName(role)}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
              <div className="text-[11px] text-slate-400 font-medium leading-tight">
                {user?.username || 'police'}
              </div>
            </div>
          </div>

          {/* Sign Out Action */}
          <button
            onClick={logout}
            title="Sign Out"
            className="h-10 w-10 rounded-2xl bg-[#F8FAFC] hover:bg-rose-50 border border-slate-100 hover:border-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
