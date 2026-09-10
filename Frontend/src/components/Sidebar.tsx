import React from 'react';
import {
  LayoutDashboard,
  Bell,
  CreditCard,
  Lock,
  User,
  Shield,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'alerts' | 'transactions' | 'holds' | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  unreadAlertsCount: number;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Fraud Alerts', icon: Bell, badge: unreadAlertsCount },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'holds', label: 'Account Holds', icon: Lock },
    { id: 'profile', label: 'My Profile', icon: User },
  ];


  return (
    <aside className="w-64 bg-[#071326] text-white flex flex-col justify-between shrink-0 min-h-screen border-r border-[#13233e] select-none">
      {/* Top Brand */}
      <div>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-[#13233e]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Shield className="h-5 w-5 fill-current" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            ZeroFraud<span className="text-blue-500">360</span>
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#0e2242]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Badge matching reference design */}
      <div className="p-6 border-t border-[#13233e]">
        <div className="flex items-center gap-2.5 text-slate-400 text-xs mb-2">
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="font-medium text-slate-300">Together for Safer Transactions</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ZeroFraud360 v1.0 (Simulation)
        </div>
      </div>
    </aside>
  );
};
