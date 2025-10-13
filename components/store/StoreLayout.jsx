'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
// No longer need dummy data, as it will come from the API
// import { dummyStoreData } from "@/assets/assets" 

const StoreLayout = ({ children }) => {
    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)

    useEffect(() => {
        const checkSellerStatus = async () => {
            try {
                // Call your new API endpoint
                const response = await fetch('/api/store/is-seller');

                // If the response is not OK (e.g., 401 Unauthorized), the user is not a seller
                if (!response.ok) {
                    setIsSeller(false);
                    return; 
                }

                // If successful, parse the JSON and update the state
                const data = await response.json();
                setIsSeller(data.isSeller);
                setStoreInfo(data.storeInfo);

            } catch (error) {
                console.error("Failed to verify seller status:", error);
                setIsSeller(false); // Assume not a seller on error
            } finally {
                // Ensure loading is set to false after the check is complete
                setLoading(false);
            }
        };

        checkSellerStatus();
    }, []); // The empty dependency array [] means this runs once when the component mounts

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">You are not authorized to access this page</h1>
            <p className="text-slate-500 mt-2">Only registered sellers can access the store dashboard.</p>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    );
}

export default StoreLayout;
