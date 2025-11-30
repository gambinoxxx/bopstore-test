import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { orderId } = params;

        const escrow = await prisma.escrow.findUnique({
            where: {
                orderId: orderId,
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

        if (!escrow || (escrow.buyerId !== userId && escrow.sellerId !== userId)) {
            return new NextResponse("Escrow not found or you are not authorized to view it.", { status: 404 });
        }

        return NextResponse.json(escrow);
    } catch (error) {
        console.error("[ESCROW_GET_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { orderId } = params;
        const { status } = await req.json();

        const escrowToUpdate = await prisma.escrow.findUnique({
            where: { orderId },
        });

        if (!escrowToUpdate) {
            return new NextResponse("Escrow not found.", { status: 404 });
        }

        let updatedEscrow;

        if (status === 'SHIPPED') {
            // Security Check: Only the seller can mark the order as shipped.
            if (escrowToUpdate.sellerId !== userId) {
                return new NextResponse("Forbidden: You are not the seller for this order.", { status: 403 });
            }
            // State Logic: Ensure you can only ship from a PENDING state.
            if (escrowToUpdate.status !== 'PENDING') {
                return new NextResponse(`Order cannot be shipped from its current state: ${escrowToUpdate.status}`, { status: 400 });
            }
            updatedEscrow = await prisma.escrow.update({ where: { orderId }, data: { status: 'SHIPPED' } });
        } else if (status === 'DELIVERED') {
            // Security Check: Only the buyer can mark the order as delivered.
            if (escrowToUpdate.buyerId !== userId) {
                return new NextResponse("Forbidden: You are not the buyer for this order.", { status: 403 });
            }
            // State Logic: Ensure you can only mark as delivered from a SHIPPED state.
            if (escrowToUpdate.status !== 'SHIPPED') {
                return new NextResponse(`Order cannot be marked as delivered from its current state: ${escrowToUpdate.status}`, { status: 400 });
            }
            updatedEscrow = await prisma.escrow.update({ where: { orderId }, data: { status: 'DELIVERED' } });
        } else if (status === 'RELEASED') {
            // Security Check: Only the buyer can release the funds.
            if (escrowToUpdate.buyerId !== userId) {
                return new NextResponse("Forbidden: You are not the buyer for this order.", { status: 403 });
            }
            // State Logic: Ensure you can only release funds from a DELIVERED state.
            if (escrowToUpdate.status !== 'DELIVERED') {
                return new NextResponse(`Funds cannot be released from the current state: ${escrowToUpdate.status}`, { status: 400 });
            }
            updatedEscrow = await prisma.escrow.update({ where: { orderId }, data: { status: 'RELEASED' } });
        } else {
            return new NextResponse("Invalid status update.", { status: 400 });
        }

        return NextResponse.json(updatedEscrow);
    } catch (error) {
        console.error("[ESCROW_PATCH_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
