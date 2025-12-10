/**
 * Main AI Agent that monitors Gmail for leave request replies
 * and sends real-time desktop and console notifications when no reply is received.
 */
import { NotificationService } from './notificationService.js';
import {
    REPLY_TIMEOUT_HOURS,
    CHECK_INTERVAL_HOURS
} from './config.js';

export class LeaveRequestAgent {
    /** AI Agent for monitoring leave requests and sending notifications. */
    
    constructor(gmailClient = null) {
        this.gmailClient = gmailClient;
        this.notificationService = new NotificationService();
        this.processedRequests = new Set(); // Track processed requests to avoid duplicates
    }
    
    async initialize() {
        /** Initialize Gmail client (async initialization). */
        if (!this.gmailClient) {
            const { GmailClient } = await import('./gmailClient.js');
            this.gmailClient = new GmailClient();
        }
        await this.gmailClient._authenticate();
    }
    
    async runOnce() {
        /**
         * Run the agent once to check for leave requests and send notifications.
         * 
         * @returns {Promise<Object>} Dictionary with execution results
         */
        await this.initialize();
        
        console.log('\n' + '='.repeat(60));
        console.log(`Leave Request Agent - ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`);
        console.log('='.repeat(60));
        
        const results = {
            checked_requests: 0,
            pending_requests: 0,
            notifications_sent: 0,
            errors: []
        };
        
        try {
            // Find leave requests from the last week
            const daysBack = Math.max(7, Math.ceil(REPLY_TIMEOUT_HOURS / 24) + 1);
            const leaveRequests = await this.gmailClient.findLeaveRequests(daysBack);
            
            console.log(`\nFound ${leaveRequests.length} leave request(s)`);
            results.checked_requests = leaveRequests.length;
            
            const pendingRequests = [];
            
            for (const request of leaveRequests) {
                const requestId = request.id;
                if (this.processedRequests.has(requestId)) {
                    continue;
                }
                
                const subject = request.subject || 'No Subject';
                const emailDate = request.date || 'Unknown';
                const hoursOld = this.gmailClient.getEmailAgeHours(request);
                
                console.log(`\n📧 Checking: ${subject}`);
                console.log(`   Date: ${emailDate}`);
                console.log(`   Age: ${hoursOld.toFixed(1)} hours`);
                
                // Check if reply timeout has passed
                if (hoursOld < REPLY_TIMEOUT_HOURS) {
                    console.log(`   ⏳ Still within timeout period (${REPLY_TIMEOUT_HOURS} hours)`);
                    continue;
                }
                
                // Check if there's a reply
                const hasReply = await this.gmailClient.checkForReply(request);
                
                if (hasReply) {
                    console.log('   ✓ Reply found - no action needed');
                    this.processedRequests.add(requestId);
                } else {
                    console.log('   ⚠ No reply found - notification needed');
                    pendingRequests.push(request);
                    results.pending_requests++;
                }
            }
            
            // Send notifications for pending requests
            for (const request of pendingRequests) {
                const subject = request.subject || 'No Subject';
                const emailDate = request.date || 'Unknown';
                const hoursOld = this.gmailClient.getEmailAgeHours(request);
                const recipient = request.to || 'Unknown';
                
                // Extract recipient email if available
                let recipientEmail = null;
                if (recipient && recipient.includes('@')) {
                    // Extract email from "Name <email@domain.com>" format
                    const emailMatch = recipient.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                    if (emailMatch) {
                        recipientEmail = emailMatch[0];
                    }
                }
                
                // Format and display console notification
                const daysOld = (hoursOld / 24).toFixed(1);
                console.log('\n' + '⚠'.repeat(30));
                console.log('LEAVE REQUEST - NO REPLY RECEIVED');
                console.log('⚠'.repeat(30));
                console.log(`Subject: ${subject}`);
                console.log(`Sent: ${emailDate}`);
                console.log(`Age: ${daysOld} days (${hoursOld.toFixed(1)} hours)`);
                if (recipientEmail) {
                    console.log(`Recipient: ${recipientEmail}`);
                }
                console.log('\n⚠ Action Required: Follow up on this leave request');
                console.log('⚠'.repeat(30) + '\n');
                
                // Send real-time desktop notification
                await this.notificationService.notifyPendingLeaveRequest(
                    request,
                    hoursOld,
                    recipientEmail
                );
                
                results.notifications_sent++;
                const requestId = request.id;
                this.processedRequests.add(requestId);
                console.log('   ✓ Notification logged');
            }
            
            // Send summary notification if there are pending requests
            if (pendingRequests.length > 0) {
                await this.notificationService.notifySummary(pendingRequests.length);
            }
            
            console.log('\n' + '='.repeat(60));
            console.log('Summary:');
            console.log(`  Checked requests: ${results.checked_requests}`);
            console.log(`  Pending requests: ${results.pending_requests}`);
            console.log(`  Notifications sent: ${results.notifications_sent}`);
            if (results.errors.length > 0) {
                console.log(`  Errors: ${results.errors.length}`);
            }
            console.log('='.repeat(60));
            
        } catch (error) {
            const errorMsg = `Error during agent execution: ${error.message}`;
            results.errors.push(errorMsg);
            console.error(`\n✗ ${errorMsg}`);
            console.error(error.stack);
        }
        
        return results;
    }
    
    async runContinuous() {
        /** Run the agent continuously, checking at specified intervals. */
        console.log('Starting Leave Request Agent in continuous mode...');
        console.log(`Check interval: ${CHECK_INTERVAL_HOURS} hours`);
        console.log(`Reply timeout: ${REPLY_TIMEOUT_HOURS} hours`);
        console.log('\nPress Ctrl+C to stop\n');
        
        try {
            while (true) {
                await this.runOnce();
                
                // Wait for the next check interval
                const waitSeconds = CHECK_INTERVAL_HOURS * 3600;
                console.log(`\n⏰ Next check in ${CHECK_INTERVAL_HOURS} hours...`);
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            }
        } catch (error) {
            if (error.code === 'SIGINT' || error.code === 'SIGTERM') {
                console.log('\n\nAgent stopped by user');
            } else {
                throw error;
            }
        }
    }
}

// Main entry point
async function main() {
    const agent = new LeaveRequestAgent();
    
    const args = process.argv.slice(2);
    if (args.includes('--continuous')) {
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\nAgent stopped by user');
            process.exit(0);
        });
        
        await agent.runContinuous();
    } else {
        await agent.runOnce();
    }
}

// Run if this is the main module
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
// process.argv[1] is already a file path, not a URL
const isMainModule = process.argv[1] && 
    (resolve(process.argv[1]) === __filename || 
     process.argv[1].endsWith('leaveAgent.js'));

if (isMainModule) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

