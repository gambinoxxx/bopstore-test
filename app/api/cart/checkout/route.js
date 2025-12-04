// app/api/cart/checkout/route.js
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }
        
        const { addressId, couponCode } = await request.json();
        
        if (!addressId) {
            return NextResponse.json({ error: 'Shipping address required' }, { status: 400 });
        }
        
        // Get user's cart
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { cart: true } // Only need the cart
        });
        
        const cart = user?.cart || {};
        
        if (Object.keys(cart).length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }
        
        // Transform cart to items array for payment initialization
        const items = Object.entries(cart).map(([productId, quantity]) => ({
            productId,
            quantity
        }));
        
        // Call payment initialization
        const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payment/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('authorization') || ''
            },
            body: JSON.stringify({
                items,
                addressId,
                couponCode
            })
        });
        
        if (!paymentResponse.ok) {
            const error = await paymentResponse.json();
            throw new Error(error.error || 'Payment initialization failed');
        }
        
        const paymentData = await paymentResponse.json();
        
        return NextResponse.json({
            success: true,
            authorization_url: paymentData.authorization_url,
            reference: paymentData.reference,
            amount: paymentData.amount,
            storeCount: paymentData.storeCount
        });
        
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}