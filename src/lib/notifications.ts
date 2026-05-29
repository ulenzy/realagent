import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { NotificationEvent } from '../types';

const CRITICAL_EVENTS = [
  'bid_accepted',
  'listing_approved',
  'inspection_confirmed',
  'dispute_opened',
  'account_suspended'
];

const PUSH_ONLY_EVENTS = [
  'bid_received',
  'message_received',
  'listing_rejected',
  'kyc_verified'
];

export async function sendNotification(userId: string, event: NotificationEvent): Promise<void> {
  const { type, title, body, data } = event;
  const targetData = data || {};

  // For offline local guests, save to localStorage
  const isLocalGuest = localStorage.getItem('isLocalGuest') === 'true';
  if (isLocalGuest) {
    try {
      const notifyId = `notify-${Date.now()}`;
      const newNotif = {
        id: notifyId,
        title,
        body,
        type,
        data: targetData,
        read: false,
        createdAt: new Date().toISOString()
      };
      const key = `notifications_${userId}`;
      const stored = localStorage.getItem(key);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newNotif);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    } catch (localErr) {
      console.error('Failed to save notification locally:', localErr);
    }
  }

  try {
    // 1. Write in-app notification to users/{userId}/notifications subcollection
    const notificationsCol = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsCol, {
      title,
      body,
      type,
      data: targetData,
      read: false,
      createdAt: new Date().toISOString()
    });

    const isCritical = CRITICAL_EVENTS.includes(type);
    const isPushOnly = PUSH_ONLY_EVENTS.includes(type);

    // 2. Push Notification if critical or push_only
    if (isCritical || isPushOnly) {
      try {
        const sendPush = httpsCallable(functions, 'sendPushNotification');
        await sendPush({
          userId,
          payload: {
            title,
            body,
            type,
            data: targetData
          }
        });
      } catch (pushErr) {
        console.error('Failed to send Push Notification Cloud Function:', pushErr);
      }
    }

    // 3. SMS notification on critical events
    if (isCritical) {
      try {
        // Fetch user phone number from firestore users collection
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const phoneNumber = userData?.phoneNumber;
          if (phoneNumber) {
            const sendSMS = httpsCallable(functions, 'sendSMS');
            await sendSMS({
              phoneNumber,
              message: `${title}: ${body}`
            });
          } else {
            console.warn(`No phone number found for user ${userId} to send critical SMS`);
          }
        }
      } catch (smsErr) {
        console.error('Failed to send SMS Cloud Function:', smsErr);
      }
    }
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}
