import React, { useState, useRef } from 'react';
import { executeTransfer } from '../services/api';
import './PinAuthScreen.css';

export default function PinAuthScreen({ onNavigate, transferData, setLastReceipt }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
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
      alert(`❌ Transaction Error [${result.error || 'FAILED'}]: ${result.message}`);
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
      </div>
    </div>
  );
}
