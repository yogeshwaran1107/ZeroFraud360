import React, { useState } from 'react';
import { loginUser, SAMPLE_ACCOUNTS } from '../services/api';
import './WelcomeScreen.css';

export default function WelcomeScreen({ onNavigate, onLoginSuccess }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [identifier, setIdentifier] = useState('10001');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (idToUse = identifier, pwdToUse = password) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await loginUser(idToUse, pwdToUse);
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess(res.account);
        }
        if (onNavigate) {
          onNavigate('dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (acc) => {
    setIdentifier(acc.accountNumber);
    setPassword('Password@123');
    handleLogin(acc.accountNumber, 'Password@123');
  };

  return (
    <div className="mobile-wrapper welcome-wrapper">
      <div className="welcome-screen">
        {/* Header Branding */}
        <div className="branding-section">
          <div className="bank-logo-icon">
            <svg viewBox="0 0 100 80" className="pillar-svg">
              <polygon points="50,10 10,35 90,35" fill="currentColor" />
              <rect x="15" y="37" width="70" height="5" fill="currentColor" />
              <rect x="22" y="45" width="12" height="25" rx="2" fill="currentColor" />
              <rect x="44" y="45" width="12" height="25" rx="2" fill="currentColor" />
              <rect x="66" y="45" width="12" height="25" rx="2" fill="currentColor" />
              <rect x="15" y="73" width="70" height="6" fill="currentColor" />
            </svg>
          </div>
          <h1 className="app-title">IndianBankSim</h1>
          <p className="app-subtitle">Multi-Account Real-Time Banking &amp; Fraud Detection</p>
        </div>

        {/* Center Illustration */}
        <div className="map-illustration-container">
          <div className="india-map-watermark">
            <svg viewBox="0 0 300 300" className="india-svg">
              <path 
                d="M150 40 Q160 50 180 55 T210 70 T240 95 T260 120 T240 140 T220 150 T200 160 T180 180 T170 210 T160 250 T150 270 T140 250 T130 210 T120 180 T100 160 T80 150 T60 140 T40 120 T60 95 T90 70 T120 55 T140 50 Z" 
                fill="rgba(255, 255, 255, 0.08)"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <div className="rupee-orbit">
            <span className="rupee-symbol">₹</span>
            <svg className="orbit-arrows-svg" viewBox="0 0 160 160">
              <path 
                d="M 30 80 A 50 50 0 0 1 130 80" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.4)" 
                strokeWidth="2" 
                strokeDasharray="4 4"
              />
              <path 
                d="M 130 80 A 50 50 0 0 1 30 80" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.4)" 
                strokeWidth="2" 
              />
              <polygon points="128,72 138,80 126,86" fill="rgba(255, 255, 255, 0.7)" />
            </svg>
          </div>
        </div>

        {/* Quick Select Accounts Panel */}
        <div className="quick-accounts-section">
          <div className="quick-accounts-header">
            <span>Select Account (5-Digit ID):</span>
          </div>
          <div className="quick-accounts-grid">
            {SAMPLE_ACCOUNTS.map(acc => (
              <button
                key={acc.accountNumber}
                type="button"
                className={`quick-acc-btn ${identifier === acc.accountNumber ? 'active' : ''}`}
                onClick={() => handleQuickSelect(acc)}
                title={`Login as ${acc.customerName} (${acc.accountNumber})`}
              >
                <div className="acc-tag-id">{acc.accountNumber}</div>
                <div className="acc-tag-name">{acc.customerName}</div>
                <div className="acc-tag-bal">₹{acc.availableBalance.toLocaleString('en-IN')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-welcome-login" onClick={() => setShowLoginModal(true)}>
            <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }}></i>
            Login with Account ID
          </button>
        </div>

        {/* Footer Note */}
        <div className="welcome-footer">
          Each account has individual wallet balance &amp; transaction history backed by the database.
        </div>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="login-modal-overlay">
            <div className="login-modal-card">
              <div className="login-modal-header">
                <h3>Account Login</h3>
                <button className="modal-close-btn" onClick={() => setShowLoginModal(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {errorMessage && (
                <div className="login-error-banner">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                <div className="form-group">
                  <label>5-Digit Account ID or Username</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 10001, 10002, muthu"
                    required
                  />
                  <span className="input-hint">Sample Account IDs: 10001, 10002, 10003, 10004, 10005, 10006</span>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="modal-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password@123"
                    required
                  />
                  <span className="input-hint">Default password: Password@123</span>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-modal-submit" disabled={loading}>
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
