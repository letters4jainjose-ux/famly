'use client';

import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
}

export default function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed z-40 w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 flex items-center justify-center active:scale-90 transition-transform hover:opacity-90"
      style={{
        bottom: 'calc(max(12px, env(safe-area-inset-bottom, 12px)) + 70px)',
        right: '20px',
      }}
      aria-label="Add expense"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
