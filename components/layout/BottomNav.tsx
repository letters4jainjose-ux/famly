'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-[var(--border)]">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', paddingTop: '8px' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-5 transition-all',
                active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
              )}>
              <div className={cn('p-1.5 rounded-xl transition-all', active && 'bg-[var(--secondary)]')}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn('text-[10px] font-semibold', active ? 'opacity-100' : 'opacity-60')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
