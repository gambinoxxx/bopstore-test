// app/api/escrow/[orderId]/route.js - UPDATED
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = params;

        // First check the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                store: {
                    select: { userId: true }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Check if user is authorized (buyer or seller)
        const isBuyer = order.userId === userId;
        const isSeller = order.store?.userId === userId;
        
        if (!isBuyer && !isSeller) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get escrow (might not exist)
        let escrow = await prisma.escrow.findUnique({
            where: { orderId: orderId },
            include: {
                buyer: {
                    select: { id: true, name: true, image: true }
                },
                seller: {
                    select: { id: true, name: true, image: true }
                },
                order: {
                    include: {
                        orderItems: { include: { product: true } },
                        address: true,
                        store: true
                    }
                }
            }
        });

        // If no escrow but order is paid, create it
        if (!escrow && order.isPaid && order.store?.userId) {
            try {
                escrow = await prisma.escrow.create({
                    data: {
                        orderId: orderId,
                        buyerId: order.userId,
                        sellerId: order.store.userId,
                        status: 'PENDING'
                    },
                    include: {
                        buyer: {
                            select: { id: true, name: true, image: true }
                        },
                        seller: {
                            select: { id: true, name: true, image: true }
                        },
                        order: {
                            include: {
                                orderItems: { include: { product: true } },
                                address: true,
                                store: true
                            }
                        }
                    }
                });
                
                console.log(`🔄 Created missing escrow for order ${orderId}`);
                
            } catch (createError) {
                console.error(`❌ Failed to create escrow for order ${orderId}:`, createError);
                // Continue without escrow
            }
        }

        if (!escrow) {
            return NextResponse.json({ 
                error: 'Escrow not found',
                order: {
                    id: order.id,
                    isPaid: order.isPaid,
                    status: order.status,
                    hasStore: !!order.store,
                    canCreateEscrow: order.isPaid && !!order.store?.userId
                }
            }, { status: 404 });
        }

        return NextResponse.json(escrow);
        
    } catch (error) {
        console.error("[ESCROW_GET_ERROR]", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}