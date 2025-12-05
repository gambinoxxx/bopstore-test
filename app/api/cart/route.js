// app/api/cart/route.js - FULLY IMPLEMENTED
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }
        
        const body = await request.json();
        const { cart = {} } = body;
        
        if (typeof cart !== 'object' || cart === null || Array.isArray(cart)) {
            return NextResponse.json({ error: 'Invalid cart format' }, { status: 400 });
        }
        
        // Sanitize cart data
        const cleanCart = {};
        for (const [productId, quantity] of Object.entries(cart)) {
            if (productId && typeof quantity === 'number' && quantity >= 0) {
                cleanCart[productId] = quantity;
            }
        }
        
        console.log(`📦 Saving cart for user ${userId}:`, cleanCart);

        // Get user details from Clerk to ensure our DB has the correct info
        const clerkUser = await clerkClient.users.getUser(userId);
        const userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
        const userEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
        const userImage = clerkUser.imageUrl;

        // Use upsert to either create a new user or update an existing one's cart
        const updatedUser = await prisma.user.upsert({
            where: { id: userId },
            update: {
                cart: cleanCart,
                updatedAt: new Date()
            }, 
            create: {
                id: userId,
                name: userName || 'New User',
                email: userEmail || `${userId}@temp.com`,
                image: userImage || '',
                cart: cleanCart,
            }
        });

        return NextResponse.json({ 
            cart: updatedUser.cart || {},
            message: 'Cart saved successfully'
        });
        
    } catch (error) {
        console.error("❌ Error saving cart:", error);
        return NextResponse.json({ 
            error: 'Failed to save cart'
        }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ cart: {} });
        }
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { cart: true }
        });
        
        console.log(`📦 Loading cart for user ${userId}:`, user?.cart || {});
        
        return NextResponse.json({ 
            cart: user?.cart || {}
        });
        
    } catch (error) {
        console.error("❌ Error loading cart:", error);
        return NextResponse.json({ 
            error: 'Failed to load cart'
        }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }
        
        console.log(`🗑️ Clearing cart for user ${userId}`);
        
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} }
        });
        
        return NextResponse.json({ 
            message: 'Cart cleared successfully'
        });
        
    } catch (error) {
        console.error("❌ Error clearing cart:", error);
        return NextResponse.json({ 
            error: 'Failed to clear cart'
        }, { status: 500 });
    }
}