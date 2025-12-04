'use client'
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import Loading from "@/components/Loading";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";

export default function Product() {

    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const products = useSelector(state => state.product.list);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            // First, try to find the product in the Redux store
            let foundProduct = products.find((p) => p.id === productId);

            // If not found in Redux, fetch from the API as a fallback
            if (!foundProduct && productId) {
                try {
                    const { data } = await axios.get(`/api/product/${productId}`);
                    foundProduct = data.product;
                } catch (error) {
                    toast.error("Could not fetch product details.");
                    console.error("Failed to fetch product:", error);
                }
            }
            setProduct(foundProduct);
            setLoading(false);
            scrollTo(0, 0);
        };

        fetchProduct();
    }, [productId, products]);

    if (loading) return <Loading />;
    if (!product) return <div className="min-h-[70vh] flex items-center justify-center text-2xl text-slate-400">Product not found.</div>;

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto">

                {/* Breadcrums */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    Home / Shop / {product?.category}
                </div>

                {/* Product Details */}
                <ProductDetails product={product} />

                {/* Description & Reviews */}
                <ProductDescription product={product} />
            </div>
        </div>
    );
}