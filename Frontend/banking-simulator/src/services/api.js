// API Client Service for IndianBankSim & ZeroFraud360 integration
// Automatically routes through Vite reverse proxy for seamless mobile/LAN/tunnel support
export const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    return '';
  }
  return 'http://localhost:8080';
};
const BASE_URL = getBaseUrl();

// Store & retrieve JWT Token
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => localStorage.setItem('token', token);
export const removeAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('activeUser');
  localStorage.removeItem('activeAccountNumber');
};

export const getActiveAccountNumber = () => localStorage.getItem('activeAccountNumber') || '10001';
export const setActiveAccountNumber = (accNo) => localStorage.setItem('activeAccountNumber', accNo);

// 6 Seeded Accounts Configuration with 5-digit Account Numbers & Distinct Balances
export const SAMPLE_ACCOUNTS = [
  {
    id: 4,
    accountNumber: '10001',
    ifsc: 'SIMU000001',
    bankCode: 'BANK_A',
    bankName: 'Bank of Simulation A',
    customerName: 'Muthukumaran M',
    username: 'muthu',
    email: 'muthu@zerofraud.bank',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 78500.00,
    upiId: 'muthu@bankA',
    pin: '123456',
    role: 'ROLE_CUSTOMER'
  },
  {
    id: 5,
    accountNumber: '10002',
    ifsc: 'SIMU000002',
    bankCode: 'BANK_B',
    bankName: 'Bank of Simulation B',
    customerName: 'Naveen K',
    username: 'naveen',
    email: 'naveen@zerofraud.bank',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 42300.00,
    upiId: 'naveen@bankB',
    pin: '123456',
    role: 'ROLE_CUSTOMER'
  },
  {
    id: 6,
    accountNumber: '10003',
    ifsc: 'SIMU000003',
    bankCode: 'BANK_C',
    bankName: 'Bank of Simulation C',
    customerName: 'Yogeshwaran V',
    username: 'yogesh',
    email: 'yogesh@zerofraud.bank',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 65200.00,
    upiId: 'yogesh@bankC',
    pin: '123456',
    role: 'ROLE_CUSTOMER'
  },
  {
    id: 7,
    accountNumber: '10004',
    ifsc: 'SIMU000001',
    bankCode: 'BANK_A',
    bankName: 'Bank of Simulation A',
    customerName: 'Kanika',
    username: 'kanika',
    email: 'kanika@zerofraud.bank',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 34800.00,
    upiId: 'kanika@bankA',
    pin: '123456',
    role: 'ROLE_CUSTOMER'
  },
  {
    id: 8,
    accountNumber: '10005',
    ifsc: 'SIMU000002',
    bankCode: 'BANK_B',
    bankName: 'Bank of Simulation B',
    customerName: 'Nithiya',
    username: 'nithiya',
    email: 'nithiya@zerofraud.bank',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 56700.00,
    upiId: 'nithiya@bankB',
    pin: '123456',
    role: 'ROLE_CUSTOMER'
  },
  {
    id: 9,
    accountNumber: '10006',
    ifsc: 'SIMU000003',
    bankCode: 'BANK_C',
    bankName: 'Bank of Simulation C',
    customerName: 'Elamathi',
    username: 'elamathi',
    email: 'elamathi@zerofraud.bank',
    currency: 'INR',
    status: 'ACTIVE',
    availableBalance: 89400.00,
    upiId: 'elamathi@bankC',
    pin: '123456',
    role: 'ROLE_CUSTOMER'
  }
];

// Seeded Accounts Mock State (for offline demo mode)
const getInitialLedger = () => {
  const saved = localStorage.getItem('mockLedger');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  const initial = {};
  SAMPLE_ACCOUNTS.forEach(acc => {
    initial[acc.accountNumber] = { ...acc };
  });
  return initial;
};

let mockLedger = getInitialLedger();

const saveMockLedger = () => {
  localStorage.setItem('mockLedger', JSON.stringify(mockLedger));
};

