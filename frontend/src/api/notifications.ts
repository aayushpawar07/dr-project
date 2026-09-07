// AI assisted development
import { notifyAuthExpired } from '../utils/jwtUtils';
import { authFetch } from './authFetch';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export interface NotificationResponse {
  id: string;
  userId: string;
  type: 'job_alert' | 'application_update' | 'interview_scheduled' | 'subscription';
  message: string;
  read: boolean;
  relatedJobId?: string;
  relatedApplicationId?: string;
  createdAt: string;
}

export interface NotificationPreferencesResponse {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  jobAlertEnabled: boolean;
  applicationUpdateEnabled: boolean;
  interviewScheduledEnabled: boolean;
  subscriptionEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationQuery {
  page?: number;
  size?: number;
  type?: string;
  unreadOnly?: boolean;
}

export async function fetchNotifications(params: NotificationQuery = {}, token: string): Promise<{
  content: NotificationResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  if (params.type) qs.set('type', params.type);
  if (params.unreadOnly !== undefined) qs.set('unreadOnly', String(params.unreadOnly));

  const url = `${API_BASE}/notifications?${qs.toString()}`;
  console.log('🌐 Fetching notifications from:', url);
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      notifyAuthExpired();
    }
    const errorText = await res.text();
    console.error('❌ API Error:', res.status, errorText);
    throw new Error(`Failed to fetch notifications (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  console.log('✅ Notifications fetched:', data);
  return data;
}

export async function getUnreadCount(token: string): Promise<number> {
  const url = `${API_BASE}/notifications/unread-count`;
  console.log('🌐 Fetching unread count from:', url);
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      notifyAuthExpired();
      return 0;
    }
    const errorText = await res.text();
    console.error('❌ API Error:', res.status, errorText);
    throw new Error(`Failed to fetch unread count (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  console.log('✅ Unread count response:', data);
  
  // Ensure we return a number, not an object
  const count = typeof data === 'object' && data !== null 
    ? (data.unreadCount || 0) 
    : (typeof data === 'number' ? data : 0);
  
  // Ensure it's a number
  const numericCount = Number(count) || 0;
  console.log('✅ Extracted unread count:', numericCount);
  
  return numericCount;
}

export async function markAsRead(notificationId: string, token: string): Promise<NotificationResponse> {
  const res = await authFetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to mark notification as read (${res.status})`);
  }

  return res.json();
}

export async function markAllAsRead(token: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to mark all notifications as read (${res.status})`);
  }
}

export async function deleteNotification(notificationId: string, token: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete notification (${res.status})`);
  }
}

export async function getNotificationPreferences(token: string): Promise<NotificationPreferencesResponse> {
  const res = await authFetch(`${API_BASE}/notifications/preferences`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch notification preferences (${res.status})`);
  }

  return res.json();
}

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferencesResponse>,
  token: string
): Promise<NotificationPreferencesResponse> {
  const res = await authFetch(`${API_BASE}/notifications/preferences`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  });

  if (!res.ok) {
    throw new Error(`Failed to update notification preferences (${res.status})`);
  }

  return res.json();
}

