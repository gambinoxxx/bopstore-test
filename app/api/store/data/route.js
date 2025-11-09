import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

 

//get store info & store products 
export async function GET(request) {
    try{
        //get store username from query params
        const {searchParams} = new URL(request.url)
        const username = searchParams.get('username')?.toLowerCase();
        if(!username){
            return NextResponse.json({error: "missing username"}, {status: 400})
        }

        //get store info and stock products with ratings 
        const store = await prisma.store.findUnique({
            where:{username, isActive: true},
            include: {
                Product: { // Correctly nest `where` and `include` for the Product relation
                    where: { stock: { gt: 0 } }, // Use `stock` field with `gt` (greater than) operator
                    include: { rating: true }
                }
            }

        })
        if(!store){
            return NextResponse.json({ store: null })
        }
        const { Product, ...restOfStore } = store;
        const storeWithProducts = { ...restOfStore, products: Product };
        return NextResponse.json({store: storeWithProducts})

    }catch (error){
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    

    }
}