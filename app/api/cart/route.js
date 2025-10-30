import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

//update user cart

export async function POST(request) {
    try {
        const {userId} = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const {cart} = await request.json()

        //save the cart to the user object 
        await prisma.user.update({
            where: {id: userId},
            data: {cart: cart}
        
        })
        return NextResponse.json({message: 'Cart updated'})
    } catch (error) {
         console.error(error);
        return NextResponse.json({ error: error.message}, {status: 400 })
    }
}
//get user cart
export async function GET(request) {
    try {
        const {userId} = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
       
        const user = await prisma.user.findUnique({
            where: {id: userId}
        })
        return NextResponse.json({cart: user.cart})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message}, {status: 400 })
    }
}