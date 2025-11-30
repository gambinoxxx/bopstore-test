'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";

export default function MySales() {
    const { getToken } = useAuth();
    const {user ,isLoaded} =useUser();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();


    useEffect(() => {
        const fetchSales = async () => {
            try {
                const token = await getToken();
                // Note the '?role=seller' query parameter
                const { data } = await axios.get('/api/orders?role=seller', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setSales(data.orders);
            } catch (error) {
                toast.error(error?.response?.data?.error || 'Failed to fetch sales');
            } finally {
                setLoading(false);
            }
        }
        if (isLoaded){
            if (user){
                fetchSales();
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
            {sales.length > 0 ? (
                <div className="my-20 max-w-7xl mx-auto">
                    <PageTitle heading="My Sales" text={`Showing total ${sales.length} sales`} linkText={'Go to home'} />

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
                            {sales.map((order) => (
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
                                    <td className="p-4 text-center align-top font-semibold text-slate-600">₦{order.total.toFixed(2)}</td>
                                    {/* Address Column */}
                                    <td className="p-4 align-top text-sm text-slate-600">{order.address.city}, {order.address.state}</td>
                                    {/* Status Column */}
                                    <td className="p-4 align-top">
                                        {/* This assumes you have an 'escrow' status on the order object, or you might need to fetch it */}
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.isPaid ? 'Paid' : 'Pending Payment'}</span>
                                    </td>
                                </tr> 
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">You have no sales yet</h1>
                </div>
            )}
        </div>
    )
}
