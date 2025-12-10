import { useEffect, useState, useCallback } from 'react';
import { getAuthUrl, fetchUsers, runCheck } from './api.js';

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
  }, [loadUsers]);

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
        <h2>Run Check</h2>
        <p>Runs a single scan for pending replies and triggers desktop notifications.</p>
        <button onClick={handleCheck} disabled={loading || !selectedUser}>
          {loading ? 'Checking...' : 'Run Now'}
        </button>
      </section>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}

