const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export async function fetchAnalyticsOverview() {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to load analytics overview');
  return res.json();
}

export async function fetchJobsByCategory() {
  const res = await fetch(`${API_BASE}/analytics/jobs-by-category`);
  if (!res.ok) throw new Error('Failed to load jobs by category');
  return res.json();
}

export async function fetchJobsByLocation() {
  const res = await fetch(`${API_BASE}/analytics/jobs-by-location`);
  if (!res.ok) throw new Error('Failed to load jobs by location');
  return res.json();
}

export async function fetchTopJobs() {
  const res = await fetch(`${API_BASE}/analytics/top-jobs`);
  if (!res.ok) throw new Error('Failed to load top jobs');
  return res.json();
}

export async function fetchRecentActivity() {
  const res = await fetch(`${API_BASE}/analytics/recent-activity`);
  if (!res.ok) throw new Error('Failed to load recent activity');
  return res.json();
}

export async function fetchUserTrends() {
  const res = await fetch(`${API_BASE}/analytics/user-trends`);
  if (!res.ok) throw new Error('Failed to load user trends');
  return res.json();
}

/**
 * Tracks a visitor page-view server-side using a stable per-browser token stored in localStorage.
 * Fires-and-forgets — never throws to avoid blocking the UI.
 */
export async function trackVisitor(): Promise<void> {
  try {
    // Get or create a stable unique token for this browser
    let visitorToken = localStorage.getItem('_mej_vtk');
    if (!visitorToken) {
      visitorToken = crypto.randomUUID();
      localStorage.setItem('_mej_vtk', visitorToken);
    }
    await fetch(`${API_BASE}/analytics/track-visitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorToken }),
    });
  } catch {
    // Silently ignore — tracking is non-critical
  }
}

/**
 * Returns total and today's unique visitor counts.
 */
export async function fetchVisitorStats(): Promise<{ totalVisitors: number; todayVisitors: number }> {
  const res = await fetch(`${API_BASE}/analytics/visitors`);
  if (!res.ok) throw new Error('Failed to load visitor stats');
  return res.json();
}