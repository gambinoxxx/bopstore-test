import { NextResponse } from 'next/server';
import paystack from 'paystack';
import { fulfillOrders } from '@/lib/payment-utils';

const paystackInstance = paystack(process.env.PAYSTACK_SECRET_KEY);

export async function POST(request) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const response = await paystackInstance.transaction.verify(reference);

    const { status, data } = response;

    if (status && data.status === 'success') {
      const { metadata } = data;
      const orderIds = metadata.orderIds.split(',');
      const userId = metadata.userId;

      console.log(`Callback: Processing successful charge for reference: ${reference}, orderIds: ${orderIds}`);

      await fulfillOrders(orderIds, userId);
      return NextResponse.json({ verified: true, message: 'Payment verified successfully' });
    }

    return NextResponse.json({ verified: false, message: 'Payment verification failed' }, { status: 400 });
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}