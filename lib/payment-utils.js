import prisma from '@/lib/prisma';
import { createNotification } from './createNotification';

export async function createOrdersFromPayment(paymentReference) {
  const paymentSession = await prisma.paymentSession.findUnique({
    where: { id: paymentReference },
    select: {
      userId: true,
      metadata: true,
    }
  });

  if (!paymentSession) {
    throw new Error('Payment session not found');
  }

  // Ensure metadata is parsed correctly and contains expected fields
  const metadata = paymentSession.metadata;
  if (!metadata || !Array.isArray(metadata.items) || !metadata.addressId) {
    throw new Error('Invalid payment session metadata structure.');
  }

  const { items, addressId, couponCode } = metadata;

  const createdOrders = [];

  // Group items by storeId  
  const itemsByStore = {};
  for (const cartItem of items) { // cartItem is expected to be { productId: '...', quantity: N }
    const productId = cartItem.id || cartItem.productId; // Use 'id' as primary, fallback to 'productId'
    if (!productId || typeof productId !== 'string') {
      console.warn(`Cart item missing or invalid productId. Skipping:`, cartItem);
      continue;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true } // Include store to get storeId and sellerId
    });

    if (!product) {
      console.warn(`Product with ID ${productId} not found in database. Skipping.`);
      continue;
    }
    if (!product.id) { // Extra check, though unlikely for a valid product
      console.warn(`Fetched product has no ID. Skipping:`, product);
      continue;
    }

    if (!itemsByStore[product.storeId]) {
      itemsByStore[product.storeId] = {
        storeId: product.storeId,
        sellerId: product.store.userId, // Assuming Store model has userId
        items: [],
      };
    }
    itemsByStore[product.storeId].items.push({
      productId: product.id, // Use the ID from the fetched product
      quantity: cartItem.quantity,
      price: product.price, // Use the actual product price from DB
      product: product // Attach full product for later use if needed (optional)
    });
  }

  for (const storeId in itemsByStore) {
    const storeData = itemsByStore[storeId];
    const storeItems = storeData.items;
    const storeTotal = storeItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const orderItemsData = storeItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const order = await prisma.$transaction(async (tx) => {
      // 1. Decrease stock for each item, checking for sufficient quantity
      for (const item of storeItems) {
        const updatedProduct = await tx.product.update({
          where: {
            id: item.productId,
            stock: {
              gte: item.quantity, // Ensure stock is greater than or equal to the quantity ordered
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId: paymentSession.userId,
          storeId: storeId,
          addressId: addressId,
          total: storeTotal,
          paymentMethod: 'PAYSTACK', // Or from metadata if dynamic
          paymentReference: paymentReference,
          status: 'ORDER_PLACED',
          isPaid: true,
          isCouponUsed: !!couponCode,
          coupon: couponCode ? { code: couponCode } : {}, // Store coupon data
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: true, // Include order items to return them
          user: { select: { name: true, email: true } }
        }
      });

      // Create escrow for the order
      await tx.escrow.create({
        data: {
          orderId: newOrder.id,
          buyerId: paymentSession.userId,
          sellerId: storeData.sellerId,
          status: 'PENDING',
        },
      });

      // 3. Notify the seller about the new order
      await createNotification({
        userId: storeData.sellerId,
        type: 'ORDER_UPDATE',
        title: 'New Order Received!',
        message: `You have a new order #${newOrder.id.substring(0, 8)} for ${formatPrice(storeTotal)}.`,
        data: { orderId: newOrder.id },
        tx: tx, // Pass the transaction client
      });

      return newOrder;
    });
    createdOrders.push(order);
  }
  return createdOrders;
}

function formatPrice(price) {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';
    return `${currency}${price.toLocaleString()}`;
}