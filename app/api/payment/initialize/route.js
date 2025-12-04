// app/api/payment/initialize/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

export async function POST(req) {
  let paymentReference = null;
  
  try {
    // Get authenticated user
    const { userId } = getAuth(req);
    const user = userId ? await clerkClient.users.getUser(userId) : null;
    
    const userEmail = user?.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || 'customer@example.com';
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Valued Customer';
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { items, addressId, couponCode } = await req.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }
    
    if (!addressId) {
      return NextResponse.json({ error: 'Shipping address required' }, { status: 400 });
    }
    
    console.log(`🛒 Starting payment for user ${userId} with ${items.length} items`);
    
    // ========== STEP 1: GROUP ITEMS BY STORE ==========
    const itemsByStore = {};
    let grandTotal = 0;    

    // OPTIMIZATION: Fetch all products at once
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        storeId: true,
        price: true,
        name: true,
        stock: true
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        console.error(`❌ Product ${item.productId} not found during processing.`);
        // Fail the transaction if a product from the cart is missing.
        return NextResponse.json({ error: `Product with ID ${item.productId} not found.` }, { status: 404 });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for "${product.name}". Only ${product.stock} available.` 
        }, { status: 400 });
      }

      const storeId = product.storeId;

      if (!itemsByStore[storeId]) {
        itemsByStore[storeId] = {
          storeId,
          items: [],
          total: 0
        };
      }

      const itemTotal = product.price * item.quantity;
      itemsByStore[storeId].items.push({
        id: product.id,
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
        itemTotal: itemTotal
      });

      itemsByStore[storeId].total += itemTotal;
      grandTotal += itemTotal;
    }
    
    // Check if we have any items
    if (Object.keys(itemsByStore).length === 0) {
      return NextResponse.json({ error: 'No valid items in cart' }, { status: 400 });
    }
    
    // Convert to array for metadata storage
    const ordersByStore = Object.values(itemsByStore);
    const storeCount = ordersByStore.length;
    
    console.log(`📊 Grouped into ${storeCount} store orders:`);
    ordersByStore.forEach(storeOrder => {
      console.log(`   Store ${storeOrder.storeId}: ${storeOrder.items.length} items, Total: ₦${storeOrder.total}`);
    });
    
    // ========== STEP 2: APPLY COUPON IF ANY ==========
    let coupon = null;
    let finalGrandTotal = grandTotal;
    
    if (couponCode) {
      try {
        coupon = await prisma.coupon.findFirst({
          where: { 
            code: couponCode,
            expiresAt: { gt: new Date() },
            isActive: true
          }
        });
        
        if (coupon) {
          const discountAmount = (grandTotal * coupon.discount) / 100;
          finalGrandTotal = grandTotal - discountAmount;
          
          console.log(`🎫 Applied coupon: ${couponCode} - ${coupon.discount}% off`);
          console.log(`   Original: ₦${grandTotal}, Discount: ₦${discountAmount}, Final: ₦${finalGrandTotal}`);
        }
      } catch (error) {
        console.error('Error applying coupon:', error);
      }
    }
    
    // ========== STEP 3: CREATE PAYMENT SESSION ==========
    paymentReference = `BOP_${Date.now()}_user_${userId}_${Math.floor(Math.random() * 100000000)}`;
    
    const paymentSession = await prisma.paymentSession.create({
      data: {
        id: paymentReference,
        userId,
        amount: finalGrandTotal,
        status: 'PENDING',
        metadata: {
          userId,
          addressId,
          ordersByStore,
          storeCount,
          grandTotal,
          finalGrandTotal,
          coupon: coupon ? {
            code: coupon.code,
            discount: coupon.discount,
            couponId: coupon.id
          } : null,
          buyerName: userName,
          buyerEmail: userEmail,
          createdAt: new Date().toISOString()
        }
      }
    });
    
    console.log(`💰 Created payment session: ${paymentReference} for ₦${finalGrandTotal}`);
    
    // ========== STEP 4: INITIALIZE PAYSTACK PAYMENT ==========
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        amount: Math.round(finalGrandTotal * 100),
        reference: paymentReference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify?reference=${paymentReference}`,
        metadata: {
          userId,
          paymentSessionId: paymentReference,
          storeCount,
          itemsCount: items.length
        }
      })
    });
    
    const paystackData = await paystackResponse.json();
    
    if (!paystackData.status) {
      throw new Error(`Payment initialization failed: ${paystackData.message}`);
    }
    
    console.log(`✅ Payment initialized. Paystack ref: ${paystackData.data.reference}`);
    
    // ========== STEP 5: RETURN RESPONSE ==========
    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paymentReference,
      amount: finalGrandTotal,
      storeCount,
      ordersByStore
    });
    
  } catch (error) {
    console.error('❌ Payment initialization error:', error);

    if (paymentReference) {
      await prisma.paymentSession.update({
        where: { id: paymentReference },
        data: { status: 'FAILED' }
      }).catch(updateError => {
        console.error(`❌ Failed to mark payment as FAILED:`, updateError);
      });
    }

    return NextResponse.json({ 
      error: 'Failed to initialize payment',
      details: error.message 
    }, { status: 500 });
  }
}