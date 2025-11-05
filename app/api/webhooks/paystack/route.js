import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { fulfillOrders } from '@/lib/payment-utils';

export async function POST(request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const body = await request.text();

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');

  const signature = request.headers.get('x-paystack-signature');

  // 1. Verify the webhook signature for security
  if (hash !== signature) {
    console.error('Paystack webhook signature verification failed.');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  // 2. Handle the 'charge.success' event
  if (event.event === 'charge.success') {
    const { metadata, reference } = event.data;

    // Metadata should contain your order and user IDs
    const orderIds = metadata.orderIds.split(',');
    const userId = metadata.userId;

    console.log(`Webhook: Processing successful charge for reference: ${reference}, orderIds: ${orderIds}`);

    try {
      await fulfillOrders(orderIds, userId);
    } catch (error) {
      console.error('Error processing charge.success webhook:', error);
      // Return a 500 to signal to Paystack that the webhook failed and should be retried.
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  }

  // 4. Acknowledge receipt of the event
  return NextResponse.json({ status: 'success' });
}
