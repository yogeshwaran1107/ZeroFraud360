import React, { useState, useEffect } from 'react';
import { getAccountDetails } from '../services/api';
import './DashboardScreen.css';

export default function DashboardScreen({ onNavigate }) {
  const [showBalance, setShowBalance] = useState(true);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function loadAccount() {
      const res = await getAccountDetails();
      if (res.success && res.account) {
        setAccount(res.account);
      }
    }
    loadAccount();
  }, []);

  const balanceVal = account?.availableBalance !== undefined ? account.availableBalance : 50000.00;
  const accNo = account?.accountNumber || '1000000001';
  const customerName = account?.customerName || 'Alice Sharma (User A)';

  return (
    <div className="mobile-wrapper">
      <div className="dashboard-screen">


        <div className="user-header">
          <div className="user-info">
            <div className="user-avatar">UA</div>
            <div className="greeting-text">
              <span className="greeting-label">Hello,</span>
              <h2 className="user-name">{customerName.split(' ')[0]}</h2>
            </div>
          </div>
          <button className="notification-btn">
            <i className="fa-regular fa-bell"></i>
          </button>
        </div>

        <div className="dashboard-content">
          <div className="account-card">
            <div className="acc-card-top">
              <div>
                <div className="acc-type">Savings Account ({account?.bankCode || 'BANK_A'})</div>
                <div className="acc-mask">ACC: {accNo}</div>
              </div>
            </div>

            <div className="acc-card-bottom">
              <div>
                <div className="balance-label">Available Balance</div>
                <div className="balance-amount">
                  {showBalance ? `₹ ${balanceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ ••••••••'}
                </div>
              </div>
              <button 
                className="eye-toggle-btn" 
                onClick={() => setShowBalance(!showBalance)}
              >
                <i className={`fa-regular ${showBalance ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
          </div>

          <div className="quick-actions-grid">
            <div className="action-item" onClick={() => onNavigate && onNavigate('transfer')}>
              <div className="action-circle-btn">
                <i className="fa-solid fa-paper-plane"></i>
              </div>
              <span className="action-label">Send Money</span>
            </div>

            <div className="action-item">
              <div className="action-circle-btn">
                <i className="fa-solid fa-qrcode"></i>
              </div>
              <span className="action-label">Receive Money</span>
            </div>

            <div className="action-item">
              <div className="action-circle-btn">
                <i className="fa-solid fa-credit-card"></i>
              </div>
              <span className="action-label">Account Details</span>
            </div>

            <div className="action-item" onClick={() => onNavigate && onNavigate('history')}>
              <div className="action-circle-btn">
                <i className="fa-regular fa-file-lines"></i>
              </div>
              <span className="action-label">Transaction History</span>
            </div>
          </div>

          <div className="section-container">
            <h3 className="section-title">Quick Transfer</h3>
            <div className="quick-transfer-row">
              <div className="beneficiary-card">
                <div className="beneficiary-info">
                  <div className="beneficiary-avatar">UB</div>
                  <div className="beneficiary-details">
                    <span className="beneficiary-name">User B (Bob)</span>
                    <span className="beneficiary-acc">ACC: 2000000001</span>
                  </div>
                </div>
                <button className="send-mini-btn" onClick={() => onNavigate && onNavigate('transfer')}>Send</button>
              </div>

              <div className="add-beneficiary-card">
                <div className="add-icon-circle">
                  <i className="fa-solid fa-plus"></i>
                </div>
                <span className="add-label">Add Beneficiary</span>
              </div>
            </div>
          </div>

          <div className="section-container">
            <h3 className="section-title">Payment Methods</h3>
            <div className="payment-methods-grid">
              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-play method-arrow-icon"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">UPI</span>
                  <span className="method-desc">Instant (24x7)</span>
                </div>
              </div>

              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-play method-arrow-icon"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">IMPS</span>
                  <span className="method-desc">Instant (24x7)</span>
                </div>
              </div>

              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-arrows-rotate"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">NEFT</span>
                  <span className="method-desc">Batch (24x7)</span>
                </div>
              </div>

              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-arrows-up-down-left-right"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">RTGS</span>
                  <span className="method-desc">Real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bottom-nav-bar">
          <button className="nav-item active" onClick={() => onNavigate && onNavigate('dashboard')}>
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
          <button className="nav-item" onClick={() => onNavigate && onNavigate('profile')}>
            <i className="fa-regular fa-user"></i>
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
