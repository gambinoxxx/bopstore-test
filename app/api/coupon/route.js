import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

//verify coupon
export async function POST(request) {
    try {
        const {userId, has} = auth();
        const {code} = await request.json();

        const coupon = await prisma.coupon.findUnique({
            where: {code: code.toUpperCase(),
                expiresAt:{ gt: new Date()}
            }
        })
        if (!coupon) {
            return NextResponse.json({error:"coupon not found "}, {status:404});
        }
        if (coupon.forNewUser) {
            if (!userId) {
                return NextResponse.json({error:"Please log in to use this coupon."}, {status:401});
            }
            const userorders = await prisma.order.findMany({
                where: {userId}})
                if (userorders.length > 0) {
                    return NextResponse.json({error:"coupon valid for new users only"}, {status:400});
            }
        }
        if (coupon.forMember && userId) {
            const hasPlusPlan = has({plan: 'bop_plus'});
            if (!hasPlusPlan) {
                return NextResponse.json({error:"coupon valid for BOP Plus members only"}, {status:400});
            }
        }
        return NextResponse.json({coupon});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status:400});
    }
} 