import imagekit from "@/configs/imageKit";
import {getAuth} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

//create the store

export async function POST(request){
    try {
        const {userId} = getAuth(request);
        //get the data from the form 
        const formData = await request.formData()

        const name = formData.get("name")
        const username = formData.get("username")
        const description = formData.get("description")
        const email = formData.get("email")
        const contact = formData.get("contact")
        const address = formData.get("address")
        const image = formData.get("image")

        // Check each field individually and log which one is missing
if (!name) {
    console.log("Name is missing");
}
if (!username) {
    console.log("Username is missing");
}
if (!description) {
    console.log("Description is missing");
}
if (!email) {
    console.log("Email is missing");
}
if (!contact) {
    console.log("Contact is missing");
}
if (!address) {
    console.log("Address is missing");
}
if (!image) {
    console.log("Image is missing");
}
        if(!name || !username || !description || !email || !contact || !address || !image){
            return NextResponse.json({error: "missing store information"}, {status: 400})
        }
        //check if the user already has a store
        const store = await prisma.store.findFirst({
            where: {
                userId: userId
            }
        })
        //if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

    //check is username is already taken
    const isUsernameTaken = await prisma.store.findFirst({
        where: {
            username: username.toLowerCase()
        }
    })
    if(isUsernameTaken){
        return NextResponse.json({error: "username is already taken"}, {status: 400})
    }
    // image upload to imagekit
    const buffer = Buffer.from(await image.arrayBuffer());
    const response = await imagekit.upload({
        file: buffer,
        fileName: image.name,
        folder: "logos"
    })

    const optimizedImage = imagekit.url({
        path: response.filePath,
        transformation: [
            {quality: "auto"},
            {format: "Webp"},
            {width: "512"}
        ]
    })
    const newStore = await prisma.store.create({
        data: {
            userId,
            name,
            description,
            username: username.toLowerCase(),
            email,
            contact,
            address,
            logo: optimizedImage
        }
    })
    // link stone to user 
    await prisma.user.update({
        where: {id: userId},
        data: {store: {connect: {id: newStore.id}}}
    })
    return NextResponse.json({message:"applied, waiting for approval"})
}
    catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})

    }
}
// check is user have already registered a store if yes then send status of the store
export async function GET(request){
    try {
        const {userId} = getAuth(request);
          //check if the user already has a store
          const store = await prisma.store.findFirst({
            where: {
                userId: userId
            }
        })
        //if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }
        return NextResponse.json({status: "not registered"})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})     
    }
}