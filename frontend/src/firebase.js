/**
 * Firebase configuration for FCM push notifications.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase config - replace with your actual config
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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('Firebase messaging not available:', error.message);
}

export { messaging };

// Request FCM token
export async function requestFCMToken() {
  if (!messaging) {
    throw new Error('Firebase messaging not initialized');
  }
  
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    });
    
    if (token) {
      console.log('FCM token received:', token.substring(0, 20) + '...');
      return token;
    } else {
      throw new Error('No registration token available');
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    throw error;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback) {
  if (!messaging) {
    console.warn('Firebase messaging not available for foreground messages');
    return () => {};
  }
  
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}