/**
 * Gmail API client for reading emails and checking for replies.
 */
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
    GMAIL_CREDENTIALS_FILE, 
    GMAIL_TOKEN_FILE, 
    GMAIL_SCOPES 
} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class GmailClient {
    /** Client for interacting with Gmail API. */
    
    constructor(auth = null) {
        this.service = null;
        this.auth = null;
        
        // If an auth client is provided (e.g., from web OAuth), use it
        if (auth) {
            this.auth = auth;
            this.service = google.gmail({ version: 'v1', auth });
        } else {
            this._authenticate();
        }
    }
    
    async _authenticate() {
        /** Authenticate and create Gmail API service (CLI / local token flow). */
        if (this.service) return; // already set (web OAuth path)
        const credentialsPath = path.resolve(__dirname, GMAIL_CREDENTIALS_FILE);
        const tokenPath = path.resolve(__dirname, GMAIL_TOKEN_FILE);
        
        if (!fs.existsSync(credentialsPath)) {
            throw new Error(
                `Gmail credentials file not found: ${credentialsPath}\n` +
                'Please download credentials.json from Google Cloud Console.'
            );
        }
        
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        
        // Handle both "installed" (Desktop app) and "web" credential formats
        const creds = credentials.installed || credentials.web;
        if (!creds) {
            throw new Error(
                'Invalid credentials format. Expected "installed" or "web" property.\n' +
                'Please ensure your credentials.json is from Google Cloud Console OAuth 2.0 Client ID.'
            );
        }
        
        const { client_secret, client_id, redirect_uris } = creds;
        const redirectUri = redirect_uris && redirect_uris.length > 0 ? redirect_uris[0] : 'http://localhost';
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
        
        // Check if we have previously stored a token
        let token = null;
        if (fs.existsSync(tokenPath)) {
            token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        }
        
        if (!token) {
            // Get new token
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: GMAIL_SCOPES,
            });
            
            console.log('Authorize this app by visiting this url:', authUrl);
            console.log('After authorization, paste the code here:');
            
            // For automated use, you might want to use a different flow
            // This requires manual intervention on first run
            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            
            return new Promise((resolve, reject) => {
                rl.question('Enter the code from that page here: ', async (code) => {
                    rl.close();
                    try {
                        const { tokens } = await oAuth2Client.getToken(code);
                        oAuth2Client.setCredentials(tokens);
                        fs.writeFileSync(tokenPath, JSON.stringify(tokens));
                        this.auth = oAuth2Client;
                        this.service = google.gmail({ version: 'v1', auth: oAuth2Client });
                        console.log('✓ Gmail API authenticated successfully');
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        } else {
            oAuth2Client.setCredentials(token);
            
            // Refresh token if expired
            if (token.expiry_date && token.expiry_date < Date.now()) {
                try {
                    const { credentials } = await oAuth2Client.refreshAccessToken();
                    oAuth2Client.setCredentials(credentials);
                    fs.writeFileSync(tokenPath, JSON.stringify(credentials));
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    // Try to get new token
                    fs.unlinkSync(tokenPath);
                    return this._authenticate();
                }
            }
            
            this.auth = oAuth2Client;
            this.service = google.gmail({ version: 'v1', auth: oAuth2Client });
            console.log('✓ Gmail API authenticated successfully');
        }
    }
    
    async searchEmails(query, maxResults = 50) {
        /**
         * Search for emails matching the query.
         * 
         * @param {string} query - Gmail search query (e.g., 'subject:leave request')
         * @param {number} maxResults - Maximum number of results to return
         * @returns {Promise<Array>} List of email message objects
         */
        try {
            const response = await this.service.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: maxResults,
            });
            
            const messages = response.data.messages || [];
            const emailList = [];
            
            for (const msg of messages) {
                const emailData = await this.getEmailDetails(msg.id);
                if (emailData) {
                    emailList.push(emailData);
                }
            }
            
            return emailList;
        } catch (error) {
            console.error('An error occurred while searching emails:', error.message);
            return [];
        }
    }
    
    async getEmailDetails(messageId) {
        /**
         * Get detailed information about a specific email.
         * 
         * @param {string} messageId - Gmail message ID
         * @returns {Promise<Object|null>} Object with email details or null
         */
        try {
            const response = await this.service.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });
            
            const message = response.data;
            const headers = message.payload?.headers || [];
            
            // Extract header information
            const emailData = {
                id: messageId,
                thread_id: message.threadId,
                snippet: message.snippet || '',
                internal_date: parseInt(message.internalDate || 0),
            };
            
            for (const header of headers) {
                const name = header.name.toLowerCase();
                if (name === 'from') {
                    emailData.from = header.value;
                } else if (name === 'to') {
                    emailData.to = header.value;
                } else if (name === 'subject') {
                    emailData.subject = header.value;
                } else if (name === 'date') {
                    emailData.date = header.value;
                }
            }
            
            // Get body content
            emailData.body = this._extractBody(message.payload);
            
            return emailData;
        } catch (error) {
            console.error('An error occurred while getting email details:', error.message);
            return null;
        }
    }
    
    _extractBody(payload) {
        /** Extract email body text from payload. */
        let body = '';
        
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain') {
                    const data = part.body?.data;
                    if (data) {
                        body += Buffer.from(data, 'base64').toString('utf-8');
                    }
                } else if (part.mimeType === 'text/html') {
                    const data = part.body?.data;
                    if (data) {
                        const html = Buffer.from(data, 'base64').toString('utf-8');
                        // Simple HTML to text conversion (remove tags)
                        body += html.replace(/<[^>]+>/g, '');
                    }
                }
                
                // Handle nested parts
                if (part.parts) {
                    body += this._extractBody(part);
                }
            }
        } else {
            if (payload.mimeType === 'text/plain') {
                const data = payload.body?.data;
                if (data) {
                    body = Buffer.from(data, 'base64').toString('utf-8');
                }
            }
        }
        
        return body;
    }
    
    async findLeaveRequests(daysBack = 7) {
        /**
         * Find leave request emails sent by the user.
         * 
         * @param {number} daysBack - Number of days to look back
         * @returns {Promise<Array>} List of leave request emails
         */
        const { LEAVE_REQUEST_SUBJECT_KEYWORDS } = await import('./config.js');
        
        // Build search query for leave requests
        const queryParts = [];
        
        // Search for emails sent by user (not received)
        queryParts.push('in:sent');
        
        // Search for subject keywords
        const subjectQuery = LEAVE_REQUEST_SUBJECT_KEYWORDS
            .map(keyword => `subject:"${keyword}"`)
            .join(' OR ');
        queryParts.push(`(${subjectQuery})`);
        
        // Search within date range
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysBack);
        const dateStr = sinceDate.toISOString().split('T')[0].replace(/-/g, '/');
        queryParts.push(`after:${dateStr}`);
        
        const query = queryParts.join(' ');
        console.log(`Searching for leave requests with query: ${query}`);
        
        const emails = await this.searchEmails(query);
        const leaveRequests = [];
        
        for (const email of emails) {
            const subject = email.subject || '';
            const subjectLower = subject.toLowerCase().trim();
            
            // Skip emails that are replies or forwards (Re:, RE:, Fwd:, FWD:, etc.)
            if (subjectLower.match(/^(re:|fwd?:|fw:)/)) {
                continue;
            }
            
            // Additional filtering by subject keywords
            if (LEAVE_REQUEST_SUBJECT_KEYWORDS.some(keyword => 
                subjectLower.includes(keyword.toLowerCase()))) {
                leaveRequests.push(email);
            }
        }
        
        return leaveRequests;
    }
    
    async checkForReply(originalEmail) {
        /**
         * Check if there's a reply to the original email.
         * 
         * @param {Object} originalEmail - Object containing original email details
         * @returns {Promise<boolean>} True if reply exists, False otherwise
         */
        const threadId = originalEmail.thread_id;
        if (!threadId) {
            return false;
        }
        
        try {
            const response = await this.service.users.threads.get({
                userId: 'me',
                id: threadId,
            });
            
            const thread = response.data;
            const messages = thread.messages || [];
            
            // Original email is typically the first message
            const originalId = originalEmail.id;
            const originalDate = parseInt(originalEmail.internal_date || 0);
            
            // Sort messages by date to find the original
            const sortedMessages = [...messages].sort((a, b) => 
                parseInt(a.internalDate || 0) - parseInt(b.internalDate || 0)
            );
            
            // The first message in the thread is typically the original
            const firstMessage = sortedMessages[0];
            const originalMessageId = firstMessage?.id;
            
            // Check if there are any messages after the original
            for (const message of messages) {
                const msgId = message.id;
                const msgDate = parseInt(message.internalDate || 0);
                
                // Skip the original message itself
                if (msgId === originalId || msgId === originalMessageId) {
                    continue;
                }
                
                // Check if this is a reply (sent after original)
                if (msgDate > originalDate) {
                    // Get message details to check sender and subject
                    const msgDetails = await this.getEmailDetails(msgId);
                    if (msgDetails) {
                        const originalFrom = originalEmail.from || '';
                        const replyFrom = msgDetails.from || '';
                        const replySubject = (msgDetails.subject || '').toLowerCase();
                        
                        // Check if it's a reply:
                        // 1. From a different sender (most common case)
                        // 2. OR has "Re:" in subject (even if from same sender, it's a reply)
                        if (originalFrom !== replyFrom || replySubject.startsWith('re:')) {
                            return true;
                        }
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('An error occurred while checking for reply:', error.message);
            return false;
        }
    }
    
    getEmailAgeHours(email) {
        /** Get the age of an email in hours. */
        const internalDate = parseInt(email.internal_date || 0);
        if (internalDate === 0) {
            return 0;
        }
        
        const emailDate = new Date(internalDate);
        const now = new Date();
        const ageMs = now - emailDate;
        return ageMs / (1000 * 60 * 60); // Convert to hours
    }
}

