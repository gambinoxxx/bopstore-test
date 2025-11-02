//update seller order status 
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
try {
    const {userId} = getAuth(request)
    const StoreId = await authSeller(userId)


    if (!StoreId) {
        return NextResponse.json({error: 'not authorized'}, {status: 401})
    }
   const{orderId, status} = await request.json()

   await prisma.order.update({
    where: {id: orderId, storeId: StoreId},
    data: {status}
   })

   return NextResponse.json({message: 'Order status updated successfully'})
} catch (error) {
       return NextResponse.json({error: error.code || error.message}, {status: 400})

}
}
export async function GET(request) {
    try {
    const {userId} = getAuth(request)
    const StoreId = await authSeller(userId)


    if (!StoreId) {
        return NextResponse.json({error: 'not authorized'}, {status: 401})
    }
    const orders =  await prisma.order.findMany({
        where: {storeId: StoreId},
        include: {user:true, address:true, orderItems: {include:{product:true}}},
        orderBy: {createdAt: 'desc'}
    })
       return NextResponse.json({orders})

    } catch (error) {
        console.error(error);
         return NextResponse.json({error: error.code || error.message}, {status: 400})
;    }
}