'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';
import Loading from '@/components/Loading';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');

  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found. Redirecting...');
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    const verifyPayment = async () => {
      try {
        await axios.post('/api/verify-payment', { reference });
        setStatus('success');
        setMessage('Payment successful! Redirecting to your orders...');
        setTimeout(() => router.push('/orders'), 3000);
      } catch (error) {
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Payment verification failed. Please contact support.');
        setTimeout(() => router.push('/cart'), 5000);
      }
    };

    verifyPayment();
  }, [reference, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {status === 'verifying' && <Loading />}
      {status === 'success' && <CheckCircle className="size-16 text-green-500 mb-4" />}
      {status === 'failed' && <XCircle className="size-16 text-red-500 mb-4" />}
      <p className="text-xl">{message}</p>
    </div>
  );
}
