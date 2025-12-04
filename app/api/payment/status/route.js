// app/api/payment/status/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');
    
    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }
    
    // Get payment session
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: reference },
      select: {
        status: true,
        metadata: true,
      }
    });
    
    if (!paymentSession) {
      return NextResponse.json({ 
        status: 'not_found',
        message: 'Payment session not found' 
      });
    }
    
    // Get orders created from this payment
    const orders = await prisma.order.findMany({
      where: { paymentReference: reference },
      select: { id: true, status: true }
    });
    
    const response = {
      status: paymentSession.status.toLowerCase(),
      message: `Payment is ${paymentSession.status.toLowerCase()}`,
      reference: reference
    };
    
    // Add order IDs if payment is completed
    if (paymentSession.status === 'COMPLETED' && orders.length > 0) {
      response.orderIds = orders.map(order => order.id);
      response.orderCount = orders.length;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to check payment status',
      error: error.message 
    }, { status: 500 });
  }
}