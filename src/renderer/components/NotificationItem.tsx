import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface NotificationItemProps {
  notification: {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  };
  onRemove: (id: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const startXRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startXRef.current;
    // Only allow swiping to the right
    if (diff > 0) {
      setOffsetX(diff);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (offsetX > 100) {
      triggerRemove();
    } else {
      setOffsetX(0);
    }
  };

  const triggerRemove = () => {
    setIsRemoving(true);
    setOffsetX(400); // Swipe away
    setTimeout(() => {
      onRemove(notification.id);
    }, 200);
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  
  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onGlobalEnd = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onGlobalEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onGlobalEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onGlobalEnd);
    };
  }, [isDragging, offsetX]);

  return (
    <div
      ref={itemRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity: isRemoving ? 0 : 1,
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border pointer-events-auto shadow-2xl cursor-grab active:cursor-grabbing select-none group relative overflow-hidden ${
        notification.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : notification.type === 'error'
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      }`}
    >
      {/* Background slide indicator */}
      <div 
        className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
        style={{ opacity: Math.min(offsetX / 200, 0.1) }}
      />
      
      {notification.type === 'success' ? (
        <CheckCircle2 size={18} />
      ) : notification.type === 'error' ? (
        <AlertCircle size={18} />
      ) : (
        <Info size={18} />
      )}
      <span className="text-sm font-medium flex-1">{notification.message}</span>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          triggerRemove();
        }}
        className="p-1 hover:bg-white/10 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationItem;
