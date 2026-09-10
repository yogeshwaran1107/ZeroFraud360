import React, { useState, useEffect } from 'react';
import { getAccountDetails, getBeneficiaries, addBeneficiary, SAMPLE_ACCOUNTS, removeAuthToken } from '../services/api';
import './DashboardScreen.css';

export default function DashboardScreen({ onNavigate, onSelectBeneficiary }) {
  const [showBalance, setShowBalance] = useState(true);
  const [account, setAccount] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add Beneficiary form state
  const [newBenName, setNewBenName] = useState('');
  const [newBenAcc, setNewBenAcc] = useState('');
  const [newBenIfsc, setNewBenIfsc] = useState('SIMU000001');
  const [newBenBank, setNewBenBank] = useState('Bank of Simulation A');
  const [newBenUpi, setNewBenUpi] = useState('');
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const accRes = await getAccountDetails();
    if (accRes.success && accRes.account) {
      setAccount(accRes.account);
    }
    const benRes = await getBeneficiaries();
    if (benRes.success && benRes.beneficiaries) {
      setBeneficiaries(benRes.beneficiaries);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const balanceVal = account?.availableBalance !== undefined ? account.availableBalance : 0.00;
  const accNo = account?.accountNumber || '10001';
  const customerName = account?.customerName || 'Account Holder';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSendToBeneficiary = (ben) => {
    if (onSelectBeneficiary) {
      onSelectBeneficiary({
        recipient: ben.beneficiaryName,
        recipientAcc: ben.accountNumber,
        ifsc: ben.ifsc,
        bankName: ben.bankName,
        upiId: ben.upiId
      });
    }
    if (onNavigate) {
      onNavigate('transfer');
    }
  };

  const handleSelectPresetPersona = (persona) => {
    setNewBenName(persona.customerName);
    setNewBenAcc(persona.accountNumber);
    setNewBenIfsc(persona.ifsc);
    setNewBenBank(persona.bankName);
    setNewBenUpi(persona.upiId);
  };

  const handleAddBeneficiarySubmit = async (e) => {
    e.preventDefault();
    if (!newBenName.trim() || !newBenAcc.trim()) {
      setFormError('Please enter beneficiary name and account number.');
      return;
    }

    setFormError('');
    const res = await addBeneficiary({
      beneficiaryName: newBenName.trim(),
      accountNumber: newBenAcc.trim(),
      ifsc: newBenIfsc.trim() || 'SIMU000001',
      bankName: newBenBank.trim() || 'Bank of Simulation',
      upiId: newBenUpi.trim()
    });

    if (res.success) {
      setShowAddModal(false);
      setNewBenName('');
      setNewBenAcc('');
      setNewBenUpi('');
      // Reload beneficiaries
      const benRes = await getBeneficiaries();
      if (benRes.success) {
        setBeneficiaries(benRes.beneficiaries);
      }
    } else {
      setFormError(res.message || 'Failed to add beneficiary.');
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    if (onNavigate) onNavigate('welcome');
  };

  return (
    <div className="mobile-wrapper">
      <div className="dashboard-screen">
        {/* User Header */}
        <div className="user-header">
          <div className="user-info">
            <div className="user-avatar">{getInitials(customerName)}</div>
            <div className="greeting-text">
              <span className="greeting-label">Hello,</span>
              <h2 className="user-name">{customerName.split(' ')[0]}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button 
              className="notification-btn" 
              onClick={handleLogout} 
              title="Switch Account / Sign Out"
              style={{ color: '#ef4444', fontSize: 18 }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
            <button className="notification-btn" onClick={loadData} title="Refresh Balance">
              <i className="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Account Balance Card */}
          <div className="account-card">
            <div className="acc-card-top">
              <div>
                <div className="acc-type">Savings Account ({account?.bankName || account?.bankCode || 'ZeroFraud Bank'})</div>
                <div className="acc-mask" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
                  ACC ID: {accNo}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  IFSC: {account?.ifsc || 'SIMU000001'} | UPI: {account?.upiId || `${customerName.toLowerCase().split(' ')[0]}@bank`}
                </div>
              </div>
            </div>

            <div className="acc-card-bottom" style={{ marginTop: 20 }}>
              <div>
                <div className="balance-label">Available Balance</div>
                <div className="balance-amount">
                  {showBalance ? `₹ ${Number(balanceVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹ ••••••••'}
                </div>
              </div>
              <button 
                className="eye-toggle-btn" 
                onClick={() => setShowBalance(!showBalance)}
                title={showBalance ? "Hide Balance" : "Show Balance"}
              >
                <i className={`fa-regular ${showBalance ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-grid">
            <div className="action-item" onClick={() => onNavigate && onNavigate('transfer')}>
              <div className="action-circle-btn">
                <i className="fa-solid fa-paper-plane"></i>
              </div>
              <span className="action-label">Send Money</span>
            </div>

            <div className="action-item" onClick={() => setShowAddModal(true)}>
              <div className="action-circle-btn">
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <span className="action-label">Add Beneficiary</span>
            </div>

            <div className="action-item" onClick={() => onNavigate && onNavigate('profile')}>
              <div className="action-circle-btn">
                <i className="fa-solid fa-wallet"></i>
              </div>
              <span className="action-label">Account Details</span>
            </div>

            <div className="action-item" onClick={() => onNavigate && onNavigate('history')}>
              <div className="action-circle-btn">
                <i className="fa-regular fa-file-lines"></i>
              </div>
              <span className="action-label">History</span>
            </div>
          </div>

          {/* Quick Transfer / Beneficiaries Section */}
          <div className="section-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title">Saved Beneficiaries</h3>
              <button 
                onClick={() => setShowAddModal(true)}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                + Add New
              </button>
            </div>

            <div className="quick-transfer-row">
              {beneficiaries.map((ben) => (
                <div key={ben.id || ben.accountNumber} className="beneficiary-card">
                  <div className="beneficiary-info">
                    <div className="beneficiary-avatar">{getInitials(ben.beneficiaryName)}</div>
                    <div className="beneficiary-details">
                      <span className="beneficiary-name">{ben.beneficiaryName}</span>
                      <span className="beneficiary-acc">ACC: {ben.accountNumber}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{ben.bankName || 'Simulated Bank'}</span>
                    </div>
                  </div>
                  <button 
                    className="send-mini-btn" 
                    onClick={() => handleSendToBeneficiary(ben)}
                  >
                    Pay Beneficiary
                  </button>
                </div>
              ))}

              <div className="add-beneficiary-card" onClick={() => setShowAddModal(true)}>
                <div className="add-icon-circle">
                  <i className="fa-solid fa-plus"></i>
                </div>
                <span className="add-label">Add Beneficiary</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="section-container">
            <h3 className="section-title">Payment Methods</h3>
            <div className="payment-methods-grid">
              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-play method-arrow-icon"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">UPI</span>
                  <span className="method-desc">Instant (24x7)</span>
                </div>
              </div>

              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-bolt method-arrow-icon"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">IMPS</span>
                  <span className="method-desc">Instant (24x7)</span>
                </div>
              </div>

              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-arrows-rotate"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">NEFT</span>
                  <span className="method-desc">Batch (24x7)</span>
                </div>
              </div>

              <div className="method-card" onClick={() => onNavigate && onNavigate('transfer')}>
                <div className="method-icon-container">
                  <i className="fa-solid fa-arrows-up-down-left-right"></i>
                </div>
                <div className="method-info">
                  <span className="method-name">RTGS</span>
                  <span className="method-desc">Real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Nav Bar */}
        <div className="bottom-nav-bar">
          <button className="nav-item active" onClick={() => onNavigate && onNavigate('dashboard')}>
            <i className="fa-solid fa-house"></i>
            <span>Home</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('transfer')}>
            <i className="fa-solid fa-money-bill-transfer"></i>
            <span>Transfer</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('history')}>
            <i className="fa-regular fa-clock"></i>
            <span>History</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate && onNavigate('profile')}>
            <i className="fa-regular fa-user"></i>
            <span>Profile</span>
          </button>
        </div>

        {/* Add Beneficiary Modal */}
        {showAddModal && (
          <div className="login-modal-overlay">
            <div className="login-modal-card" style={{ maxWidth: 450 }}>
              <div className="login-modal-header">
                <h3>Add New Beneficiary</h3>
                <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {formError && (
                <div className="login-error-banner">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick Preset Selector */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Quick Fill from Personas:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {SAMPLE_ACCOUNTS
                    .filter(a => a.accountNumber !== accNo)
                    .map(persona => (
                      <button
                        key={persona.accountNumber}
                        type="button"
                        onClick={() => handleSelectPresetPersona(persona)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          color: '#e2e8f0',
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                      >
                        {persona.customerName} ({persona.accountNumber})
                      </button>
                    ))}
                </div>
              </div>

              <form onSubmit={handleAddBeneficiarySubmit}>
                <div className="form-group">
                  <label>Beneficiary Full Name</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={newBenName}
                    onChange={(e) => setNewBenName(e.target.value)}
                    placeholder="e.g. Naveen K"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>5-Digit Account Number</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={newBenAcc}
                    onChange={(e) => setNewBenAcc(e.target.value)}
                    placeholder="e.g. 10002"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={newBenIfsc}
                      onChange={(e) => setNewBenIfsc(e.target.value)}
                      placeholder="SIMU000002"
                    />
                  </div>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={newBenBank}
                      onChange={(e) => setNewBenBank(e.target.value)}
                      placeholder="Bank B"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>UPI ID (Optional)</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={newBenUpi}
                    onChange={(e) => setNewBenUpi(e.target.value)}
                    placeholder="e.g. naveen@bankB"
                  />
                </div>

                <div className="modal-actions" style={{ display: 'flex', gap: 10 }}>
                  <button 
                    type="button" 
                    className="btn-modal-submit" 
                    onClick={() => setShowAddModal(false)}
                    style={{ background: '#334155' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-modal-submit">
                    Save Beneficiary
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
