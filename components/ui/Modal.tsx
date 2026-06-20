'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export default function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel — sits above bottom nav with padding */}
      <div
        className={cn(
          'relative w-full bg-[var(--card)] shadow-2xl animate-slide-up',
          'rounded-t-3xl',
          {
            'max-w-sm': size === 'sm',
            'max-w-md': size === 'md',
            'max-w-lg': size === 'lg',
          },
          className
        )}
        style={{
          // Push modal up above the bottom nav bar
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content — scrollable, with bottom padding to clear nav bar */}
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: 'calc(85vh - 80px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
