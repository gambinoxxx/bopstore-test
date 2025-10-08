import {getAuth} from '@clerk/nextjs/server';
import prisma from "@/lib/prisma";
import {NextResponse} from "next/server";
import authAdmin from "@middlewares/authAdmin";
import { inngest } from '@/inngest/client';

//add new coupon 
export async function POST(request){
    try{
        const {userId} = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if(!isAdmin){
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }

        const {coupon} = await request.json()
        coupon.code = coupon.code.toUpperCase()

        await prisma.coupon.create({data: coupon}).then(async(coupon)=>{
         //run inngest sheduler function to delete coupon on expiry
         await inngest.send({
            name: 'app/coupon.expired',
            data: {
                code: coupon.code,
                expires_at: coupon.expiresAt

            }

         })
        })

        return NextResponse.json({message: "coupon added successfully"}, {status: 200})

    }catch(error){
        console.error(error)
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    
    }
}
//delete coupon /api/coupon?id=couponId

export async function DELETE(request){
    try {

        const {userId} = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if(!isAdmin){
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        const {searchParams} = request.nextUrl;
        const code = searchParams.get("code");

        await prisma.coupon.delete({where: {code}})

        return NextResponse.json({message: "coupon deleted successfully"}, {status: 200})
    }catch(error){
        console.error(error)
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    
    }
}
//get all coupons /api/coupon
export async function GET(request){
try {
    const {userId} = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if(!isAdmin){
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        const coupons = await prisma.coupon.findMany({})
        return NextResponse.json({coupons}, {status: 200})
    
} catch (error) {
    console.error(error)
        return NextResponse.json({error: error.code || error.message}, {status: 400})
}
}
