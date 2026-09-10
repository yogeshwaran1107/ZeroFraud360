import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import DashboardScreen from './components/DashboardScreen';
import SendMoneyScreen from './components/SendMoneyScreen';
import PinAuthScreen from './components/PinAuthScreen';
import SuccessScreen from './components/SuccessScreen';
import HistoryScreen from './components/HistoryScreen';
import ProfileScreen from './components/ProfileScreen';
import TransactionDetailsScreen from './components/TransactionDetailsScreen';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('welcome'); // Starts on Welcome Landing screen

  // Dynamic transfer state shared across IndianBankSim flow
  const [transferData, setTransferData] = useState({
    amount: '5000',
    method: 'upi',
    remarks: 'Lunch payment',
    recipient: 'User B (Bob Verma)',
    recipientAcc: '2000000001'
  });

  const [lastReceipt, setLastReceipt] = useState(null);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div>
      {/* Native Mobile Screen Router */}
      {currentPage === 'welcome' && (
        <WelcomeScreen onNavigate={handleNavigate} />
      )}

      {currentPage === 'dashboard' && (
        <DashboardScreen onNavigate={handleNavigate} />
      )}

      {currentPage === 'transfer' && (
        <SendMoneyScreen 
          onNavigate={handleNavigate} 
          transferData={transferData}
          setTransferData={setTransferData}
        />
      )}

      {currentPage === 'auth' && (
        <PinAuthScreen 
          onNavigate={handleNavigate} 
          transferData={transferData}
          setLastReceipt={setLastReceipt}
        />
      )}

      {currentPage === 'success' && (
        <SuccessScreen 
          onNavigate={handleNavigate} 
          lastReceipt={lastReceipt}
        />
      )}

      {currentPage === 'history' && (
        <HistoryScreen onNavigate={handleNavigate} />
      )}

      {currentPage === 'profile' && (
        <ProfileScreen onNavigate={handleNavigate} />
      )}

      {currentPage === 'details' && (
        <TransactionDetailsScreen onNavigate={handleNavigate} />
      )}
    </div>
  );
}
