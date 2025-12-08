'use client'

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth, useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';
import WhatsAppWidget from "@/components/WhatsAppWidget";
import { fetchCart, clearCart } from "@/lib/features/cart/cartSlice";
import { fetchAddress } from "@/lib/features/address/addressSlice";
import { fetchUserRatings } from "@/lib/features/rating/ratingSlice";
import { fetchNotifications } from "@/lib/notificationSlice";
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import MobileSearch from "@/components/MobileSearch";
import PromoPopup from "@/components/PromoPopup";
import Footer from "@/components/Footer";
import { fetchProducts } from "@/lib/features/product/productSlice";

export default function PublicLayout({ children }) {
  const { user } = useUser();
  const dispatch = useDispatch();
  const { getToken, isSignedIn } = useAuth(); // Use isSignedIn for a more reliable check
  const notifications = useSelector((state) => state.notifications.list);
  const prevNotificationIds = useRef(new Set());

  // Fetch products on mount
  useEffect(() => {
    dispatch(fetchProducts({}));
  }, [dispatch]);

  // Fetch user data when user logs in
  useEffect(() => { 
    if (isSignedIn) { // Switch from `user` to `isSignedIn`
      console.log('👤 User logged in, fetching data...');
      dispatch(fetchCart({ getToken }));
      dispatch(fetchAddress({ getToken }));
      dispatch(fetchUserRatings({ getToken }));
      dispatch(fetchNotifications({ getToken }));
    }
  }, [isSignedIn, getToken, dispatch]);

  // Reset cart when user logs out
  useEffect(() => {
    if (!isSignedIn) { // Also use isSignedIn here for consistency
      console.log('👤 User logged out, clearing cart...');
      dispatch(clearCart());
    } 
  }, [isSignedIn, dispatch]); // Changed dependency from 'user' to 'isSignedIn' for stability

  // Poll for new notifications every 30 seconds when the user is logged in
  useEffect(() => {
    if (isSignedIn) {
      const interval = setInterval(() => {
        console.log('🔄 Polling for new notifications...');
        dispatch(fetchNotifications({ getToken }));
      }, 30000); // 30 seconds

      return () => clearInterval(interval); // Cleanup on unmount or user logout
    }
  }, [isSignedIn, getToken, dispatch]);

  // Effect to show toast for new notifications
  useEffect(() => {
    const currentIds = new Set(notifications.map(n => n.id));
    
    notifications.forEach(notification => {
      // If the notification is new and unread, show a toast
      if (!prevNotificationIds.current.has(notification.id) && notification.status === 'UNREAD') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <p className="font-medium text-gray-900">{notification.title}</p>
              <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
            </div>
          </div>
        ));
      }
    });

    prevNotificationIds.current = currentIds; // Always update the ref to the current set of IDs after processing
  }, [notifications]);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Banner />
      <Navbar />
      <MobileSearch />
      {children}
      <PromoPopup />
      <WhatsAppWidget />
      <Footer />
    </>
  );
}