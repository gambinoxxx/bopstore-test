import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Auth seller 
export async function GET(request) {
  try {
    const { userId } = auth(); // Use auth() instead of getAuth(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Your custom seller verification logic
    const isSeller = await authSeller(userId);

    if (!isSeller) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const storeInfo = await prisma.store.findUnique({
      where: { userId }
    });

    return NextResponse.json({ isSeller, storeInfo });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}