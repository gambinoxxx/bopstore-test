import { Webhook } from 'svix';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
    return NextResponse.json({ error: 'Error occurred -- no svix headers' }, { status: 400 });
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
    return NextResponse.json({ error: 'Error occurred during webhook verification' }, { status: 400 });
  }

  const eventType = evt.type;

  // --- USER CREATED ---
  if (eventType === 'user.created') {
    await prisma.user.create({
      data: {
        id: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        // Use the full name if available, otherwise default to "New User"
        name: (`${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim()) || 'New User',
        image: evt.data.image_url,
      },
    });
    console.log(`User ${evt.data.id} created with name: ${(`${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim()) || 'New User'}`);
  }

  // --- USER UPDATED ---
  if (eventType === 'user.updated') {
    const name = (`${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim()) || 'New User';
    await prisma.user.update({
      where: { id: evt.data.id },
      data: {
        email: evt.data.email_addresses[0].email_address,
        // Always update the name, even if it's just to the default
        name: name,
        image: evt.data.image_url,
      },
    });
    console.log(`User ${evt.data.id} updated with name: ${name}`);
  }

  // We don't handle user.deleted in this example, but you could add it here if needed.

  return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
}