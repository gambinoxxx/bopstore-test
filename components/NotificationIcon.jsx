'use client';

import { Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';

export default function NotificationIcon() {
  const { unreadCount } = useSelector((state) => state.notifications);
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push('/notifications')} 
      className="relative p-2 rounded-full hover:bg-gray-100"
      aria-label={`You have ${unreadCount} unread notifications`}
    >
      <Bell className="h-6 w-6 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
