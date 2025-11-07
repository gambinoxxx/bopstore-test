import authSeller from "@/middlewares/authSeller";
import {getAuth} from "@clerk/nextjs/server" 
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import imagekit from "@/configs/imageKit";


// add a new product
export async function POST(request) {
    try{
        const {userId} = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        //get the data from the form    
        const formData = await request.formData()
        const name = formData.get("name")
        const description = formData.get("description")
        const mrp = Number(formData.get("mrp"))
        const price = Number(formData.get("price"))
        const category = formData.get("category")
        const images = formData.getAll("images")

        if (!name || !description || !mrp || !price || !category || !images){
            return NextResponse.json({error: "missing product details"}, {status: 400})
        }
        // uploading images to imagekit
        const imagesUrl = await Promise.all(images.map(async (image) => {
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await imagekit.upload({
                file: buffer,
                fileName: image.name,
                folder: "products"
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {quality: "auto"},
                    {format: "Webp"},
                    {width: "1024"}
                ]
            })
            return url
        }))
        await prisma.product.create({
            data:{
                name,
                description,
                mrp,
                price,
                category,
                images: imagesUrl,
                storeId
            }
        })
        return NextResponse.json({message: "product added successfully"})   

    } 
    catch (error) {

        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    }
}

//get all products for a seller 
export async function GET(request){
    try{
        const {userId} = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({error: "not authorized"}, {status: 401})
        }
        const products = await prisma.product.findMany({
            where: {
                storeId
            }
        })
        return NextResponse.json({products})
    }catch (error){
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, 
            {status: 400})

    }   
}

// update product stock
export async function PUT(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const { productId, stock } = await request.json();

        if (!productId || stock === undefined || stock === null || isNaN(stock)) {
            return NextResponse.json({ error: "Missing or invalid product details" }, { status: 400 });
        }

        // Ensure the product belongs to the seller's store before updating
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                storeId: storeId,
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found or you don't have permission to edit it." }, { status: 404 });
        }

        // Update the stock
        await prisma.product.update({
            where: { id: productId },
            data: { stock: stock },
        });

        return NextResponse.json({ message: "Stock updated successfully" });
    } catch (error) {
        console.error("Error updating stock:", error);
        return NextResponse.json({ error: error.message || "Failed to update stock" }, { status: 500 });
    }
}