# AI Leave Request Agent

An intelligent agent that monitors your Gmail inbox for leave request replies, sends real-time desktop notifications, provides a React UI for users to connect Gmail, and stores OAuth tokens in SQLite (configurable).

## Features

- 🔍 **Gmail Integration**: Automatically searches for leave request emails you've sent
- 📧 **Reply Detection**: Checks if replies have been received for each leave request
- 🔔 **Real-Time Desktop Notifications**: Instant popups for pending requests
- 🖥️ **React Frontend**: Connect Gmail and trigger checks from a web UI
- 💾 **MongoDB Storage**: Store OAuth tokens in MongoDB (configurable URI)
- 🔄 **Continuous Monitoring**: Run as a scheduled task or continuously

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Gmail account with API access enabled
- Google Cloud Project with Gmail API enabled

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as the application type
   - Download the credentials JSON file
   - Rename it to `credentials.json` and place it in the project root
5. On first run, the script will prompt you to visit a URL for authentication and enter the authorization code

### 3. Configuration

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```
   
   On Windows:
   ```powershell
   copy env.example .env
   ```

2. Edit `.env` with your settings:
   ```env
   # Agent settings
   LEAVE_REQUEST_KEYWORDS=leave request,leave application,vacation request
   CHECK_INTERVAL_HOURS=24
   REPLY_TIMEOUT_HOURS=48
   ```

## Usage

### Start API Server (for React UI)

```bash
npm run api
```

This exposes:
- `GET /api/auth/url` to start Gmail OAuth
- `GET /api/auth/callback` to complete OAuth and store tokens in SQLite
- `POST /api/check` to run a single check for a given user

### Start Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

By default the frontend proxies `/api` to `http://localhost:3001`. Update `FRONTEND_URL`, `PORT`, and `MONGO_URI` in `.env` as needed.

### Test Notifications

Test if desktop notifications are working on your system:

```bash
npm run test:notification
```

### Run Once

Check for pending leave requests and send notifications immediately:

```bash
npm start
```

Or directly:

```bash
node leaveAgent.js
```

### Run Continuously

Run the agent continuously, checking at regular intervals:

```bash
npm run start:continuous
```

Or directly:

```bash
node leaveAgent.js --continuous
```

### Schedule with Task Scheduler (Windows)

1. Open Task Scheduler
2. Create a new task
3. Set trigger (e.g., daily at 9 AM)
4. Set action: `node` with arguments: `D:\workspace\shruti\AI-Agent\leaveAgent.js`
5. Set working directory to the project folder
6. Make sure Node.js is in your system PATH

### Schedule with Cron (Linux/Mac)

Add to crontab to run daily at 9 AM:

```bash
0 9 * * * cd /path/to/AI-Agent && node leaveAgent.js
```

### Using PM2 (Recommended for Production)

Install PM2 globally:

```bash
npm install -g pm2
```

Start the agent:

```bash
pm2 start leaveAgent.js --name leave-agent -- --continuous
```

View logs:

```bash
pm2 logs leave-agent
```

Stop the agent:

```bash
pm2 stop leave-agent
```

## How It Works

1. **Email Detection**: The agent searches your Gmail "Sent" folder for emails matching leave request keywords
2. **Reply Checking**: For each leave request, it checks the email thread for replies
3. **Timeout Evaluation**: If no reply is found and the email is older than the timeout period, notifications are triggered
4. **Real-Time Desktop Notification**: Sends an instant desktop popup notification with details about the pending request
5. **Console Notification**: Also displays a formatted notification in the console with full details
6. **Summary Notification**: Sends a summary notification if multiple requests are pending

## Configuration Options

- `LEAVE_REQUEST_KEYWORDS`: Comma-separated keywords to identify leave requests (default: "leave request,leave application,vacation request")
- `CHECK_INTERVAL_HOURS`: How often to check for new requests in continuous mode (default: 24)
- `REPLY_TIMEOUT_HOURS`: Hours to wait before sending a notification if no reply (default: 48)

## Troubleshooting

### Gmail Authentication Issues

- Ensure `credentials.json` is in the project root
- Delete `token.json` and re-authenticate if token expires
- Check that Gmail API is enabled in Google Cloud Console
- Make sure you're using the correct OAuth client type (Desktop app)

### Notification Issues

- **Desktop Notifications**: 
  - Test notifications with: `npm run test:notification`
  - On Windows: Notifications appear in the system tray/action center
  - On macOS: Notifications appear in the notification center
  - On Linux: Requires `libnotify` (usually pre-installed)
  - If notifications don't appear, check your system notification settings
- **Console Notifications**: 
  - Notifications are also displayed in the console output
  - Make sure you're running the agent in a terminal that supports console output
  - For production use, consider redirecting output to a log file

### No Leave Requests Found

- Adjust `LEAVE_REQUEST_KEYWORDS` to match your email subjects
- Increase the search date range in the code if needed
- Check that emails are in your "Sent" folder
- Verify Gmail API permissions are correct

### Node.js Issues

- Ensure Node.js version is 18 or higher: `node --version`
- Clear node_modules and reinstall if needed: `rm -rf node_modules && npm install`
- Check for any missing dependencies

## Project Structure

```
AI-Agent/
├── package.json             # Node.js dependencies and scripts
├── server.js                # Express API for auth + checks
├── authService.js           # OAuth helper
├── db.js                    # SQLite storage for tokens
├── config.js                # Configuration management
├── gmailClient.js           # Gmail API integration
├── notificationService.js   # Desktop notification service
├── leaveAgent.js            # Main agent logic
├── testNotification.js      # Test script for notifications
├── env.example              # Example environment file
├── frontend/                # React UI
├── credentials.json         # Gmail OAuth credentials (not in git)
└── token.json               # Gmail OAuth token (not in git)
```

## Security Notes

- Never commit `credentials.json`, `token.json`, or `.env` to version control
- Regularly rotate API credentials
- Use environment variables or secure credential storage in production
- Consider using a secrets management service for production deployments

## Extending the Agent

The agent can be extended to:

- Add notification channels (Microsoft Teams, Slack, email, etc.)
- Add more sophisticated reply detection logic
- Integrate with calendar systems
- Add webhook endpoints for external triggers
- Implement machine learning for better leave request detection
- Add database storage for request tracking
- Add a REST API for remote control
- Implement email templates for different types of leave requests

## License

This project is provided as-is for educational and personal use.

## Contributing

Feel free to submit issues or pull requests to improve the agent!
