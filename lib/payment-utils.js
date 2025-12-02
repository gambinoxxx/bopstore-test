// lib/payment-utils.js - FIXED VERSION
import prisma from '@/lib/prisma';
import { sendEmail } from './sendNotification';

/**
 * Creates orders from a successful payment session.
 * This function is called AFTER payment is confirmed.
 * @param {string} paymentReference - The Paystack payment reference
 * @returns {Promise<void>}
 */
export async function createOrdersFromPayment(paymentReference) {
    let transactionCompleted = false;
    
    try {
        console.log(`Creating orders for payment: ${paymentReference}`);
        
        // Get payment session with stored order data
        const paymentSession = await prisma.paymentSession.findUnique({
            where: { id: paymentReference }
        });
        
        if (!paymentSession) {
            throw new Error(`Payment session not found: ${paymentReference}`);
        }
        
        // Check if already processed
        if (paymentSession.status === 'COMPLETED') {
            console.log(`Payment ${paymentReference} already processed`);
            return;
        }
        
        const sessionData = paymentSession.metadata;
        const userId = sessionData.userId;
        
        // ========== CRITICAL FIX 1: Smaller, focused transactions ==========
        
        // Step 1: Atomically mark payment as processing (single operation)
        try {
            await prisma.paymentSession.update({
                where: { 
                    id: paymentReference, 
                    status: 'PENDING' 
                },
                data: { status: 'COMPLETED' }
            });
        } catch (updateError) {
            // If update fails (already completed or not PENDING), just return
            if (updateError.code === 'P2025') {
                console.log(`Payment ${paymentReference} already processed or not in PENDING state`);
                return;
            }
            throw updateError;
        }
        
        // Step 2: Create orders (separate from atomic update)
        const createdOrders = [];
        
        for (const storeOrder of sessionData.ordersByStore) {
            const storeId = storeOrder.storeId;
            
            // Calculate total with coupon discount
            let total = storeOrder.total;
            if (sessionData.coupon) {
                total -= (total * sessionData.coupon.discount) / 100;
            }
            
            // Create order with transaction for order + items only
            const order = await prisma.$transaction(async (tx) => {
                const order = await tx.order.create({
                    data: {
                        userId,
                        storeId,
                        addressId: sessionData.addressId,
                        total,
                        paymentMethod: 'PAYSTACK',
                        paymentReference: paymentReference,
                        status: 'ORDER_PLACED',
                        isPaid: true,
                        isCouponUsed: !!sessionData.coupon,
                        coupon: sessionData.coupon || {},
                        orderItems: {
                            create: storeOrder.items.map(item => ({
                                productId: item.id,
                                quantity: item.quantity,
                                price: item.price,
                            }))
                        }
                    },
                    include: {
                        orderItems: { include: { product: true } },
                        store: { select: { name: true, email: true } },
                        user: { select: { name: true, email: true } },
                    }
                });
                
                return order;
            });
            
            createdOrders.push(order);
            
            // Step 3: Reduce stock (outside main transaction to prevent timeout)
            for (const item of storeOrder.items) {
                await prisma.product.update({
                    where: { id: item.id },
                    data: { stock: { decrement: item.quantity } }
                }).catch(error => {
                    console.error(`Failed to reduce stock for product ${item.id}:`, error);
                    // Continue even if stock update fails
                });
            }
            
            // Step 4: Create escrow
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                select: { userId: true }
            });
            
            if (store) {
                await prisma.escrow.create({
                    data: {
                        orderId: order.id,
                        buyerId: userId,
                        sellerId: store.userId,
                        status: 'PENDING'
                    }
                }).catch(error => {
                    console.error(`Failed to create escrow for order ${order.id}:`, error);
                });
            }
        }
        
        // Step 5: Clear user's cart (separate operation)
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} }
        }).catch(error => {
            console.error(`Failed to clear cart for user ${userId}:`, error);
        });
        
        transactionCompleted = true;
        console.log(`✅ Created ${createdOrders.length} orders for payment ${paymentReference}`);
        
        // Step 6: Send notifications (outside all transactions)
        await sendOrderNotifications(createdOrders).catch(error => {
            console.error('Failed to send notifications:', error);
        });
        
        return createdOrders;
        
    } catch (error) {
        console.error('❌ Failed to create orders from payment:', error);
        
        // Only mark as failed if transaction wasn't completed
        if (!transactionCompleted) {
            try {
                await prisma.paymentSession.updateMany({
                    where: { 
                        id: paymentReference, 
                        status: { not: 'COMPLETED' } 
                    },
                    data: { status: 'FAILED' }
                });
                console.log(`❌ Marked payment ${paymentReference} as FAILED`);
            } catch (updateError) {
                console.error('Failed to update payment session status:', updateError);
            }
        }
        
        // Re-throw the error for caller to handle
        throw error;
    }
}

