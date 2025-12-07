import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase'; // Assuming you use Firebase for real-time chat
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { createNotification } from '@/lib/createNotification';

export async function POST(request) {
  try {
    const { userId: senderId, sessionClaims } = getAuth(request);
    if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, recipientId, content } = body;

    if (!chatId || !recipientId || !content) {
      return NextResponse.json({ error: 'Missing required fields: chatId, recipientId, content' }, { status: 400 });
    }

    // 1. Save the message to your real-time database (e.g., Firebase)
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      content,
      timestamp: serverTimestamp(),
    });

    // 2. Create a notification for the recipient in your PostgreSQL database
    await createNotification({
      userId: recipientId,
      type: 'CHAT_MESSAGE',
      title: `New message from ${sessionClaims?.firstName || 'a user'}`,
      message: content.substring(0, 100), // Truncate message for the notification
      data: {
        chatId: chatId,
        senderId: senderId,
      },
    });

    return NextResponse.json({ success: true, message: 'Message sent and notification created.' });

  } catch (error) {
    console.error('[CHAT_SEND_ERROR]', error);
    return NextResponse.json({ 
        error: 'Failed to send message.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

