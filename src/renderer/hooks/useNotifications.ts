import { useState, useCallback } from 'react';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration = 6000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showSuccess = (msg: string) => addNotification(msg, 'success');
  const showError = (msg: string) => addNotification(msg, 'error');
  const showInfo = (msg: string) => addNotification(msg, 'info');

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo
  };
};
