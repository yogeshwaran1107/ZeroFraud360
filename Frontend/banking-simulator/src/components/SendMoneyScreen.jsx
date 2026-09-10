import React, { useState } from 'react';
import './SendMoneyScreen.css';

export default function SendMoneyScreen({ onNavigate, transferData, setTransferData }) {
  const [amount, setAmount] = useState(transferData?.amount || '5000');
  const [selectedMethod, setSelectedMethod] = useState(transferData?.method || 'upi');
  const [remarks, setRemarks] = useState(transferData?.remarks || 'Lunch payment');

  const presetAmounts = ['500', '1000', '5000', '10000'];

  const handleContinue = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (setTransferData) {
      setTransferData({
        amount,
        method: selectedMethod,
        remarks,
        recipient: 'User B',
        recipientAcc: '2000000001'
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
          <div className="form-section">
            <label className="section-label">Transfer To</label>
            <div className="recipient-card">
              <div className="recipient-info">
                <div className="recipient-avatar">UB</div>
                <div className="recipient-details">
                  <span className="recipient-name">User B (Bob Verma)</span>
                  <span className="recipient-acc">ACC: 2000000001</span>
                </div>
              </div>
              <button className="change-btn" type="button">Change</button>
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
                  <span className="method-sub">Real-time transfer</span>
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
                  <span className="method-sub">Real-time transfer</span>
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
                  <span className="method-sub">Processed in batches</span>
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
                  <span className="method-title">RTGS (Real-time)</span>
                  <span className="method-sub">For high value transfers</span>
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
              placeholder="Add a note"
            />
          </div>
        </div>

        <div className="bottom-action-container">
          <button className="btn-continue" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
