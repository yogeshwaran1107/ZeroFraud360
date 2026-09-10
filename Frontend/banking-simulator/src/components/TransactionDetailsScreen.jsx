import React from 'react';
import './TransactionDetailsScreen.css';

export default function TransactionDetailsScreen({ onNavigate }) {
  const steps = [
    { title: 'Payment Initiated', time: '09:41:02 AM' },
    { title: 'Risk Check Passed', time: '09:41:03 AM' },
    { title: 'Debited from Your Account', time: '09:41:04 AM' },
    { title: 'Credited to Recipient', time: '09:41:06 AM' },
    { title: 'Completed', time: '09:41:06 AM' }
  ];

  return (
    <div className="mobile-wrapper">
      <div className="txn-details-screen">


        <div className="page-header">
          <button className="back-btn" onClick={() => onNavigate && onNavigate('history')}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="page-title">Transaction Details</h2>
          <div style={{ width: 24 }}></div>
        </div>

        <div className="txn-details-content">
          <div className="txn-info-card">
            <div className="txn-recipient-header">
              <div className="recipient-avatar">UB</div>
              <div className="recipient-text">
                <h3 className="recipient-name">User B</h3>
                <span className="recipient-acc">XXXX 5678</span>
              </div>
            </div>

            <div className="txn-amount-row">
              <span className="txn-amount-val">- ₹ 5,000.00</span>
              <span className="txn-success-badge">SUCCESS</span>
            </div>

            <div className="txn-kv-list">
              <div className="txn-kv-item">
                <span className="kv-label">Transaction ID</span>
                <span className="kv-val font-mono">TXN123456789</span>
              </div>

              <div className="txn-kv-item">
                <span className="kv-label">Date &amp; Time</span>
                <span className="kv-val">10 Sep 2026, 09:41 AM</span>
              </div>

              <div className="txn-kv-item">
                <span className="kv-label">Payment Method</span>
                <span className="kv-val">UPI</span>
              </div>

              <div className="txn-kv-item">
                <span className="kv-label">Status</span>
                <span className="kv-val">Success</span>
              </div>

              <div className="txn-kv-item">
                <span className="kv-label">Remarks</span>
                <span className="kv-val">Lunch payment</span>
              </div>
            </div>
          </div>

          <div className="processing-flow-card">
            <h3 className="flow-card-title">Processing Flow</h3>
            <div className="flow-timeline">
              {steps.map((step, idx) => (
                <div key={idx} className="timeline-step-item">
                  <div className="timeline-left">
                    <div className="step-check-icon">
                      <i className="fa-solid fa-circle-check"></i>
                    </div>
                    {idx < steps.length - 1 && <div className="step-connecting-line"></div>}
                  </div>
                  <div className="timeline-right">
                    <span className="step-title">{step.title}</span>
                    <span className="step-time">{step.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
