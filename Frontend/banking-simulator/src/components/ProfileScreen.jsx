import React, { useState } from 'react';
import './ProfileScreen.css';

export default function ProfileScreen({ onNavigate }) {
  const [showBalance, setShowBalance] = useState(true);

  const menuItems = [
    { id: 1, title: 'Account Details', icon: 'fa-regular fa-id-card' },
    { id: 2, title: 'Manage UPI PIN', icon: 'fa-solid fa-calculator', action: () => onNavigate && onNavigate('auth') },
    { id: 3, title: 'Beneficiaries', icon: 'fa-solid fa-user-plus' },
    { id: 4, title: 'Security Settings', icon: 'fa-solid fa-lock', action: () => onNavigate && onNavigate('simulator') },
    { id: 5, title: 'Notifications', icon: 'fa-regular fa-bell' },
    { id: 6, title: 'About', icon: 'fa-solid fa-circle-info' },
  ];

  return (
    <div className="mobile-wrapper">
      <div className="profile-screen">


        <div className="profile-page-header">
          <div style={{ width: 24 }}></div>
          <h2 className="page-title">Profile</h2>
          <button className="settings-btn">
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-user-card">
            <div className="profile-avatar">UA</div>
            <div className="profile-user-details">
              <h3 className="profile-user-name">User A</h3>
              <span className="profile-user-email">usera@bank.com</span>
            </div>
          </div>

          <div className="profile-account-card">
            <div className="profile-acc-top">
              <div>
                <div className="profile-acc-type">Savings Account</div>
                <div className="profile-acc-num">XXXX 1234</div>
              </div>
              <button 
                className="profile-eye-btn" 
                onClick={() => setShowBalance(!showBalance)}
              >
                <i className={`fa-regular ${showBalance ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>

            <div className="profile-acc-bottom">
              <div className="profile-bal-label">Available Balance</div>
              <div className="profile-bal-amount">
                {showBalance ? '₹ 50,000.00' : '₹ ••••••••'}
              </div>
            </div>
          </div>

          <div className="profile-menu-list">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className="profile-menu-item"
                onClick={item.action || (() => alert(`Opened ${item.title}`))}
              >
                <div className="menu-icon-wrap">
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
