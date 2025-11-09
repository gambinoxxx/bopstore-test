import prisma from '@/lib/prisma';
import { sendEmail } from './sendNotification';

/**
 * Marks orders as paid and clears the user's cart within a transaction.
 * This function is idempotent and safe to call multiple times for the same order.
 * @param {string[]} orderIds - An array of order IDs to update.
 * @param {string} userId - The ID of the user who owns the orders.
 * @returns {Promise<void>}
 */
export async function fulfillOrders(orderIds, userId) {
    try {
        const updatedOrdersResult = await prisma.$transaction(async (tx) => {
            // Update the orders to be marked as paid.
            // This is idempotent: it only updates orders that are not already paid.
            const updatedOrders = await tx.order.updateMany({
                where: {
                    id: { in: orderIds },
                    userId: userId,
                    isPaid: false, // Important: Only update if not already paid
                },
                data: { isPaid: true },
            });

            // Clear the user's cart only if we actually updated orders.
            if (updatedOrders.count > 0) {
                await tx.user.update({ where: { id: userId }, data: { cart: {} } });
                console.log(`Fulfilled ${updatedOrders.count} order(s) and cleared cart for user: ${userId}`);
            }

            return updatedOrders;
        });

        // --- Send email notifications if orders were newly fulfilled ---
        if (updatedOrdersResult.count > 0) {
            const orders = await prisma.order.findMany({
                where: { id: { in: orderIds } },
                include: {
                    orderItems: { include: { product: true } },
                    store: { select: { name: true, email: true } },
                    user: { select: { name: true, email: true } },
                },
            });

            if (!orders.length) return;

            const buyerName = orders[0].user.name || 'Customer';
            const buyerEmail = orders[0].user.email;
            const notificationPromises = [];

            // Group items by store for seller notifications
            const ordersByStore = new Map();
            orders.forEach(order => {
                if (!ordersByStore.has(order.storeId)) {
                    ordersByStore.set(order.storeId, { store: order.store, items: [] });
                }
                ordersByStore.get(order.storeId).items.push(...order.orderItems);
            });

            // --- Prepare notifications for each seller ---
            for (const [, { store, items }] of ordersByStore.entries()) {
                const orderTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const itemsHtml = `<ul>${items.map(item => `<li>${item.quantity} x ${item.product.name} - ₦${item.price.toFixed(2)}</li>`).join('')}</ul>`;

                if (store?.email) {
                    const sellerHtml = `
                        <p>Hi ${store.name},</p>
                        <p>You have a new paid order from ${buyerName}. Please check your dashboard to process it.</p>
                        <h3>Order Summary:</h3>
                        ${itemsHtml}
                        <p><strong>Store Total: ₦${orderTotal.toFixed(2)}</strong></p>
                        <p>Order details are available in your Bopstore seller dashboard.</p>
                    `;
                    notificationPromises.push(sendEmail({
                        to: store.email,
                        subject: `You Have a New Paid Order on Bopstore!`,
                        html: sellerHtml,
                        text: `You have a new paid order from ${buyerName}. Store Total: ₦${orderTotal.toFixed(2)}. Please check your dashboard.`
                    }));
                }
            }

            // --- Notify the buyer with a single consolidated email ---
            if (buyerEmail) {
                const allItems = orders.flatMap(order => order.orderItems);
                const allItemsHtml = `<ul>${allItems.map(item => `<li>${item.quantity} x ${item.product.name} - ₦${item.price.toFixed(2)}</li>`).join('')}</ul>`;
                const grandTotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                const buyerHtml = `<p>Hi ${buyerName},</p><p>Thank you for your payment! Your order is confirmed and the seller(s) will begin processing it shortly.</p><h3>Full Order Summary:</h3>${allItemsHtml}<p><strong>Grand Total: ₦${grandTotal.toFixed(2)}</strong></p><p>You can view your complete order details in your account.</p>`;
                notificationPromises.push(sendEmail({
                    to: buyerEmail,
                    subject: 'Your Bopstore Order is Confirmed!',
                    html: buyerHtml,
                    text: `Your payment was successful! Grand Total: ₦${grandTotal.toFixed(2)}.`
                }));
            }

            await Promise.all(notificationPromises).catch(console.error);
        }
    } catch (error) {
        console.error(`Error fulfilling orders for user ${userId}:`, error);
        // Re-throw the error to be handled by the caller.
        throw error;
    }
}