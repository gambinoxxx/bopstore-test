import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import paystack from "paystack";
import { sendEmail } from "@/lib/sendNotification";

export async function POST(request) {
    console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Loaded' : 'Not Loaded');


    try {
        const {userId ,has } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }
        const {addressId, items, couponCode, paymentMethod, totalAmount} = await request.json();

        //check if all requred fields are present 
        if(!addressId || !items || !Array.isArray(items) || !paymentMethod || items.length === 0){
          return NextResponse.json({ error: 'missing order details' }, { status: 401 });
        }

        let coupon = null;
        if (couponCode) {
           coupon = await prisma.coupon.findUnique({
            where: {code: couponCode
            }
        })
        if (!coupon) {
            return NextResponse.json({error:"coupon not found "}, {status:404});
        }
        }
        // check if coupon is avaliable for new users 
        
        if (couponCode && coupon.forNewUser) {
            if (!userId) {
                return NextResponse.json({error:"Please log in to use this coupon."}, {status:401});
            }
            const userorders = await prisma.order.findMany({
                where: {userId}})
                if (userorders.length > 0) {
                    return NextResponse.json({error:"coupon valid for new users only"}, {status:400});
            }
        }
        const hasPlusPlan = has({plan: 'bop_plus'});
        //check if coupon is avaliable for members

        if (couponCode && coupon.forMember && userId) {
            if (!hasPlusPlan) {
                return NextResponse.json({error:"coupon valid for BOP Plus members only"}, {status:400});
            }
        }
        //group orders by storeId using a Map
        const ordersByStore = new Map()
        
        // --- PERFORMANCE FIX: Fetch all products at once to avoid N+1 problem ---
        const productIds = items.map(item => item.id);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        for(const item of items) {
            const product = productMap.get(item.id);
            if (!product) {
                return NextResponse.json({ error: `Product with id ${item.id} not found.` }, { status: 404 });
            }
            const storeId = product.storeId
            if (!ordersByStore.has(storeId)) {
                ordersByStore.set(storeId, []);
            }
            ordersByStore.get(storeId).push({...item, price: product.price});
        }

        // --- NOTIFICATION LOGIC: Get store and buyer details ---
        const storeIds = Array.from(ordersByStore.keys());
        const stores = await prisma.store.findMany({
            where: { id: { in: storeIds } },
            select: { id: true, name: true, email: true },
        });
        const storeDetailsMap = new Map(stores.map(s => [s.id, s]));
        const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });

        const orderCreationData = [];

        for (const [storeId, sellerItems] of ordersByStore.entries()) {
            // Calculate total for each store's order without shipping, as it's part of the finalAmount
            let total = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            if (coupon) {
                total -= (total * coupon.discount) / 100;
            }

            orderCreationData.push({
                userId,
                storeId,
                addressId,
                total,
                paymentMethod,
                isCouponUsed: !!coupon,
                coupon: coupon ? coupon : {},
                orderItems: {
                    create: sellerItems.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price,
                    }))
                }
            });
        }

        // Prepare stock update operations
        const stockUpdateOperations = items.map(item =>
            prisma.product.update({
                where: { id: item.id },
                data: { stock: { decrement: item.quantity } },
            })
        );

        // --- DATA INTEGRITY FIX: Use a transaction to create orders ---
        const createdOrders = await prisma.$transaction(
            [...orderCreationData.map(data => prisma.order.create({ data })), ...stockUpdateOperations]
        );

        const orderIds = createdOrders.map(order => order.id);

        if (paymentMethod === 'PAYSTACK') {
            const paystackInstance = paystack(process.env.PAYSTACK_SECRET_KEY);
            const origin = request.headers.get('origin');

            // Find user's email for Paystack
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const response = await paystackInstance.transaction.initialize({
                amount: Math.round(totalAmount * 100), // Use totalAmount from frontend
                email: user.email,
                currency: 'NGN', // or 'NGN', 'GHS', 'ZAR'
                callback_url: `${origin}/verify-payment`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                }
            });

            // The response body from paystack contains the authorization URL
            return NextResponse.json({ session: response.data });
        }

        // For non-Paystack (COD) payments, clear the cart and send notifications immediately
        if (paymentMethod !== 'PAYSTACK') {
            await prisma.user.update({
                where: {id: userId},
                data: {cart: {}}
            });

            // --- Prepare and send email notifications for COD orders ---
            const buyerName = buyer?.name || 'Customer';
            const buyerEmail = buyer?.email;
            const notificationPromises = [];

            // --- Prepare notifications for each seller ---
            for (const [storeId, sellerItems] of ordersByStore.entries()) {
                const store = storeDetailsMap.get(storeId);
                const orderTotal = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                // Create a detailed HTML list of items for the email
                const itemsHtml = `<ul>${sellerItems.map(item => `<li>${item.quantity} x ${productMap.get(item.id)?.name} - ₦${item.price.toFixed(2)}</li>`).join('')}</ul>`;

                // --- Notify the seller ---
                if (store?.email) {
                    const sellerHtml = `
                        <p>Hi ${store.name},</p>
                        <p>You have a new order from ${buyerName}. Please check your dashboard to process it.</p>
                        <h3>Order Summary:</h3>
                        ${itemsHtml}
                        <p><strong>Store Total: ₦${orderTotal.toFixed(2)}</strong></p>
                        <p>Order details are available in your Bopstore seller dashboard.</p>
                    `;
                    notificationPromises.push(sendEmail({
                        to: store.email,
                        subject: `You Have a New Order on Bopstore!`,
                        html: sellerHtml,
                        text: `You have a new order from ${buyerName}. Store Total: ₦${orderTotal.toFixed(2)}. Please check your dashboard.`
                    }));
                }
            }

            // --- Notify the buyer with a single consolidated email ---
            if (buyerEmail) {
                const allItems = Array.from(ordersByStore.values()).flat();
                const allItemsHtml = `<ul>${allItems.map(item => `<li>${item.quantity} x ${productMap.get(item.id)?.name} - ₦${item.price.toFixed(2)}</li>`).join('')}</ul>`;
                const grandTotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                const buyerHtml = `
                    <p>Hi ${buyerName},</p>
                    <p>Thank you for your order! We've received it and the seller(s) will begin processing it shortly.</p>
                    <h3>Full Order Summary:</h3>
                    ${allItemsHtml}
                    <p><strong>Grand Total: ₦${grandTotal.toFixed(2)}</strong></p>
                    <p>You can view your complete order details in your account.</p>
                `;
                notificationPromises.push(sendEmail({
                    to: buyerEmail,
                    subject: 'Your Bopstore Order has been placed!',
                    html: buyerHtml,
                    text: `Thank you for your order! Grand Total: ₦${grandTotal.toFixed(2)}.`
                }));
            }

            // Send all notifications concurrently
            await Promise.all(notificationPromises).catch(console.error);
        }

        return NextResponse.json({message: 'Order placed successfully'});
    } catch (error) {
        // Log the full error to the server console for better debugging
        console.error("Error creating order:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
//get all orders for a user 

export async function GET(request) {
    try {
        const {userId} = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }
        const orders = await prisma.order.findMany({
            // --- BUG FIX: Combined where clauses ---
            where: {
                userId,
                OR: [
                    { paymentMethod: 'COD' },
                    { paymentMethod: 'PAYSTACK', isPaid: true }
                ]
            },
            include: {
                orderItems: {include: {product: true}},
                address: true,
            },
            orderBy: {createdAt: 'desc'}
        })
        return NextResponse.json({orders});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status:400});
    }
}
