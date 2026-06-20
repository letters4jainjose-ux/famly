'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none',
          {
            'bg-[var(--primary)] text-white hover:opacity-90 focus:ring-[var(--primary)] shadow-sm active:scale-95': variant === 'primary',
            'bg-[var(--secondary)] text-[var(--primary)] hover:opacity-90 focus:ring-[var(--primary)]': variant === 'secondary',
            'bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] focus:ring-[var(--primary)]': variant === 'ghost',
            'bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500 dark:bg-red-950 dark:text-red-400': variant === 'danger',
            'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] focus:ring-[var(--primary)]': variant === 'outline',
          },
          {
            'text-xs px-3 py-1.5 rounded-xl gap-1.5': size === 'sm',
            'text-sm px-4 py-2.5 rounded-2xl gap-2': size === 'md',
            'text-base px-6 py-3.5 rounded-2xl gap-2': size === 'lg',
            'p-2.5 rounded-xl': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
