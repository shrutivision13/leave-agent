/**
 * Express server exposing APIs for Gmail auth and leave request checks.
 */
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { PORT, FRONTEND_URL, SCHEDULE_HOURS } from './config.js';
import { generateAuthUrl, handleAuthCallback, getAuthorizedClient } from './authService.js';
import { listUsers } from './db.js';
import { LeaveRequestAgent } from './leaveAgent.js';
import { GmailClient } from './gmailClient.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Get Google auth URL
app.get('/api/auth/url', (_req, res) => {
    try {
        const url = generateAuthUrl();
        res.json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Handle OAuth callback: /api/auth/callback?code=...
app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'Missing code' });
    }
    try {
        const { userEmail } = await handleAuthCallback(code);
        const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
        if (wantsJson) {
            return res.json({ userEmail, success: true });
        }
        const redirectUrl = `${FRONTEND_URL}/auth-success?email=${encodeURIComponent(userEmail)}`;
        return res.redirect(redirectUrl);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// List connected users
app.get('/api/users', (_req, res) => {
    listUsers()
        .then(users => res.json({ users }))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.message });
        });
});

// Run leave check once for a specific user
app.post('/api/check', async (req, res) => {
    const { userEmail } = req.body || {};
    if (!userEmail) {
        return res.status(400).json({ error: 'userEmail required' });
    }
    try {
        const auth = await getAuthorizedClient(userEmail);
        if (!auth) {
            return res.status(400).json({ error: 'No tokens for this user. Connect Gmail first.' });
        }
        const gmailClient = new GmailClient(auth);
        const agent = new LeaveRequestAgent(gmailClient);
        const results = await agent.runOnce();
        res.json({ results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ---- Scheduler: every SCHEDULE_HOURS hours ----
const cronExpr = `0 */${SCHEDULE_HOURS} * * *`; // minute 0, every N hours
console.log(`Scheduling automated checks every ${SCHEDULE_HOURS} hours (cron: ${cronExpr})`);

cron.schedule(cronExpr, async () => {
    console.log(`[Scheduler] Running periodic leave checks at ${new Date().toISOString()}`);
    try {
        const users = await listUsers();
        for (const u of users) {
            const userEmail = u.user_email;
            try {
                const auth = await getAuthorizedClient(userEmail);
                if (!auth) {
                    console.warn(`[Scheduler] No tokens for ${userEmail}, skipping`);
                    continue;
                }
                const gmailClient = new GmailClient(auth);
                const agent = new LeaveRequestAgent(gmailClient);
                await agent.runOnce();
            } catch (err) {
                console.error(`[Scheduler] Error for ${userEmail}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Failed to list users:', err.message);
    }
});

app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});

