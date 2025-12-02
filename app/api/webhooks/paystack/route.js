// app/api/webhook/paystack/route.js - UPDATED VERSION
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createOrdersFromPayment } from '@/lib/payment-utils';

export async function POST(request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const body = await request.text();

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex');

    const signature = request.headers.get('x-paystack-signature');

    if (hash !== signature) {
      console.error('❌ Paystack webhook signature verification failed.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      
      console.log(`✅ Webhook: Processing successful charge for reference: ${reference}`);
      
      if (!reference) {
        console.error('❌ Webhook Error: charge.success event received without a reference.');
        return NextResponse.json({ error: 'Reference missing in webhook payload' }, { status: 400 });
      }

      try {
        // Use the new function that creates orders from payment
        await createOrdersFromPayment(reference);
        console.log(`✅ Webhook: Successfully processed payment ${reference}`);
        
      } catch (error) {
        console.error(`❌ Webhook: Error processing payment ${reference}:`, error);
        
        // Return 500 so Paystack retries
        return NextResponse.json({ 
          error: 'Webhook processing failed',
          details: error.message 
        }, { status: 500 });
      }
    }

    // Handle failed payment
    if (event.event === 'charge.failed') {
      const { reference } = event.data;
      console.log(`❌ Webhook: Payment failed for reference: ${reference}`);
      
      // Update payment session to failed
      await prisma.paymentSession.updateMany({
        where: { 
          id: reference,
          status: { not: 'COMPLETED' }
        },
        data: { status: 'FAILED' }
      }).catch(() => {
        console.log(`No payment session found for failed reference: ${reference}`);
      });
    }

    // Acknowledge receipt
    return NextResponse.json({ status: 'success' });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}