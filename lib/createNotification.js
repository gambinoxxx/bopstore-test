import prisma from '@/lib/prisma';

/**
 * Creates a notification for a specific user.
 * @param {object} data - The notification data.
 * @param {string} data.userId - The ID of the user to notify.
 * @param {string} data.type - The type of notification (e.g., 'CHAT_MESSAGE').
 * @param {string} data.title - The title of the notification.
 * @param {string} data.message - The notification message body.
 * @param {object} [data.data] - Optional JSON data, like a chatId or orderId.
 */
export async function createNotification({ userId, type, title, message, data = {}, tx }) {
  try {
    // Use the provided transaction client 'tx', or fall back to the global 'prisma' client.
    const db = tx || prisma;
    const notification = await db.notification.create({
      data: { userId, type, title, message, data },
    });
    console.log(`✅ Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error(`❌ Failed to create notification for user ${userId}:`, error);
    // We don't re-throw the error because a failed notification shouldn't block the primary action (e.g., sending a message).
  }
}
