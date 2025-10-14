import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";

// Auth seller 
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ isSeller: false, storeInfo: null, error: 'Unauthorized' }, { status: 401 });
    }

    const isSeller = await authSeller(userId);

    if (!isSeller) {
      // The user might have a store, but it's not approved yet.
      const storeInfo = await prisma.store.findUnique({ where: { userId } });
      return NextResponse.json({ isSeller: false, storeInfo });
    }

    const storeInfo = await prisma.store.findUnique({
      where: { userId }
    });

    return NextResponse.json({ isSeller: true, storeInfo });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}