import {
  LayoutDashboard,
  Bell,
  CreditCard,
  Lock,
  User,
  ShieldCheck,
  Building2,
  MapPin,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'alerts' | 'patterns' | 'forensics' | 'transactions' | 'holds' | 'profile' | 'developer';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  unreadAlertsCount: number;
  patternsCount?: number;
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
  patternsCount = 0,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Fraud Alerts', icon: Bell, badge: unreadAlertsCount },
    { id: 'patterns', label: 'Fraud Patterns', icon: ShieldCheck, badge: patternsCount > 0 ? patternsCount : undefined },
    { id: 'forensics', label: 'Account Forensics', icon: MapPin },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'holds', label: 'Account Holds', icon: Lock },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-200/80 select-none shadow-xs">
      {/* Top Brand / Private Bank Header */}
      <div>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-slate-200/80 overflow-hidden shrink-0">
            <img src="/ZeroFraud360.png" alt="ZeroFraud360 Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight text-slate-900 leading-none">
              ZeroFraud<span className="text-blue-700">360</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
              <Building2 className="h-2.5 w-2.5 text-blue-600" />
              <span>Private Bank Portal</span>
            </div>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-6 pt-5 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Navigation
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/90 text-blue-700 font-bold border-r-4 border-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      item.id === 'patterns'
                        ? 'bg-indigo-100 text-indigo-700'
                        : isActive
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-100 text-rose-700'
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

      {/* Bottom Footer Institutional Badge */}
      <div className="p-5 border-t border-slate-200/80 bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-600 text-xs mb-1 font-semibold">
          <ShieldCheck className="h-4 w-4 text-blue-700" />
          <span>Institutional Security</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          RBI / FIU-IND AML Compliant Engine
        </p>
        <div className="text-[10px] text-slate-400 font-mono mt-1.5 pt-1.5 border-t border-slate-200/60">
          ZeroFraud360 v1.0 • Live
        </div>
      </div>
    </aside>
  );
};
