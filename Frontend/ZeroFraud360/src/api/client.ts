import type {
  AuthResponse,
  UserProfile,
  FraudAlert,
  FraudPattern,
  ObservedTransaction,
  ReleaseHoldResponse,
  PaymentSuccessEventPayload,
  ApiError,
  QuickAccount,
  AccountForensics,
  DashboardMetrics,
} from '../types';


const TOKEN_KEY = 'zerofraud_access_token';
const USER_KEY = 'zerofraud_user_profile';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: (): UserProfile | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser: (user: UserProfile) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure requests go through relative URLs handled by Vite proxy or base URL
  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  if (!response.ok) {
    let errorData: Partial<ApiError> = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: response.statusText || 'An unexpected error occurred.',
        code: `HTTP_${response.status}`,
      };
    }

    const error: ApiError = {
      status: response.status,
      code: errorData.code || `HTTP_${response.status}`,
      message: errorData.message || `Request failed with status ${response.status}`,
      correlationId: errorData.correlationId,
      fieldErrors: errorData.fieldErrors,
      timestamp: errorData.timestamp,
    };
    throw error;
  }

  // Check if response has content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text() as unknown as T;
}

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<AuthResponse> => {
      const res = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      tokenStorage.set(res.accessToken);
      tokenStorage.setUser({
        username: res.username,
        role: res.role,
        enabled: true,
      });
      return res;
    },

    me: async (): Promise<UserProfile> => {
      return apiRequest<UserProfile>('/api/auth/me');
    },

    logout: async (): Promise<void> => {
      try {
        await apiRequest<{ message: string }>('/api/auth/logout', {
          method: 'POST',
        });
      } catch {
        // Silently clear credentials even if network fails
      } finally {
        tokenStorage.clear();
      }
    },
  },

  fraud: {
    getAlerts: async (): Promise<FraudAlert[]> => {
      return apiRequest<FraudAlert[]>('/api/fraud/alerts');
    },

    getAlertById: async (alertId: string): Promise<FraudAlert> => {
      return apiRequest<FraudAlert>(`/api/fraud/alerts/${encodeURIComponent(alertId)}`);
    },

    getTransactions: async (): Promise<ObservedTransaction[]> => {
      return apiRequest<ObservedTransaction[]>('/api/fraud/transactions');
    },

    getPatterns: async (): Promise<FraudPattern[]> => {
      return apiRequest<FraudPattern[]>('/api/fraud/patterns');
    },

    createPattern: async (pattern: Partial<FraudPattern>): Promise<FraudPattern> => {
      return apiRequest<FraudPattern>('/api/fraud/patterns', {
        method: 'POST',
        body: JSON.stringify(pattern),
      });
    },

    deletePattern: async (patternId: string, permanent: boolean = false): Promise<{ patternId: string; status: string }> => {
      return apiRequest<{ patternId: string; status: string }>(
        `/api/fraud/patterns/${encodeURIComponent(patternId)}${permanent ? '?permanent=true' : ''}`,
        {
          method: 'DELETE',
        }
      );
    },

    purgeCustomPatterns: async (): Promise<{ success: boolean; purgedCount: number }> => {
      return apiRequest<{ success: boolean; purgedCount: number }>('/api/fraud/patterns/custom/purge', {
        method: 'DELETE',
      });
    },

    getQuickAccounts: async (): Promise<QuickAccount[]> => {
      return apiRequest<QuickAccount[]>('/api/fraud/accounts/quick-list');
    },

    getAccountForensics: async (accountId: string): Promise<AccountForensics> => {
      return apiRequest<AccountForensics>(`/api/fraud/accounts/${encodeURIComponent(accountId)}/forensics`);
    },

    getDashboardMetrics: async (): Promise<DashboardMetrics> => {
      return apiRequest<DashboardMetrics>('/api/fraud/metrics/dashboard');
    },
  },

  officer: {
    releaseHold: async (
      holdId: string,
      reason: string,
      officerId?: string
    ): Promise<ReleaseHoldResponse> => {
      return apiRequest<ReleaseHoldResponse>(
        `/api/officer/holds/${encodeURIComponent(holdId)}/release`,
        {
          method: 'POST',
          body: JSON.stringify({
            officerId,
            reason,
          }),
        }
      );
    },

    confirmFraud: async (
      holdId: string,
      reason: string,
      officerId?: string
    ): Promise<{ holdId: string; status: string; officerId: string; reason: string }> => {
      return apiRequest<{ holdId: string; status: string; officerId: string; reason: string }>(
        `/api/officer/holds/${encodeURIComponent(holdId)}/confirm-fraud`,
        {
          method: 'POST',
          body: JSON.stringify({
            officerId,
            reason,
          }),
        }
      );
    },
  },

  notifications: {
    getRecent: async (): Promise<any[]> => {
      return apiRequest<any[]>('/api/notifications');
    },
    getByAlertId: async (alertId: string): Promise<any[]> => {
      return apiRequest<any[]>(`/api/notifications/alert/${encodeURIComponent(alertId)}`);
    },
  },

  events: {
    ingestPaymentSuccess: async (
      payload: PaymentSuccessEventPayload
    ): Promise<{ eventId: string; status: string }> => {
      return apiRequest<{ eventId: string; status: string }>(
        '/internal/v1/events/payment-success',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    },
  },

  developer: {
    resetAll: async (): Promise<{ success: boolean; message: string; bankSimulationResult?: string }> => {
      return apiRequest('/api/developer/reset-all', { method: 'POST' });
    },
    resetZeroFraud: async (): Promise<{ success: boolean; message: string }> => {
      return apiRequest('/api/developer/reset-zerofraud', { method: 'POST' });
    },
    unfreezeAll: async (): Promise<{ success: boolean; message: string }> => {
      return apiRequest('/api/developer/unfreeze-all', { method: 'POST' });
    },
    getStatus: async (): Promise<{
      observedTransactionsCount: number;
      fraudAlertsCount: number;
      mediumRiskAlertsCount: number;
      criticalAlertsCount: number;
      holdRequestsCount: number;
      fraudPatternsCount: number;
      bankSimulationConnected: boolean;
      zeroFraudConnected: boolean;
      timestamp: string;
    }> => {
      return apiRequest('/api/developer/status');
    },
    getBankAccounts: async (): Promise<Array<{
      accountNumber: string;
      customerName: string;
      availableBalance: number;
      currency: string;
      status: string;
      bankCode: string;
    }>> => {
      try {
        const res = await fetch('http://localhost:8080/api/developer/accounts');
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
  },
};
