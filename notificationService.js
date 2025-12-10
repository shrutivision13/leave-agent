/**
 * Notification service that works in both development and production.
 * Uses desktop notifications locally and FCM push notifications in production.
 */
import notifier from 'node-notifier';
import { FirebaseService } from './firebaseService.js';

export class NotificationService {
    /** Service for sending notifications (desktop locally, FCM in production). */
    
    constructor() {
        this.notifier = notifier;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.firebaseService = new FirebaseService();
        this.initialized = false;
    }
    
    async initialize() {
        if (this.isProduction) {
            console.log('Production environment detected, initializing FCM...');
            this.initialized = await this.firebaseService.initialize();
        } else {
            console.log('Development environment detected, using desktop notifications');
            this.initialized = true;
        }
        return this.initialized;
    }
    
    // Register FCM token from frontend
    registerFCMToken(token) {
        if (this.isProduction && this.initialized) {
            this.firebaseService.addFCMToken(token);
        }
    }
    
    // Unregister FCM token
    unregisterFCMToken(token) {
        if (this.isProduction && this.initialized) {
            this.firebaseService.removeFCMToken(token);
        }
    }
    
    /**
     * Send a desktop notification for a pending leave request.
     * 
     * @param {Object} request - Leave request object
     * @param {string} request.subject - Email subject
     * @param {string} request.date - Email date
     * @param {number} hoursOld - Age of email in hours
     * @param {string|null} recipientEmail - Recipient email address
     * @returns {Promise<boolean>} True if notification sent successfully
     */
    async notifyPendingLeaveRequest(request, hoursOld, recipientEmail = null) {
        if (this.isProduction && this.initialized) {
            // Use FCM push notifications in production
            return await this.firebaseService.sendLeaveRequestNotification(request, hoursOld, recipientEmail);
        } else {
            // Use desktop notifications in development
            const subject = request.subject || 'No Subject';
            const emailDate = request.date || 'Unknown';
            const daysOld = (hoursOld / 24).toFixed(1);
            
            // Format notification message
            let message = `Sent: ${emailDate}\n`;
            message += `Age: ${daysOld} days (${hoursOld.toFixed(1)} hours)`;
            if (recipientEmail) {
                message += `\nTo: ${recipientEmail}`;
            }
            message += '\n\n⚠ Action Required: Follow up on this leave request';
            
            // Truncate subject if too long
            const title = subject.length > 60 ? subject.substring(0, 57) + '...' : subject;
            
            try {
                await new Promise((resolve, reject) => {
                    this.notifier.notify(
                        {
                            title: '⚠ Leave Request - No Reply',
                            message: message,
                            subtitle: title,
                            sound: true,
                            wait: false,
                            timeout: 10,
                            icon: null,
                            appID: 'AI Leave Request Agent',
                            appName: 'AI Leave Request Agent',
                        },
                        (err, response) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                });
                
                console.log('   ✓ Desktop notification sent');
                return true;
            } catch (error) {
                console.error('   ✗ Failed to send desktop notification:', error.message);
                return false;
            }
        }
    }
    
    /**
     * Send a summary notification for multiple pending requests.
     * 
     * @param {number} count - Number of pending requests
     * @returns {Promise<boolean>} True if notification sent successfully
     */
    async notifySummary(count) {
        if (count === 0) {
            return true; // No notification needed
        }
        
        if (this.isProduction && this.initialized) {
            // Use FCM push notifications in production
            return await this.firebaseService.sendSummaryNotification(count);
        } else {
            // Use desktop notifications in development
            const message = count === 1 
                ? 'You have 1 leave request pending reply.'
                : `You have ${count} leave requests pending replies.`;
            
            try {
                await new Promise((resolve, reject) => {
                    this.notifier.notify(
                        {
                            title: '📧 Leave Request Summary',
                            message: message,
                            sound: true,
                            wait: false,
                            timeout: 5,
                            appID: 'AI Leave Request Agent',
                            appName: 'AI Leave Request Agent',
                        },
                        (err, response) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                });
                
                return true;
            } catch (error) {
                console.error('Failed to send summary notification:', error.message);
                return false;
            }
        }
    }
    
    /**
     * Test notification to verify the service is working.
     * 
     * @returns {Promise<boolean>} True if test notification sent successfully
     */
    async testNotification() {
        if (this.isProduction && this.initialized) {
            // Use FCM push notifications in production
            return await this.firebaseService.sendTestNotification();
        } else {
            // Use desktop notifications in development
            try {
                await new Promise((resolve, reject) => {
                    this.notifier.notify(
                        {
                            title: '✅ Notification Test',
                            message: 'Desktop notifications are working correctly!',
                            sound: true,
                            wait: false,
                            timeout: 5,
                            appID: 'AI Leave Request Agent',
                            appName: 'AI Leave Request Agent',
                        },
                        (err, response) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                });
                
                console.log('✓ Test desktop notification sent successfully');
                return true;
            } catch (error) {
                console.error('✗ Failed to send test notification:', error.message);
                return false;
            }
        }
    }
}

