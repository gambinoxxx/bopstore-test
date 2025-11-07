'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { MinusIcon, PlusIcon } from "lucide-react";
import toast from "react-hot-toast";

const Counter = ({ productId, stock }) => {

    // --- FIX: Read quantity from the cartItems object ---
    const cartItems = useSelector(state => state.cart.cartItems);
    const quantity = cartItems[productId] || 0;
    const dispatch = useDispatch();

    const handleIncrement = () => {
        // --- VALIDATION: Check against available stock before incrementing ---
        if (quantity >= stock) {
            toast.error(`Only ${stock} items are available in stock.`);
            return;
        }
        dispatch(addToCart({ productId }));
    };

    const handleDecrement = () => {
        dispatch(removeFromCart({ productId }));
    };

    return (
        <div className="flex items-center gap-3">
            <button onClick={handleDecrement} className="bg-slate-200 size-8 flex items-center justify-center rounded-full active:scale-95 transition">
                <MinusIcon size={14} />
            </button>
            <p className="text-lg font-semibold w-6 text-center">{quantity}</p>
            <button onClick={handleIncrement} className="bg-slate-200 size-8 flex items-center justify-center rounded-full active:scale-95 transition">
                <PlusIcon size={14} />
            </button>
        </div>
    )
}

export default Counter