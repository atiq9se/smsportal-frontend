export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
  active: boolean;
  smsBalance?: number;
  balanceTaka?: number;
  smsCost?: number;
  createdAt: string;
}

export interface SmsSettings {
  apiUrl: string;
  sendUrl?: string;
  resolvedSendUrl?: string;
  username: string;
  password: string;
  senderId?: string;
  configured: boolean;
  sendConfigured?: boolean;
  updatedAt?: string | null;
}

export interface Stat {
  label: string;
  value: string;
  trend: string;
}

export interface RecentMessage {
  id: string;
  to: string;
  content: string;
  status: string;
  time: string;
}

export interface Message {
  id: string;
  to: string;
  contact: string;
  content: string;
  type: string;
  status: string;
  date: string;
  time: string;
  userId?: string;
}

export interface Group {
  id: string;
  name: string;
  contacts: number;
  type: string;
  createdAt: string;
  lastSent: string;
}

export interface Contact {
  phone: string;
  name?: string;
  email?: string;
  address?: string;
  groupId: string;
}

export interface WalletBalance {
  balanceTaka: number;
  smsRemaining: number;
  smsCostTaka?: number;
}

export interface DashboardData {
  stats: Stat[];
  recentMessages: RecentMessage[];
  balance?: WalletBalance;
}

export interface MessageSummary {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  totalFiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: MessageSummary;
  filters: {
    status: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    q: string;
  };
}
