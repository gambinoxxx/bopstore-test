'use client'
import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { DeleteIcon } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios" // 👈 ADDED: axios import

export default function AdminCoupons() {
    const { getToken } = useAuth()

    const [coupons, setCoupons] = useState([])

    const [newCoupon, setNewCoupon] = useState({
        code: '',
        description: '',
        discount: '',
        forNewUser: false,
        forMember: false,
        isPublic: false,
        expiresAt: new Date()
    })

    const fetchCoupons = async () => {
        try {
            const token = await getToken()
            // 💡 CHANGED API PATH: from '/api/admin/coupons' to '/api/coupon'
            const { data } = await axios.get('/api/coupon', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            setCoupons(data.coupons)
        } catch (error) {
            // Fix typo: error.meassge -> error.message
            toast.error(error?.response?.data?.error || error.message) 
        }
    }

    const handleAddCoupon = async (e) => {
        e.preventDefault()
        try {
            const token = await getToken()

            // 💡 Data transformation (good practice)
            const couponData = {
                ...newCoupon,
                discount: Number(newCoupon.discount),
                // Ensure date is sent as a proper ISO string if needed, 
                // but new Date(newCoupon.expiresAt) is okay for Prisma if the input value is a date string.
                expiresAt: new Date(newCoupon.expiresAt) 
            };

            // 💡 CHANGED API PATH: from '/api/admin/coupon' to '/api/coupon'
            const { data } = await axios.post('/api/coupon', { coupon: couponData }, { 
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            toast.success(data.message)
            
            // Clear the form after successful add
            setNewCoupon({
                 code: '',
                 description: '',
                 discount: '',
                 forNewUser: false,
                 forMember: false,
                 isPublic: false,
                 expiresAt: new Date()
            });

            await fetchCoupons()
        } catch (error) {
             toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleChange = (e) => {
        // Handle checkbox toggles for boolean fields (forNewUser, forMember)
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setNewCoupon({ ...newCoupon, [e.target.name]: value })
    }

    // ✅ IMPLEMENTED FUNCTION
    const deleteCoupon = async (code) => {
        try {
            const token = await getToken()
            
            // 💡 Send DELETE request with the coupon code as a query parameter
            const { data } = await axios.delete(`/api/coupon?code=${code}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            toast.success(data.message)
            await fetchCoupons() // Reload the list
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    // The rest of your component remains the same for the return statement...
    useEffect(() => {
        fetchCoupons();
    }, [])

    return (
        <div className="text-slate-500 mb-40">
            {/* Add Coupon */}
            <form onSubmit={(e) => toast.promise(handleAddCoupon(e), { loading: "Adding coupon..." })} className="max-w-sm text-sm">
                <h2 className="text-2xl">Add <span className="text-slate-800 font-medium">Coupons</span></h2>
                <div className="flex gap-2 max-sm:flex-col mt-2">
                    <input type="text" placeholder="Coupon Code" className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="code" value={newCoupon.code} onChange={handleChange} required
                    />
                    <input type="number" placeholder="Coupon Discount (%)" min={1} max={100} className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="discount" value={newCoupon.discount} onChange={handleChange} required
                    />
                </div>
                <input type="text" placeholder="Coupon Description" className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                    name="description" value={newCoupon.description} onChange={handleChange} required
                />

                <label>
                    <p className="mt-3">Coupon Expiry Date</p>
                    <input type="date" placeholder="Coupon Expires At" className="w-full mt-1 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="expiresAt" value={format(newCoupon.expiresAt, 'yyyy-MM-dd')} onChange={handleChange}
                    />
                </label>

                <div className="mt-5">
                    {/* Simplified handleChange for checkboxes (though your original worked too) */}
                    <div className="flex gap-2 mt-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input type="checkbox" className="sr-only peer"
                                name="forNewUser" checked={newCoupon.forNewUser}
                                onChange={handleChange} 
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>For New User</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                            <input type="checkbox" className="sr-only peer"
                                name="forMember" checked={newCoupon.forMember}
                                onChange={handleChange} 
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                            <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                        </label>
                        <p>For Member</p>
                    </div>
                </div>
                <button className="mt-4 p-2 px-10 rounded bg-slate-700 text-white active:scale-95 transition">Add Coupon</button>
            </form>

            {/* List Coupons */}
            <div className="mt-14">
                <h2 className="text-2xl">List <span className="text-slate-800 font-medium">Coupons</span></h2>
                <div className="overflow-x-auto mt-4 rounded-lg border border-slate-200 max-w-4xl">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Code</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Description</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Discount</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Expires At</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">New User</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">For Member</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {coupons.map((coupon) => (
                                <tr key={coupon.code} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 font-medium text-slate-800">{coupon.code}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.description}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.discount}%</td>
                                    {/* Ensure coupon.expiresAt is a valid Date object or ISO string */}
                                    <td className="py-3 px-4 text-slate-800">{format(new Date(coupon.expiresAt), 'yyyy-MM-dd')}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.forNewUser ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.forMember ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-slate-800">
                                        <DeleteIcon onClick={() => toast.promise(deleteCoupon(coupon.code), { loading: "Deleting coupon..." })} className="w-5 h-5 text-red-500 hover:text-red-800 cursor-pointer" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
