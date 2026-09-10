import React from 'react';
import './SuccessScreen.css';

export default function SuccessScreen({ onNavigate, lastReceipt }) {
  const amount = lastReceipt?.amount || 5000;
  const txnId = lastReceipt?.transactionId || 'TXN123456789';
  const recipient = lastReceipt?.recipient || 'User B';
  const method = lastReceipt?.method || 'UPI';
  const remarks = lastReceipt?.remarks || 'Lunch payment';
  const date = lastReceipt?.occurredAt || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="mobile-wrapper">
      <div className="success-screen">

        <div className="success-content">
          <div className="checkmark-container">
            <div className="checkmark-circle-outer">
              <div className="checkmark-circle-inner">
                <i className="fa-solid fa-check"></i>
              </div>
            </div>
          </div>

          <h2 className="success-title">Money Sent Successfully!</h2>
          <div className="success-amount">₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>

          <div className="recipient-row-card">
            <div className="recipient-avatar">UB</div>
            <div className="recipient-text-group">
              <span className="to-label">To</span>
              <h3 className="recipient-name">{recipient}</h3>
              <span className="recipient-acc">XXXX 5678</span>
            </div>
          </div>

          <div className="receipt-details-list">
            <div className="receipt-item">
              <span className="receipt-label">Transaction ID</span>
              <span className="receipt-val font-mono">{txnId}</span>
            </div>

            <div className="receipt-item">
              <span className="receipt-label">Date &amp; Time</span>
              <span className="receipt-val">{date}</span>
            </div>

            <div className="receipt-item">
              <span className="receipt-label">Payment Method</span>
              <span className="receipt-val payment-method-val">
                <i className="fa-solid fa-play upi-icon"></i> {method}
              </span>
            </div>

            <div className="receipt-item">
              <span className="receipt-label">Remarks</span>
              <span className="receipt-val">{remarks}</span>
            </div>
          </div>
        </div>

        <div className="bottom-receipt-actions">
          <button className="btn-done" onClick={() => onNavigate && onNavigate('dashboard')}>
            Done
          </button>
          <button className="btn-view-details" onClick={() => onNavigate && onNavigate('details')}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
