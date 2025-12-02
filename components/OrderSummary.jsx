// components/OrderSummary.js - FULLY UPDATED VERSION
import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react'
import React, { useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { Protect, useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';

const DELIVERY_FEE = 3500;

const OrderSummary = ({ totalPrice, items }) => {

    const {user} = useUser();
    const {getToken} = useAuth();
    const dispatch = useDispatch();

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

    const router = useRouter();

    const addressList = useSelector(state => state.address.list);

    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
            if (!user) {
                return toast.error('Please login to proceed')
            }
            const token = await getToken();
            const {data} = await axios.post('/api/coupon', {code: couponCodeInput},{
                headers:{Authorization: `Bearer ${token}`}
            })
            setCoupon(data.coupon);
            toast.success('Coupon applied successfully');
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        }
    }

    // Calculate the final amount to be sent to the backend
    const isPlusMember = user?.publicMetadata?.plan === 'bop_plus';
    const shippingCost = isPlusMember ? 0 : DELIVERY_FEE;
    const couponDiscount = coupon ? (coupon.discount / 100 * totalPrice) : 0;
    const finalAmount = totalPrice + shippingCost - couponDiscount;

    const totalForDisplay = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(finalAmount);

    const shippingForDisplay = isPlusMember ? 'Free' : `${currency}${DELIVERY_FEE.toLocaleString()}`;

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        try {
            if (!user) {
                return toast.error('Please login to place an order');
            }
            if (!selectedAddress) {
                return toast.error('Please select an address to place an order');
            }
            
            const token = await getToken();

            const orderData = {
                addressId: selectedAddress.id,
                items,
                totalAmount: finalAmount // Send the final calculated amount
            }
            
            if (coupon) {
                orderData.couponCode = coupon.code;
            }
            
            const {data} = await axios.post('/api/orders', orderData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Order API Response:', data); // Debug log
            
            // Handle both old and new response formats for Paystack
            let redirectUrl = null;
            
            if (data.authorization_url) {
                // New format (preferred)
                redirectUrl = data.authorization_url;
            } else if (data.session && data.session.authorization_url) {
                // Old format support (backward compatibility)
                redirectUrl = data.session.authorization_url;
            } else if (data.data && data.data.authorization_url) {
                // Another possible format
                redirectUrl = data.data.authorization_url;
            }
            
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                console.error('No payment URL found in response:', data);
                toast.error('Payment initialization failed. Please try again.');
            }
            
        } catch (error) {
            console.error('Place order error:', error);
            toast.error(error?.response?.data?.error || error.message || 'Order placement failed');
        }
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            <div className='flex gap-2 items-center'>
                <input 
                    type="radio" 
                    id="PAYSTACK" 
                    name='payment' 
                    checked={true}
                    readOnly
                    className='accent-gray-500' 
                />
                <label htmlFor="PAYSTACK" className='cursor-pointer'>Paystack</label>
            </div>
            
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon 
                                onClick={() => setSelectedAddress(null)} 
                                className='cursor-pointer hover:text-slate-700' 
                                size={18} 
                            />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select 
                                        className='border border-slate-400 p-2 w-full my-3 outline-none rounded' 
                                        onChange={(e) => setSelectedAddress(addressList[e.target.value])}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>
                                                    {address.name}, {address.city}, {address.state}, {address.zip}
                                                </option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button 
                                className='flex items-center gap-1 text-slate-600 mt-1 hover:text-slate-800' 
                                onClick={() => setShowAddressModal(true)}
                            >
                                Add Address <PlusIcon size={18} />
                            </button>
                        </div>
                    )
                }
            </div>
            
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p>{shippingForDisplay}</p>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                
                {
                    !coupon ? (
                        <form 
                            onSubmit={handleCouponCode} 
                            className='flex justify-center gap-3 mt-3'
                        >
                            <input 
                                onChange={(e) => setCouponCodeInput(e.target.value)} 
                                value={couponCodeInput} 
                                type="text" 
                                placeholder='Coupon Code' 
                                className='border border-slate-400 p-1.5 rounded w-full outline-none focus:border-slate-600'
                            />
                            <button 
                                type='submit'
                                className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'
                            >
                                Apply
                            </button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon 
                                size={18} 
                                onClick={() => setCoupon('')} 
                                className='hover:text-red-700 transition cursor-pointer' 
                            />
                        </div>
                    )
                }
            </div>
            
            <div className='flex justify-between py-4'>
                <p className='font-medium'>Total:</p>
                <p className='font-bold text-lg text-slate-700'>{currency}{totalForDisplay}</p>
            </div>
            
            <button 
                onClick={e => toast.promise(handlePlaceOrder(e), { 
                    loading: 'Initializing Payment...',
                    success: 'Redirecting to payment...',
                    error: 'Failed to initialize payment'
                })} 
                className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all font-medium'
                disabled={!selectedAddress}
            >
                {selectedAddress ? 'Proceed to Payment' : 'Select Address First'}
            </button>

            <p className='text-xs text-slate-400 mt-3 text-center'>
                You will be redirected to Paystack to complete your payment
            </p>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
        </div>
    )
}

export default OrderSummary