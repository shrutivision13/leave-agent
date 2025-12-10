/**
 * Test script to verify desktop notifications are working.
 */
import { NotificationService } from './notificationService.js';

const notificationService = new NotificationService();

console.log('Testing desktop notifications...\n');
notificationService.testNotification()
    .then(() => {
        console.log('\n✓ Notification test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Notification test failed:', error);
        process.exit(1);
    });

