'use client'
import React, { useState, useMemo } from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'

const LatestProducts = () => {

    const displayQuantity = 8;
    const allProducts = useSelector(state => state.product.list);
    const [activeCategory, setActiveCategory] = useState('All');

    // Dynamically get unique categories from products, and add "All"
    const categories = useMemo(() => {
        const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
        return ['All', ...uniqueCategories];
    }, [allProducts]);

    // Filter products based on the active category
    const filteredProducts = useMemo(() => {
        const sortedByDate = [...allProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (activeCategory === 'All') {
            return sortedByDate.slice(0, displayQuantity);
        }
        return sortedByDate.filter(p => p.category === activeCategory).slice(0, displayQuantity);
    }, [allProducts, activeCategory]);

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Discover what's new in our collection.`} href='/shop' />

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 my-8">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                            activeCategory === category
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >{category}</button>
                ))}
            </div>

            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {filteredProducts.map((product, index) => (
                    <ProductCard key={index} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts