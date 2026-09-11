import React, { useState, useEffect } from 'react';
import { getBeneficiaries, getAccountDetails, SAMPLE_ACCOUNTS, getActiveAccountNumber } from '../services/api';
import './SendMoneyScreen.css';

export default function SendMoneyScreen({ onNavigate, transferData, setTransferData }) {
  const [amount, setAmount] = useState(transferData?.amount || '5000');
  const [selectedMethod, setSelectedMethod] = useState(transferData?.method || 'upi');
  const [remarks, setRemarks] = useState(transferData?.remarks || 'Payment');

  const [recipientName, setRecipientName] = useState(transferData?.recipient || 'Naveen K');
  const [recipientAcc, setRecipientAcc] = useState(transferData?.recipientAcc || '10002');
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [customAccInput, setCustomAccInput] = useState('');
  const [isFrozen, setIsFrozen] = useState(false);

  const activeAccNo = getActiveAccountNumber();

  useEffect(() => {
    async function load() {
      const accRes = await getAccountDetails();
      if (accRes.success && accRes.account && accRes.account.status === 'FROZEN') {
        setIsFrozen(true);
      }
      const res = await getBeneficiaries();
      if (res.success && res.beneficiaries) {
        setBeneficiaries(res.beneficiaries);
      }
    }
    load();
  }, []);

  const presetAmounts = ['500', '1000', '2000', '5000', '10000'];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSelectRecipient = (name, acc) => {
    setRecipientName(name);
    setRecipientAcc(acc);
    setShowPicker(false);
  };

  const handleCustomAccSubmit = (e) => {
    e.preventDefault();
    if (!customAccInput.trim()) return;
    const match = SAMPLE_ACCOUNTS.find(a => a.accountNumber === customAccInput.trim());
    if (match) {
      setRecipientName(match.customerName);
      setRecipientAcc(match.accountNumber);
    } else {
      setRecipientName(`Account ${customAccInput.trim()}`);
      setRecipientAcc(customAccInput.trim());
    }
    setShowPicker(false);
    setCustomAccInput('');
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (isFrozen) {
      alert('🚨 ACTION BLOCKED: You have been marked as a fraud and the officials are tracking you! All outbound transfers are suspended.');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (recipientAcc === activeAccNo) {
      alert('Cannot transfer to the same account. Please choose a different recipient.');
      return;
    }

    if (setTransferData) {
      setTransferData({
        amount,
        method: selectedMethod,
        remarks,
        recipient: recipientName,
        recipientAcc: recipientAcc,
        senderAcc: activeAccNo
      });
    }

    if (onNavigate) onNavigate('auth');
  };

  return (
    <div className="mobile-wrapper">
      <div className="send-money-screen">
        <div className="page-header">
          <button className="back-btn" onClick={() => onNavigate && onNavigate('dashboard')}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="page-title">Send Money</h2>
          <div style={{ width: 24 }}></div>
        </div>

        <div className="send-money-content">
          {isFrozen && (
            <div style={{
              margin: '0 0 18px',
              padding: '14px 16px',
              borderRadius: '16px',
              background: '#fff1f2',
              border: '2px solid #f43f5e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#ffe4e6',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}>
                <i className="fa-solid fa-ban"></i>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#881337', marginBottom: '2px' }}>
                  Transfers Suspended
                </div>
                <div style={{ fontSize: '11px', color: '#9f1239', lineHeight: '1.4' }}>
                  You have been marked as a fraud and the officials are tracking you! Outbound payments are restricted.
                </div>
              </div>
            </div>
          )}

          <div className="form-section">
            <label className="section-label">Transfer To (Beneficiary)</label>
            <div className="recipient-card">
              <div className="recipient-info">
                <div className="recipient-avatar">{getInitials(recipientName)}</div>
                <div className="recipient-details">
                  <span className="recipient-name">{recipientName}</span>
                  <span className="recipient-acc">ACC ID: {recipientAcc}</span>
                </div>
              </div>
              <button 
                className="change-btn" 
                type="button"
                onClick={() => setShowPicker(true)}
              >
                Change
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">Amount</label>
            <div className="amount-input-box">
              <span className="currency-prefix">₹</span>
              <input 
                type="number" 
                className="amount-input" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="amount-chips">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`chip-btn ${amount === preset ? 'active' : ''}`}
                  onClick={() => setAmount(preset)}
                >
                  ₹ {parseInt(preset).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">Payment Method</label>
            <div className="payment-methods-list">
              <label 
                className={`payment-option ${selectedMethod === 'upi' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('upi')}
              >
                <div className="radio-dot">
                  {selectedMethod === 'upi' && <div className="radio-inner-dot"></div>}
                </div>
                <div className="method-icon-wrap upi-icon">
                  <i className="fa-solid fa-play"></i>
                </div>
                <div className="method-details">
                  <span className="method-title">UPI (Instant)</span>
                  <span className="method-sub">Real-time settlement</span>
                </div>
              </label>

              <label 
                className={`payment-option ${selectedMethod === 'imps' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('imps')}
              >
                <div className="radio-dot">
                  {selectedMethod === 'imps' && <div className="radio-inner-dot"></div>}
                </div>
                <div className="method-icon-wrap">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div className="method-details">
                  <span className="method-title">IMPS (Instant)</span>
                  <span className="method-sub">Immediate payment service</span>
                </div>
              </label>

              <label 
                className={`payment-option ${selectedMethod === 'neft' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('neft')}
              >
                <div className="radio-dot">
                  {selectedMethod === 'neft' && <div className="radio-inner-dot"></div>}
                </div>
                <div className="method-icon-wrap">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <div className="method-details">
                  <span className="method-title">NEFT (Batch)</span>
                  <span className="method-sub">Electronic funds transfer</span>
                </div>
              </label>

              <label 
                className={`payment-option ${selectedMethod === 'rtgs' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('rtgs')}
              >
                <div className="radio-dot">
                  {selectedMethod === 'rtgs' && <div className="radio-inner-dot"></div>}
                </div>
                <div className="method-icon-wrap">
                  <i className="fa-solid fa-indian-rupee-sign"></i>
                </div>
                <div className="method-details">
                  <span className="method-title">RTGS (High Value)</span>
                  <span className="method-sub">Real-time gross settlement</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">Remarks (Optional)</label>
            <input 
              type="text" 
              className="remarks-input" 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add a payment note"
            />
          </div>
        </div>

        <div className="bottom-action-container">
          <button className="btn-continue" onClick={handleContinue}>
            Continue
          </button>
        </div>

        {/* Change Recipient Modal */}
        {showPicker && (
          <div className="login-modal-overlay">
            <div className="login-modal-card">
              <div className="login-modal-header">
                <h3>Select Beneficiary</h3>
                <button className="modal-close-btn" onClick={() => setShowPicker(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Saved Beneficiaries List */}
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Your Beneficiaries:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {beneficiaries.map((b) => (
                    <button
                      key={b.id || b.accountNumber}
                      type="button"
                      onClick={() => handleSelectRecipient(b.beneficiaryName, b.accountNumber)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        padding: '10px 12px',
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{b.beneficiaryName}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', color: '#38bdf8', fontSize: 12 }}>
                        {b.accountNumber}
                      </span>
                    </button>
                  ))}
                  {beneficiaries.length === 0 && (
                    <p style={{ fontSize: 12, color: '#64748b' }}>No saved beneficiaries yet.</p>
                  )}
                </div>
              </div>

              {/* Quick Select All Personas */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Or Select Teammate Persona:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {SAMPLE_ACCOUNTS
                    .filter(a => a.accountNumber !== activeAccNo)
                    .map(a => (
                      <button
                        key={a.accountNumber}
                        type="button"
                        onClick={() => handleSelectRecipient(a.customerName, a.accountNumber)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          color: '#e2e8f0',
                          padding: '6px 10px',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {a.customerName} ({a.accountNumber})
                      </button>
                    ))}
                </div>
              </div>

              {/* Or Type 5-Digit Account Number */}
              <form onSubmit={handleCustomAccSubmit}>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Or Enter 5-Digit Account Number</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={customAccInput}
                    onChange={(e) => setCustomAccInput(e.target.value)}
                    placeholder="e.g. 10003"
                  />
                </div>
                <button type="submit" className="btn-modal-submit">
                  Use This Account
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