// Mock Beneficiaries Storage
const getInitialBeneficiaries = () => {
  const saved = localStorage.getItem('mockBeneficiaries');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {
    '10001': [
      { id: 1, beneficiaryName: 'Naveen K', accountNumber: '10002', ifsc: 'SIMU000002', bankName: 'Bank of Simulation B', upiId: 'naveen@bankB' },
      { id: 2, beneficiaryName: 'Yogeshwaran V', accountNumber: '10003', ifsc: 'SIMU000003', bankName: 'Bank of Simulation C', upiId: 'yogesh@bankC' }
    ],
    '10002': [
      { id: 3, beneficiaryName: 'Muthukumaran M', accountNumber: '10001', ifsc: 'SIMU000001', bankName: 'Bank of Simulation A', upiId: 'muthu@bankA' }
    ],
    '10003': [
      { id: 4, beneficiaryName: 'Kanika', accountNumber: '10004', ifsc: 'SIMU000001', bankName: 'Bank of Simulation A', upiId: 'kanika@bankA' }
    ]
  };
};

let mockBeneficiaries = getInitialBeneficiaries();

const saveMockBeneficiaries = () => {
  localStorage.setItem('mockBeneficiaries', JSON.stringify(mockBeneficiaries));
};

// Mock Transaction History
const getInitialTransactions = () => {
  const saved = localStorage.getItem('mockTransactions');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
};

let mockTransactions = getInitialTransactions();

const saveMockTransactions = () => {
  localStorage.setItem('mockTransactions', JSON.stringify(mockTransactions));
};

/**
 * Login API Request
 * Supports Account ID (e.g. 10001) OR username (e.g. muthu)
 */
export async function loginUser(usernameOrAccNo, password = 'Password@123') {
  const identifier = String(usernameOrAccNo).trim();
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) setAuthToken(data.accessToken);

      // Immediately fetch account details from database to establish active account
      const accRes = await getAccountDetails();
      if (accRes.success && accRes.account) {
        setActiveAccountNumber(accRes.account.accountNumber);
        return { success: true, data, account: accRes.account };
      }
      return { success: true, data };
    }
  } catch (err) {
    console.warn('Backend server connecting failed, switching to local persona verification:', err.message);
  }

  // Fallback persona verification
  const foundAccount = SAMPLE_ACCOUNTS.find(
    a => a.accountNumber === identifier || a.username.toLowerCase() === identifier.toLowerCase()
  );

  if (foundAccount && (password === 'Password@123' || !password)) {
    const mockToken = `mock-jwt-token-${foundAccount.username}`;
    setAuthToken(mockToken);
    setActiveAccountNumber(foundAccount.accountNumber);
    const accountState = mockLedger[foundAccount.accountNumber] || foundAccount;
    return {
      success: true,
      data: {
        accessToken: mockToken,
        tokenType: 'Bearer',
        userId: foundAccount.id,
        username: foundAccount.username,
        roles: ['ROLE_CUSTOMER']
      },
      account: accountState
    };
  }

  return {
    success: false,
    error: 'INVALID_CREDENTIALS',
    message: 'Invalid Account ID or Password. Try Account 10001 with password Password@123.'
  };
}

/**
 * Get Authenticated Account Details from Backend Database
 */
export async function getAccountDetails() {
  const token = getAuthToken();
  const activeAccNo = getActiveAccountNumber();

  if (token && !token.startsWith('mock-jwt-')) {
    try {
      const res = await fetch(`${BASE_URL}/api/accounts/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const account = Array.isArray(data) ? data[0] : data;
        if (account && account.accountNumber) {
          setActiveAccountNumber(account.accountNumber);
        }
        return { success: true, account };
      }
    } catch (err) {
      console.warn('Backend /api/accounts/me unavailable:', err.message);
    }
  }

  // Fallback to local ledger for active persona
  const activeAcc = mockLedger[activeAccNo] || mockLedger['10001'] || SAMPLE_ACCOUNTS[0];
  return {
    success: true,
    account: activeAcc
  };
}

/**
 * Get Beneficiaries for currently logged-in account
 */
export async function getBeneficiaries() {
  const token = getAuthToken();
  const activeAccNo = getActiveAccountNumber();

  if (token && !token.startsWith('mock-jwt-')) {
    try {
      const res = await fetch(`${BASE_URL}/api/beneficiaries`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, beneficiaries: data };
      }
    } catch (err) {
      console.warn('Backend /api/beneficiaries unavailable:', err.message);
    }
  }

  // Fallback to mock beneficiaries
  const list = mockBeneficiaries[activeAccNo] || [];
  return {
    success: true,
    beneficiaries: list
  };
}

/**
 * Add a New Beneficiary
 */
export async function addBeneficiary(beneficiary) {
  const token = getAuthToken();
  const activeAccNo = getActiveAccountNumber();

  if (token && !token.startsWith('mock-jwt-')) {
    try {
      const res = await fetch(`${BASE_URL}/api/beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(beneficiary)
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        const err = await res.json();
        return { success: false, message: err.message || 'Failed to add beneficiary.' };
      }
    } catch (err) {
      console.warn('Backend add beneficiary error:', err.message);
    }
  }

  // Fallback mock add
  if (!mockBeneficiaries[activeAccNo]) {
    mockBeneficiaries[activeAccNo] = [];
  }
  const newBen = {
    id: Date.now(),
    beneficiaryName: beneficiary.beneficiaryName,
    accountNumber: beneficiary.accountNumber,
    ifsc: beneficiary.ifsc || 'SIMU000001',
    bankName: beneficiary.bankName || 'Bank of Simulation',
    upiId: beneficiary.upiId || ''
  };
  mockBeneficiaries[activeAccNo].unshift(newBen);
  saveMockBeneficiaries();

  return { success: true, data: newBen };
}

