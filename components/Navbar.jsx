'use client'
import { Flame, Menu, PackageIcon, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { useUser, UserButton, Protect, SignInButton, useAuth } from "@clerk/nextjs";

const Navbar = () => {
    const { user } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [search, setSearch] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cartCount = useSelector(state => state.cart.total);

    const [isSeller, setIsSeller] = useState(false);
    const handleSearch = (e) => {
        e.preventDefault();
        // Prevent empty search
        if (search.trim()) {
            router.push(`/shop?search=${search}`);
        }
    };

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
    ];

    useEffect(() => {
        // Close menu on route change
        setIsMenuOpen(false);

        const fetchSellerStatus = async () => {
            if (user) {
                try {
                    const token = await getToken();
                    const { data } = await axios.get('/api/store/is-seller', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setIsSeller(data.isSeller);
                } catch (error) {
                    console.error("Failed to fetch seller status", error);
                }
            }
        };
        fetchSellerStatus();
    }, [pathname, user, getToken]);

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

                    <Link href="/" className="relative text-3xl sm:text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">BOP</span>STORE<span className="text-green-600 text-5xl leading-0">.</span>
                        <Protect plan='bop_plus'>
                            <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                                Plus
                            </p>
                        </Protect>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        {navLinks.map(link => (
                            <Link key={link.label} href={link.href}>{link.label}</Link>
                        ))}
                        <Link href="/deal" className="flex items-center gap-1.5 font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                            <Flame size={16} />
                            Hot Deals
                        </Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input 
                                className="w-full bg-transparent outline-none placeholder-slate-600" 
                                type="text" 
                                placeholder="Search products" 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)} 
                                required 
                            />
                        </form>

                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">{cartCount}</button>
                        </Link>

                        {!user ? (
                            <SignInButton mode="modal">
                                <button className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full">
                                    Login
                                </button>
                            </SignInButton>
                        ) : (
                            <UserButton afterSignOutUrl="/">
                                <UserButton.MenuItems>
                                    <UserButton.Action labelIcon={<PackageIcon size={16} />} label="My Orders" onClick={() => router.push('/orders')} />
                                    {isSeller && (
                                        <UserButton.Action labelIcon={<PackageIcon size={16} />} label="Seller Dashboard" onClick={() => router.push('/store')} />
                                    )}
                                </UserButton.MenuItems>
                            </UserButton>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="sm:hidden flex items-center gap-4">
                         <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={22} />
                            <button className="absolute -top-1 -right-2 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">{cartCount}</button>
                        </Link>
                        {/* User Icon / Login Button for Mobile */}
                        {user ? (
                            <UserButton afterSignOutUrl="/" />
                        ) : (
                            <SignInButton mode="modal">
                                <button className="text-sm font-medium text-slate-600">Login</button>
                            </SignInButton>
                        )}

                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="z-50">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            <div className={`sm:hidden fixed top-0 right-0 h-full bg-white z-40 w-64 shadow-xl transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col items-center justify-center h-full gap-8 text-lg">
                    {navLinks.map(link => (
                        <Link key={link.label} href={link.href} onClick={() => setIsMenuOpen(false)}>{link.label}</Link>
                    ))}
                     <Link href="/deal" className="flex items-center gap-1.5 font-semibold text-orange-600 hover:text-orange-700 transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Flame size={20} />
                        Hot Deals
                    </Link>
                    <hr className="w-3/4 border-slate-200" />
                    {user ? (
                        <>
                            <Link href="/orders" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                            {isSeller && (
                                <Link href="/store" onClick={() => setIsMenuOpen(false)}>Seller Dashboard</Link>
                            )}
                        </>
                    ) : null}
                    {/* The login button is now outside the menu, so it's removed from here. */}
                </div>
            </div>
            {isMenuOpen && <div className="sm:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setIsMenuOpen(false)}></div>}

            <hr className="border-gray-300" />
        </nav>
    );
};

export default Navbar;
