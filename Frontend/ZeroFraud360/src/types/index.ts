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
  | 'MEDIUM_RISK'
  | 'RESOLVED'
  | 'CONFIRMED_FRAUD'
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

export interface FraudPattern {
  id: number;
  patternId: string;
  patternName: string;
  patternType: string;
  description: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  sourceAccount?: string;
  muleAccount?: string;
  destinationAccount?: string;
  minAmount?: number;
  maxAmount?: number;
  timeWindowSeconds?: number;
  actionTaken: string;
  confirmedByOfficer?: string;
  alertId?: string;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  createdAt: string;
}

export interface QuickAccount {
  accountNumber: string;
  customerName: string;
  bankCode: string;
  status: string;
  availableBalance: number;
}

export interface ForensicsSummary {
  totalWithdrawalsAmount: number;
  totalWithdrawalsCount: number;
  totalInflowAmount: number;
  totalInflowCount: number;
  highestSingleWithdrawal: number;
  primaryWithdrawalMode: string;
  primaryLocation: string;
}

export interface WithdrawalModeStat {
  mode: string;
  label: string;
  totalAmount: number;
  count: number;
  percentage: number;
  averageAmount: number;
  icon: string;
}

export interface LocationWithdrawalStat {
  locationId: string;
  city: string;
  state: string;
  terminalOrBranch: string;
  latitude: number;
  longitude: number;
  totalAmount: number;
  count: number;
  lastActivityAt: string;
  riskTag: string;
}

export interface GeoVelocityAlert {
  alertId: string;
  message: string;
  fromCity: string;
  toCity: string;
  timeDifferenceMinutes: number;
  distanceKm: number;
  severity: string;
}

export interface ForensicTransactionItem {
  transactionId: string;
  timestamp: string;
  mode: string;
  modeLabel: string;
  type: 'DEBIT' | 'CREDIT' | string;
  amount: number;
  city: string;
  terminal: string;
  counterparty: string;
  status: string;
  anomalyFlag: string;
}

export interface AccountForensics {
  accountNumber: string;
  customerName: string;
  bankCode: string;
  bankName: string;
  status: string;
  availableBalance: number;
  currency: string;
  riskScore: number;
  riskLevel: string;
  summary: ForensicsSummary;
  modeBreakdowns: WithdrawalModeStat[];
  locations: LocationWithdrawalStat[];
  velocityAlerts: GeoVelocityAlert[];
  auditLedger: ForensicTransactionItem[];
}

export interface HourlyBin {
  label: string;
  count: number;
  alertCount: number;
  totalAmount: number;
}

export interface DashboardMetrics {
  totalTransactions: number;
  totalAmount: number;
  flaggedAlerts: number;
  activeHolds: number;
  affectedAccounts: number;
  normalTransactions: number;
  suspiciousTransactions: number;
  normalPercentage: number;
  suspiciousPercentage: number;
  timeBins: HourlyBin[];
}

