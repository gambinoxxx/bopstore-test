'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';

const CategoriesMarquee = () => {
    const router = useRouter();
    const products = useSelector(state => state.product.list);

    // Get a unique, sorted list of all categories from the products
    const categories = useMemo(() => {
        if (!products || products.length === 0) return [];
        const allCategories = products.map(p => p.category).filter(Boolean);
        return [...new Set(allCategories)].sort();
    }, [products]);

    const handleCategoryClick = (category) => {
        // Navigate to the shop and pre-select the category filter
        // This requires the shop page to handle URL-based filter state, which we can add next.
        router.push(`/shop?category=${encodeURIComponent(category)}`);
    };

    // If there are no categories, don't render the marquee
    if (categories.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
            <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4" >
                {/* Duplicate the array to create a seamless loop effect */}
                {[...categories, ...categories, ...categories, ...categories].map((category, index) => (
                    <button key={`${category}-${index}`} onClick={() => handleCategoryClick(category)} className="px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300 capitalize">
                        {category}
                    </button>
                ))}
            </div>
            <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    );
};

export default CategoriesMarquee;