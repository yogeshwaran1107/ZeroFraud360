export type OfficerRole = 'ROLE_POLICE' | 'ROLE_CYBER' | 'ROLE_BANK' | string;

export interface UserProfile {
  username: string;
  role: OfficerRole;
  enabled: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  role: OfficerRole;
}

export type AlertStatus =
  | 'CREATED'
  | 'DECISION_REQUESTED'
  | 'HOLD_REQUESTED'
  | 'HOLD_ACTIVE'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ERROR'
  | string;

export type DecisionType = 'STOP' | 'ALLOW' | string;

export interface FraudAlert {
  id: number;
  alertId: string;
  dedupKey: string;
  patternType: string;
  status: AlertStatus;
  firstTransactionId: string;
  secondTransactionId: string;
  sourceAccountId: string;
  intermediateAccountId: string;
  destinationAccountId: string;
  firstAmount: number;
  secondAmount: number;
  timeDifferenceSeconds: number;
  decision?: DecisionType;
  decisionReason?: string;
  externalDecisionRequestId?: string;
  holdRequestId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface ObservedTransaction {
  id: number;
  eventId: string;
  transactionId: string;
  senderAccountId: string;
  receiverAccountId: string;
  senderBankId: string;
  receiverBankId: string;
  amount: number;
  currency: string;
  paymentRail: string;
  status: string;
  correlationId?: string;
  messageId?: string;
  occurredAt: string;
  receivedAt?: string;
  createdAt?: string;
}

export interface ReleaseHoldRequest {
  officerId?: string;
  reason: string;
}

export interface ReleaseHoldResponse {
  holdId: string;
  status: string;
  officerId: string;
  reason: string;
}

export interface AccountParticipant {
  accountId: string;
  accountNumber: string;
  bankId: string;
}

export interface PaymentSuccessEventPayload {
  eventId: string;
  eventType: string;
  transactionId: string;
  occurredAt: string;
  sender: AccountParticipant;
  receiver: AccountParticipant;
  amount: number;
  currency: string;
  paymentRail: string;
  correlationId?: string;
  messageId?: string;
}

export interface ApiError {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  correlationId?: string;
  fieldErrors?: Record<string, string> | null;
}
