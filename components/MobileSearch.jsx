'use client'
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MobileSearch = () => {
    const [search, setSearch] = useState('');
    const router = useRouter();

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) {
            router.push(`/shop?search=${search}`);
        }
    };

    return (
        <div className="sm:hidden flex justify-center my-4">
            <form onSubmit={handleSearch} className="flex items-center w-3/5 text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
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
        </div>
    );
};

export default MobileSearch;