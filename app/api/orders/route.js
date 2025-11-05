import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import paystack from "paystack";

export async function POST(request) {
    console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Loaded' : 'Not Loaded');

    try {
        const {userId ,has } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }
        const {addressId, items, couponCode, paymentMethod} = await request.json();

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

        const calculateOrderDetails = (storeId, sellerItems, shippingAdded) => {
            let total = sellerItems.reduce((acc,item)=>acc + (item.price * item.quantity),0);
            let isShippingFeeAddedNow = shippingAdded;

            if (couponCode){
                total -= (total * coupon.discount) / 100;

            }
            if (!hasPlusPlan && !shippingAdded){
                total += 35; // Assuming shipping fee is 35
                isShippingFeeAddedNow = true;
            }
            return { total: parseFloat(total.toFixed(2)), shippingAdded: isShippingFeeAddedNow };
        };

        let fullAmount = 0;
        let isShippingFeeAdded = false;
        const orderCreationData = [];

        for (const [storeId, sellerItems] of ordersByStore.entries()) {
            const { total, shippingAdded } = calculateOrderDetails(storeId, sellerItems, isShippingFeeAdded);
            isShippingFeeAdded = shippingAdded;
            fullAmount += total;
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

        // --- DATA INTEGRITY FIX: Use a transaction to create orders ---
        const createdOrders = await prisma.$transaction(
            orderCreationData.map(data => prisma.order.create({ data }))
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
                amount: Math.round(fullAmount * 100), // Amount in kobo/cents
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

        // For non-Stripe payments, clear the cart immediately
        if (paymentMethod !== 'PAYSTACK') {
            await prisma.user.update({
                where: {id: userId},
                data: {cart: {}}
            });
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
