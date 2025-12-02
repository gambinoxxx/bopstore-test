// app/verify-payment/page.js - FINAL OPTIMIZED VERSION
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Loading from '@/components/Loading';
import { clearCart } from '@/lib/features/cart/cartSlice';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const reference = searchParams.get('reference');

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderIds, setOrderIds] = useState([]);
  
  const pollIntervalRef = useRef(null);
  const redirectTimeoutRef = useRef(null);
  const isProcessing = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  const startPolling = useCallback(async () => {
    if (isProcessing.current) return; // Prevent multiple polling
    isProcessing.current = true;
    
    let pollCount = 0;
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        pollCount++;
        
        const response = await axios.get(`/api/payment/status?reference=${reference}`);
        const data = response.data;
        
        if (data.status === 'completed') {
          // Orders created successfully!
          clearInterval(pollIntervalRef.current);
          setStatus('success');
          setOrderIds(data.orderIds || []);
          setMessage('Payment successful! Order confirmed.');
          dispatch(clearCart());
          
          // Set redirect timeout
          redirectTimeoutRef.current = setTimeout(() => {
            if (data.orderIds?.length > 0) {
              router.push(`/orders/${data.orderIds[0]}`);
            } else {
              router.push('/orders');
            }
          }, 2000);
          
        } else if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(pollIntervalRef.current);
          setStatus('failed');
          setMessage(`Payment ${data.status}. Please try again.`);
          
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/cart');
          }, 3000);
          
        } else if (data.status === 'pending') {
          setStatus('processing');
          if (pollCount > 2) {
            setMessage(`Creating your order... (${pollCount - 2}s)`);
          }
        }
        
        // Safety timeout
        if (pollCount >= 60) {
          clearInterval(pollIntervalRef.current);
          setStatus('failed');
          setMessage('Order processing is taking longer than expected. Please contact support.');
          isProcessing.current = false;
        }
        
      } catch (pollError) {
        console.error('Polling error:', pollError);
        if (pollCount > 10) {
          setMessage('Having trouble checking order status. Please wait...');
        }
        if (pollCount >= 30) {
          clearInterval(pollIntervalRef.current);
          setStatus('failed');
          setMessage('Unable to verify order status. Please contact support.');
          isProcessing.current = false;
        }
      }
    }, 1000);
  }, [reference, router, dispatch]);

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found.');
      redirectTimeoutRef.current = setTimeout(() => router.push('/'), 3000);
      return;
    }

    const verifyPayment = async () => {
      try {
        await axios.post('/api/verify-payment', { reference });
        startPolling();
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Payment verification failed.');
        
        redirectTimeoutRef.current = setTimeout(() => {
          router.push('/cart');
        }, 5000);
      }
    };

    verifyPayment();
  }, [reference, router, startPolling]);

  const handleBackToCart = useCallback(() => {
    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    router.push('/cart');
  }, [router]);

  const handleGoToOrders = useCallback(() => {
    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    if (orderIds.length > 0) {
      router.push(`/orders/${orderIds[0]}`);
    } else {
      router.push('/orders');
    }
  }, [router, orderIds]);

  const handleContactSupport = useCallback(() => {
    window.open('mailto:support@bopstore.com?subject=Payment%20Issue&body=Payment%20Reference:%20' + reference, '_blank');
  }, [reference]);

  const handleRetryPayment = useCallback(() => {
    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    router.push('/cart');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      {status === 'verifying' && (
        <div className="flex flex-col items-center space-y-4">
          <Loading />
          <div className="space-y-2">
            <p className="text-xl font-medium">{message}</p>
            <p className="text-gray-600 text-sm">
              Please don't close this window. This may take a few seconds.
            </p>
            <p className="text-xs text-gray-500">
              Reference: {reference}
            </p>
          </div>
        </div>
      )}
      
      {status === 'processing' && (
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="size-12 animate-spin text-blue-600" />
          <div className="space-y-2">
            <p className="text-xl font-medium">{message}</p>
            <p className="text-gray-600 text-sm">
              Your payment was successful. Now creating your order...
            </p>
            <p className="text-xs text-gray-500">
              Reference: {reference}
            </p>
          </div>
        </div>
      )}
      
      {status === 'success' && (
        <div className="space-y-6 max-w-md">
          <CheckCircle className="size-20 text-green-500 mx-auto" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-gray-600">{message}</p>
            {orderIds.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-medium">
                  ✓ Order created successfully
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Order ID: {orderIds[0]}
                </p>
                {orderIds.length > 1 && (
                  <p className="text-xs text-gray-600 mt-1">
                    + {orderIds.length - 1} more order(s)
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoToOrders}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                View Your Orders
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Redirecting automatically in 2 seconds...
            </p>
          </div>
        </div>
      )}
      
      {status === 'failed' && (
        <div className="space-y-6 max-w-md">
          <XCircle className="size-20 text-red-500 mx-auto" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">Payment Failed</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500">
              Reference: {reference}
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            >
              Back to Cart
            </button>
            <button
              onClick={handleContactSupport}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 w-full"
            >
              Contact Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
}