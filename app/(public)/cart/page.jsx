// app/(public)/cart/page.jsx - FINAL CORRECTED VERSION
'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image"; 
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";

export default function Cart() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';
    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);
    
    // Use Clerk auth instead of Redux auth
    const { isSignedIn } = useAuth();
    
    const dispatch = useDispatch();
    const router = useRouter();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const createCartArray = () => {
        let total = 0;
        const cartArray = [];
        
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => product.id === key);
            if (product) {
                cartArray.push({
                    ...product,
                    quantity: value,
                    total: product.price * value
                });
                total += product.price * value;
            }
        }
        
        setCartArray(cartArray);
        setTotalPrice(total);
    };

    const handleDeleteItemFromCart = (productId) => {
        dispatch(deleteItemFromCart({ productId }));
        toast.success('Item removed from cart');
    };

    // Memoize the grouped items to prevent unnecessary recalculations
    const itemsByStore = useMemo(() => {
        const grouped = {};
        cartArray.forEach(item => {
            if (item.storeId) {
                if (!grouped[item.storeId]) {
                    grouped[item.storeId] = {
                        storeName: item.store?.name || 'Store',
                        items: [],
                        total: 0
                    };
                }
                grouped[item.storeId].items.push(item);
                grouped[item.storeId].total += item.total;
            }
        });
        return grouped;
    }, [cartArray]);

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">
            <div className="max-w-7xl mx-auto">
                {/* Title */}
                <PageTitle heading="My Cart" text="items in your cart" linkText="Add more" />

                {/* Not signed in warning */}
                {!isSignedIn && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 font-medium">
                            ⚠️ You're not signed in
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            Your cart will be saved locally. Sign in to save your cart across devices.
                        </p>
                        <button
                            onClick={() => router.push('/sign-in?redirect=/cart')}
                            className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
                        >
                            Sign in now →
                        </button>
                    </div>
                )}

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">
                    {/* Cart Items - Grouped by Store */}
                    <div className="w-full max-w-4xl">
                        {Object.entries(itemsByStore).map(([storeId, storeData]) => (
                            <div key={storeId} className="mb-8 p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        🏪
                                    </div>
                                    <h3 className="font-semibold">{storeData.storeName}</h3>
                                </div>
                                
                                <table className="w-full text-slate-600 table-auto">
                                    <thead>
                                        <tr className="max-sm:text-sm">
                                            <th className="text-left">Product</th>
                                            <th>Quantity</th>
                                            <th>Total Price</th>
                                            <th className="max-md:hidden">Remove</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {storeData.items.map((item, index) => (
                                            <tr key={index} className="space-x-2">
                                                <td className="flex gap-3 my-4">
                                                    <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                                                        <Image 
                                                            src={item.images?.[0] || '/placeholder.jpg'} 
                                                            className="h-14 w-auto" 
                                                            alt={item.name} 
                                                            width={45} 
                                                            height={45} 
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = '/placeholder.jpg';
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="max-sm:text-sm font-medium">{item.name}</p>
                                                        <p className="text-xs text-slate-500">{item.category}</p>
                                                        <p className="text-slate-700 font-medium">
                                                            {currency}{item.price.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <Counter productId={item.id} stock={item.stock} />
                                                </td>
                                                <td className="text-center font-medium">
                                                    {currency}{(item.price * item.quantity).toLocaleString()}
                                                </td>
                                                <td className="text-center max-md:hidden">
                                                    <button 
                                                        onClick={() => handleDeleteItemFromCart(item.id)} 
                                                        className="text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all"
                                                        title="Remove item"
                                                    >
                                                        <Trash2Icon size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="mt-4 pt-4 border-t text-right">
                                    <p className="font-medium text-lg">
                                        Store Subtotal: {currency}{storeData.total.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary Component - THIS HAS THE CHECKOUT BUTTON */}
                    <div className="w-full max-w-md">
                        <OrderSummary totalPrice={totalPrice} items={cartArray} />
                        
                        {/* ESCROW INFO ONLY - NO CHECKOUT BUTTON HERE */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="text-blue-600">💡</div>
                                <p className="font-medium text-blue-800">Escrow Protection</p>
                            </div>
                            <p className="text-sm text-blue-700">
                                Your payment is held securely in escrow and will only be released 
                                to sellers after you confirm delivery of your items.
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                                {Object.keys(itemsByStore).length} store(s) will receive separate payments.
                            </p>
                        </div>

                        {/* Order Notes for Multi-Store */}
                        {Object.keys(itemsByStore).length > 1 && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Note:</span> Since you're buying from {Object.keys(itemsByStore).length} different stores, 
                                    each store will ship separately and you'll receive multiple tracking numbers.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex flex-col items-center justify-center text-slate-400">
            <div className="text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h1 className="text-2xl sm:text-4xl font-semibold mb-4">Your cart is empty</h1>
                <p className="text-gray-600 mb-6 max-w-md">
                    Add some products to your cart and they'll appear here. Start shopping to find amazing deals!
                </p>
                <button
                    onClick={() => router.push('/shop')}
                    className="mt-4 bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                    Browse Products
                </button>
            </div>
        </div>
    );
}