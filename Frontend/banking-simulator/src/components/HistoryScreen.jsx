import React, { useState, useEffect } from 'react';
import { getTransactionHistory, getActiveAccountNumber, SAMPLE_ACCOUNTS } from '../services/api';
import './HistoryScreen.css';

export default function HistoryScreen({ onNavigate }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeAccNo = getActiveAccountNumber();

  const getAccountName = (accNo) => {
    const found = SAMPLE_ACCOUNTS.find(a => a.accountNumber === String(accNo));
    return found ? found.customerName : `Account ${accNo}`;
  };

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const res = await getTransactionHistory(activeAccNo);
      if (res.success && res.transactions && res.transactions.length > 0) {
        const formatted = res.transactions.map((t, idx) => {
          const isDebit = String(t.senderAccountId) === String(activeAccNo);
          const counterParty = isDebit ? t.receiverAccountId : t.senderAccountId;
          const name = getAccountName(counterParty);
          const dateStr = t.occurredAt 
            ? new Date(t.occurredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : 'Recent';

          const rail = (t.paymentRail || 'UPI').replace('SIMULATED_', '');

          return {
            id: t.id || t.transactionId || idx,
            name,
            type: isDebit ? 'Sent' : 'Received',
            mode: rail,
            amount: parseFloat(t.amount || 0),
            isDebit,
            timestamp: dateStr
          };
        });
        setTransactions(formatted);
      } else {
        // Sample baseline history for this account
        setTransactions([
          {
            id: 101,
            name: 'Initial Account Credit',
            type: 'Received',
            mode: 'NEFT',
            amount: 25000,
            isDebit: false,
            timestamp: '01 Sep 2026, 10:00 AM'
          }
        ]);
      }
      setLoading(false);
    }
    loadHistory();
  }, [activeAccNo]);

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
          {loading ? (
            <p style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No transactions found.</p>
          ) : (
            filteredTransactions.map((item) => (
              <div 
                key={item.id} 
                className="history-list-item"
                onClick={() => onNavigate && onNavigate('dashboard')}
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
                    {item.isDebit ? '- ₹ ' : '+ ₹ '}{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="item-time">{item.timestamp}</div>
                </div>

                <i className="fa-solid fa-chevron-right chevron-icon"></i>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
