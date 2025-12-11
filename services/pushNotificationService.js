// services/pushNotificationService.js
/**
 * pushNotificationService
 * - Primary: Firebase Cloud Messaging (server SDK)
 * - Fallback: Web Push (sketched; requires keys & subscription endpoint from clients)
 */

const admin = require('firebase-admin');
const webpush = require('web-push');

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY_BASE64, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

let fcmInitialized = false;
if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY_BASE64) {
  try {
    const privateKey = Buffer.from(FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
    admin.initializeApp({
      credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey,
      }),
    });
    fcmInitialized = true;
  } catch (err) {
    console.warn('[pushNotificationService] Firebase init failed', err.message || err);
  }
} else {
  console.warn('[pushNotificationService] Firebase env vars not set; FCM disabled.');
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[pushNotificationService] VAPID keys missing — web-push may not work.');
}

/** Send FCM to device tokens (array or single) */
async function sendFcm({ tokens, title, body, data = {}, android = {}, apns = {} }) {
  if (!fcmInitialized) {
    return { success: false, error: new Error('FCM not configured') };
  }
  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
    tokens: Array.isArray(tokens) ? tokens : [tokens],
    android: android || {},
    apns: apns || {},
  };
  try {
    const res = await admin.messaging().sendMulticast(message);
    return { success: true, result: res };
  } catch (err) {
    console.error('[pushNotificationService] sendFcm error', err.message || err);
    return { success: false, error: err };
  }
}

/** Send Web Push (requires subscription object from client) */
async function sendWebPush(subscription, payload) {
  try {
    const resp = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true, resp };
  } catch (err) {
    console.error('[pushNotificationService] sendWebPush error', err);
    return { success: false, error: err };
  }
}

module.exports = {
  sendFcm,
  sendWebPush,
};
