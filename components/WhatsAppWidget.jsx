'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react'; // A generic chat icon

const WhatsAppWidget = () => {
  // We will get the number from an environment variable
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const prefilledMessage = "Hello! I have a question about Bop-Store.";

  const widgetRef = useRef(null);
  const [position, setPosition] = useState({ x: 30, y: 30 }); // Initial position from bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    // Prevent default behavior like text selection
    e.preventDefault();
    setIsDragging(true);
    initialPos.current = { x: position.x, y: position.y };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !widgetRef.current) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    // Calculate new position, ensuring it stays within viewport bounds
    const newX = Math.max(0, Math.min(window.innerWidth - widgetRef.current.offsetWidth, initialPos.current.x - dx));
    const newY = Math.max(0, Math.min(window.innerHeight - widgetRef.current.offsetHeight, initialPos.current.y - dy));

    setPosition({ x: newX, y: newY });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!whatsappNumber) {
    return null; // Don't render if the number isn't set
  }

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(prefilledMessage)}`;

  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 transition-all ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
      onMouseDown={handleMouseDown}
    >
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => isDragging && e.preventDefault()}>
        <div className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-transform hover:scale-110">
          <MessageCircle size={32} />
        </div>
      </a>
    </div>
  );
};

export default WhatsAppWidget;