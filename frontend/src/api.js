const API_BASE = import.meta.env.VITE_API_URL || '/api';
console.log("🚀 ~ API_BASE:", API_BASE)

export async function getAuthUrl() {
  const res = await fetch(`${API_BASE}/auth/url`);
  if (!res.ok) throw new Error('Failed to fetch auth URL');
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function runCheck(userEmail) {
  const res = await fetch(`${API_BASE}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to run check');
  }
  return res.json();
}

export async function testNotification() {
  const res = await fetch(`${API_BASE}/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send test notification');
  }
  return res.json();
}

export async function registerFCMToken(fcmToken) {
  const res = await fetch(`${API_BASE}/notifications/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to register FCM token');
  }
  return res.json();
}

export async function unregisterFCMToken(fcmToken) {
  const res = await fetch(`${API_BASE}/notifications/unregister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to unregister FCM token');
  }
  return res.json();
}

