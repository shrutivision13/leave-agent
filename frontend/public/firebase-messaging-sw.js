/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config - should match your frontend config
const firebaseConfig = {
  apiKey: "AIzaSyCVlGCwhWh1RRQBSdoy3dUjCDdX9fVb5Ks",
  authDomain: "relay-ai-7b3ce.firebaseapp.com",
  projectId: "relay-ai-7b3ce",
  storageBucket: "relay-ai-7b3ce.firebasestorage.app",
  messagingSenderId: "104072870053",
  appId: "1:104072870053:web:fdbceefc8ec4ac9a40354c",
  measurementId: "G-2D7PZ54BTJ"
}
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Leave Request Agent';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.type || 'default',
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});