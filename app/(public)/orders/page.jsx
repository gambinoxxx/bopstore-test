'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/formatPrice";

const StatusBadge = ({ status, isPaid }) => {
    const statusMap = {
        PENDING: { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
        SHIPPED: { text: 'Shipped', className: 'bg-blue-100 text-blue-800' },
        DELIVERED: { text: 'Delivered', className: 'bg-indigo-100 text-indigo-800' },
        RELEASED: { text: 'Completed', className: 'bg-green-100 text-green-800' },
        DISPUTED: { text: 'Disputed', className: 'bg-red-100 text-red-800' },
    };

    const displayStatus = statusMap[status] || { text: isPaid ? 'Paid' : 'Pending Payment', className: 'bg-gray-100 text-gray-800' };

    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${displayStatus.className}`}>{displayStatus.text}</span>;
};

export default function Orders() {
    const { getToken } = useAuth();
    const {user ,isLoaded} =useUser();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();


    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = await getToken();
                const { data } = await axios.get('/api/orders', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setOrders(data.orders);
            } catch (error) {
                toast.error(error?.response?.data?.error || 'Failed to fetch orders');
            } finally {
                setLoading(false);
            }
        }
        if (isLoaded){
            if (user){
                fetchOrders();
            }else{
                router.push('/'); //redirect to home if not logged in
            }
        }
    }, [isLoaded, user, getToken, router]);

    if (!isLoaded || loading) {
        return <Loading />
    }

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                <div className="my-20 max-w-7xl mx-auto">
                    <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                    <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                        <thead>
                            <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                <th className="text-left">Product</th>
                                <th className="text-center">Total Price</th>
                                <th className="text-left">Address</th>
                                <th className="text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} onClick={() => router.push(`/orders/${order.id}`)} className="cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                                    {/* Product Column */}
                                    <td className="p-4 align-top">
                                        <div className="font-semibold text-slate-700">
                                            {order.orderItems[0]?.product?.name || 'Product Name Missing'}
                                            {order.orderItems.length > 1 && <span className="text-slate-500 font-normal"> + {order.orderItems.length - 1} more</span>}
                                        </div>
                                        <div className="text-sm text-slate-500">Order ID: {order.id}</div>
                                    </td>
                                    {/* Total Price Column */}
                                    <td className="p-4 text-center align-top font-semibold text-slate-600">{formatPrice(order.total)}</td>
                                    {/* Address Column */}
                                    <td className="p-4 align-top text-sm text-slate-600">{order.address.city}, {order.address.state}</td>
                                    {/* Status Column */}
                                    <td className="p-4 align-top">
                                        <StatusBadge status={order.escrow?.status} isPaid={order.isPaid} />
                                    </td>
                                </tr> 
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">You have no orders</h1>
                </div>
            )}
        </div>
    )
}