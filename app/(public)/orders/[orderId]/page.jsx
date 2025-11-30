'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { db } from '@/lib/firebase'; // Import db for Firestore
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import Loading from '@/components/Loading';
import OrderChat from '@/components/OrderChat'; // Adjust path if needed
import { formatPrice } from '@/lib/formatPrice';

const OrderDetailPage = () => {
    const [escrow, setEscrow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useUser();
    const params = useParams();
    const { orderId } = params;

    useEffect(() => {
        if (!orderId) return;

        const fetchEscrowDetails = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/escrow/${orderId}`);
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to fetch order details.');
                }
                const data = await response.json();
                setEscrow(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEscrowDetails();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center">
                <Loading />
                <p className="mt-4 text-lg text-gray-600">Loading order details...</p>
            </div>
        );
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
    }

    if (!escrow) {
        return <div className="container mx-auto p-4 text-center">No order details found.</div>;
    }

    const { order, buyer, seller, status } = escrow;

    // Helper function to post a system message to the chat
    const postSystemMessage = async (text) => {
        await addDoc(collection(db, 'chats', orderId, 'messages'), {
            text,
            isSystemMessage: true,
            timestamp: serverTimestamp(),
        });
    };

    const handleMarkAsShipped = async () => {
        if (!confirm('Are you sure you want to mark this order as shipped?')) {
            return;
        }

        try {
            const response = await fetch(`/api/escrow/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SHIPPED' }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update status.');
            }

            const updatedEscrow = await response.json();
            setEscrow(prev => ({ ...prev, status: updatedEscrow.status })); // Update UI instantly
            await postSystemMessage('Seller marked the order as SHIPPED.');
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleMarkAsDelivered = async () => {
        if (!confirm('Are you sure you have received this order? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/escrow/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DELIVERED' }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update status.');
            }

            const updatedEscrow = await response.json();
            setEscrow(prev => ({ ...prev, status: updatedEscrow.status })); // Update UI instantly
            await postSystemMessage('Buyer confirmed the order as DELIVERED.');
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleReleaseFunds = async () => {
        if (!confirm('Are you sure you want to release the funds? This will complete the transaction.')) {
            return;
        }

        try {
            const response = await fetch(`/api/escrow/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RELEASED' }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update status.');
            }

            const updatedEscrow = await response.json();
            setEscrow(prev => ({ ...prev, status: updatedEscrow.status })); // Update UI instantly
            await postSystemMessage('Buyer released the funds. Transaction complete!');
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-4">Order Details</h1>
            <p className="mb-6 text-gray-600">Order ID: {order.id}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Order Info */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Order Summary</h2>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                            status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' :
                            status === 'SHIPPED' ? 'bg-blue-200 text-blue-800' :
                            status === 'DELIVERED' ? 'bg-green-200 text-green-800' :
                            status === 'RELEASED' ? 'bg-purple-200 text-purple-800' :
                            'bg-gray-200 text-gray-800'
                        }`}>
                            Escrow Status: {status}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {order.orderItems.map(item => (
                            <div key={item.productId} className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <p className="font-semibold">{item.product.name} (x{item.quantity})</p>
                                    <p className="text-sm text-gray-500">From: {order.store.name}</p>
                                </div>
                                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-right">
                        <p className="text-lg font-bold">Total: {formatPrice(order.total)}</p>
                    </div>

                    <div className="mt-8">
                        <h3 className="font-semibold text-lg mb-2">Shipping Address</h3>
                        <p className="text-gray-700">{order.address.name}</p>
                        <p className="text-gray-700">{order.address.street}</p>
                        <p className="text-gray-700">{order.address.city}, {order.address.state} {order.address.zip}</p>
                        <p className="text-gray-700">{order.address.country}</p>
                    </div>

                    {/* Seller Action Button */}
                    {user?.id === seller.id && status === 'PENDING' && (
                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-semibold mb-2">Seller Actions</h3>
                            <button
                                onClick={handleMarkAsShipped}
                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                            >Mark as Shipped</button>
                        </div>
                    )}

                    {/* Buyer Action Button */}
                    {user?.id === buyer.id && status === 'SHIPPED' && (
                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-semibold mb-2">Buyer Actions</h3>
                            <button
                                onClick={handleMarkAsDelivered}
                                className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition-colors"
                            >Mark as Received</button>
                        </div>
                    )}

                    {/* Buyer Action Button for Releasing Funds */}
                    {user?.id === buyer.id && status === 'DELIVERED' && (
                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-semibold mb-2">Final Step</h3>
                            <button
                                onClick={handleReleaseFunds}
                                className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 transition-colors"
                            >Release Funds to Seller</button>
                        </div>
                    )}

                </div>

                {/* Right Column: Chat & Parties */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Transaction Parties</h2>
                    <div className="mb-4">
                        <h3 className="font-semibold">Buyer</h3>
                        <p>{buyer.name}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold">Seller</h3>
                        <p>{seller.name}</p>
                    </div>

                    <div className="mt-8 border-t pt-6">
                        <h2 className="text-xl font-semibold mb-4">Chat with Seller</h2>
                        <OrderChat 
                            orderId={order.id} 
                            escrowStatus={status}
                            isBuyer={user?.id === buyer.id}
                            orderCreatedAt={order.createdAt}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailPage;
