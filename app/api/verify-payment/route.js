// app/api/verify-payment/route.js - UPDATED
import { NextResponse } from 'next/server';
import paystack from 'paystack';
import prisma from '@/lib/prisma';
import { createOrdersFromPayment } from '@/lib/payment-utils';

const paystackInstance = paystack(process.env.PAYSTACK_SECRET_KEY);

export async function POST(request) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    console.log(`🔍 Verifying payment: ${reference}`);
    
    // Verify with Paystack
    const response = await paystackInstance.transaction.verify(reference);
    const { status, data } = response;

    if (status && data.status === 'success') {
      console.log(`✅ Payment successful for reference: ${reference}`);
      
      // Check if payment session exists
      const paymentSession = await prisma.paymentSession.findUnique({
        where: { id: reference }
      });
      
      if (!paymentSession) {
        return NextResponse.json({ 
          verified: false, 
          message: 'Payment session not found.' 
        }, { status: 404 });
      }
      
      // Handle different session statuses
      switch (paymentSession.status) {
        case 'COMPLETED':
          return NextResponse.json({ 
            verified: true, 
            message: 'Payment already processed successfully.' 
          });
        
        case 'FAILED':
        case 'EXPIRED':
          return NextResponse.json({ 
            verified: false, 
            message: `This payment session is ${paymentSession.status.toLowerCase()}.` 
          }, { status: 400 });
      }
      
      // ========== CRITICAL FIX: Handle processing ==========
      try {
        // Atomically update from PENDING to prevent race conditions.
        // We will mark as COMPLETED here and rely on the transaction in createOrdersFromPayment.
        const updatedSession = await prisma.paymentSession.updateMany({
          where: { 
            id: reference,
            status: 'PENDING' // Only update if still PENDING
          },
          data: { status: 'COMPLETED' } // Mark as completed immediately
        });

        // If no rows were updated, another process got to it first.
        if (updatedSession.count === 0) {
          console.log(`⚡ Race condition or stale session: ${reference} was not in PENDING state.`);
          // Re-fetch to check the current status and return an appropriate message.
          const currentSession = await prisma.paymentSession.findUnique({ where: { id: reference } });
          return NextResponse.json({ 
            verified: true, 
            message: `Payment already being processed or was completed. Current status: ${currentSession?.status}` 
          });
        }
        
        // Create orders
        const createdOrders = await createOrdersFromPayment(reference);
        
        return NextResponse.json({ 
          verified: true, 
          message: 'Payment verified successfully.',
          ordersCreated: createdOrders?.length || 0,
          reference,
          orders: createdOrders.map(o => o.id)
        });
        
      } catch (orderError) {
        console.error(`❌ Failed to create orders:`, orderError);
        
        // Mark as failed
        await prisma.paymentSession.update({
          where: { id: reference },
          data: { status: 'FAILED' }
        });
        
        return NextResponse.json({ 
          verified: true, // Payment WAS successful
          message: 'Payment successful but order creation failed. Please contact support.',
          reference
        });
      }
    }

    // Payment failed
    console.log(`❌ Payment failed: ${reference}`, data?.message);
    
    // Update payment session to failed
    await prisma.paymentSession.updateMany({
      where: { 
        id: reference,
        status: { notIn: ['COMPLETED', 'FAILED'] }
      },
      data: { status: 'FAILED' }
    });
    
    return NextResponse.json({ 
      verified: false, 
      error: data?.message || 'Payment verification failed.' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return NextResponse.json({ 
      error: 'Payment verification failed.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}