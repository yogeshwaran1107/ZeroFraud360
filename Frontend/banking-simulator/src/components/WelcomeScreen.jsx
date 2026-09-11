import React, { useState } from 'react';
import { loginUser, SAMPLE_ACCOUNTS } from '../services/api';
import mapImage from '../assets/Map.jpg';
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

        {/* Center Map Image */}
        <div className="center-map-wrapper">
          <div className="center-map-card">
            <img 
              src={mapImage} 
              alt="India Inter-Bank Simulation Network Map" 
              className="center-map-img" 
            />
            <div className="map-badge-overlay">
              <span className="live-dot"></span>
              <span>All India Inter-Bank Simulated Network</span>
            </div>
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
