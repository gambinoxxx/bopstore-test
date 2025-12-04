// lib/payment-utils.js - COMPLETE VERSION
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/sendNotification'; // Make sure this exists

export async function createOrdersFromPayment(paymentReference) {
  console.log(`🔄 Creating orders for: ${paymentReference}`);
  
  try {
    // Get payment session
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: paymentReference }
    });
    
    if (!paymentSession) {
      throw new Error(`Payment session not found: ${paymentReference}`);
    }
    
    if (paymentSession.status === 'COMPLETED') {
      console.log(`✅ Already processed: ${paymentReference}`);
      return [];
    }
    
    const sessionData = paymentSession.metadata;
    const userId = sessionData.userId;
    const ordersByStore = sessionData.ordersByStore || [];
    
    console.log(`📦 Processing ${ordersByStore.length} store orders`);
    
    const createdOrders = [];
    
    // ========== CREATE ONE ORDER PER STORE ==========
    for (const storeOrder of ordersByStore) {
      const storeId = storeOrder.storeId;
      
      // Get store details (including seller userId)
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { userId: true, name: true, email: true }
      });
      
      if (!store) {
        console.error(`❌ Store ${storeId} not found`);
        continue;
      }
      
      console.log(`🏪 Creating order for: ${store.name} (Seller: ${store.userId})`);
      
      // Calculate total with coupon
      let orderTotal = storeOrder.total;
      if (sessionData.coupon?.discount) {
        const discount = (orderTotal * sessionData.coupon.discount) / 100;
        orderTotal -= discount;
      }
      
      try {
        // ATOMIC OPERATION: Create Order, Escrow, and update stock in one transaction
        const order = await prisma.$transaction(async (tx) => {
          // 1. Create the Order
          const newOrder = await tx.order.create({
            data: {
              userId,
              storeId,
              addressId: sessionData.addressId,
              total: orderTotal,
              paymentMethod: 'PAYSTACK',
              paymentReference: paymentReference,
              status: 'ORDER_PLACED',
              isPaid: true,
              isCouponUsed: !!sessionData.coupon,
              coupon: sessionData.coupon || {},
              orderItems: {
                create: storeOrder.items.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                }))
              }
            },
            include: { 
              orderItems: {
                include: {
                  product: {
                    select: {
                      name: true,
                      images: true
                    }
                  }
                }
              },
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          });
          console.log(`✅ Created order: ${newOrder.id}`);

          // 2. Create the Escrow
          await tx.escrow.create({
            data: {
              orderId: newOrder.id,
              buyerId: userId,
              sellerId: store.userId,
              amount: orderTotal,
              status: 'PENDING'
            }
          });
          console.log(`💳 Created escrow for order: ${newOrder.id}`);

          // 3. Reduce stock for each item
          for (const item of storeOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            });
          }
          console.log(`📉 Stock updated for order: ${newOrder.id}`);

          return newOrder;
        });

        createdOrders.push(order);

      } catch (transactionError) {
        console.error(`❌ Transaction failed for store ${storeId}:`, transactionError);
        // Continue with other stores
      }
    }
    
    // Clear cart
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { cart: {} }
      });
      console.log(`🛒 Cleared cart`);
    } catch (cartError) {
      console.error(`❌ Cart clear failed:`, cartError);
    }
    
    // Mark payment as completed
    await prisma.paymentSession.update({
      where: { id: paymentReference },
      data: { status: 'COMPLETED' }
    });
    
    console.log(`🎉 Created ${createdOrders.length} orders with escrows`);
    
    // Send notifications in background
    if (createdOrders.length > 0) {
      sendOrderNotifications(createdOrders).catch(error => {
        console.error('❌ Failed to send notifications:', error);
      });
    }
    
    return createdOrders;
    
  } catch (error) {
    console.error(`❌ Failed to create orders: ${error.message}`);
    
    // Mark as failed
    try {
      await prisma.paymentSession.update({
        where: { id: paymentReference },
        data: { status: 'FAILED' }
      });
    } catch (updateError) {
      console.error('Failed to mark as failed:', updateError);
    }
    
    throw error;
  }
}

// ... rest of your functions (sendOrderNotifications, cleanupExpiredPaymentSessions, fulfillOrders)

/**
 * Sends notifications to sellers and buyer after order creation
 */
async function sendOrderNotifications(orders) {
    try {
        if (!orders || orders.length === 0) return;

        const notificationPromises = [];
        const buyer = orders[0].user;
        const buyerName = buyer.name || 'Customer';

        // OPTIMIZATION: Fetch all stores at once to avoid N+1 queries
        const storeIds = orders.map(order => order.storeId);
        const stores = await prisma.store.findMany({
            where: { id: { in: storeIds } },
            select: { id: true, name: true, email: true }
        });
        const storeMap = new Map(stores.map(s => [s.id, s]));
        
        // Send notifications to each seller
        for (const order of orders) {
            const store = storeMap.get(order.storeId);
            
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
                    <p>The payment is held in escrow and will be released once you mark the order as delivered.</p>
                `;
                
                notificationPromises.push(sendEmail({
                    to: store.email,
                    subject: `New Paid Order Received - ${order.id}`,
                    html: sellerHtml,
                    text: `New paid order from ${buyerName}. Order ID: ${order.id}. Total: ₦${orderTotal.toFixed(2)}. Payment held in escrow.`
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
                <p>Thank you for your order! Your payment has been confirmed and is securely held in escrow.</p>
                <p><strong>Payment Reference:</strong> ${orders[0]?.paymentReference || 'N/A'}</p>
                <p>Your order is being processed by the sellers. You will receive updates as it progresses.</p>
                <h3>Order Summary:</h3>
                ${allItemsHtml}
                <p><strong>Grand Total: ₦${grandTotal.toFixed(2)}</strong></p>
                <p>Your payment will be released to the seller once you confirm delivery.</p>
                <p>You can track your orders in your account dashboard.</p>
            `;
            
            notificationPromises.push(sendEmail({
                to: buyer.email,
                subject: 'Order Confirmed - Payment Received & Held in Escrow',
                html: buyerHtml,
                text: `Thank you for your order! Payment confirmed and held in escrow. Grand Total: ₦${grandTotal.toFixed(2)}`
            }));
        }
        
        // Send all notifications
        await Promise.all(notificationPromises);
        console.log(`✅ Sent notifications for ${orders.length} orders`);
        
    } catch (error) {
        console.error('❌ Failed to send notifications:', error);
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
        
        console.log(`🧹 Cleaned up ${count} expired payment sessions`);
        return count;
        
    } catch (error) {
        console.error('❌ Error cleaning up payment sessions:', error);
        throw error;
    }
}

/**
 * Keep for backward compatibility (if you have old pending orders)
 * @deprecated Use createOrdersFromPayment instead
 */
export async function fulfillOrders(orderIds, userId) {
    console.warn('⚠️ fulfillOrders is deprecated. Use createOrdersFromPayment instead.');
    throw new Error('fulfillOrders is deprecated. Orders are now created after payment confirmation.');
}