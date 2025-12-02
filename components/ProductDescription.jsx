'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

const ProductDescription = ({ product }) => {

    const [selectedTab, setSelectedTab] = useState('Description');

    // Check if the product has specifications and the object is not empty.
    const hasSpecifications = product.specifications && Object.keys(product.specifications).length > 0;

    // Dynamically create the list of tabs to display.
    const tabs = ['Description'];
    if (hasSpecifications) {
        tabs.push('Specifications');
    }
    tabs.push(`Reviews (${product.rating?.length || 0})`);

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {tabs.map((tab, index) => (
                    <button 
                        className={`${tab.startsWith(selectedTab) ? 'border-b-[1.5px] font-semibold border-slate-700 text-slate-800' : 'text-slate-400'} px-4 py-2 font-medium transition-colors`} 
                        key={index} 
                        onClick={() => setSelectedTab(tab.split(' ')[0])} // Set tab to 'Description', 'Specifications', or 'Reviews'
                    >
                        {tab} 
                    </button>
                ))}
            </div>

            {/* Description */}
            {selectedTab === "Description" && (
                <div className="prose prose-sm max-w-xl text-gray-600">
                    <p>{product.description}</p>
                </div>
            )}

            {/* Reviews */}
            {selectedTab === "Reviews" && (
                <div className="flex flex-col gap-3 mt-14">
                    {product.rating.map((item,index) => (
                        <div key={index} className="flex gap-5 mb-10">
                            <Image src={item.user.image} alt="" className="size-10 rounded-full" width={100} height={100} />
                            <div>
                                <div className="flex items-center" >
                                    {Array(5).fill('').map((_, index) => (
                                        <StarIcon key={index} size={18} className='text-transparent mt-0.5' fill={item.rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                                    ))}
                                </div>
                                <p className="text-sm max-w-lg my-4">{item.review}</p>
                                <p className="font-medium text-slate-800">{item.user.name}</p>
                                <p className="mt-3 font-light">{new Date(item.createdAt).toDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Specifications */}
            {selectedTab === "Specifications" && hasSpecifications && (
                 <div className="max-w-xl">
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.entries(product.specifications).map(([key, value]) => (
                                    <tr key={key} className="even:bg-gray-50">
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-600 w-1/3">{key}</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800">{String(value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Store Page */}
            <div className="flex gap-3 mt-14">
                <Image src={product.store.logo} alt="" className="size-11 rounded-full ring ring-slate-400" width={100} height={100} />
                <div>
                    <p className="font-medium text-slate-600">Product by {product.store.name}</p>
                    <Link href={`/shop/${product.store.username}`} className="flex items-center gap-1.5 text-green-500"> view store <ArrowRight size={14} /></Link>
                </div>
            </div>
        </div>
    )
}

export default ProductDescription