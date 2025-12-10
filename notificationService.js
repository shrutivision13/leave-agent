/**
 * Notification service that works in both development and production.
 * Uses desktop notifications locally and web notifications in production.
 */
import notifier from 'node-notifier';

export class NotificationService {
    /** Service for sending notifications (desktop locally, web in production). */
    
    constructor() {
        this.notifier = notifier;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.webNotifications = []; // Store notifications for web clients
        this.webClients = new Set(); // Store connected web clients
    }
    
    // Add method to register web clients (for SSE)
    addWebClient(res) {
        this.webClients.add(res);
        
        // Remove client when connection closes
        res.on('close', () => {
            this.webClients.delete(res);
        });
    }
    
    // Send notification to all connected web clients
    sendToWebClients(notification) {
        this.webClients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(notification)}\n\n`);
            } catch (error) {
                // Remove disconnected clients
                this.webClients.delete(client);
            }
        });
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
        
        const notification = {
            type: 'leave_request',
            title: '⚠ Leave Request - No Reply',
            message: message,
            subject: title,
            timestamp: new Date().toISOString(),
            data: {
                subject,
                emailDate,
                hoursOld: hoursOld.toFixed(1),
                daysOld,
                recipientEmail
            }
        };
        
        if (this.isProduction) {
            // Send to web clients in production
            this.webNotifications.push(notification);
            this.sendToWebClients(notification);
            console.log('   ✓ Web notification sent');
            return true;
        } else {
            // Use desktop notifications in development
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
        
        const message = count === 1 
            ? 'You have 1 leave request pending reply.'
            : `You have ${count} leave requests pending replies.`;
        
        const notification = {
            type: 'summary',
            title: '📧 Leave Request Summary',
            message: message,
            timestamp: new Date().toISOString(),
            data: { count }
        };
        
        if (this.isProduction) {
            // Send to web clients in production
            this.webNotifications.push(notification);
            this.sendToWebClients(notification);
            return true;
        } else {
            // Use desktop notifications in development
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
        const notification = {
            type: 'test',
            title: '✅ Notification Test',
            message: 'Notifications are working correctly!',
            timestamp: new Date().toISOString()
        };
        
        if (this.isProduction) {
            // Send to web clients in production
            this.sendToWebClients(notification);
            console.log('✓ Test web notification sent successfully');
            return true;
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
    
    // Get recent notifications for web clients
    getRecentNotifications(limit = 10) {
        return this.webNotifications.slice(-limit);
    }
}

