// app/api/payment/status/route.js - CREATE THIS NEW FILE
import prisma from '@/lib/prisma';
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const reference = searchParams.get('reference');
        
        if (!reference) {
            return NextResponse.json({ error: 'Payment reference required' }, { status: 400 });
        }
        
        // Check payment session
        const paymentSession = await prisma.paymentSession.findUnique({
            where: { id: reference },
            select: { status: true, userId: true }
        });
        
        if (!paymentSession) {
            return NextResponse.json({ 
                status: 'not_found',
                message: 'Payment session not found' 
            });
        }
        
        // If payment completed, check if orders were created
        if (paymentSession.status === 'COMPLETED') {
            const orders = await prisma.order.findMany({
                where: {
                    paymentReference: reference,
                    isPaid: true
                },
                select: { id: true }
            });
            
            return NextResponse.json({
                status: 'completed',
                orderIds: orders.map(o => o.id),
                message: 'Payment completed and orders created'
            });
        }
        
        // Return current status
        return NextResponse.json({
            status: paymentSession.status.toLowerCase(),
            message: `Payment ${paymentSession.status}`
        });
        
    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json({ 
            error: 'Failed to check payment status',
            details: error.message 
        }, { status: 500 });
    }
}