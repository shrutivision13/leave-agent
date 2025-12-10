import { useEffect, useState, useCallback } from 'react';
import { getAuthUrl, fetchUsers, runCheck, testNotification, registerFCMToken } from './api.js';
import { requestFCMToken, onForegroundMessage } from './firebase.js';

function useQueryParam(key) {
  const [value, setValue] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key));
  }, [key]);

  return value;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [fcmToken, setFcmToken] = useState(null);
  const [fcmSupported, setFcmSupported] = useState(true);
  const connectedEmail = useQueryParam('email');

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchUsers();
      setUsers(data.users || []);
      if (data.users?.length && !selectedUser) {
        setSelectedUser(data.users[0].user_email);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [selectedUser]);

  useEffect(() => {
    loadUsers();
    setupNotifications();
  }, [loadUsers]);

  const setupNotifications = useCallback(async () => {
    try {
      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      }

      // Setup FCM
      if (Notification.permission === 'granted') {
        try {
          const token = await requestFCMToken();
          setFcmToken(token);
          
          // Register token with backend
          await registerFCMToken(token);
          console.log('FCM token registered with backend');
          
          // Listen for foreground messages
          const unsubscribe = onForegroundMessage((payload) => {
            console.log('Foreground FCM message:', payload);
            
            // Add to notifications list
            const notification = {
              type: payload.data?.type || 'fcm',
              title: payload.notification?.title || 'Notification',
              message: payload.notification?.body || '',
              timestamp: new Date().toISOString(),
              data: payload.data
            };
            
            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          });
          
          return unsubscribe;
        } catch (error) {
          console.error('FCM setup failed:', error);
          setFcmSupported(false);
        }
      }
    } catch (error) {
      console.error('Notification setup failed:', error);
      setFcmSupported(false);
    }
  }, []);

  useEffect(() => {
    if (connectedEmail) {
      setSuccess(`Connected as ${connectedEmail}`);
      loadUsers();
    }
  }, [connectedEmail, loadUsers]);

  const handleConnect = async () => {
    setError('');
    try {
      const { url } = await getAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCheck = async () => {
    if (!selectedUser) {
      setError('Select a user first');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await runCheck(selectedUser);
      setSuccess(`Checked ${res.results?.checked_requests || 0} requests; notifications sent: ${res.results?.notifications_sent || 0}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await testNotification();
      setSuccess('Test notification sent!');
    } catch (err) {
      setError(err.message);
    }
  };

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      await setupNotifications();
    }
  };

  return (
    <div className="app">
      <header>
        <h1>AI Leave Request Agent</h1>
        <p>Connect Gmail and get real-time desktop notifications for unreplied leave requests.</p>
      </header>

      <section className="card">
        <h2>Connect Gmail</h2>
        <p>Click below to authorize Gmail (redirects to Google). After consent you'll be returned here.</p>
        <button onClick={handleConnect}>Connect Gmail</button>
        {connectedEmail && <p className="success">Connected as {connectedEmail}</p>}
      </section>

      <section className="card">
        <h2>Connected Accounts</h2>
        {users.length === 0 && <p>No accounts connected yet.</p>}
        {users.length > 0 && (
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            {users.map(u => (
              <option key={u.user_email} value={u.user_email}>
                {u.user_email} (updated {u.updated_at})
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="card">
        <h2>Push Notifications</h2>
        {!fcmSupported && (
          <p className="error">Push notifications are not supported in this environment.</p>
        )}
        {fcmSupported && notificationPermission === 'default' && (
          <div>
            <p>Enable push notifications to receive alerts.</p>
            <button onClick={requestNotificationPermission}>Enable Push Notifications</button>
          </div>
        )}
        {fcmSupported && notificationPermission === 'denied' && (
          <p className="error">Notifications are blocked. Please enable them in your browser settings.</p>
        )}
        {fcmSupported && notificationPermission === 'granted' && (
          <div>
            <p className="success">✓ Push notifications enabled</p>
            {fcmToken && <p className="success">✓ FCM token registered</p>}
            <button onClick={handleTestNotification}>Test Notification</button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Run Check</h2>
        <p>Runs a single scan for pending replies and triggers notifications.</p>
        <button onClick={handleCheck} disabled={loading || !selectedUser}>
          {loading ? 'Checking...' : 'Run Now'}
        </button>
      </section>

      {notifications.length > 0 && (
        <section className="card">
          <h2>Recent Notifications</h2>
          <div className="notifications">
            {notifications.map((notif, index) => (
              <div key={index} className={`notification ${notif.type}`}>
                <div className="notification-title">{notif.title}</div>
                <div className="notification-message">{notif.message}</div>
                <div className="notification-time">
                  {new Date(notif.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}

