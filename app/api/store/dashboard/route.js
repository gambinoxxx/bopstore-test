import {NextResponse} from "next/server";
import {getAuth} from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSeller";
import prisma from "@/lib/prisma";

// get dashboard data for seller (total orders ,total earning, total product )
export async function GET(request) {
    try {
        const {userId} = getAuth(request)
        const storeId = await authSeller(userId)

        //get all orders for seller
        const orders = await prisma.order.findMany({
            where: {
                storeId}
        })
        //get all products with ratings for seller 
        const products = await prisma.product.findMany({
            where: { storeId}
        })
        const productIds = products.map(product => product.id)
        const ratings = await prisma.rating.findMany({

            where: { productId: { in: productIds } },
            include: {user: true, product: true}

        })
        const dashboardData = {
            ratings,
            totalOrders: orders.length,
            totalEarnings: Math.round(orders.reduce((acc, order) => acc + order.total,0)),
            totalProducts: products.length
        }
        return NextResponse.json({dashboardData});

    }
    catch (error){
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    }
}
