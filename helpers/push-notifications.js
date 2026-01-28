/**
 * Push Notification Helper
 * Sends push notifications via Expo's push notification service
 */

const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send a push notification to a single device
 * @param {string} pushToken - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send
 * @returns {Promise<object>} - Result of the push
 */
async function sendPushNotification(pushToken, title, body, data = {}) {
    // Check that the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return { success: false, error: 'Invalid push token' };
    }

    const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high'
    };

    try {
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];

        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }

        console.log('Push notification sent:', { title, body, tickets });
        return { success: true, tickets };
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send push notifications to multiple devices
 * @param {Array<string>} pushTokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send
 * @returns {Promise<object>} - Result of the push
 */
async function sendPushNotifications(pushTokens, title, body, data = {}) {
    const messages = [];

    for (const pushToken of pushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
            priority: 'high'
        });
    }

    if (messages.length === 0) {
        return { success: false, error: 'No valid push tokens' };
    }

    try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }

        console.log(`Push notifications sent to ${messages.length} devices`);
        return { success: true, tickets };
    } catch (error) {
        console.error('Error sending push notifications:', error);
        return { success: false, error: error.message };
    }
}

// ==================== ORDER NOTIFICATION TEMPLATES ====================

/**
 * Notify user when order status changes
 */
async function notifyOrderStatusChange(pushToken, orderNumber, oldStatus, newStatus) {
    const statusMessages = {
        Processing: {
            title: 'Order Being Processed',
            body: `Your order #${orderNumber} is now being processed.`
        },
        Shipped: {
            title: 'Order Shipped',
            body: `Great news! Your order #${orderNumber} has been shipped and is on its way.`
        },
        Delivered: {
            title: 'Order Delivered',
            body: `Your order #${orderNumber} has been delivered. Enjoy your purchase!`
        },
        Cancelled: {
            title: 'Order Cancelled',
            body: `Your order #${orderNumber} has been cancelled. Contact support if you have questions.`
        }
    };

    const notification = statusMessages[newStatus] || {
        title: 'Order Update',
        body: `Your order #${orderNumber} status has been updated to ${newStatus}.`
    };

    return sendPushNotification(pushToken, notification.title, notification.body, {
        type: 'order_status_change',
        orderNumber,
        oldStatus,
        newStatus
    });
}

/**
 * Notify user when payment is verified
 */
async function notifyPaymentVerified(pushToken, orderNumber) {
    return sendPushNotification(
        pushToken,
        'Payment Verified',
        `Your payment for order #${orderNumber} has been verified. Thank you!`,
        {
            type: 'payment_verified',
            orderNumber
        }
    );
}

/**
 * Notify user when payment is rejected
 */
async function notifyPaymentRejected(pushToken, orderNumber) {
    return sendPushNotification(
        pushToken,
        'Payment Issue',
        `There was an issue verifying your payment for order #${orderNumber}. Please contact support.`,
        {
            type: 'payment_rejected',
            orderNumber
        }
    );
}

/**
 * Notify user when payment is under review
 */
async function notifyPaymentUnderReview(pushToken, orderNumber) {
    return sendPushNotification(
        pushToken,
        'Payment Under Review',
        `Your payment for order #${orderNumber} is being reviewed. We'll update you shortly.`,
        {
            type: 'payment_review',
            orderNumber
        }
    );
}

module.exports = {
    sendPushNotification,
    sendPushNotifications,
    notifyOrderStatusChange,
    notifyPaymentVerified,
    notifyPaymentRejected,
    notifyPaymentUnderReview
};
