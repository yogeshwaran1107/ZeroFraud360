import type {
  AuthResponse,
  UserProfile,
  FraudAlert,
  ObservedTransaction,
  ReleaseHoldResponse,
  PaymentSuccessEventPayload,
  ApiError,
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
};
