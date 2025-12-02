// app/api/verify-payment/route.js
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
          message: 'Payment session not found. Please contact support with your payment reference.' 
        }, { status: 404 });
      }
      
      // Handle different session statuses
      switch (paymentSession.status) {
        case 'COMPLETED': // Already processed, success.
          return NextResponse.json({ 
            verified: true, 
            message: 'Payment already processed successfully.' 
          });
        
        case 'FAILED': // Terminal state, fail.
        case 'EXPIRED': // Terminal state, fail.
          return NextResponse.json({ 
            verified: false, 
            message: `This payment session has been marked as ${paymentSession.status.toLowerCase()}. Please try a new payment.` 
          }, { status: 400 });
      }
      
      // If we reach here, the status is PENDING and ready for processing.
      // We don't need to update the status here because createOrdersFromPayment handles the transition.
      
      // Start order creation in background (non-blocking)
      createOrdersFromPayment(reference)
        .then(() => {
          console.log(`✅ Successfully created orders for ${reference}`);
        })
        .catch(error => {
          console.error(`❌ Failed to create orders for ${reference}:`, error);
          // Optionally: Send alert to admin about failed order creation
        });
      
      return NextResponse.json({ 
        verified: true, 
        message: 'Payment verified successfully. Your order is being created...',
        reference
      });
    }

    // Payment failed
    console.log(`❌ Payment failed for reference: ${reference}`, data?.message);
    
    // Update payment session to failed
    await prisma.paymentSession.updateMany({
      where: { 
        id: reference,
        status: { notIn: ['COMPLETED', 'FAILED'] } // Don't overwrite completed or already failed
      },
      data: { status: 'FAILED' }
    }).catch(() => {
      // Session might not exist (e.g., direct payment without checkout)
      console.log(`No payment session found for failed reference: ${reference}`);
    });
    
    return NextResponse.json({ 
      verified: false, 
      error: data?.message || 'Payment verification failed. Please try again.' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Error verifying Paystack payment:', error);
    return NextResponse.json({ 
      error: 'Payment verification service is temporarily unavailable.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}