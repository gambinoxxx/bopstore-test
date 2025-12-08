import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';

export async function PATCH(request, { params }) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Correctly access the parameter, accounting for potential casing issues.
    // The key in the `params` object matches the name of the file segment, which can be case-sensitive.
    // The error log indicates the server is seeing it as 'notificationid'.
    // We will access it with the lowercase 'id' to match.
    const notificationId = params.notificationid; // This is now correct because we renamed the folder.

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found or access denied' }, { status: 404 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ', readAt: new Date() },
    });

    return NextResponse.json(updatedNotification);

  } catch (error) {
    console.error('[NOTIFICATION_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
