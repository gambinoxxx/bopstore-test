// app/api/orders/route.js - UPDATED VERSION
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import paystack from "paystack";
import crypto from "crypto";

const paystackInstance = paystack(process.env.PAYSTACK_SECRET_KEY);

export async function POST(request) {
    console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Loaded' : 'Not Loaded');

    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }
        
        // Remove paymentMethod since we only use Paystack now
        const { addressId, items, couponCode, totalAmount } = await request.json();

        // Check if all required fields are present 
        if (!addressId || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing order details' }, { status: 400 });
        }

        // --- VALIDATION PHASE (NO ORDERS CREATED YET) ---
        
        let coupon = null;
        if (couponCode) {
            coupon = await prisma.coupon.findUnique({
                where: { code: couponCode }
            });
            
            if (!coupon) {
                return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
            }
            
            // Check if coupon is available for new users 
            if (coupon.forNewUser) {
                // Only check for completed (paid) orders
                const userOrders = await prisma.order.findMany({
                    where: {
                        userId: userId,
                        isPaid: true
                    }
                });
                
                if (userOrders.length > 0) {
                    return NextResponse.json({ error: "Coupon valid for new users only" }, { status: 400 });
                }
            }
        }
        
        // --- PERFORMANCE FIX: Fetch all products at once to avoid N+1 problem ---
        const productIds = items.map(item => item.id);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });
        
        const productMap = new Map(products.map(p => [p.id, p]));
        
        // Check stock availability (but don't reduce yet!)
        for (const item of items) {
            const product = productMap.get(item.id);
            if (!product) {
                return NextResponse.json({ error: `Product with id ${item.id} not found.` }, { status: 404 });
            }
            if (product.stock < item.quantity) {
                return NextResponse.json({ 
                    error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
                }, { status: 400 });
            }
        }

        // Group orders by storeId using a Map
        const ordersByStore = new Map();
        
        for (const item of items) {
            const product = productMap.get(item.id);
            const storeId = product.storeId;
            
            if (!ordersByStore.has(storeId)) {
                ordersByStore.set(storeId, []);
            }
            ordersByStore.get(storeId).push({
                ...item, 
                price: product.price,
                productName: product.name
            });
        }

        // --- Get store and buyer details for metadata ---
        const storeIds = Array.from(ordersByStore.keys());
        const stores = await prisma.store.findMany({
            where: { id: { in: storeIds } },
            select: { id: true, name: true, email: true, userId: true },
        });
        const storeDetailsMap = new Map(stores.map(s => [s.id, s]));
        
        const buyer = await prisma.user.findUnique({ 
            where: { id: userId }, 
            select: { name: true, email: true } 
        });

        if (!buyer || !buyer.email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 404 });
        }

        // Generate unique payment reference
        const paymentReference = `BOP_${Date.now()}_${userId}_${crypto.randomBytes(4).toString('hex')}`;

        // --- STORE ORDER DATA IN PAYMENT SESSION (NO ORDERS CREATED!) ---
        const paymentSessionData = {
            userId,
            buyerEmail: buyer.email,
            buyerName: buyer.name,
            addressId,
            items: items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: productMap.get(item.id).price,
                storeId: productMap.get(item.id).storeId,
                productName: productMap.get(item.id).name
            })),
            ordersByStore: Array.from(ordersByStore.entries()).map(([storeId, storeItems]) => ({
                storeId,
                items: storeItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                total: storeItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                storeDetails: storeDetailsMap.get(storeId)
            })),
            coupon: coupon ? {
                code: coupon.code,
                discount: coupon.discount,
                forNewUser: coupon.forNewUser
            } : null,
            totalAmount,
            createdAt: new Date().toISOString(),
        };

        // Create payment session (NOT ORDER!)
        await prisma.paymentSession.create({
            data: {
                id: paymentReference,
                userId,
                status: 'PENDING',
                amount: totalAmount,
                metadata: paymentSessionData,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000) // Expire in 30 minutes
            }
        });

        // Initialize Paystack payment
        const origin = request.headers.get('origin');
        const response = await paystackInstance.transaction.initialize({
            amount: Math.round(totalAmount * 100),
            email: buyer.email,
            currency: 'NGN',
            reference: paymentReference,
            callback_url: `${origin}/verify-payment?reference=${paymentReference}`,
            metadata: {
                paymentReference,
                userId,
                addressId,
                itemsCount: items.length,
                storeCount: storeIds.length,
                couponCode: couponCode || null
            }
        });

        // --- IMPORTANT: Validate Paystack response ---
        if (!response || !response.status || !response.data?.authorization_url) {
            console.error("Paystack initialization failed. Response:", response);
            return NextResponse.json({ 
                error: "Could not connect to payment gateway. Please try again later.",
                details: response?.message || "No response from Paystack."
            }, { status: 502 }); // 502 Bad Gateway is appropriate here
        }

        // Return Paystack authorization URL
        return NextResponse.json({ 
            authorization_url: response.data.authorization_url,
            reference: paymentReference,
            message: 'Redirect to payment gateway'
        });

    } catch (error) {
        console.error("Error initiating payment:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET endpoint - UPDATE to only show paid orders
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');

        let whereClause = {};

        if (role === 'seller') {
            // Fetch orders where the user is the seller (owner of the store)
            whereClause = {
                store: { userId: userId },
                isPaid: true // Only show paid orders
            };
        } else {
            // Default to fetching orders where the user is the buyer
            whereClause = {
                userId: userId,
                isPaid: true // Only show paid orders
            };
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: { 
                orderItems: { 
                    include: { product: true } 
                }, 
                address: true, 
                user: { select: { name: true } },
                escrow: {
                    select: { status: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}