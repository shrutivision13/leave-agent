/**
 * Real-time desktop notification service using node-notifier.
 * Provides cross-platform desktop notifications for leave request alerts.
 */
import notifier from 'node-notifier';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class NotificationService {
    /** Service for sending desktop notifications. */
    
    constructor() {
        this.notifier = notifier;
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
                        sound: true, // Play system sound
                        wait: false, // Don't wait for callback
                        timeout: 10, // Notification timeout in seconds
                        icon: null, // Use default system icon
                        // Windows specific options
                        appID: 'AI Leave Request Agent',
                        // macOS specific options
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
    
    /**
     * Test notification to verify the service is working.
     * 
     * @returns {Promise<boolean>} True if test notification sent successfully
     */
    async testNotification() {
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
            
            console.log('✓ Test notification sent successfully');
            return true;
        } catch (error) {
            console.error('✗ Failed to send test notification:', error.message);
            return false;
        }
    }
}

