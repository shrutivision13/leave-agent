/**
 * Firebase Cloud Messaging service for push notifications.
 */
import admin from 'firebase-admin';

export class FirebaseService {
    constructor() {
        this.initialized = false;
        this.fcmTokens = new Set(); // Store FCM tokens
    }
    
    async initialize() {
        try {
            // Initialize Firebase Admin SDK
            if (!admin.apps.length) {
                // Check if service account key is provided
                const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
                
                if (serviceAccountKey) {
                    const serviceAccount = JSON.parse(serviceAccountKey);
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                } else {
                    console.warn('Firebase service account key not found. FCM notifications disabled.');
                    return false;
                }
            }
            
            this.initialized = true;
            console.log('✓ Firebase service initialized');
            return true;
        } catch (error) {
            console.error('✗ Failed to initialize Firebase:', error.message);
            return false;
        }
    }
    
    addFCMToken(token) {
        if (token && typeof token === 'string') {
            this.fcmTokens.add(token);
            console.log(`FCM token registered: ${token.substring(0, 20)}...`);
        }
    }
    
    removeFCMToken(token) {
        this.fcmTokens.delete(token);
    }
    
    async sendNotification(title, body, data = {}) {
        if (!this.initialized || this.fcmTokens.size === 0) {
            console.log('FCM not initialized or no tokens registered');
            return false;
        }
        
        const tokens = Array.from(this.fcmTokens);
        
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                timestamp: new Date().toISOString()
            },
            tokens
        };
        
        try {
            const response = await admin.messaging().sendMulticast(message);
            
            // Remove invalid tokens
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const failedToken = tokens[idx];
                        console.log(`Removing invalid FCM token: ${failedToken.substring(0, 20)}...`);
                        this.fcmTokens.delete(failedToken);
                    }
                });
            }
            
            console.log(`✓ FCM notification sent to ${response.successCount} devices`);
            return true;
        } catch (error) {
            console.error('✗ Failed to send FCM notification:', error.message);
            return false;
        }
    }
    
    async sendLeaveRequestNotification(request, hoursOld, recipientEmail = null) {
        const subject = request.subject || 'No Subject';
        const emailDate = request.date || 'Unknown';
        const daysOld = (hoursOld / 24).toFixed(1);
        
        const title = '⚠️ Leave Request - No Reply';
        const body = `${subject} (${daysOld} days old)`;
        
        const data = {
            type: 'leave_request',
            subject,
            emailDate,
            hoursOld: hoursOld.toString(),
            daysOld,
            recipientEmail: recipientEmail || ''
        };
        
        return await this.sendNotification(title, body, data);
    }
    
    async sendSummaryNotification(count) {
        if (count === 0) return true;
        
        const title = '📧 Leave Request Summary';
        const body = count === 1 
            ? 'You have 1 leave request pending reply.'
            : `You have ${count} leave requests pending replies.`;
        
        const data = {
            type: 'summary',
            count: count.toString()
        };
        
        return await this.sendNotification(title, body, data);
    }
    
    async sendTestNotification() {
        const title = '✅ Notification Test';
        const body = 'Push notifications are working correctly!';
        
        const data = {
            type: 'test'
        };
        
        return await this.sendNotification(title, body, data);
    }
}