'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { fetchNotifications, markNotificationAsRead } from '@/lib/notificationSlice'; // Corrected path
import { MessageSquare, ShoppingBag, AlertTriangle, Bell } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import Loading from '@/components/Loading';

const notificationIcons = {
  CHAT_MESSAGE: <MessageSquare className="h-5 w-5 text-blue-500" />,
  ORDER_UPDATE: <ShoppingBag className="h-5 w-5 text-green-500" />,
  SYSTEM_ALERT: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { getToken } = useAuth();
  const { list: notifications, status } = useSelector((state) => state.notifications);

  useEffect(() => {
    // Ensure notifications are fetched if the list is empty
    if (status === 'idle') {
      dispatch(fetchNotifications({ getToken }));
    }
  }, [status, dispatch, getToken]);

  const handleNotificationClick = async (notification) => {
    // Mark as read if it's unread
    if (notification.status === 'UNREAD') {
      dispatch(markNotificationAsRead({ notificationId: notification.id, getToken }));
    }

    // Navigate based on notification type
    if (notification.type === 'CHAT_MESSAGE' && notification.data?.chatId) {
      router.push(`/chat/${notification.data.chatId}`);
    } else if (notification.type.startsWith('ORDER_') && notification.data?.orderId) {
      router.push(`/orders/${notification.data.orderId}`);
    }
    // Add other navigation logic as needed
  };

  if (status === 'loading') {
    return <Loading />;
  }

  return (
    <div className="min-h-screen mx-6 text-slate-800">
      <div className="max-w-4xl mx-auto">
        <PageTitle heading="My Notifications" text="All your recent updates" />

        <div className="mt-8 space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  notification.status === 'UNREAD'
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {notificationIcons[notification.type] || <AlertTriangle className="h-5 w-5 text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                      {notification.status === 'UNREAD' && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-gray-500">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-4 text-xl font-medium">No Notifications Yet</h2>
              <p className="mt-2 text-sm">We'll let you know when something important happens.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
