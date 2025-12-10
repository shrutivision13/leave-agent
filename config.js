/**
 * Configuration management for the AI Agent.
 * Loads credentials and settings from environment variables or .env file.
 */
import dotenv from 'dotenv';

dotenv.config();

// Gmail API Configuration
export const GMAIL_CREDENTIALS_FILE = process.env.GMAIL_CREDENTIALS_FILE || 'credentials.json';
export const GMAIL_TOKEN_FILE = process.env.GMAIL_TOKEN_FILE || 'token.json';
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Agent Configuration
export const LEAVE_REQUEST_SUBJECT_KEYWORDS = (process.env.LEAVE_REQUEST_KEYWORDS || 
    'leave request,leave application,vacation request,leave').split(',').map(k => k.trim());
export const CHECK_INTERVAL_HOURS = parseInt(process.env.CHECK_INTERVAL_HOURS || '24', 10);
export const REPLY_TIMEOUT_HOURS = parseInt(process.env.REPLY_TIMEOUT_HOURS || '1', 10);

// Server / DB Configuration
export const PORT = parseInt(process.env.PORT || '3001', 10);
console.log("🚀 ~ PORT:", PORT)
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:x9E8TV2IoTPaCkpn@quizopp.yfsv1yj.mongodb.net/leave-agent';

// Scheduler
export const SCHEDULE_HOURS = parseInt(process.env.SCHEDULE_HOURS || '12', 10);


