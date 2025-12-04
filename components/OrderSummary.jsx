// components/OrderSummary.js - FULL CORRECTED VERSION
import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react'
import React, { useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';

const DELIVERY_FEE = 3500;

const OrderSummary = ({ totalPrice, items }) => {
    const { user } = useUser();
    const { getToken } = useAuth();
    const dispatch = useDispatch();
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';
    const router = useRouter();
    const addressList = useSelector(state => state.address.list);

    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
            if (!user) {
                return toast.error('Please login to proceed')
            }
            const token = await getToken();
            const { data } = await axios.post('/api/coupon', { code: couponCodeInput }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCoupon(data.coupon);
            toast.success('Coupon applied successfully');
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        }
    }

    // Calculate the final amount
    const isPlusMember = user?.publicMetadata?.plan === 'bop_plus';
    const shippingCost = isPlusMember ? 0 : DELIVERY_FEE;
    const couponDiscount = coupon ? (coupon.discount / 100 * totalPrice) : 0;
    const finalAmount = totalPrice + shippingCost - couponDiscount;

    const totalForDisplay = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(finalAmount);

    const shippingForDisplay = isPlusMember ? 'Free' : `${currency}${DELIVERY_FEE.toLocaleString()}`;

    // DIRECT PAYMENT FUNCTION - NO CART SYNC
    const handleCheckout = async (e) => {
        e.preventDefault();
        
        if (!user) {
            toast.error('Please login to place an order');
            return;
        }
        
        if (!selectedAddress) {
            toast.error('Please select an address to place an order');
            return;
        }
        
        if (items.length === 0) {
            toast.error('Your cart is empty');
            return;
        }
        
        setProcessing(true);
        
        try {
            const token = await getToken();
            
            // Format items correctly for /api/orders
            const orderItems = items.map(item => ({
                id: item.id, // ✅ MUST be 'id' not 'productId'
                quantity: item.quantity
            }));
            
            console.log('🛒 Sending order to /api/orders:', {
                items: orderItems,
                addressId: selectedAddress.id,
                couponCode: coupon?.code,
                totalAmount: finalAmount
            });
            
            // Call /api/orders endpoint (this creates payment session)
            const { data } = await axios.post('/api/orders', {
                items: orderItems,
                addressId: selectedAddress.id,
                couponCode: coupon?.code,
                totalAmount: finalAmount
            }, {
                headers: { 
                    Authorization: `Bearer ${token}` 
                },
                timeout: 10000 // 10 second timeout
            });
            
            console.log('✅ Orders API response:', data);
            
            if (data.authorization_url) {
                // Clear cart and redirect to Paystack
                dispatch(clearCart());
                window.location.href = data.authorization_url;
            } else if (data.error) {
                throw new Error(data.error);
            } else if (data.message) {
                throw new Error(data.message);
            } else {
                throw new Error('No payment URL received from server');
            }
            
        } catch (error) {
            console.error('❌ Checkout error:', error);
            
            let errorMessage = 'Payment initialization failed';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            
            // Log detailed error for debugging
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Error status:', error.response.status);
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-white border border-slate-200 text-slate-500 text-sm rounded-xl p-7 shadow-sm'>
            <h2 className='text-xl font-medium text-slate-800 mb-2'>Order Summary</h2>
            <p className='text-slate-500 text-sm mb-6'>Review your order before payment</p>
            
            <div className='my-4 py-4 border-y border-slate-200'>
                <p className='text-slate-700 font-medium mb-3'>Shipping Address</p>
                {selectedAddress ? (
                    <div className='flex justify-between items-start'>
                        <div className="text-slate-800">
                            <p className="font-medium">{selectedAddress.name}</p>
                            <p className="text-sm">{selectedAddress.street || selectedAddress.city}, {selectedAddress.state}</p>
                            <p className="text-sm">{selectedAddress.phone || ''}</p>
                        </div>
                        <SquarePenIcon 
                            onClick={() => setSelectedAddress(null)} 
                            className='cursor-pointer hover:text-slate-700 text-slate-500' 
                            size={18} 
                        />
                    </div>
                ) : (
                    <div>
                        {addressList.length > 0 ? (
                            <select 
                                className='border border-slate-300 p-3 w-full my-2 outline-none rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                onChange={(e) => {
                                    const index = parseInt(e.target.value);
                                    if (!isNaN(index) && addressList[index]) {
                                        setSelectedAddress(addressList[index]);
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled className="text-slate-400">Select Shipping Address</option>
                                {addressList.map((address, index) => (
                                    <option key={index} value={index} className="text-slate-700">
                                        {address.name}, {address.city}, {address.state}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-sm text-slate-500 my-2">No addresses saved</p>
                        )}
                        <button 
                            className='flex items-center gap-2 text-blue-600 mt-3 hover:text-blue-800 text-sm font-medium' 
                            onClick={() => setShowAddressModal(true)}
                        >
                            <PlusIcon size={16} /> Add New Address
                        </button>
                    </div>
                )}
            </div>
            
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between mb-4'>
                    <div className='flex flex-col gap-2 text-slate-600'>
                        <p>Subtotal ({items.length} items):</p>
                        <p>Shipping:</p>
                        {coupon && <p className="text-green-600">Coupon Discount:</p>}
                    </div>
                    <div className='flex flex-col gap-2 font-medium text-right'>
                        <p className="text-slate-800">{currency}{totalPrice.toLocaleString()}</p>
                        <p className="text-slate-800">{shippingForDisplay}</p>
                        {coupon && <p className="text-green-600 font-semibold">-{currency}{couponDiscount.toFixed(2)}</p>}
                    </div>
                </div>
                
                {!coupon ? (
                    <form onSubmit={handleCouponCode} className='flex gap-2 mt-4'>
                        <input 
                            onChange={(e) => setCouponCodeInput(e.target.value)} 
                            value={couponCodeInput} 
                            type="text" 
                            placeholder='Enter coupon code' 
                            className='border border-slate-300 p-3 rounded-lg w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        />
                        <button 
                            type='submit'
                            className='bg-slate-700 text-white px-4 rounded-lg hover:bg-slate-800 active:scale-95 transition-all whitespace-nowrap font-medium'
                        >
                            Apply
                        </button>
                    </form>
                ) : (
                    <div className='w-full flex items-center justify-between text-sm mt-2 p-3 bg-green-50 rounded-lg border border-green-100'>
                        <div>
                            <p className="font-semibold text-green-800">Code: {coupon.code.toUpperCase()}</p>
                            <p className="text-xs text-green-700 mt-1">{coupon.description}</p>
                        </div>
                        <XIcon 
                            size={18} 
                            onClick={() => setCoupon('')} 
                            className='hover:text-red-700 transition cursor-pointer text-green-600' 
                        />
                    </div>
                )}
            </div>
            
            <div className='flex justify-between py-6'>
                <div>
                    <p className='font-bold text-lg text-slate-800'>Total Amount</p>
                    <p className='text-sm text-slate-500'>Including all charges</p>
                </div>
                <p className='font-bold text-2xl text-slate-900'>{currency}{totalForDisplay}</p>
            </div>
            
            <button 
                onClick={handleCheckout}
                disabled={!selectedAddress || processing || items.length === 0}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                    !selectedAddress || processing || items.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] shadow-md hover:shadow-lg'
                }`}
            >
                {processing 
                    ? 'Processing Payment...' 
                    : !selectedAddress 
                    ? 'Select Shipping Address' 
                    : `Pay ${currency}${totalForDisplay}`
                }
            </button>

            <p className='text-xs text-slate-500 mt-4 text-center'>
                🔒 Secure payment via Paystack • Your payment is protected by escrow
            </p>

            {/* Order Protection Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="text-blue-600 text-lg">🛡️</div>
                    <p className="font-semibold text-blue-800">Order Protection</p>
                </div>
                <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Payment held securely in escrow</li>
                    <li>• Funds released only after delivery confirmation</li>
                    <li>• Each seller receives separate payment</li>
                    <li>• 100% money-back guarantee for undelivered items</li>
                </ul>
            </div>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
        </div>
    )
}

export default OrderSummary;