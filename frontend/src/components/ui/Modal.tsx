import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeStyles[size]} bg-white rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8E8ED]">
          <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#86868B] hover:bg-gray-100 hover:text-[#1D1D1F] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-[#E8E8ED]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
