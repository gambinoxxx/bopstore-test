// app/api/cart/route.js - SIMPLE WORKING VERSION
import { getAuth, clerkClient } from "@clerk/nextjs/server"; // Corrected import
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ 
                cart: {},
                success: true,
                message: 'User not authenticated, cart saved locally'
            });
        }
        
        const { cart = {} } = await request.json();
        
        if (typeof cart !== 'object' || cart === null || Array.isArray(cart)) {
            return NextResponse.json({ 
                cart: {},
                success: true,
                message: 'Invalid cart format'
            });
        }
        
        // Clean cart - remove any invalid values
        const cleanCart = {};
        for (const [productId, quantity] of Object.entries(cart)) {
            // Only include valid product IDs and positive quantities
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
            // Return empty cart for unauthenticated users
            return NextResponse.json({ 
                cart: {},
                success: true,
                message: 'User not authenticated, returning empty cart'
            });
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
            success: false,
            cart: {},
            error: error.message
        }, { status: 500 });
    }
}

// Optional: DELETE endpoint to clear cart
export async function DELETE(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            return NextResponse.json({ 
                success: true,
                message: 'User not authenticated'
            });
        }
        
        console.log(`🗑️ Clearing cart for user ${userId}`);
        
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} }
        });
        
        return NextResponse.json({ 
            success: true,
            message: 'Cart cleared successfully'
        });
        
    } catch (error) {
        console.error("❌ Error clearing cart:", error);
        return NextResponse.json({ 
            success: false,
            error: error.message
        }, { status: 500 });
    }
}