export interface User {
  id: string;
  providerId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  senderEmail: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  totalRecipients: number;
  createdAt: string;
  sentCount?: number;
  failedCount?: number;
  pendingCount?: number;
}

export interface EmailMessage {
  id: string;
  userId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  hourlyLimit: number;
  scheduledAt: string;
  sentAt: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  lastError: string | null;
  providerMessageId: string | null;
  bullmqJobId: string | null;
  createdAt: string;
}

export interface SlackConnection {
  id: string;
  userId: string;
  teamName: string;
  createdAt: string;
}

export interface QueueMetrics {
  waiting: number;
  delayed: number;
  active: number;
  completed: number;
  failed: number;
}

export interface DashboardStats {
  scheduledEmails: number;
  sentThisWeek: number;
  openRate: number;
  queueHealth: QueueMetrics;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmailListResponse {
  emails: EmailMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
