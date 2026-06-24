const { sendMail } = require('./emailService');
const { sendSms } = require('./smsService');
const Notification = require('../models/notificationModel');

/**
 * NotificationManager
 * Centralizes logic for sending notifications via multiple channels (In-App, Email, SMS).
 */
const NotificationManager = {
    /**
     * Send a notification to a user.
     * @param {Object} user - The user object (must contain _id, email, name; phone is optional).
     * @param {String} type - Notification type (e.g., 'welcome', 'ride_update', 'product_sold').
     * @param {Object} data - Dynamic data for the notification (e.g., ride details, product name).
     * @param {Object} options - Options like { sendEmail: true, sendSms: false, inApp: true }.
     */
    async notify(user, type, data = {}, options = {}) {
        const defaults = { sendEmail: true, sendSms: false, inApp: true }; // Default settings
        const config = { ...defaults, ...options };

        console.log(`[NotificationManager] Processing '${type}' for user ${user.email}`);

        const results = {};

        // 1. In-App Notification (Stored in DB + Socket.io via Controller logic usually, but we can save directly here)
        if (config.inApp) {
            try {
                const title = this._getTitle(type, data);
                const message = this._getMessage(type, data);

                const notification = await Notification.create({
                    user: user._id,
                    type: 'system', // or map 'type' to schema enum
                    event: 'general',
                    title,
                    message,
                    meta: data
                });
                results.inApp = notification;
                // Note: Socket.io emission is typically handled where the request has access to 'io' (controller).
                // If we want to emit here, we'd need to pass the 'io' instance or import a singleton.
            } catch (err) {
                console.error('[NotificationManager] In-App Error:', err.message);
            }
        }

        // 2. Email Notification
        if (config.sendEmail && user.email) {
            try {
                const subject = this._getEmailSubject(type, data);
                const html = this._getEmailContent(type, data, user);

                const emailResult = await sendMail({
                    to: user.email,
                    subject,
                    html
                });
                results.email = emailResult;
            } catch (err) {
                console.error('[NotificationManager] Email Error:', err.message);
            }
        }

        // 3. SMS Notification (Only if user has phone & SMS is enabled)
        if (config.sendSms && user.phone) {
            try {
                const smsBody = this._getSmsBody(type, data);
                const smsResult = await sendSms({
                    to: user.phone,
                    body: smsBody
                });
                results.sms = smsResult;
            } catch (err) {
                console.error('[NotificationManager] SMS Error:', err.message);
            }
        }

        return results;
    },

    // --- Helper Methods to generate content based on type ---

    _getTitle(type, data) {
        switch (type) {
            case 'welcome': return 'Welcome to Our Platform!';
            case 'ride_assigned': return 'Your Ride is Confirmed';
            case 'ride_cancelled': return 'Ride Cancelled';
            case 'new_review': return 'New Review on your Product';
            case 'welcome': return 'Welcome! Verify your Email';
            default: return 'New Notification';
        }
    },

    _getMessage(type, data) {
        switch (type) {
            case 'welcome': return `Hello ${data.name}, please verify your email.`;
            case 'ride_assigned': return `Driver ${data.driverName} is on the way.`;
            case 'ride_cancelled': return `Your ride was cancelled. Reason: ${data.reason}`;
            case 'product_sold': return `Your product ${data.productName} has been marked as sold.`;
            default: return 'You have a new update.';
        }
    },

    _getEmailSubject(type, data) {
        return this._getTitle(type, data);
    },

    _getEmailContent(type, data, user) {
        // In a real app, use HTML templates. For now, returning simple HTML strings.
        const header = `<h2>Hi ${user.name},</h2>`;
        let body = '';

        switch (type) {
            case 'welcome':
                body = `<p>Welcome to the Community Super-App! We're excited to have you on board.</p>
                <p>Start exploring products, rides, and jobs today.</p>`;
                break;
            case 'ride_assigned':
                body = `<p>Good news! A driver has accepted your ride request.</p>
                <p><strong>Driver:</strong> ${data.driverName}</p>
                <p><strong>Vehicle:</strong> ${data.vehicle || 'Standard'}</p>`;
                break;
            case 'ride_cancelled':
                body = `<p>We're sorry, but your ride was cancelled.</p>
                <p><strong>Reason:</strong> ${data.reason || 'No reason provided'}</p>`;
                break;
            case 'new_review':
                body = `<p>Someone reviewed your product <strong>${data.productName}</strong>.</p>
                <p><strong>Rating:</strong> ${data.rating} / 5</p>
                <p><strong>Comment:</strong> "${data.comment}"</p>`;
                break;
            default:
                body = `<p>You have a new notification: ${this._getMessage(type, data)}</p>`;
        }

        return `${header}${body}<br><p>Cheers,<br>The Team</p>`;
    },

    _getSmsBody(type, data) {
        switch (type) {
            case 'welcome': return `Welcome to the app, ${data.name}!`;
            case 'ride_assigned': return `Your ride is confirmed! Driver: ${data.driverName}.`;
            case 'ride_cancelled': return `Ride Cancelled. Reason: ${data.reason || 'N/A'}`;
            default: return this._getMessage(type, data);
        }
    }
};

module.exports = NotificationManager;
