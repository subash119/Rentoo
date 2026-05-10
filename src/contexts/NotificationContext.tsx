import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedData?: {
    senderId?: string;
    messageId?: string;
    [key: string]: any;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  navigateToNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(\${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/v1/notifications`', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(\${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/v1/notifications`/mark-all-read', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const navigateToNotification = async (notification: Notification) => {
    await markAsRead(notification._id);
    
    switch (notification.type) {
      case 'NEW_MESSAGE':
        // Navigate to the appropriate chat section based on user role
        if (user?.role === 'vendor') {
          navigate('/vendor/chats');
        } else {
          navigate('/customer/chats');
        }
        break;
      case 'RENTAL_REQUEST':
      case 'RENTAL_APPROVED':
      case 'RENTAL_REJECTED':
        navigate('/dashboard?tab=requests');
        break;
      case 'PAYMENT_RECEIVED':
        navigate('/dashboard?tab=requests');
        break;
      case 'PRODUCT_RETURNED':
        navigate(`/products/${notification.relatedData?.productId}`);
        break;
      default:
        navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        navigateToNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
