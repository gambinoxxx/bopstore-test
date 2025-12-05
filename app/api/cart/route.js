import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
// NOTE: Removed 'clerkClient' import to rely only on getAuth

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        
        if (!userId) {
            // An unauthenticated user cannot save a cart persistently.
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }
        
        const body = await request.json();
        const { cart = {} } = body;
        
        if (typeof cart !== 'object' || cart === null || Array.isArray(cart)) {
            return NextResponse.json({ error: 'Invalid cart format' }, { status: 400 });
        }
        
        // --- NEW LOGGING FOR DEBUGGING ---
        // This will show exactly what the client sent before any cleaning.
        console.log(`📦 RAW Input Cart for user ${userId}:`, cart);

        // --- Cart Sanitization (Good Practice) ---
        const cleanCart = {};
        for (const [productId, quantity] of Object.entries(cart)) {
            // Ensure product ID is present and quantity is a non-negative number
            if (productId && typeof quantity === 'number' && quantity >= 0) {
                cleanCart[productId] = quantity;
            } else {
                // Log if an item was dropped due to validation failure
                console.log(`⚠️ Dropped item: Product ID: ${productId}, Quantity: ${quantity} (Type: ${typeof quantity})`);
            }
        }
        
        // Existing log shows the result after sanitization
        console.log(`📦 Saved (Clean) Cart for user ${userId}:`, cleanCart);

        // Use upsert to either create a new user (with placeholders) or update an existing one's cart.
        // The 'updatedAt: new Date()' line was removed from the 'update' block to fix the Prisma validation error.
        const updatedUser = await prisma.user.upsert({
            where: { id: userId },
            update: {
                cart: cleanCart,
                // Removed: updatedAt: new Date()
            }, 
            create: {
                id: userId,
                // Using placeholders as we are avoiding clerkClient to fetch name/email/image
                name: 'User Placeholder', 
                email: `${userId}@placeholder.com`, 
                image: '',
                cart: cleanCart,
            }
        });

        return NextResponse.json({ 
            cart: updatedUser.cart || {},
            message: 'Cart saved successfully (using basic auth).'
        });
        
    } catch (error) {
        // The console log will still show the original error if it's not a config issue.
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
            // Unauthenticated users get an empty cart.
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
