'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; 
import OrderChat from '@/components/OrderChat'; // Adjust path if needed

const OrderDetailPage = () => {
    const [escrow, setEscrow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const params = useParams();
    const { orderId } = params;

    useEffect(() => {
        if (!orderId) return;

        const fetchEscrowDetails = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/escrow/${orderid}`);
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
        return <div className="container mx-auto p-4 text-center">Loading order details...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
    }

    if (!escrow) {
        return <div className="container mx-auto p-4 text-center">No order details found.</div>;
    }

    const { order, buyer, seller, status } = escrow;

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
                                <p className="font-semibold">₦{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-right">
                        <p className="text-lg font-bold">Total: ₦{order.total.toFixed(2)}</p>
                    </div>

                    <div className="mt-8">
                        <h3 className="font-semibold text-lg mb-2">Shipping Address</h3>
                        <p className="text-gray-700">{order.address.name}</p>
                        <p className="text-gray-700">{order.address.street}</p>
                        <p className="text-gray-700">{order.address.city}, {order.address.state} {order.address.zip}</p>
                        <p className="text-gray-700">{order.address.country}</p>
                    </div>
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
                        <OrderChat orderId={order.id} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailPage;
