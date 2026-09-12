import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import type { FraudAlert, ObservedTransaction, FraudPattern, DashboardMetrics } from './types';
import { Sidebar, type NavTab } from './components/Sidebar';

import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { FraudAlertsView } from './views/FraudAlertsView';
import { TransactionDetailsView } from './views/TransactionDetailsView';
import { AccountHoldsView } from './views/AccountHoldsView';
import { TransactionsView } from './views/TransactionsView';
import { FraudPatternsView } from './views/FraudPatternsView';
import { ProfileView } from './views/ProfileView';
import { DeveloperView } from './views/DeveloperView';
import { AccountForensicsView } from './views/AccountForensicsView';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/developer')) {
      return 'developer';
    }
    return 'dashboard';
  });
  const [selectedAlertForDetails, setSelectedAlertForDetails] = useState<FraudAlert | null>(null);

  // Real data state
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [transactions, setTransactions] = useState<ObservedTransaction[]>([]);
  const [patternsCount, setPatternsCount] = useState<number>(0);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Fetch real data continuously from ZeroFraud360 backend (:8081)
  const fetchRealData = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsDataLoading(true);
    try {
      const [alertsRes, txsRes, patternsRes, metricsRes] = await Promise.all([
        api.fraud.getAlerts(),
        api.fraud.getTransactions(),
        api.fraud.getPatterns().catch(() => [] as FraudPattern[]),
        api.fraud.getDashboardMetrics().catch(() => null),
      ]);
      setAlerts(alertsRes || []);
      setTransactions(txsRes || []);
      setPatternsCount(patternsRes?.length || 0);
      if (metricsRes) {
        setDashboardMetrics(metricsRes);
      }
      setIsBackendConnected(true);

      // If viewing details, update selectedAlert with latest status
      setSelectedAlertForDetails((prev) => {
        if (!prev) return null;
        const updated = (alertsRes || []).find((a) => a.alertId === prev.alertId);
        return updated || prev;
      });
    } catch {
      setIsBackendConnected(false);
    } finally {
      if (!silent) setIsDataLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchRealData(false);
    }
  }, [isAuthenticated, fetchRealData]);

  // Continuous real-time tracking polling every 2.5 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchRealData(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRealData]);

  // Handle browser URL changes (back/forward or manual navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname.includes('/developer')) {
          setActiveTab('developer');
          setSelectedAlertForDetails(null);
        } else if (activeTab === 'developer') {
          setActiveTab('dashboard');
        }
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [activeTab]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-900">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-200 mb-4 border border-slate-200 animate-pulse overflow-hidden">
          <img src="/ZeroFraud360.png" alt="ZeroFraud360 Logo" className="h-full w-full object-contain" />
        </div>
        <div className="text-base font-black tracking-tight text-slate-900">
          ZeroFraud<span className="text-blue-700">360</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">Connecting to Private Banking Core Engine (:8081)...</div>
      </div>
    );
  }

  const isDeveloperRoute = typeof window !== 'undefined' && window.location.pathname.includes('/developer');
  if (!isAuthenticated && !isDeveloperRoute) {
    return <LoginView />;
  }

  const getPageHeader = () => {
    if (selectedAlertForDetails) {
      return {
        title: 'Transaction Details',
        subtitle: 'Complete transaction analysis, money flow diagram, and clearance actions',
      };
    }
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Private Banking Risk Dashboard',
          subtitle: 'Real-time overview of fraud detection and account security',
        };
      case 'alerts':
        return {
          title: 'Fraud Alerts',
          subtitle: 'Suspicious transactions flagged across simulated customer accounts',
        };
      case 'patterns':
        return {
          title: 'Fraud Patterns Registry',
          subtitle: 'Manage and inspect confirmed fraud signatures, money mule patterns, and AML prevention rules',
        };
      case 'forensics':
        return {
          title: 'Account Forensics & Intelligence',
          subtitle: 'Investigate physical withdrawal modes, specific ATM/POS terminals, and geographic audit trails',
        };
      case 'transactions':
        return {
          title: 'Transactions Stream',
          subtitle: 'All payment transactions processed across simulated banks',
        };
      case 'holds':
        return {
          title: 'Account Holds & Locks',
          subtitle: 'Manage and view customer accounts placed on financial hold',
        };
      case 'profile':
        return {
          title: 'Officer Profile',
          subtitle: 'Officer credentials and security permissions',
        };
      case 'developer':
        return {
          title: 'Developer Control & Demo Studio',
          subtitle: 'One-click data wiping, account unfreezing, and automated multi-hop demonstration controls',
        };
      default:
        return {
          title: 'ZeroFraud360',
          subtitle: 'Real-Time Fraud Detection',
        };
    }
  };

  const headerMeta = getPageHeader();
  const unreadAlertsCount = alerts.filter((a) => a.status === 'HOLD_ACTIVE').length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
      {/* Left Sidebar - White Private Bank Theme */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedAlertForDetails(null);
          if (typeof window !== 'undefined') {
            if (tab === 'developer') {
              window.history.pushState(null, '', '/developer');
            } else {
              window.history.pushState(null, '', '/');
            }
          }
        }}
        unreadAlertsCount={unreadAlertsCount}
        patternsCount={patternsCount}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - White Theme */}
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          alertsCount={unreadAlertsCount}
          recentAlerts={alerts.filter((a) => a.status === 'HOLD_ACTIVE')}
          onSelectAlert={(alert) => {
            setSelectedAlertForDetails(alert);
          }}
          onAlertsClick={() => {
            setActiveTab('alerts');
            setSelectedAlertForDetails(null);
          }}
          isBackendConnected={isBackendConnected}
        />

        {/* Page Content View */}
        <main className="flex-1 px-8 pb-8 pt-4 overflow-y-auto">
          {selectedAlertForDetails ? (
            <TransactionDetailsView
              alert={selectedAlertForDetails}
              onBack={() => setSelectedAlertForDetails(null)}
              onHoldReleased={() => fetchRealData(true)}
            />
          ) : activeTab === 'dashboard' ? (
            <DashboardView
              alerts={alerts}
              transactions={transactions}
              metrics={dashboardMetrics}
              isLoading={isDataLoading}
              onViewAllAlerts={() => setActiveTab('alerts')}
              onSelectAlert={(a) => setSelectedAlertForDetails(a)}
            />
          ) : activeTab === 'alerts' ? (
            <FraudAlertsView
              alerts={alerts}
              isLoading={isDataLoading}
              onSelectAlert={(a) => setSelectedAlertForDetails(a)}
            />
          ) : activeTab === 'patterns' ? (
            <FraudPatternsView
              onPatternsUpdated={() => fetchRealData(true)}
            />
          ) : activeTab === 'forensics' ? (
            <AccountForensicsView />
          ) : activeTab === 'transactions' ? (
            <TransactionsView
              transactions={transactions}
              isLoading={isDataLoading}
            />
          ) : activeTab === 'holds' ? (
            <AccountHoldsView
              alerts={alerts}
              isLoading={isDataLoading}
              onHoldReleased={() => fetchRealData(true)}
            />
          ) : activeTab === 'developer' ? (
            <DeveloperView onSimulationTriggered={() => fetchRealData(true)} />
          ) : (
            <ProfileView />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
