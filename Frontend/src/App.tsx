import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import type { FraudAlert, ObservedTransaction } from './types';
import { Sidebar, type NavTab } from './components/Sidebar';

import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { FraudAlertsView } from './views/FraudAlertsView';
import { TransactionDetailsView } from './views/TransactionDetailsView';
import { AccountHoldsView } from './views/AccountHoldsView';
import { TransactionsView } from './views/TransactionsView';
import { ProfileView } from './views/ProfileView';
import { Shield } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedAlertForDetails, setSelectedAlertForDetails] = useState<FraudAlert | null>(null);

  // Real data state
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [transactions, setTransactions] = useState<ObservedTransaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Fetch real data continuously from ZeroFraud360 backend (:8081)
  const fetchRealData = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsDataLoading(true);
    try {
      const [alertsRes, txsRes] = await Promise.all([
        api.fraud.getAlerts(),
        api.fraud.getTransactions(),
      ]);
      setAlerts(alertsRes || []);
      setTransactions(txsRes || []);
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#071326] text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30 mb-4 animate-pulse">
          <Shield className="h-8 w-8 fill-current" />
        </div>
        <div className="text-base font-extrabold tracking-tight">ZeroFraud360</div>
        <div className="text-xs text-slate-400 mt-1">Connecting to Fraud Detection Engine...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const getPageHeader = () => {
    if (selectedAlertForDetails) {
      return {
        title: 'Transaction Details',
        subtitle: 'Complete transaction information and fraud analysis',
      };
    }
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Real-time overview of fraud detection and account security',
        };
      case 'alerts':
        return {
          title: 'Fraud Alerts',
          subtitle: 'Transactions flagged by ZeroFraud360',
        };
      case 'transactions':
        return {
          title: 'Transactions',
          subtitle: 'All payment transactions processed across simulated banks',
        };
      case 'holds':
        return {
          title: 'Account Holds',
          subtitle: 'Manage and view accounts placed on hold',
        };
      case 'profile':
        return {
          title: 'My Profile',
          subtitle: 'Officer credentials and security permissions',
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
    <div className="flex min-h-screen bg-[#f4f6fb] text-slate-800 font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedAlertForDetails(null);
        }}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          alertsCount={unreadAlertsCount}
          onAlertsClick={() => {
            setActiveTab('alerts');
            setSelectedAlertForDetails(null);
          }}
          isBackendConnected={isBackendConnected}
        />

        {/* Page Content View */}
        <main className="flex-1 p-8 overflow-y-auto">
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
