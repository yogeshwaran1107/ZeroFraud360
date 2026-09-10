// API Client Service for IndianBankSim & ZeroFraud360 integration
const BASE_URL = 'http://localhost:8080';

// Store & retrieve JWT Token
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

// Seeded Accounts Mock State (for offline demo mode)
let mockLedger = {
  '1000000001': {
    id: 1,
    accountNumber: '1000000001',
    ifsc: 'SIMU000001',
    bankCode: 'BANK_A',
    bankName: 'Bank of Simulation A',
    customerName: 'Alice Sharma',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 50000.00,
    upiId: 'alice@bankA',
    pin: '123456'
  },
  '2000000001': {
    id: 2,
    accountNumber: '2000000001',
    ifsc: 'SIMU000002',
    bankCode: 'BANK_B',
    bankName: 'Bank of Simulation B',
    customerName: 'Bob Verma',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 10000.00,
    upiId: 'bob@bankB',
    pin: '654321'
  }
};

/**
 * Login API Request
 */
export async function loginUser(username, password) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) setAuthToken(data.accessToken);
      return { success: true, data };
    }
  } catch (err) {
    console.warn('Backend offline, using seed persona verification:', err.message);
  }

  // Offline / Seed Fallback
  if ((username === 'alice' || username === 'User A') && password === 'Password@123') {
    const mockToken = 'mock-jwt-token-alice-123';
    setAuthToken(mockToken);
    return {
      success: true,
      data: {
        accessToken: mockToken,
        tokenType: 'Bearer',
        userId: 1,
        username: 'alice',
        roles: ['ROLE_CUSTOMER']
      }
    };
  }

  return {
    success: false,
    error: 'INVALID_CREDENTIALS',
    message: 'Invalid username or password. (Try alice / Password@123)'
  };
}

/**
 * Get Authenticated Account Details
 */
export async function getAccountDetails() {
  const token = getAuthToken();
  try {
    const res = await fetch(`${BASE_URL}/api/accounts/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, account: Array.isArray(data) ? data[0] : data };
    }
  } catch (err) {
    console.warn('Backend offline, returning local account state:', err.message);
  }

  // Fallback to local ledger
  return {
    success: true,
    account: mockLedger['1000000001']
  };
}

/**
 * Execute Payment Transfer
 */
export async function executeTransfer({
  senderAccountNumber = '1000000001',
  receiverAccountNumber = '2000000001',
  amount,
  upiPin,
  paymentRail = 'SIMULATED_UPI',
  remarks = ''
}) {
  const payload = {
    senderAccountNumber,
    receiverAccountNumber,
    amount: parseFloat(amount),
    currency: 'INR',
    upiPin,
    paymentRail,
    messageId: `MSG-${Date.now()}`,
    occurredAt: new Date().toISOString()
  };

  try {
    const res = await fetch(`${BASE_URL}/api/payments/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    } else {
      const errData = await res.json();
      return { success: false, error: errData.code || 'TRANSFER_FAILED', message: errData.message };
    }
  } catch (err) {
    console.warn('Backend server offline, executing mock transfer processing:', err.message);
  }

  // Offline Mode Transfer Logic
  const sender = mockLedger[senderAccountNumber] || mockLedger['1000000001'];
  
  if (upiPin && sender.pin && upiPin !== sender.pin) {
    return {
      success: false,
      error: 'INVALID_PIN',
      message: 'Incorrect UPI PIN entered.'
    };
  }

  if (payload.amount > sender.availableBalance) {
    return {
      success: false,
      error: 'INSUFFICIENT_AVAILABLE_FUNDS',
      message: 'Ledger balance minus active holds is insufficient.'
    };
  }

  // Atomic debit/credit in local state
  sender.availableBalance -= payload.amount;
  if (mockLedger[receiverAccountNumber]) {
    mockLedger[receiverAccountNumber].availableBalance += payload.amount;
  }

  const txnId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  return {
    success: true,
    data: {
      transactionId: txnId,
      senderAccountNumber: sender.accountNumber,
      receiverAccountNumber,
      amount: payload.amount,
      currency: 'INR',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      remarks
    }
  };
}
