import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }
        const { cart } = await request.json();

        // Use upsert to create the user if they don't exist, or update if they do.
        const updatedUser = await prisma.user.upsert({
            where: { id: userId },
            update: { cart },
            create: {
                id: userId,
                // You might need to fetch user details from Clerk here for a complete record
                name: 'New User',
                email: 'newuser@example.com',
                image: '',
                cart,
            },
        });
        return NextResponse.json({ cart: updatedUser.cart });
    } catch (error) {
        console.error("Error updating cart:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            // For unauthenticated users, it's better to return an empty cart than an error
            return NextResponse.json({ cart: {} });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        return NextResponse.json({ cart: user?.cart || {} });
    } catch (error) {
        console.error("Error fetching cart:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}