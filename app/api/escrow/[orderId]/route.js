
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/createNotification";

// =========================================================================
// GET: Fetch Escrow Details (Existing Logic)
// Used by the frontend component's initial useEffect to load the data.
// =========================================================================
export async function GET(req, { params }) { // Correctly destructure params from the context object
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

        // If no escrow but order is paid, create it (idempotent creation)
        if (!escrow && order.isPaid && order.store?.userId) {
            try {
                escrow = await prisma.escrow.create({
                    data: {
                        orderId: orderId,
                        buyerId: order.userId,
                        sellerId: order.store.userId,
                        status: 'PENDING' // Initial status
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
                // This could be a unique constraint violation if two requests tried to create it simultaneously
                console.error(`❌ Failed to create escrow for order ${orderId}:`, createError);
                // Try fetching it one more time in case it was just created
                escrow = await prisma.escrow.findUnique({
                    where: { orderId: orderId },
                    include: {
                        buyer: { select: { id: true, name: true, image: true } },
                        seller: { select: { id: true, name: true, image: true } },
                        order: { include: { orderItems: { include: { product: true } }, address: true, store: true } }
                    }
                });
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

// =========================================================================
// PATCH: Update Escrow Status (New Logic to fix 405 error)
// Used by handleMarkAsShipped, handleMarkAsDelivered, and handleReleaseFunds.
// =========================================================================
export async function PATCH(req, { params }) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = params;
        const body = await req.json();
        const { status: newStatus } = body; // Expecting { status: 'SHIPPED' | 'DELIVERED' | 'RELEASED' }

        // 1. Fetch current order and escrow state
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { store: { select: { userId: true } } }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const currentEscrow = await prisma.escrow.findUnique({
            where: { orderId: orderId }
        });

        if (!currentEscrow) {
             return NextResponse.json({ error: 'Escrow record must exist before updating status' }, { status: 404 });
        }

        const isBuyer = order.userId === userId;
        const isSeller = order.store?.userId === userId;
        const currentStatus = currentEscrow.status;

        // 2. State Transition and Authorization Logic
        let error = null;

        switch (newStatus) {
            case 'SHIPPED':
                if (!isSeller) {
                    error = 'Only the seller can mark the order as SHIPPED.';
                } else if (currentStatus !== 'PENDING') {
                    error = `Cannot transition from ${currentStatus} to SHIPPED.`;
                }
                break;
            case 'DELIVERED':
                if (!isBuyer) {
                    error = 'Only the buyer can mark the order as DELIVERED.';
                } else if (currentStatus !== 'SHIPPED') {
                    error = `Cannot transition from ${currentStatus} to DELIVERED.`;
                }
                break;
            case 'RELEASED':
                if (!isBuyer) {
                    error = 'Only the buyer can release the funds.';
                } else if (currentStatus !== 'DELIVERED') {
                    error = `Cannot transition from ${currentStatus} to RELEASED.`;
                }
                // NOTE: Implement actual payment/fund release logic here or trigger a background job
                break;
            default:
                error = 'Invalid status transition requested.';
        }

        if (error) {
            return NextResponse.json({ error: error }, { status: 403 });
        }

        // 3. Update the escrow status
        const updatedEscrow = await prisma.escrow.update({
            where: { orderId: orderId },
            data: { status: newStatus },
            // Include necessary fields for the client to update state
            include: {
                buyer: { select: { id: true, name: true, image: true } },
                seller: { select: { id: true, name: true, image: true } },
                order: { include: { orderItems: { include: { product: true } }, address: true, store: true } }
            }
        });

        console.log(`✅ Escrow ${orderId} status updated to: ${newStatus}`);

        // 4. Create notifications based on the status change
        if (newStatus === 'SHIPPED') {
            await createNotification({
                userId: order.userId, // Notify the buyer
                type: 'ORDER_SHIPPED',
                title: 'Your Order Has Shipped!',
                message: `Your order #${order.id.substring(0, 8)} is on its way.`,
                data: { orderId: order.id }
            });
        } else if (newStatus === 'DELIVERED') {
            await createNotification({
                userId: order.store.userId, // Notify the seller
                type: 'ORDER_DELIVERED',
                title: 'Order Delivered',
                message: `Order #${order.id.substring(0, 8)} has been marked as delivered by the buyer.`,
                data: { orderId: order.id }
            });
        }

        return NextResponse.json(updatedEscrow);

    } catch (error) {
        console.error("[ESCROW_PATCH_ERROR]", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
