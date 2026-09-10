import React, { useState, useEffect } from 'react';
import { getAccountDetails, removeAuthToken } from '../services/api';
import './ProfileScreen.css';

export default function ProfileScreen({ onNavigate }) {
  const [showBalance, setShowBalance] = useState(true);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await getAccountDetails();
      if (res.success && res.account) {
        setAccount(res.account);
      }
    }
    load();
  }, []);

  const customerName = account?.customerName || 'Account Holder';
  const accNo = account?.accountNumber || '10001';
  const email = account?.email || `${customerName.toLowerCase().replace(/[^a-z]/g, '')}@zerofraud.bank`;
  const balanceVal = account?.availableBalance !== undefined ? account.availableBalance : 0.00;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    removeAuthToken();
    if (onNavigate) onNavigate('welcome');
  };

  const menuItems = [
    { id: 1, title: 'Manage Beneficiaries', icon: 'fa-solid fa-user-plus', action: () => onNavigate && onNavigate('dashboard') },
    { id: 2, title: 'Manage UPI PIN', icon: 'fa-solid fa-calculator', action: () => onNavigate && onNavigate('auth') },
    { id: 3, title: 'Transaction History', icon: 'fa-regular fa-clock', action: () => onNavigate && onNavigate('history') },
    { id: 4, title: 'Bank: ' + (account?.bankName || 'Bank of Simulation A'), icon: 'fa-solid fa-building-columns' },
    { id: 5, title: 'Sign Out / Switch User', icon: 'fa-solid fa-right-from-bracket', action: handleLogout, isDanger: true }
  ];

  return (
    <div className="mobile-wrapper">
      <div className="profile-screen">
        <div className="profile-page-header">
          <div style={{ width: 24 }}></div>
          <h2 className="page-title">Profile</h2>
          <button className="settings-btn" onClick={handleLogout} title="Sign Out">
            <i className="fa-solid fa-right-from-bracket" style={{ color: '#ef4444' }}></i>
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-user-card">
            <div className="profile-avatar">{getInitials(customerName)}</div>
            <div className="profile-user-details">
              <h3 className="profile-user-name">{customerName}</h3>
              <span className="profile-user-email">{email}</span>
            </div>
          </div>

          <div className="profile-account-card">
            <div className="profile-acc-top">
              <div>
                <div className="profile-acc-type">Savings Account ({account?.bankCode || 'BANK_A'})</div>
                <div className="profile-acc-num">ACC ID: {accNo}</div>
              </div>
              <button 
                className="profile-eye-btn" 
                onClick={() => setShowBalance(!showBalance)}
                title={showBalance ? "Hide Balance" : "Show Balance"}
              >
                <i className={`fa-regular ${showBalance ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>

            <div className="profile-acc-bottom">
              <div className="profile-bal-label">Available Balance</div>
              <div className="profile-bal-amount">
                {showBalance 
                  ? `₹ ${Number(balanceVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : '₹ ••••••••'}
              </div>
            </div>
          </div>

          <div className="profile-menu-list">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className="profile-menu-item"
                onClick={item.action || (() => alert(`${item.title}`))}
                style={item.isDanger ? { color: '#ef4444' } : {}}
              >
                <div className="menu-icon-wrap" style={item.isDanger ? { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' } : {}}>
                  <i className={item.icon}></i>
                </div>
                <span className="menu-item-title">{item.title}</span>
                <i className="fa-solid fa-chevron-right menu-chevron"></i>
              </div>
            ))}
          </div>
        </div>

        <div className="bottom-nav-bar">
          <button className="nav-item" onClick={() => onNavigate && onNavigate('dashboard')}>
            <i className="fa-solid fa-house"></i>
            <span>Home</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('transfer')}>
            <i className="fa-solid fa-money-bill-transfer"></i>
            <span>Transfer</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('history')}>
            <i className="fa-regular fa-clock"></i>
            <span>History</span>
          </button>
          <button className="nav-item active" onClick={() => onNavigate && onNavigate('profile')}>
            <i className="fa-solid fa-user"></i>
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
