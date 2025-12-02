'use client';

import { useMemo } from 'react';

const CategoryFilter = ({ products, selectedCategories, setSelectedCategories }) => {
    // Get a unique list of all categories from the products
    const categories = useMemo(() => {
        const allCategories = products.map(p => p.category).filter(Boolean); // filter(Boolean) removes any null/undefined
        return [...new Set(allCategories)].sort(); // Create a unique, sorted list
    }, [products]);

    const handleCategoryChange = (category) => {
        setSelectedCategories(prev => {
            if (prev.includes(category)) {
                // If it's already selected, remove it
                return prev.filter(c => c !== category);
            } else {
                // If it's not selected, add it
                return [...prev, category];
            }
        });
    };

    return (
        <div className="p-4 border rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-3 text-slate-800">Categories</h3>
            <div className="space-y-2">
                {categories.map(category => (
                    <label key={category} className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => handleCategoryChange(category)}
                            className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                        />
                        <span className="text-slate-600 capitalize">
                            {category}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default CategoryFilter;