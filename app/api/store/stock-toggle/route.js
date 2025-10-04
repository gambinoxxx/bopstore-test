import {getAuth} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authSeller from "@/middlewares/authSeller";
import prisma from "@/lib/prisma";
//toggle stock of aproduct
export async function POST(request) {
    try{
        const {userId} = getAuth(request)
        const {productId} = await request.json()

        if(!productId){
            return NextResponse.json({error: "missing details: productId"}, {status: 400});

        }
        const storeId = await authSeller(userId)

        if (!storeId){
            return NextResponse.json({error: "missing details: productId"}, {status: 401});
        }
        // check if the product exists
        const product = await prisma.product.findFirst({
            where: {id: productId, storeId}
        })
        if (!product){
            return NextResponse.json({error: "product not found"}, {status: 404})
        }
        await prisma.product.update({
            where: {id: productId},
            data: {
                inStock: !product.inStock
            }
        })
        return NextResponse.json({message: "stock toggled successfully"})
    }catch (error){
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    

    }
}