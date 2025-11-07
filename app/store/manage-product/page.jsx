'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"

export default function StoreManageProducts() {
    const {getToken} = useAuth()
    const {user} = useUser()

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])

    const fetchProducts = async () => {
      try {
        const token = await getToken()
        const {data} = await axios.get('/api/store/product', {headers: 
            {Authorization: `Bearer ${token}` }}) 
            setProducts(data.products.sort((a ,b)=> new Date(b.createdAt) - new Date(a.createdAt)))
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message)
      }
        setLoading(false)
    }

    const handleStockChange = (productId, newStock) => {
        setProducts(prevProducts =>
            prevProducts.map(p => (p.id === productId ? { ...p, stock: newStock } : p))
        );
    };

    const updateStock = async (productId, stock) => {
        try {
            const token = await getToken();
            const { data } = await axios.put('/api/store/product', { productId, stock: Number(stock) }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(data.message);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to update stock.');
            fetchProducts(); // Re-fetch to revert optimistic update on error
        }
    };

    useEffect(() => {
          if(user){
               fetchProducts()
          }
    }, [user])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Manage <span className="text-slate-800 font-medium">Products</span></h1>
            <table className="w-full max-w-4xl text-left  ring ring-slate-200  rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="px-4 py-3 hidden md:table-cell">MRP</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Stock</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {products.map((product) => (
                        <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} className='p-1 shadow rounded cursor-pointer' src={product.images[0]} alt="" />
                                    {product.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">{product.description}</td>
                            <td className="px-4 py-3 hidden md:table-cell">{currency} {product.mrp.toLocaleString()}</td>
                            <td className="px-4 py-3">{currency} {product.price.toLocaleString()}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={product.stock}
                                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                                        className="w-16 p-1 border border-slate-300 rounded-md text-center"
                                        min="0"
                                    />
                                    <button onClick={() => toast.promise(updateStock(product.id, product.stock), { loading: "Saving..." })} className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded hover:bg-slate-700 active:scale-95 transition">
                                        Save
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )
}