/**
 * Sends notifications to sellers and buyer after order creation
 */
async function sendOrderNotifications(orders) {
    try {
        if (!orders || orders.length === 0) return;

        const notificationPromises = [];
        const buyer = orders[0].user;
        const buyerName = buyer.name || 'Customer';
        
        // Send notifications to each seller
        for (const order of orders) {
            const store = order.store;
            if (store?.email) {
                const orderTotal = order.orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const itemsHtml = `<ul>${order.orderItems.map(item => 
                    `<li>${item.quantity} x ${item.product.name} - ₦${item.price.toFixed(2)}</li>`
                ).join('')}</ul>`;
                
                const sellerHtml = `
                    <p>Hi ${store.name},</p>
                    <p>You have received a new paid order!</p>
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Customer:</strong> ${buyerName}</p>
                    <h3>Order Items:</h3>
                    ${itemsHtml}
                    <p><strong>Total: ₦${orderTotal.toFixed(2)}</strong></p>
                    <p>Please process this order through your seller dashboard.</p>
                `;
                
                notificationPromises.push(sendEmail({
                    to: store.email,
                    subject: `New Paid Order Received - ${order.id}`,
                    html: sellerHtml,
                    text: `New paid order from ${buyerName}. Total: ₦${orderTotal.toFixed(2)}`
                }));
            }
        }
        
        // Send notification to buyer
        if (buyer?.email) {
            const allItems = orders.flatMap(order => order.orderItems);
            const allItemsHtml = `<ul>${allItems.map(item => 
                `<li>${item.quantity} x ${item.product.name} - ₦${item.price.toFixed(2)}</li>`
            ).join('')}</ul>`;
            
            const grandTotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            
            const buyerHtml = `
                <p>Hi ${buyerName},</p>
                <p>Thank you for your order! Your payment has been confirmed.</p>
                <p><strong>Payment Reference:</strong> ${orders[0]?.paymentReference || 'N/A'}</p>
                <p>Your order is being processed by the sellers. You will receive updates as it progresses.</p>
                <h3>Order Summary:</h3>
                ${allItemsHtml}
                <p><strong>Grand Total: ₦${grandTotal.toFixed(2)}</strong></p>
                <p>You can track your orders in your account dashboard.</p>
            `;
            
            notificationPromises.push(sendEmail({
                to: buyer.email,
                subject: 'Order Confirmed - Payment Received',
                html: buyerHtml,
                text: `Thank you for your order! Payment confirmed. Grand Total: ₦${grandTotal.toFixed(2)}`
            }));
        }
        
        // Send all notifications
        await Promise.all(notificationPromises);
        console.log(`✅ Sent notifications for ${orders.length} orders`);
        
    } catch (error) {
        console.error('Failed to send notifications:', error);
        // Don't throw - notification failure shouldn't fail the whole process
    }
}

/**
 * Optional: Cleanup expired payment sessions
 * Run this as a cron job or serverless function
 */
export async function cleanupExpiredPaymentSessions() {
    try {
        const { count } = await prisma.paymentSession.updateMany({
            where: {
                status: 'PENDING',
                expiresAt: {
                    lt: new Date()
                }
            },
            data: { status: 'EXPIRED' }
        });
        
        console.log(`Cleaned up ${count} expired payment sessions`);
        return count;
        
    } catch (error) {
        console.error('Error cleaning up payment sessions:', error);
        throw error;
    }
}

/**
 * Keep for backward compatibility (if you have old pending orders)
 * @deprecated Use createOrdersFromPayment instead
 */
export async function fulfillOrders(orderIds, userId) {
    console.warn('fulfillOrders is deprecated. Use createOrdersFromPayment instead.');
    throw new Error('fulfillOrders is deprecated. Orders are now created after payment confirmation.');
}