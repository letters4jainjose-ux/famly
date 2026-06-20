import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  gradient?: string;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export default function StatCard({ label, value, icon, gradient, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-3xl p-4 flex flex-col gap-3',
      gradient || 'bg-[var(--card)] border border-[var(--border)]',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-xs font-medium tracking-wide uppercase',
          gradient ? 'text-white/80' : 'text-[var(--muted-foreground)]'
        )}>
          {label}
        </span>
        {icon && (
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center',
            gradient ? 'bg-white/20' : 'bg-[var(--muted)]'
          )}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className={cn(
          'text-2xl font-bold tracking-tight',
          gradient ? 'text-white' : 'text-[var(--foreground)]'
        )}>
          {value}
        </div>
        {trend && (
          <div className={cn(
            'text-xs mt-0.5',
            gradient ? 'text-white/70' : trend.positive ? 'text-[var(--success)]' : 'text-red-400'
          )}>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
