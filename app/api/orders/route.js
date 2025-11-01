import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


export async function POST(request) {
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

        for(const item of items){
            const product = await prisma.product.findUnique({
                where: {id: item.id}
            })
            const storeId = product.storeId;
            if (!ordersByStore.has(storeId)) {
                ordersByStore.set(storeId, []);
            }
            ordersByStore.get(storeId).push({...item, price: product.price});
        }

        let orderIds =[];
        let fullAmount = 0;

        let isShippingFeeAdded = false

        //create orders for each seller 
        for (const [storeId ,sellerItems] of ordersByStore.entries()){
            let total = sellerItems.reduce((acc,item)=>acc + (item.price * item.quantity),0);

            if (couponCode){
                total -= (total * coupon.discount) / 100;

            }
            if (!hasPlusPlan && !isShippingFeeAdded){
                total += 3500;
                isShippingFeeAdded = true;
            }
            fullAmount += parseFloat(total.toFixed(2))

            const order = await prisma.order.create({
                data: {
                    userId,
                    storeId,
                    addressId,
                    total: parseFloat(total.toFixed(2)),
                    paymentMethod,
                    isCouponUsed: coupon ? true : false,
                    coupon: coupon ? coupon : {},
                    orderItems:{
                        create: sellerItems.map(item =>({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price,
                        }))
                    }
                }
            })
            orderIds.push(order.id);
        } 
        await prisma.user.update({
            where: {id: userId},
            data: {cart: {}}
        })
        return NextResponse.json({message: 'Order placed successfully'});
    } catch (error) {
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
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
            where: {userId, OR:[
                {paymentMethod: 'COD'},
                {AND: [{paymentMethod: 'STRIPE'}, {isPaid: true}]}
            ]},

            include:{
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
