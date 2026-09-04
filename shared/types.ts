export interface User {
  id: string;
  providerId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  senderEmail: string;
  startAt: Date;
  delaySeconds: number;
  hourlyLimit: number;
  totalRecipients: number;
  createdAt: Date;
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
  scheduledAt: Date;
  sentAt: Date | null;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  lastError: string | null;
  providerMessageId: string | null;
  bullmqJobId: string | null;
  createdAt: Date;
}

export interface SlackConnection {
  id: string;
  userId: string;
  teamName: string;
  webhookUrl: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface CampaignFormData {
  subject: string;
  body: string;
  senderEmail: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  recipients: string[];
}
