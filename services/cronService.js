const cron = require('node-cron');
const Ride = require('../models/rideModel');
const Notification = require('../models/notificationModel');
const Token = require('../models/tokenModel');

const CronService = {
  init() {
    console.log('[CronService] Initialized scheduled tasks.');

    // 1️⃣ Every Midnight: Clean up expired tokens
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Running daily cleanup...');
      try {
        // Delete tokens older than 7 days (cleanup ref)
        // Note: Tokens usually have TTL in DB, but this is a fallback
        const result = await Token.deleteMany({ createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
        console.log(`[Cron] Deleted ${result.deletedCount} expired tokens.`);
      } catch (err) {
        console.error('[Cron] Token cleanup failed:', err.message);
      }
    });

    // 2️⃣ Every Hour: Cancel "OPEN" rides older than 2 hours
    cron.schedule('0 * * * *', async () => {
      console.log('[Cron] Checking for stale rides...');
      try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const result = await Ride.updateMany(
          { status: 'OPEN', createdAt: { $lt: twoHoursAgo } },
          { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
        );
        if (result.modifiedCount > 0) {
           console.log(`[Cron] Auto-cancelled ${result.modifiedCount} stale rides.`);
        }
      } catch (err) {
        console.error('[Cron] Ride cleanup failed:', err.message);
      }
    });

    // 3️⃣ Weekly: Delete old notifications (older than 30 days)
    cron.schedule('0 0 * * 0', async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
        console.log(`[Cron] Deleted ${result.deletedCount} old notifications.`);
      } catch (err) {
        console.error('[Cron] Notification cleanup failed:', err.message);
      }
    });
  }
};

module.exports = CronService;
