import React, { useState, useEffect } from 'react';
import { 
  getAccountDetails, 
  getBeneficiaries, 
  addBeneficiary, 
  SAMPLE_ACCOUNTS, 
  removeAuthToken,
  simulateTheft,
  getVictimAlerts,
  confirmFraudVictim,
  releaseFraudVictim
} from '../services/api';
import './DashboardScreen.css';

export default function DashboardScreen({ onNavigate, onSelectBeneficiary }) {
  const [showBalance, setShowBalance] = useState(true);
  const [account, setAccount] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Victim alerts state
  const [victimAlerts, setVictimAlerts] = useState([]);

  // Theft simulation modal state
  const [showTheftModal, setShowTheftModal] = useState(false);
  const [theftVictimAcc, setTheftVictimAcc] = useState('');
  const [theftAmount, setTheftAmount] = useState('50000');
  const [theftLoading, setTheftLoading] = useState(false);

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
      const alertsRes = await getVictimAlerts(accRes.account.accountNumber);
      if (alertsRes.success) {
        setVictimAlerts(alertsRes.alerts || []);
      }
    }
    const benRes = await getBeneficiaries();
    if (benRes.success && benRes.beneficiaries) {
      setBeneficiaries(benRes.beneficiaries);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      const activeAcc = localStorage.getItem('activeAccountNumber') || '10001';
      const alertsRes = await getVictimAlerts(activeAcc);
      if (alertsRes.success) {
        setVictimAlerts(alertsRes.alerts || []);
      }
    }, 4000);
    return () => clearInterval(interval);
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

  // Automatically ensure theftVictimAcc points to a valid victim (never own account)
  useEffect(() => {
    const validVictims = SAMPLE_ACCOUNTS.filter(a => a.accountNumber !== accNo);
    if (validVictims.length > 0 && (!theftVictimAcc || theftVictimAcc === accNo)) {
      setTheftVictimAcc(validVictims[0].accountNumber);
    }
  }, [accNo, theftVictimAcc]);

  const handleOpenTheftModal = () => {
    const validVictims = SAMPLE_ACCOUNTS.filter(a => a.accountNumber !== accNo);
    if (validVictims.length > 0 && (!theftVictimAcc || theftVictimAcc === accNo)) {
      setTheftVictimAcc(validVictims[0].accountNumber);
    }
    setShowTheftModal(true);
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

  const handleConfirmFraud = async (alertId) => {
    if (!confirm('Officially confirm that this transaction was fraudulent? Account holding the funds will be permanently blocked.')) return;
    const res = await confirmFraudVictim(alertId);
    if (res.success) {
      alert('✅ Fraud Confirmed! The mule account holding your funds has been officially frozen and reported to Cyber Crime & Bank Security.');
      loadData();
    } else {
      alert('Failed to confirm fraud: ' + (res.message || 'Error occurred'));
    }
  };

  const handleReleaseHold = async (alertId) => {
    if (!confirm('Confirm that you authorized this transaction? The protective hold will be released.')) return;
    const res = await releaseFraudVictim(alertId);
    if (res.success) {
      alert('Protective hold released.');
      loadData();
    } else {
      alert('Failed to release hold: ' + (res.message || 'Error occurred'));
    }
  };

  const handleExecuteTheft = async (e) => {
    e.preventDefault();
    const validVictims = SAMPLE_ACCOUNTS.filter(a => a.accountNumber !== accNo);
    const targetVictim = (theftVictimAcc && theftVictimAcc !== accNo)
      ? theftVictimAcc
      : (validVictims[0]?.accountNumber || '');

    if (!targetVictim) {
      alert('Please select a victim account.');
      return;
    }
    if (targetVictim === accNo) {
      alert('Cannot steal from your own active account. Please choose a different victim account.');
      return;
    }
    setTheftLoading(true);
    const res = await simulateTheft({
      victimAcc: targetVictim,
      recipientAcc: accNo,
      amount: theftAmount,
      remarks: 'UNAUTHORIZED CREDENTIAL THEFT DRAIN'
    });
    setTheftLoading(false);
    if (res.success) {
      setShowTheftModal(false);
      alert(`🚨 Theft Simulated Successfully!\n₹${parseFloat(theftAmount).toLocaleString('en-IN')} was stolen from Victim Account ${targetVictim} into your Account ${accNo}.`);
      loadData();
    } else {
      alert('Theft Simulation Failed: ' + (res.message || res.error));
    }
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

        {/* Account Frozen & Tracked Banner */}
        {account?.status === 'FROZEN' && (
          <div style={{
            margin: '0 20px 16px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: '#fff1f2',
            border: '2px solid #f43f5e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 8px 16px -4px rgba(244, 63, 94, 0.2)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ffe4e6',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#be123c',
                letterSpacing: '0.05em',
                marginBottom: '2px'
              }}>
                ACCOUNT RESTRICTED & TRACKED
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: '800',
                color: '#881337',
                lineHeight: '1.3',
                marginBottom: '4px'
              }}>
                You have been marked as a fraud and the officials are tracking you!
              </div>
              <div style={{ fontSize: '11px', color: '#9f1239', lineHeight: '1.4' }}>
                All fund transfers from Account <strong>{accNo}</strong> have been suspended. Multi-hop layering investigation in progress.
              </div>
            </div>
          </div>
        )}

        {/* Victim Fraud Interception Alert & Action Banner */}
        {victimAlerts && victimAlerts.length > 0 && (
          <div style={{
            margin: '0 20px 16px',
            padding: '16px 18px',
            borderRadius: '16px',
            background: '#fff1f2',
            border: '2px solid #e11d48',
            boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.25)'
          }}>
            {victimAlerts.map((alert) => (
              <div key={alert.alertId} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#e11d48',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>
                    SECURITY ALERT • ZERO FRAUD 360
                  </span>
                  <span style={{ fontSize: '11px', color: '#9f1239', fontWeight: 600 }}>
                    Alert ID: {alert.alertId}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#881337', marginBottom: 6 }}>
                  🚨 Stolen Funds Traced & Intercepted at Mule Account!
                </div>
                <div style={{ fontSize: '12px', color: '#4c0519', lineHeight: 1.5, marginBottom: 12 }}>
                  ZeroFraud360 detected that <strong>₹{parseFloat(alert.secondAmount || 50000).toLocaleString('en-IN')}</strong> originating from your account was routed through a money mule chain. The transaction was stopped and funds are currently <strong>HELD at Account {alert.destinationAccountId}</strong> before escaping to the next cashout account!
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#be123c', marginBottom: 10 }}>
                  Did you authorize this transaction, or is it an unauthorized THEFT?
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleConfirmFraud(alert.alertId)}
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#e11d48',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <i className="fa-solid fa-shield-xmark"></i>
                    Confirm Fraud & Block
                  </button>
                  <button
                    onClick={() => handleReleaseHold(alert.alertId)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    I Authorized This
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
          <div className="quick-actions-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="action-item" onClick={() => onNavigate && onNavigate('transfer')}>
              <div className="action-circle-btn">
                <i className="fa-solid fa-paper-plane"></i>
              </div>
              <span className="action-label">Send Money</span>
            </div>

            <div className="action-item" onClick={handleOpenTheftModal}>
              <div className="action-circle-btn" style={{ background: '#ffe4e6', color: '#e11d48', border: '1px solid #fca5a5' }}>
                <i className="fa-solid fa-mask"></i>
              </div>
              <span className="action-label" style={{ color: '#be123c', fontWeight: 800 }}>Theft Money</span>
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
        {/* Theft Simulation Modal */}
        {showTheftModal && (
          <div className="login-modal-overlay">
            <div className="login-modal-card" style={{ maxWidth: 460, border: '2px solid #f43f5e' }}>
              <div className="login-modal-header" style={{ borderBottom: '1px solid #ffe4e6', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <h3 style={{ color: '#be123c', margin: 0, fontSize: 16 }}>Theft Money from Account X</h3>
                </div>
                <button className="modal-close-btn" onClick={() => setShowTheftModal(false)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
                Simulate an unauthorized phishing or credential drain attack. Stolen funds will be transferred from the chosen Victim Account into your currently active Account (<strong>{accNo}</strong>).
              </p>

              <form onSubmit={handleExecuteTheft} style={{ marginTop: 14 }}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Select Victim Account (Account X)
                  </label>
                  <select
                    className="modal-input"
                    value={theftVictimAcc && theftVictimAcc !== accNo ? theftVictimAcc : (SAMPLE_ACCOUNTS.find(a => a.accountNumber !== accNo)?.accountNumber || '')}
                    onChange={(e) => setTheftVictimAcc(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10 }}
                  >
                    {SAMPLE_ACCOUNTS
                      .filter(a => a.accountNumber !== accNo)
                      .map(acc => (
                        <option key={acc.accountNumber} value={acc.accountNumber}>
                          {acc.customerName} ({acc.accountNumber}) - Bal: ₹{Number(acc.availableBalance).toLocaleString('en-IN')}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Theft Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="modal-input"
                    value={theftAmount}
                    onChange={(e) => setTheftAmount(e.target.value)}
                    placeholder="50000"
                    min="1"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10 }}
                  />
                </div>

                <div style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  fontSize: 11,
                  color: '#9f1239',
                  marginBottom: 16
                }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
                  ZeroFraud360 will observe this theft event as the root compromised origin for downstream multi-hop money mule tracking.
                </div>

                <div className="modal-actions" style={{ display: 'flex', gap: 10 }}>
                  <button 
                    type="button" 
                    className="btn-modal-submit" 
                    onClick={() => setShowTheftModal(false)}
                    style={{ background: '#64748b' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-modal-submit"
                    disabled={theftLoading}
                    style={{ background: '#e11d48', fontWeight: 800 }}
                  >
                    {theftLoading ? 'Draining...' : '⚡ Execute Theft Attack'}
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
