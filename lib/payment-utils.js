import prisma from '@/lib/prisma';

/**
 * Marks orders as paid and clears the user's cart within a transaction.
 * This function is idempotent and safe to call multiple times for the same order.
 * @param {string[]} orderIds - An array of order IDs to update.
 * @param {string} userId - The ID of the user who owns the orders.
 * @returns {Promise<void>}
 */
export async function fulfillOrders(orderIds, userId) {
  try {
    await prisma.$transaction(async (tx) => {
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
    });
  } catch (error) {
    console.error(`Error fulfilling orders for user ${userId}:`, error);
    // Re-throw the error to be handled by the caller.
    throw error;
  }
}