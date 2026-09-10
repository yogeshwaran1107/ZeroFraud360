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
  const [currentPage, setCurrentPage] = useState('welcome');

  // Dynamic transfer state shared across IndianBankSim flow
  const [transferData, setTransferData] = useState({
    amount: '5000',
    method: 'upi',
    remarks: 'Transfer payment',
    recipient: 'Naveen K',
    recipientAcc: '10002',
    senderAcc: '10001'
  });

  const [lastReceipt, setLastReceipt] = useState(null);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleSelectBeneficiary = (ben) => {
    setTransferData(prev => ({
      ...prev,
      recipient: ben.recipient,
      recipientAcc: ben.recipientAcc,
      senderAcc: localStorage.getItem('activeAccountNumber') || '10001'
    }));
    setCurrentPage('transfer');
  };

  return (
    <div>
      {/* Native Mobile Screen Router */}
      {currentPage === 'welcome' && (
        <WelcomeScreen 
          onNavigate={handleNavigate} 
          onLoginSuccess={(acc) => {
            if (acc) {
              setTransferData(prev => ({
                ...prev,
                senderAcc: acc.accountNumber
              }));
            }
          }}
        />
      )}

      {currentPage === 'dashboard' && (
        <DashboardScreen 
          onNavigate={handleNavigate} 
          onSelectBeneficiary={handleSelectBeneficiary}
        />
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
