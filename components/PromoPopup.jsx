'use client';

import { XIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { assets } from '@/assets/assets';
import { useAuth } from '@clerk/nextjs';

const PromoPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    // Use Clerk's auth hook to get the state of the modals.
    const { openSignIn, openSignUp, isSignedIn } = useAuth();

    // --- CONFIGURATION ---
    // Easily change the promo message and the sessionStorage key here.
    const PROMO_MESSAGE = "‧₊˚🎄✩ ₊˚🦌⊹♡ Xmas sales! Get festive discounts Get 10% off on all products. Use code: MERRY10";
    const SESSION_STORAGE_KEY = 'promoPopupClosed_v1'; // Change this key to force the popup to show again for all users.

    useEffect(() => {
        // Check if the user has already closed the popup in this session.
        const hasBeenClosed = sessionStorage.getItem(SESSION_STORAGE_KEY);
        // Also, don't show the popup if the user is already signed in.
        if (!hasBeenClosed && !isSignedIn) {
            // If not, show the popup after a short delay to not overwhelm the user.
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2000); // 2-second delay
            return () => clearTimeout(timer);
        }
    }, []);
    
    const handleClose = () => {
        setIsOpen(false);
        // Remember that the user has closed the popup for this session.
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    };

    if (!isOpen) {
        return null; // Don't render if it's not time to show it.
    }
    if (openSignIn || openSignUp) {
        return null; // *** This is the key fix: Don't render if a Clerk modal is open.
    }

    return (
           <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-md w-full bg-white rounded-lg shadow-2xl animate-scale-in text-center overflow-hidden">
                <button onClick={handleClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-800 transition-colors z-10 bg-white/50 rounded-full p-1">
                    <XIcon size={24} />
                </button>
                <Image
                    src={assets.img6}
                    alt="Promotional Offer"
                    width={450}
                    height={250}
                    className="w-full h-auto object-cover"
                />
                <div className="p-6">
                    <p className="text-lg font-semibold text-slate-700 mb-4">{PROMO_MESSAGE}</p>
                    <button
                        onClick={() => {
                            handleClose();
                            // For a better user experience, directly open the sign-in modal.
                            openSignIn();
                        }}
                        className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition-transform transform hover:scale-105"
                    >
                        Sign Up & Claim
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromoPopup;
