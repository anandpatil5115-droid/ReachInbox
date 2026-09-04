'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Bell,
  Plug,
  Copy,
  Check,
  Loader2,
  Gauge,
  Clock,
  Server,
  Circle,
  Activity,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { User as UserType, SlackConnection } from '@/lib/types';

interface SettingsPageProps {
  onNavigate?: (page: string) => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [slack, setSlack] = useState<SlackConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [slackLoading, setSlackLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [delaySeconds, setDelaySeconds] = useState(2);

  useEffect(() => {
    setLoading(true);
    api
      .get<UserType>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSlackLoading(true);
    api
      .get<SlackConnection>('/slack/status')
      .then(setSlack)
      .catch(() => setSlack(null))
      .finally(() => setSlackLoading(false));
  }, []);

  useEffect(() => {
    const savedLimit = localStorage.getItem('ri_hourlyLimit');
    const savedDelay = localStorage.getItem('ri_delaySeconds');
    if (savedLimit) setHourlyLimit(Number(savedLimit));
    if (savedDelay) setDelaySeconds(Number(savedDelay));
  }, []);

  const saveDefaults = () => {
    localStorage.setItem('ri_hourlyLimit', String(hourlyLimit));
    localStorage.setItem('ri_delaySeconds', String(delaySeconds));
  };

  const copyBaseUrl = () => {
    navigator.clipboard.writeText(BASE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-[20px] font-semibold text-[#1D1D1F]">
          Settings
        </h1>
        <p className="text-[13px] text-[#6E6E73] mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-[#E8E8ED] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8ED]">
          <h2 className="text-[13px] font-semibold text-[#1D1D1F]">Profile</h2>
        </div>
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton variant="circle" width={64} height={64} />
              <div className="space-y-2">
                <Skeleton variant="text" width={140} />
                <Skeleton variant="text" width={200} />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#F0EFFE] text-[#5856D6] text-xl font-bold">
                  {initial}
                </div>
              )}
              <div>
                <p className="text-[15px] font-semibold text-[#1D1D1F]">{user.name}</p>
                <p className="text-[13px] text-[#6E6E73]">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Shield size={12} className="text-[#248A3D]" />
                  <span className="text-[11px] font-medium text-[#248A3D] bg-[#F5F5F7] px-2 py-0.5 rounded-full">
                    Signed in with Google
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#86868B]">Unable to load profile</p>
          )}
        </div>
      </div>

      {/* Slack Integration */}
      <div className="bg-white rounded-xl border border-[#E8E8ED] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8ED]">
          <h2 className="text-[13px] font-semibold text-[#1D1D1F]">Slack Integration</h2>
        </div>
        <div className="px-6 py-6">
          {slackLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton variant="rectangle" width={200} height={36} className="rounded-lg" />
            </div>
          ) : slack ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#F5F5F7]">
                  <Plug size={18} className="text-[#248A3D]" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#1D1D1F]">{slack.teamName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#248A3D]" />
                    <span className="text-[11px] text-[#248A3D]">Connected</span>
                  </div>
                </div>
              </div>
              <Button variant="danger" size="sm">
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#1D1D1F]">Connect Slack</p>
                <p className="text-[12px] text-[#6E6E73] mt-0.5">
                  Get notified when rate limits are reached
                </p>
              </div>
              <a href={`${BASE_URL}/slack/connect`}>
                <Button size="sm">
                  <Plug size={14} />
                  Connect Slack
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Email Defaults */}
      <div className="bg-white rounded-xl border border-[#E8E8ED] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8ED]">
          <h2 className="text-[13px] font-semibold text-[#1D1D1F]">Email Defaults</h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="text-[12px] text-[#6E6E73]">
            Default settings applied to new campaigns. You can override these per campaign.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] mb-1.5 block">Default hourly limit</label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] mb-1.5 block">Delay between emails (sec)</label>
              <Input
                type="number"
                min={1}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveDefaults}>
              <Check size={14} />
              Save preferences
            </Button>
          </div>
        </div>
      </div>

      {/* API Information */}
      <div className="bg-white rounded-xl border border-[#E8E8ED] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8ED]">
          <h2 className="text-[13px] font-semibold text-[#1D1D1F]">API Information</h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#6E6E73]">Backend URL</p>
              <p className="text-[13px] text-[#1D1D1F] font-mono mt-0.5">{BASE_URL}</p>
            </div>
            <button
              onClick={copyBaseUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D2D2D7] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-[#248A3D]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#6E6E73]">Queue Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#248A3D] animate-pulse" />
                <span className="text-[13px] text-[#1D1D1F]">Operational</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F5F5F7] border border-[#E8E8ED]">
            <Circle size={12} className="text-[#86868B] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[#6E6E73]">
              The API is rate-limited to protect email providers. Queue jobs are processed with
              configurable delays and hourly limits to ensure reliable delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Queue Monitor */}
      <div className="bg-white rounded-xl border border-[#E8E8ED] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8ED]">
          <h2 className="text-[13px] font-semibold text-[#1D1D1F]">Queue Monitor</h2>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#1D1D1F]">BullMQ Dashboard</p>
              <p className="text-[12px] text-[#6E6E73] mt-0.5">
                Monitor email queue jobs, retries, and failures in real time
              </p>
            </div>
            <a
              href="/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D2D2D7] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
            >
              <Activity size={12} />
              Open dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
