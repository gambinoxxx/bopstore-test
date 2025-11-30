import { Webhook } from 'svix';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(req) {
    // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
    }

    // Get the headers
    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occurred -- no svix headers', {
            status: 400
        });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occurred', {
            status: 400
        });
    }

    const eventType = evt.type;

    // Handle the user.created and user.updated events
    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

        // Construct a full name, falling back to username or email part if names are not available.
        let fullName = `${first_name || ''} ${last_name || ''}`.trim();
        if (!fullName) {
            // Use the part of the email before the "@" as a fallback name
            fullName = username || email_addresses[0].email_address.split('@')[0];
        }

        try {
            await prisma.user.upsert({
                where: { id: id },
                update: {
                    email: email_addresses[0].email_address,
                    name: fullName,
                    image: image_url,
                },
                create: {
                    id: id,
                    email: email_addresses[0].email_address,
                    name: fullName,
                    image: image_url,
                },
            });
            console.log(`User ${id} was successfully created or updated.`);
        } catch (error) {
            console.error('Error creating/updating user:', error);
            return new Response('Error occurred while syncing user', { status: 500 });
        }
    }

    return new Response('', { status: 200 });
}