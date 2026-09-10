import React, { useState } from 'react';
import './HistoryScreen.css';

export default function HistoryScreen({ onNavigate }) {
  const [activeFilter, setActiveFilter] = useState('All');

  const transactions = [
    {
      id: 1,
      name: 'User B',
      type: 'Sent',
      mode: 'UPI',
      amount: 5000,
      isDebit: true,
      timestamp: '10 Sep 2026, 09:41 AM'
    },
    {
      id: 2,
      name: 'User B',
      type: 'Received',
      mode: 'UPI',
      amount: 2000,
      isDebit: false,
      timestamp: '09 Sep 2026, 06:12 PM'
    },
    {
      id: 3,
      name: 'User B',
      type: 'Sent',
      mode: 'IMPS',
      amount: 1000,
      isDebit: true,
      timestamp: '08 Sep 2026, 11:30 AM'
    },
    {
      id: 4,
      name: 'Salary Credit',
      type: 'Received',
      mode: 'NEFT',
      amount: 50000,
      isDebit: false,
      timestamp: '01 Sep 2026, 09:00 AM'
    },
    {
      id: 5,
      name: 'Electricity Bill',
      type: 'Sent',
      mode: 'UPI',
      amount: 1200,
      isDebit: true,
      timestamp: '28 Aug 2026, 07:45 PM'
    },
    {
      id: 6,
      name: 'User B',
      type: 'Received',
      mode: 'UPI',
      amount: 3000,
      isDebit: false,
      timestamp: '25 Aug 2026, 04:20 PM'
    }
  ];

  const filterCategories = ['All', 'UPI', 'IMPS', 'NEFT', 'RTGS'];

  const filteredTransactions = activeFilter === 'All'
    ? transactions
    : transactions.filter(t => t.mode.toUpperCase() === activeFilter.toUpperCase());

  return (
    <div className="mobile-wrapper">
      <div className="history-screen">


        <div className="page-header">
          <button className="back-btn" onClick={() => onNavigate && onNavigate('dashboard')}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="page-title">Transaction History</h2>
          <div style={{ width: 24 }}></div>
        </div>

        <div className="filter-chips-container">
          {filterCategories.map((cat) => (
            <button
              key={cat}
              className={`filter-chip ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="history-list-content">
          {filteredTransactions.map((item) => (
            <div 
              key={item.id} 
              className="history-list-item"
              onClick={() => onNavigate && onNavigate('details')}
            >
              <div className={`history-icon-badge ${item.isDebit ? 'debit' : 'credit'}`}>
                <i className={`fa-solid ${item.isDebit ? 'fa-arrow-up-right-from-square' : 'fa-arrow-down'}`}></i>
              </div>

              <div className="history-item-details">
                <span className="item-name">{item.name}</span>
                <span className="item-mode">{item.type} • {item.mode}</span>
              </div>

              <div className="history-item-right">
                <div className={`item-amount ${item.isDebit ? 'debit-amount' : 'credit-amount'}`}>
                  {item.isDebit ? '- ₹ ' : '+ ₹ '}{item.amount.toLocaleString('en-IN')}
                </div>
                <div className="item-time">{item.timestamp}</div>
              </div>

              <i className="fa-solid fa-chevron-right chevron-icon"></i>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