/**
 * Execute Payment Transfer
 * Updates the database balances atomically and creates transaction records
 */
export async function executeTransfer({
  senderAccountNumber,
  receiverAccountNumber,
  amount,
  upiPin = '123456',
  paymentRail = 'SIMULATED_UPI',
  remarks = 'Transfer'
}) {
  const token = getAuthToken();
  const activeAccNo = senderAccountNumber || getActiveAccountNumber();

  const payload = {
    senderAccountNumber: activeAccNo,
    receiverAccountNumber: String(receiverAccountNumber).trim(),
    amount: parseFloat(amount),
    currency: 'INR',
    upiPin,
    paymentRail,
    messageId: `MSG-${Date.now()}`,
    occurredAt: new Date().toISOString()
  };

  if (token && !token.startsWith('mock-jwt-')) {
    try {
      const res = await fetch(`${BASE_URL}/api/payments/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        const errData = await res.json().catch(() => ({}));
        const isFraudBlocked = errData.code === 'ACCOUNT_BLOCKED_FRAUD' ||
          (errData.message && (errData.message.includes('tracking you') || errData.message.includes('marked as a fraud') || errData.message.includes('fraud')));
        return {
          success: false,
          error: isFraudBlocked ? 'ACCOUNT_BLOCKED_FRAUD' : (errData.code || 'TRANSFER_FAILED'),
          message: isFraudBlocked ? 'You have been marked as a fraud and the officials are tracking you! All outbound transfers are suspended.' : errData.message
        };
      }
    } catch (err) {
      console.warn('Backend server offline during transfer:', err.message);
    }
  }

  // Fallback Offline Mode Transfer Logic with Persistence
  const sender = mockLedger[activeAccNo] || mockLedger['10001'];
  const receiver = mockLedger[payload.receiverAccountNumber];

  if (sender && sender.status === 'FROZEN') {
    return {
      success: false,
      error: 'ACCOUNT_BLOCKED_FRAUD',
      message: 'You have been marked as a fraud and the officials are tracking you! All outbound transfers are suspended.'
    };
  }

  if (payload.amount > sender.availableBalance) {
    return {
      success: false,
      error: 'INSUFFICIENT_AVAILABLE_FUNDS',
      message: `Insufficient balance. Current available balance: ₹${sender.availableBalance.toLocaleString('en-IN')}`
    };
  }

  // Atomic debit/credit
  sender.availableBalance -= payload.amount;
  if (receiver) {
    receiver.availableBalance += payload.amount;
  }
  saveMockLedger();

  const txnId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const txnRecord = {
    transactionId: txnId,
    senderAccountId: sender.accountNumber,
    receiverAccountId: payload.receiverAccountNumber,
    amount: payload.amount,
    currency: 'INR',
    status: 'SUCCESS',
    occurredAt: new Date().toISOString(),
    remarks
  };
  mockTransactions.unshift(txnRecord);
  saveMockTransactions();

  return {
    success: true,
    data: txnRecord
  };
}

/**
 * Get Transaction History for specified account number
 */
export async function getTransactionHistory(accountNumber) {
  const accNo = accountNumber || getActiveAccountNumber();
  const token = getAuthToken();

  if (token && !token.startsWith('mock-jwt-')) {
    try {
      const res = await fetch(`${BASE_URL}/api/payments/history/${accNo}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, transactions: data };
      }
    } catch (err) {
      console.warn('Backend /api/payments/history unavailable:', err.message);
    }
  }

  // Filter mock transactions for this account
  const filtered = mockTransactions.filter(
    t => t.senderAccountId === accNo || t.receiverAccountId === accNo
  );

  return { success: true, transactions: filtered };
}
