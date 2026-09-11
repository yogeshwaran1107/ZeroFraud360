import React, { useState, useRef } from 'react';
import { executeTransfer } from '../services/api';
import './PinAuthScreen.css';

export default function PinAuthScreen({ onNavigate, transferData, setLastReceipt }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [fraudModalMessage, setFraudModalMessage] = useState(null);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value !== '' && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleAuthorize = async (e) => {
    e.preventDefault();
    const fullPin = pin.join('');
    if (fullPin.length < 6) {
      alert('Please enter your 6-digit UPI PIN (Default: 123456).');
      return;
    }

    setLoading(true);

    const senderAcc = transferData?.senderAcc || localStorage.getItem('activeAccountNumber') || '10001';
    const receiverAcc = transferData?.recipientAcc || '10002';

    const result = await executeTransfer({
      senderAccountNumber: senderAcc,
      receiverAccountNumber: receiverAcc,
      amount: transferData?.amount || '5000',
      upiPin: fullPin,
      paymentRail: transferData?.method === 'upi' ? 'SIMULATED_UPI' : (transferData?.method || 'SIMULATED_UPI').toUpperCase(),
      remarks: transferData?.remarks || 'Payment'
    });

    setLoading(false);

    if (result.success) {
      if (setLastReceipt) {
        setLastReceipt({
          transactionId: result.data.transactionId || 'TXN123456789',
          amount: parseFloat(transferData?.amount || '5000'),
          recipient: transferData?.recipient || 'Beneficiary',
          recipientAcc: receiverAcc,
          senderAcc: senderAcc,
          method: (transferData?.method || 'UPI').toUpperCase(),
          remarks: transferData?.remarks || 'Payment',
          occurredAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        });
      }
      if (onNavigate) onNavigate('success');
    } else {
      if (result.error === 'ACCOUNT_BLOCKED_FRAUD' || result.message?.includes('tracking you') || result.message?.includes('fraud')) {
        setFraudModalMessage(result.message || 'You have been marked as a fraud and the officials are tracking you! All outbound transfers are suspended.');
      } else {
        alert(`❌ Transaction Error [${result.error || 'FAILED'}]: ${result.message}`);
      }
    }
  };

  return (
    <div className="mobile-wrapper">
      <div className="pin-auth-screen">


        <div className="page-header">
          <button className="back-btn" onClick={() => onNavigate && onNavigate('transfer')}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="page-title">Authenticate</h2>
          <div style={{ width: 24 }}></div>
        </div>

        <div className="pin-auth-content">
          <div className="lock-icon-container">
            <div className="lock-circle-outer">
              <div className="lock-circle-inner">
                <i className="fa-solid fa-lock"></i>
              </div>
            </div>
          </div>

          <div className="auth-text-header">
            <h3 className="auth-main-title">Enter UPI PIN</h3>
            <p className="auth-sub-desc">
              Enter your 6-digit UPI PIN to authorize transfer of ₹{parseFloat(transferData?.amount || 5000).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="pin-input-row">
            {pin.map((digit, idx) => (
              <div key={idx} className={`pin-box ${digit ? 'filled' : ''}`}>
                <input
                  ref={inputRefs[idx]}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="pin-box-input"
                />
                {digit && <span className="pin-dot">●</span>}
              </div>
            ))}
          </div>

          <div className="npci-security-card">
            <div className="npci-icon-wrap">
              <i className="fa-solid fa-shield"></i>
            </div>
            <p className="npci-text">
              This transaction is secured with 2-Factor Authentication as per NPCI guidelines. (Default PIN: 123456)
            </p>
          </div>
        </div>

        <div className="bottom-action-container">
          <button className="btn-authorize" onClick={handleAuthorize} disabled={loading}>
            {loading ? 'Processing Payment...' : 'Authorize'}
          </button>
        </div>

        {fraudModalMessage && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.35)',
              border: '2px solid #f43f5e'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: '#ffe4e6',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px'
              }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <span style={{
                display: 'inline-block',
                background: '#ffe4e6',
                color: '#be123c',
                fontWeight: '800',
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                marginBottom: '10px'
              }}>
                ACCOUNT FROZEN & TRACKED
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px' }}>
                You have been marked as a fraud and the officials are tracking you!
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px' }}>
                Your account is currently frozen due to suspected fraudulent multi-hop activity. Banking compliance and cyber crime officials are tracking this account.
              </p>
              <button
                onClick={() => {
                  setFraudModalMessage(null);
                  if (onNavigate) onNavigate('dashboard');
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
